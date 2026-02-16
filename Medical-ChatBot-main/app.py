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
from pinecone import Pinecone

app = Flask(__name__)
load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# ✅ التعديل هنا: مش needed environment parameter مع الـ new client
pc = Pinecone(
    api_key=PINECONE_API_KEY,
    environment="aped-4627-b74a"  # أو أي environment تبعك
) # environment مش مطلوب هنا

# Check if index exists
print("Available indexes:", pc.list_indexes().names())  # للـ debugging

if "medical-chatbot" not in pc.list_indexes().names():
    raise ValueError("Index 'medical-chatbot' not found! Available indexes: {}".format(pc.list_indexes().names()))

embeddings = download_embeddings()

index_name = "medical-chatbot"
docsearch = PineconeVectorStore.from_existing_index(
    index_name=index_name,
    embedding=embeddings
)

# باقي الكود كما هو...

retriever = docsearch.as_retriever(search_type="similarity", search_kwargs={"k": 3})

# ✅ Chat model using Groq (higher free-tier rate limits than Google Gemini)
chatModel = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0.3,
    api_key=GROQ_API_KEY,
)

# ✅ Conversation memory: remembers the last 3 interactions only
memory = ConversationBufferWindowMemory(
    memory_key="chat_history",
    return_messages=True,
    k=3
)

# ✅ Prompt including previous conversation history
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
    msg = request.form["msg"]
    print("User:", msg)

    # 🧠 تحميل المحادثة السابقة من الذاكرة
    previous_context = memory.load_memory_variables({})

    # استدعاء السلسلة مع المحادثة السابقة
    try:
        response = rag_chain.invoke({
            "input": msg,
            "chat_history": previous_context.get("chat_history", [])
        })

        answer = response["answer"]
        print("Response:", answer)

        # 💾 حفظ السؤال والإجابة في الذاكرة
        memory.save_context({"input": msg}, {"output": answer})

        return str(answer)
    except Exception as e:
        print(f"Error generating response: {e}")
        return "I'm sorry, I'm temporarily unable to process your request. Please try again in a moment."

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=9090, debug=True)
