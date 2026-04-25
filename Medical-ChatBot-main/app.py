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
import re
import time
import logging
from pinecone import Pinecone


# ─── Language Detection ───────────────────────────────────────────────────────
def detect_language(text: str) -> str:
    """Detect if text is primarily Arabic or English based on character counts."""
    arabic_chars = len(re.findall(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]', text))
    latin_chars = len(re.findall(r'[a-zA-Z]', text))
    return "Arabic" if arabic_chars > latin_chars else "English"

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__)
load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT")
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

# ─── Prompt template with RAG context + chat history + language enforcement ──
prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("placeholder", "{chat_history}"),
    ("system", "LANGUAGE ENFORCEMENT (NON-NEGOTIABLE): The user's current message is written in {detected_language}. You MUST respond ENTIRELY in {detected_language}. Every single word — headings, bullets, explanations, doctor names, disclaimers, and warnings — MUST be in {detected_language}. If the retrieved medical context is in a different language, translate the relevant information into {detected_language}. VIOLATION OF THIS RULE IS ABSOLUTELY FORBIDDEN."),
    ("human", "{input}")
])

question_answer_chain = create_stuff_documents_chain(chatModel, prompt)
rag_chain = create_retrieval_chain(retriever, question_answer_chain)

@app.route("/")
def index():
    return render_template('chat.html')

@app.route("/api/chatbot", methods=["GET", "POST"])
def chat():
    # Accept both JSON and form-encoded data (JSON needed for Capacitor mobile app)
    if request.is_json:
        msg = (request.json or {}).get("msg", "").strip()
    else:
        msg = request.form.get("msg", "").strip()

    # Input validation
    if not msg:
        return jsonify({"answer": "Please enter a message."})

    if len(msg) > 2000:
        return jsonify({"answer": "Your message is too long. Please keep it under 2000 characters."})

    logger.info("User: %s", msg)

    # Detect user's language for response enforcement
    detected_lang = detect_language(msg)
    logger.info("Detected language: %s", detected_lang)

    # Load previous conversation from memory
    previous_context = memory.load_memory_variables({})

    try:
        response = rag_chain.invoke({
            "input": msg,
            "chat_history": previous_context.get("chat_history", []),
            "detected_language": detected_lang
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

        return jsonify({"answer": str(answer)})

    except RuntimeError as e:
        # All API keys exhausted
        if "exhausted" in str(e).lower():
            logger.error("All Gemini API keys exhausted: %s", e)
            return jsonify({"answer": "All API keys are currently exhausted. Please try again later."})
        raise

    except Exception as e:
        logger.error("Error generating response: %s", e, exc_info=True)
        return jsonify({"answer": "I'm sorry, I'm temporarily unable to process your request. Please try again in a moment."})

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=9090, debug=True)
