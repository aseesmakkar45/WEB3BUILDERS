import sys
# CRITICAL FIX: Prevent conflicting global Python packages from crashing local Conda environments
sys.path = [p for p in sys.path if "AppData\\Roaming" not in p]

import os
import re
import fitz  # PyMuPDF
import chromadb
import chromadb.utils.embedding_functions as embedding_functions
from dotenv import load_dotenv
from pathlib import Path
import logging
import time

# ==============================================================================
# HIERARCHICAL DATA INGESTION SCRIPT
# ==============================================================================
# Parses Legal PDFs, cleans artifacts, chunks strictly by legislative boundaries 
# (Sections/Articles), and generates multilingual embeddings via Cohere for ChromaDB.

# Set up terminal logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Load environment variables
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
ENV_PATH = BACKEND_DIR / ".env"
load_dotenv(str(ENV_PATH))

def clean_pdf_text(text: str) -> str:
    """Removes standard PDF artifacts like page numbers and redundant headers."""
    # Strip isolated page numbers (e.g., lines containing just a number)
    text = re.sub(r'^\s*\d+\s*$', '', text, flags=re.MULTILINE)
    # Collapse multiple excessive newlines to keep text block cohesive
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def hierarchical_chunk(text: str, act_title: str) -> list[dict]:
    """
    Semantic chunking using a sliding window.
    Ensures chunks do not exceed the 512-token limit of the BGE embedding model,
    preventing silent truncation of critical laws at the end of huge chunks.
    """
    words = text.split()
    chunks = []
    current_chap = "Unknown"
    current_sec = "Unknown"
    
    max_words = 250
    overlap_words = 50
    
    for i in range(0, len(words), max_words - overlap_words):
        chunk_words = words[i:i + max_words]
        if not chunk_words:
            break
            
        chunk_text = " ".join(chunk_words)
        
        # Stateful tracking for Chapter
        chap_match = re.search(r'\b(Chapter\s+[A-Za-z0-9IVX]+)\b', chunk_text, re.IGNORECASE)
        if chap_match:
            current_chap = chap_match.group(1).title()
            
        # Try to extract section numbers
        sec_match = re.search(r'\b(?:Section\s+)?(\d+[A-Z]?)\.', chunk_text[:200], re.IGNORECASE)
        if sec_match:
            current_sec = sec_match.group(1)
            
        chunks.append({
            "text": chunk_text,
            "metadata": {
                "act_title": act_title,
                "chapter": current_chap,
                "part": "Unknown",
                "section_num": current_sec,
                "is_amended": False
            }
        })
        
    return chunks

def process_pdfs(data_dir: str, acts_collection, sections_collection):
    """Reads PDFs from data_dir, chunks them, and uploads vectors to ChromaDB."""
    if not os.path.exists(data_dir):
        logger.warning(f"Data directory '{data_dir}' does not exist. Creating it now...")
        os.makedirs(data_dir, exist_ok=True)
        logger.info(f"Please drop your Indian Legal PDFs (e.g. BNS.pdf) into '{data_dir}' and run again.")
        return

    pdf_files = [f for f in os.listdir(data_dir) if f.lower().endswith('.pdf')]
    if not pdf_files:
        logger.info(f"No PDFs found in '{data_dir}'. Waiting for documents to ingest.")
        return

    batch_size = 512 # Significantly increased for local offline embedding optimization

    for filename in pdf_files:
        logger.info(f"Processing '{filename}'...")
        file_path = os.path.join(data_dir, filename)
        
        # Derive the Act Title from the filename (e.g. "Bharatiya_Nyaya_Sanhita.pdf" -> "Bharatiya Nyaya Sanhita")
        act_title = os.path.splitext(filename)[0].replace("_", " ").title()
        
        # Store high-level Act metadata into the Acts collection
        acts_collection.upsert(
            documents=[f"Full text compilation of {act_title}"],
            metadatas=[{"act_title": act_title}],
            ids=[f"act_{act_title.replace(' ', '_')}"]
        )
        
        # 1. Parse PDF using PyMuPDF
        doc = fitz.open(file_path)
        full_text = ""
        for page in doc:
            full_text += page.get_text("text") + "\n"
            
        if not full_text.strip():
            logger.warning(f"⚠️ No extractable text found in '{filename}'. If this is a scanned document, it requires OCR before ingestion.")
            continue
            
        # 2. Clean artifacts
        cleaned_text = clean_pdf_text(full_text)
        
        # 3. Structural Chunking
        chunks = hierarchical_chunk(cleaned_text, act_title)
        logger.info(f"Extracted {len(chunks)} legislative structural chunks from '{act_title}'.")
        
        # 4. Insert into ChromaDB (Sections Collection)
        docs = []
        metadatas = []
        ids = []
        
        for idx, chunk_data in enumerate(chunks):
            # We skip adding empty texts just in case
            if len(chunk_data["text"]) < 10:
                continue
                
            docs.append(chunk_data["text"])
            metadatas.append(chunk_data["metadata"])
            ids.append(f"{filename}_{chunk_data['metadata']['section_num']}_{idx}")
            
            if len(docs) >= batch_size:
                logger.info(f"Uploading batch of {len(docs)} vectors to ChromaDB...")
                sections_collection.upsert(
                    documents=docs,
                    metadatas=metadatas,
                    ids=ids
                )
                docs, metadatas, ids = [], [], []
                
        # Flush remaining chunks
        if docs:
            logger.info(f"Uploading final batch of {len(docs)} vectors to ChromaDB...")
            sections_collection.upsert(
                documents=docs,
                metadatas=metadatas,
                ids=ids
            )
            
    logger.info("✅ Database Ingestion completely finished!")

def main():
    logger.info("Initializing ChromaDB Persistent Client (Two-Stage Architecture)...")
    CHROMA_PERSIST_DIR = BACKEND_DIR / "chroma_db"
    client = chromadb.PersistentClient(path=str(CHROMA_PERSIST_DIR))
    
    # Inject SentenceTransformer
    emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="BAAI/bge-base-en-v1.5")
    
    # Initialize Collections
    logger.info("Wiping old collections to prevent ghost chunks...")
    try:
        client.delete_collection("legal_acts")
        client.delete_collection("legal_sections")
    except Exception:
        pass
        
    logger.info("Connecting to 'legal_acts' and 'legal_sections' collections...")
    acts_collection = client.get_or_create_collection(
        name="legal_acts",
        embedding_function=emb_fn,
        metadata={"hnsw:space": "cosine"}
    )
    
    sections_collection = client.get_or_create_collection(
        name="legal_sections",
        embedding_function=emb_fn,
        metadata={"hnsw:space": "cosine"}
    )
    
    DATA_DIR = BACKEND_DIR / "data"
    process_pdfs(str(DATA_DIR), acts_collection, sections_collection)

if __name__ == "__main__":
    main()
