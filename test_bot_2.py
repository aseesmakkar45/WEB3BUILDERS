import asyncio
import os
import sys
sys.path = [p for p in sys.path if "AppData\\Roaming" not in p]
from backend.services.rag_engine import generate_rag_stream

async def run_tests():
    print("\n--- Test 1: Known Topic (Mars) ---")
    query1 = "What are your thoughts on settling Mars?"
    async for chunk in generate_rag_stream("test_user", query1, vibe_mode="x_mode"):
        pass # print(chunk, end="", flush=True)
    print("\n\n--- Test 2: Unseen Topic (Latest OpenAI Model) ---")
    query2 = "What do you think of the latest openai model released yesterday?"
    async for chunk in generate_rag_stream("test_user", query2, vibe_mode="x_mode"):
        pass # print(chunk, end="", flush=True)

if __name__ == "__main__":
    asyncio.run(run_tests())
