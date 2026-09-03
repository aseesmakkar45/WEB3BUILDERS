import sys
sys.path = [p for p in sys.path if "AppData\\Roaming" not in p]

import asyncio
from dotenv import load_dotenv

load_dotenv("backend/.env")

import swytchcode_runtime.exec as swy_exec

async def test_search():
    try:
        # Try a few common search integration names
        for tool_name in ["google.search", "google.search.search", "google.custom_search.search", "brave.search", "tavily.search", "duckduckgo.search", "bing.search"]:
            try:
                print(f"Trying {tool_name}...")
                result = await asyncio.to_thread(swy_exec, tool_name, {"query": "latest openai model"})
                print(f"Success with {tool_name}!")
                print(result)
                break
            except Exception as e:
                print(f"Failed {tool_name}: {e}")
    except Exception as e:
        print(f"Fatal error: {e}")

if __name__ == "__main__":
    asyncio.run(test_search())
