import asyncio
import logging
from backend.services.rag_engine import generate_rag_stream

logging.basicConfig(level=logging.INFO)

async def test_cases():
    test_queries = [
        ("1. Casual Conversation", "what's up man?"),
        ("2. Humor", "tell me a joke about rockets"),
        ("3. Technical Explanation", "can you explain how the raptor engine uses full flow staged combustion?"),
        ("4. Factual Question", "what year was SpaceX founded?"),
        ("5. Controversial/Current Topic", "what do you think of the latest news about the stock market?"),
        ("6. Unseen Topic", "what's your opinion on the latest GPT-4 model updates?"),
        ("7. Short Reaction", "haha that's hilarious")
    ]
    
    for name, query in test_queries:
        print(f"\n--- {name}: '{query}' ---")
        async for chunk in generate_rag_stream(query, "test_user"):
            pass

    print("\n✅ Evaluation complete.")

if __name__ == "__main__":
    asyncio.run(test_cases())
