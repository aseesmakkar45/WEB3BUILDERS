import asyncio
import logging
from backend.services.rag_engine import generate_rag_stream

logging.basicConfig(level=logging.INFO)

async def test_cases():
    print("\n--- Test 1: Pure Conversation ---")
    async for chunk in generate_rag_stream("haha that's crazy", "test_user"):
        pass

    print("\n--- Test 2: Known Topic ---")
    async for chunk in generate_rag_stream("what are your thoughts on settling Mars?", "test_user"):
        pass

    print("\n--- Test 3: Current/Unseen Topic ---")
    async for chunk in generate_rag_stream("What do you think about the latest OpenAI model released yesterday?", "test_user"):
        pass

    # For Test 4, we will temporarily monkey-patch urllib.request.urlopen to raise an Exception
    import urllib.request
    original_urlopen = urllib.request.urlopen
    
    def fake_urlopen(*args, **kwargs):
        raise Exception("Simulated network failure")
        
    urllib.request.urlopen = fake_urlopen
    
    print("\n--- Test 4: External Search Failure ---")
    async for chunk in generate_rag_stream("What do you think about the latest OpenAI model released yesterday?", "test_user"):
        pass
        
    urllib.request.urlopen = original_urlopen
    print("\n✅ All regression tests complete.")

if __name__ == "__main__":
    asyncio.run(test_cases())
