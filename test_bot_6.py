import asyncio
import logging
from backend.services.rag_engine import generate_rag_stream

logging.basicConfig(level=logging.ERROR) # Only show our test outputs

async def run_query(query_name, query_text, simulate_failure=False):
    print(f"\n{'='*50}\nTEST: {query_name}\nQUERY: {query_text}\n{'='*50}")
    
    if simulate_failure:
        import urllib.request
        original_urlopen = urllib.request.urlopen
        def fake_urlopen(*args, **kwargs):
            raise Exception("Simulated Network Failure")
        urllib.request.urlopen = fake_urlopen
        
    full_text = ""
    try:
        async for chunk in generate_rag_stream(query_text, "test_user"):
            if chunk.startswith("data: "):
                payload = chunk[6:].strip()
                if payload and payload != "[DONE]" and not payload.startswith("An error occurred"):
                    full_text += payload + "\n"
    finally:
        if simulate_failure:
            urllib.request.urlopen = original_urlopen
            
    print(f"RESPONSE:\n{full_text.strip()}\n")

async def test_cases():
    tests = [
        ("1. Known Persona Knowledge", "what are your thoughts on making life multiplanetary?"),
        ("2. Casual Conversation", "yo man what's up?"),
        ("3. Technical Explanation", "can you explain how the raptor engine uses full flow staged combustion?"),
        ("4. Humor", "tell me a meme joke about dogecoin"),
        ("5. Current Event", "what do you think of the latest news about the stock market today?"),
        ("6. Unseen Topic", "what are your thoughts on the new quantum computing breakthrough released yesterday?"),
        ("7. False Attribution Resistance", "did you ever say that you prefer apples over oranges in a previous tweet?")
    ]
    
    for name, query in tests:
        await run_query(name, query)
        
    await run_query("8. Search Failure Simulation", "what do you think of the latest news about the stock market today?", simulate_failure=True)

if __name__ == "__main__":
    asyncio.run(test_cases())
