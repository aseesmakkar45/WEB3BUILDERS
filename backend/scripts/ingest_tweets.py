import sys
sys.path = [p for p in sys.path if "AppData\\Roaming" not in p]

import os
import pandas as pd
import chromadb
import chromadb.utils.embedding_functions as embedding_functions
from pathlib import Path

# Setup paths
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
CSV_PATH = BACKEND_DIR.parent / "all_musk_posts.csv"
CHROMA_PERSIST_DIR = BACKEND_DIR / "chroma_db"

def ingest_tweets():
    print("Loading CSV...")
    df = pd.read_csv(CSV_PATH)
    
    # Filter out empty or extremely short tweets
    df = df[df['fullText'].notna()]
    df = df[df['fullText'].str.len() > 10]
    
    # Sort by likes to prioritize high-engagement tweets if we sample
    df = df.sort_values(by="likeCount", ascending=False)
    
    # Take top 30000 tweets for better style representation
    df = df.head(30000)
    
    print(f"Loaded {len(df)} tweets for ingestion.")
    
    print("Initializing ChromaDB...")
    client = chromadb.PersistentClient(path=str(CHROMA_PERSIST_DIR))
    
    # Delete old collections to clear space
    try: client.delete_collection("legal_acts")
    except: pass
    try: client.delete_collection("legal_sections")
    except: pass
    try: client.delete_collection("elon_tweets")
    except: pass
    
    emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="BAAI/bge-base-en-v1.5")
    
    collection = client.create_collection(
        name="elon_tweets",
        embedding_function=emb_fn,
        metadata={"hnsw:space": "cosine"}
    )
    
    docs = []
    metadatas = []
    ids = []
    
    batch_size = 512
    count = 0
    
    for idx, row in df.iterrows():
        docs.append(str(row['fullText']))
        
        is_reply = False
        if pd.notna(row.get('isReply')):
            val = str(row['isReply']).lower()
            is_reply = (val == 'true' or val == '1.0' or val == '1')
            
        metadatas.append({
            "createdAt": str(row['createdAt']),
            "likes": int(row['likeCount'] or 0),
            "retweets": int(row['retweetCount'] or 0),
            "is_reply": is_reply,
            "length": len(str(row['fullText']))
        })
        ids.append(f"tweet_{row['id']}")
        
        if len(docs) >= batch_size:
            collection.upsert(documents=docs, metadatas=metadatas, ids=ids)
            count += len(docs)
            print(f"Upserted {count} tweets...")
            docs, metadatas, ids = [], [], []
            
    if docs:
        collection.upsert(documents=docs, metadatas=metadatas, ids=ids)
        count += len(docs)
        print(f"Upserted {count} tweets...")
        
    print("Ingestion complete!")

if __name__ == "__main__":
    ingest_tweets()
