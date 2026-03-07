# Embeddings and store in Pinecone

from dotenv import load_dotenv
import os
import time
import logging
from src.helper import load_pdf_files, filter_to_minimal_docs, text_split, get_key_pool
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from pinecone import Pinecone
from pinecone import ServerlessSpec
from langchain_pinecone import PineconeVectorStore

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")

# Validate required API keys
if not PINECONE_API_KEY or PINECONE_API_KEY == "your_pinecone_api_key_here":
    print("ERROR: PINECONE_API_KEY is not set or is placeholder. Please set a valid key in .env")
    exit(1)

# Initialize the key pool (reads GEMINI_API_KEYS or GOOGLE_API_KEY)
key_pool = get_key_pool()

os.environ["PINECONE_API_KEY"] = PINECONE_API_KEY

# Initialize Pinecone client immediately after loading environment variables
pc = Pinecone(api_key=PINECONE_API_KEY)
index_name = "medical-chatbot"

# FORCE_REINDEX: set to "true" to delete the existing index and re-ingest with updated chunking
force_reindex = os.getenv("FORCE_REINDEX", "false").lower() == "true"

# Check if index already exists using list_indexes()
existing_indexes = pc.list_indexes()
existing_index_names = {idx.name for idx in existing_indexes}

if index_name in existing_index_names and force_reindex:
    print(f"FORCE_REINDEX enabled — deleting existing index '{index_name}'...")
    pc.delete_index(index_name)
    # Wait for deletion to complete
    time.sleep(5)
    print(f"Index '{index_name}' deleted. Will recreate with updated chunking.")
    existing_index_names.discard(index_name)

if index_name in existing_index_names:
    # Index already exists; avoid re-ingesting data to save startup time and RAM
    print(f"Index '{index_name}' already exists, skipping data upload.")
    print(f"  (Set FORCE_REINDEX=true to delete and re-ingest with updated chunking)")
else:
    print(f"Index '{index_name}' does not exist. Creating index and uploading data...")

    # Create the index
    pc.create_index(
        name=index_name,
        dimension=3072,  # Dimension of Google Gemini embedding model "gemini-embedding-001"
        metric="cosine",  # Similarity metric
        spec=ServerlessSpec(cloud="aws", region="us-east-1")
    )

    # Wait for index to be ready
    print("Waiting for index to be ready...")
    time.sleep(10)

    # Load and process documents only when creating the index
    extracted_data = load_pdf_files(data='data/')
    minimal_docs = filter_to_minimal_docs(extracted_data)
    text_chunks = text_split(minimal_docs)
    print(f"Prepared {len(text_chunks)} chunks (chunk_size=700, overlap=70)")

    # ── Batch upload with key rotation ────────────────────────────────────
    BATCH_SIZE = 80
    DELAY_BETWEEN = 2
    LONG_PAUSE_EVERY = 40
    LONG_PAUSE_SECS = 60

    total = len(text_chunks)
    uploaded = 0

    for batch_num, i in enumerate(range(0, total, BATCH_SIZE), start=1):
        batch = text_chunks[i : i + BATCH_SIZE]

        success = False
        while not success:
            try:
                current_key = key_pool.current_key
                embeddings = GoogleGenerativeAIEmbeddings(
                    model="models/gemini-embedding-001",
                    google_api_key=current_key
                )
                PineconeVectorStore.from_documents(
                    documents=batch,
                    embedding=embeddings,
                    index_name=index_name
                )
                uploaded += len(batch)
                logger.info("Batch %d: uploaded %d/%d chunks using %s",
                            batch_num, uploaded, total, key_pool.current_key_label)
                success = True

            except Exception as e:
                err_str = str(e).lower()
                if "429" in str(e) or "quota" in err_str or "rate" in err_str or "resourceexhausted" in err_str:
                    if key_pool.rotate():
                        logger.info("Retrying batch %d with %s...", batch_num, key_pool.current_key_label)
                        time.sleep(5)
                    else:
                        # All keys exhausted — wait 60s and reset (daily quotas may recover)
                        logger.warning("All keys exhausted. Waiting 60s before retrying...")
                        time.sleep(60)
                        key_pool.reset_exhausted()
                else:
                    logger.error("Non-rate-limit error on batch %d: %s", batch_num, e)
                    raise

        # Rate-limit pacing
        if batch_num % LONG_PAUSE_EVERY == 0:
            print(f"  Pausing {LONG_PAUSE_SECS}s to respect rate limits...")
            time.sleep(LONG_PAUSE_SECS)
        else:
            time.sleep(DELAY_BETWEEN)

    print(f"Successfully uploaded {uploaded}/{total} chunks to Pinecone.")
