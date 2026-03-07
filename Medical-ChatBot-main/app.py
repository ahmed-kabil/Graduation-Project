from flask import Flask, render_template, jsonify, request
from src.helper import download_embeddings
from langchain_pinecone import PineconeVectorStore
from langchain_groq import ChatGroq
from langchain.chains.retrieval import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain.memory import ConversationBufferWindowMemory
from dotenv import load_dotenv
from src.prompt import *
import os
import logging
from pinecone import Pinecone

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__)
load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# ─── Pinecone client ─────────────────────────────────────────────────────────
pc = Pinecone(
    api_key=PINECONE_API_KEY,
    environment="aped-4627-b74a"
)

logger.info("Available Pinecone indexes: %s", pc.list_indexes().names())

if "medical-chatbot" not in pc.list_indexes().names():
    raise ValueError("Index 'medical-chatbot' not found! Available indexes: {}".format(pc.list_indexes().names()))

embeddings = download_embeddings()

index_name = "medical-chatbot"
docsearch = PineconeVectorStore.from_existing_index(
    index_name=index_name,
    embedding=embeddings
)

# ─── Retriever: k=5 for broader medical context ──────────────────────────────
retriever = docsearch.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 5}
)

# ─── Chat model using Groq ───────────────────────────────────────────────────
chatModel = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0.3,
    max_tokens=1024,
    api_key=GROQ_API_KEY,
)

# ─── Conversation memory: last 5 exchanges ───────────────────────────────────
memory = ConversationBufferWindowMemory(
    memory_key="chat_history",
    return_messages=True,
    k=5
)

# ─── Prompt template with RAG context + chat history ─────────────────────────
prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("placeholder", "{chat_history}"),
    ("human", "{input}")
])

question_answer_chain = create_stuff_documents_chain(chatModel, prompt)
rag_chain = create_retrieval_chain(retriever, question_answer_chain)

@app.route("/")
def index():
    return render_template('chat.html')

@app.route("/get", methods=["GET", "POST"])
def chat():
    msg = request.form.get("msg", "").strip()

    # Input validation
    if not msg:
        return "Please enter a message."

    if len(msg) > 2000:
        return "Your message is too long. Please keep it under 2000 characters."

    logger.info("User: %s", msg)

    # Load previous conversation from memory
    previous_context = memory.load_memory_variables({})

    try:
        response = rag_chain.invoke({
            "input": msg,
            "chat_history": previous_context.get("chat_history", [])
        })

        answer = response["answer"]

        # Log retrieved sources for debugging
        source_docs = response.get("context", [])
        if source_docs:
            logger.info("Retrieved %d chunks from vector DB", len(source_docs))
            for i, doc in enumerate(source_docs):
                src = doc.metadata.get("source", "unknown")
                preview = doc.page_content[:80].replace("\n", " ")
                logger.debug("  Chunk %d [%s]: %s...", i + 1, src, preview)
        else:
            logger.warning("No chunks retrieved from vector DB for query: %s", msg[:80])

        logger.info("Response: %s", answer[:120])

        # Save Q&A to memory
        memory.save_context({"input": msg}, {"output": answer})

        return str(answer)

    except Exception as e:
        logger.error("Error generating response: %s", e, exc_info=True)
        return "I'm sorry, I'm temporarily unable to process your request. Please try again in a moment."

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=9090, debug=True)
