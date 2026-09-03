import sys
sys.path = [p for p in sys.path if "AppData\\Roaming" not in p]

import asyncio
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

from backend.services.rag_engine import generate_rag_stream

async def run_test():
    prompt = "What are your thoughts on settling Mars?"
    print(f"User: {prompt}")
    print("Bot: ", end="")
    
    # We simulate a stream
    stream = generate_rag_stream(prompt, chat_id="test_session")
    
    async for chunk in stream:
        # It's an SSE chunk, like 'data: text\n'
        # Let's clean it for console viewing
        clean = chunk.replace("data: ", "").replace("\n", "")
        if clean != "[DONE]":
            print(clean, end="", flush=True)
            
    print("\n--- Test Complete ---")

if __name__ == "__main__":
    asyncio.run(run_test())
