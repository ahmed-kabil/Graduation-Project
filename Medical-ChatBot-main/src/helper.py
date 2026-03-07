from langchain_community.document_loaders import DirectoryLoader, PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from typing import List
from langchain.schema import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import os
import time
import logging

logger = logging.getLogger(__name__)


# EXtract text from pdf files
def load_pdf_files(data):
    loader = DirectoryLoader(
        data,
        glob="*.pdf", 
        loader_cls=PyPDFLoader
    )
    documents = loader.load()
    return documents



# Data Filtering
def filter_to_minimal_docs(docs: List[Document]) -> List[Document]:
    minimal_docs: List[Document] = []
    for doc in docs:
        src = doc.metadata.get("source")
        minimal_docs.append(
            Document(
                page_content=doc.page_content, 
                metadata={"source": src}))
    return minimal_docs




# Splitting the documents into chunks
def text_split(minimal_docs):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=700,
        chunk_overlap=70,
        separators=["\n\n", "\n", ". ", " ", ""],
        length_function=len,
    )
    text_chunks = text_splitter.split_documents(minimal_docs)
    return text_chunks


# ═══════════════════════════════════════════════════════════════════════════════
#                    GEMINI API KEY POOL & ROTATING EMBEDDINGS
# ═══════════════════════════════════════════════════════════════════════════════

class GeminiKeyPool:
    """Manages a pool of Gemini API keys with automatic rotation on quota exhaustion."""

    def __init__(self):
        # Priority 1: GEMINI_API_KEYS (comma-separated list)
        keys_str = os.environ.get("GEMINI_API_KEYS", "").strip()

        if keys_str:
            self.keys = [k.strip() for k in keys_str.split(",") if k.strip()]
        else:
            # Fallback: single GOOGLE_API_KEY
            single_key = os.environ.get("GOOGLE_API_KEY", "").strip()
            if single_key:
                self.keys = [single_key]
            else:
                raise ValueError(
                    "No Gemini API keys found. Set GEMINI_API_KEYS (comma-separated) "
                    "or GOOGLE_API_KEY in your environment."
                )

        self.current_index = 0
        self.exhausted_keys: set = set()
        logger.info("GeminiKeyPool initialized with %d API key(s)", len(self.keys))

    @property
    def current_key(self) -> str:
        return self.keys[self.current_index]

    @property
    def current_key_label(self) -> str:
        return f"Key #{self.current_index + 1}/{len(self.keys)}"

    def rotate(self) -> bool:
        """Mark current key as exhausted and switch to next available key.
        Returns True if a fresh key is available, False if all exhausted."""
        self.exhausted_keys.add(self.current_index)
        logger.warning(
            "%s exhausted (quota/rate limit). %d/%d keys now exhausted.",
            self.current_key_label, len(self.exhausted_keys), len(self.keys)
        )

        # Find next non-exhausted key
        for offset in range(1, len(self.keys)):
            candidate = (self.current_index + offset) % len(self.keys)
            if candidate not in self.exhausted_keys:
                self.current_index = candidate
                logger.info("Switched to %s", self.current_key_label)
                return True

        logger.error("ALL %d Gemini API keys are exhausted!", len(self.keys))
        return False

    def all_exhausted(self) -> bool:
        return len(self.exhausted_keys) >= len(self.keys)

    def reset_exhausted(self):
        """Reset exhausted tracking (e.g., after daily quota reset)."""
        self.exhausted_keys.clear()
        logger.info("All keys marked as available again.")


class RotatingGeminiEmbeddings:
    """Drop-in wrapper for GoogleGenerativeAIEmbeddings with automatic key rotation."""

    QUOTA_ERROR_SIGNALS = ["429", "quota", "rate", "resourceexhausted", "resource_exhausted"]

    def __init__(self, key_pool: GeminiKeyPool, model: str = "models/gemini-embedding-001"):
        self.key_pool = key_pool
        self.model = model
        self._embeddings = self._create_client()

    def _create_client(self) -> GoogleGenerativeAIEmbeddings:
        logger.info("Creating Gemini embedding client with %s", self.key_pool.current_key_label)
        return GoogleGenerativeAIEmbeddings(
            model=self.model,
            google_api_key=self.key_pool.current_key
        )

    def _is_quota_error(self, error: Exception) -> bool:
        err_str = str(error).lower()
        return any(signal in err_str for signal in self.QUOTA_ERROR_SIGNALS)

    def _call_with_rotation(self, method_name: str, *args, **kwargs):
        """Call an embedding method with automatic key rotation on quota errors."""
        last_error = None

        while not self.key_pool.all_exhausted():
            try:
                method = getattr(self._embeddings, method_name)
                return method(*args, **kwargs)
            except Exception as e:
                if self._is_quota_error(e):
                    last_error = e
                    logger.warning(
                        "Quota error on %s: %s",
                        self.key_pool.current_key_label,
                        str(e)[:150]
                    )
                    if self.key_pool.rotate():
                        self._embeddings = self._create_client()
                        time.sleep(2)  # Brief pause before retrying
                    # If rotate() returned False, loop exits via all_exhausted()
                else:
                    raise  # Non-quota error — re-raise immediately

        raise RuntimeError(
            f"All {len(self.key_pool.keys)} Gemini API keys exhausted. "
            f"Last error: {last_error}"
        )

    def embed_documents(self, texts, **kwargs):
        return self._call_with_rotation("embed_documents", texts, **kwargs)

    def embed_query(self, text, **kwargs):
        return self._call_with_rotation("embed_query", text, **kwargs)

    def __getattr__(self, name):
        """Delegate any other attribute access to the underlying client for LangChain compat."""
        return getattr(self._embeddings, name)


# ─── Global singleton key pool ───────────────────────────────────────────────
_key_pool = None

def get_key_pool() -> GeminiKeyPool:
    global _key_pool
    if _key_pool is None:
        _key_pool = GeminiKeyPool()
    return _key_pool


# ─── Public API ──────────────────────────────────────────────────────────────
def download_embeddings():
    """Return a rotating Gemini embedding client that auto-switches API keys on quota errors."""
    pool = get_key_pool()
    return RotatingGeminiEmbeddings(key_pool=pool)
