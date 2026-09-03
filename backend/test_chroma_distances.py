import sys
sys.path = [p for p in sys.path if "AppData\\Roaming" not in p]
import chromadb
import chromadb.utils.embedding_functions as embedding_functions
from pathlib import Path
import json

BACKEND_DIR = Path("c:/Users/lenovo/Desktop/JOURNEY/GITHUB/VIBEWRITE/backend")
CHROMA_PERSIST_DIR = BACKEND_DIR / "chroma_db"
chroma_client = chromadb.PersistentClient(path=str(CHROMA_PERSIST_DIR))
emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="BAAI/bge-base-en-v1.5")
tweets_collection = chroma_client.get_collection("elon_tweets", embedding_function=emb_fn)

queries = [
    "haha that's crazy",
    "what's up",
    "What do you think about the latest OpenAI model released yesterday?",
    "What are your thoughts on settling Mars?",
    "FSD beta v12 release notes"
]

results = {}
for q in queries:
    res = tweets_collection.query(query_texts=[q], n_results=3)
    distances = res['distances'][0] if res['distances'] else []
    results[q] = distances

with open("distances.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=4)
