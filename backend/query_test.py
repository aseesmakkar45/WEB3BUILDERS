import sys, os
sys.path = [p for p in sys.path if 'AppData\\Roaming' not in p]
import chromadb
import chromadb.utils.embedding_functions as embedding_functions

db_path = os.path.join(os.getcwd(), 'chroma_db')
client = chromadb.PersistentClient(path=db_path)
emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name='BAAI/bge-base-en-v1.5')
sections_collection = client.get_collection('legal_sections', embedding_function=emb_fn)

results = sections_collection.query(query_texts=['Is it illegal to drive bike without helmet'], n_results=5)
print('RAW QUERY RESULTS:')
for i, (doc, meta) in enumerate(zip(results['documents'][0], results['metadatas'][0])):
    print(f"Match {i+1}: Act={meta.get('act_title')} Sec={meta.get('section_num')} | len={len(doc)}")
    print(f"Preview: {doc[:150]}...\n")

print('\nOPTIMIZED QUERY RESULTS:')
results2 = sections_collection.query(query_texts=['Motor Vehicles Act Section 129, protective headgear exemption, traffic compliance penalty, two-wheeler safety violations, two-wheeler operation without helmet fine'], n_results=5)
for i, (doc, meta) in enumerate(zip(results2['documents'][0], results2['metadatas'][0])):
    print(f"Match {i+1}: Act={meta.get('act_title')} Sec={meta.get('section_num')} | len={len(doc)}")
    print(f"Preview: {doc[:150]}...\n")
