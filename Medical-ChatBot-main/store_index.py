# Embeddings and store in Pinecone

from dotenv import load_dotenv
import os
import time
from src.helper import load_pdf_files, filter_to_minimal_docs, text_split, download_embeddings
from pinecone import Pinecone
from pinecone import ServerlessSpec
from langchain_pinecone import PineconeVectorStore

load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Validate required API keys
if not PINECONE_API_KEY or PINECONE_API_KEY == "your_pinecone_api_key_here":
    print("ERROR: PINECONE_API_KEY is not set or is placeholder. Please set a valid key in .env")
    exit(1)

if not GOOGLE_API_KEY or GOOGLE_API_KEY == "your_google_api_key_here":
    print("ERROR: GOOGLE_API_KEY is not set or is placeholder. Please set a valid key in .env")
    exit(1)

os.environ["PINECONE_API_KEY"] = PINECONE_API_KEY
os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY

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

    # Initialize embeddings only when needed
    embeddings = download_embeddings()

    # ── Batch upload with rate-limit handling ─────────────────────────────
    # Google Gemini free tier: 100 embed requests/min.
    # Upload in small batches with delays to stay within limits.
    BATCH_SIZE = 80          # docs per batch (each becomes 1 API call)
    DELAY_BETWEEN = 2        # seconds between batches
    LONG_PAUSE_EVERY = 40    # big pause every N batches
    LONG_PAUSE_SECS = 60     # duration of big pause

    total = len(text_chunks)
    uploaded = 0

    # Get the Pinecone index for adding documents
    index = pc.Index(index_name)

    for batch_num, i in enumerate(range(0, total, BATCH_SIZE), start=1):
        batch = text_chunks[i : i + BATCH_SIZE]
        retry_count = 0
        max_retries = 5

        while retry_count < max_retries:
            try:
                PineconeVectorStore.from_documents(
                    documents=batch,
                    embedding=embeddings,
                    index_name=index_name
                )
                uploaded += len(batch)
                print(f"  Batch {batch_num}: uploaded {uploaded}/{total} chunks")
                break
            except Exception as e:
                retry_count += 1
                err_msg = str(e).lower()
                if "quota" in err_msg or "rate" in err_msg or "resource_exhausted" in err_msg or "429" in err_msg:
                    wait_time = min(60 * retry_count, 120)
                    print(f"  Rate limited on batch {batch_num}, waiting {wait_time}s (retry {retry_count}/{max_retries})...")
                    time.sleep(wait_time)
                else:
                    print(f"  Error on batch {batch_num}: {e}")
                    if retry_count >= max_retries:
                        print(f"  FAILED batch {batch_num} after {max_retries} retries. Continuing...")
                    else:
                        time.sleep(10)

        # Rate-limit pacing
        if batch_num % LONG_PAUSE_EVERY == 0:
            print(f"  Pausing {LONG_PAUSE_SECS}s to respect rate limits...")
            time.sleep(LONG_PAUSE_SECS)
        else:
            time.sleep(DELAY_BETWEEN)

    print(f"Successfully uploaded {uploaded}/{total} chunks to Pinecone.")
