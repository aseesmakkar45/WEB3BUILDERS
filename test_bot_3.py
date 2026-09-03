import asyncio
from backend.services.rag_engine import generate_rag_stream
import logging

logging.basicConfig(level=logging.INFO)

async def test_cases():
    print("\n--- Test 1: Pure Conversation (haha that's hilarious) ---")
    async for chunk in generate_rag_stream("haha that's hilarious", "test_user"):
        pass

    print("\n--- Test 2: Known Topic (Mars) ---")
    async for chunk in generate_rag_stream("What are your thoughts on settling Mars?", "test_user"):
        pass

    print("\n--- Test 3: Unseen Topic (Latest OpenAI Model) ---")
    async for chunk in generate_rag_stream("What do you think about the latest OpenAI model released yesterday?", "test_user"):
        pass
        
    print("\n✅ Verification complete.")

if __name__ == "__main__":
    asyncio.run(test_cases())
