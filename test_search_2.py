import sys
sys.path = [p for p in sys.path if "AppData\\Roaming" not in p]
import os
os.environ["PYTHONIOENCODING"] = "utf-8"

import asyncio
from dotenv import load_dotenv

load_dotenv("backend/.env")

import swytchcode_runtime.exec as swy_exec
import json

async def test_search():
    results = {}
    for tool_name in ["google.search", "google.custom_search.search", "google.search.search", "brave.search", "tavily.search", "duckduckgo.search", "bing.search"]:
        try:
            result = await asyncio.to_thread(swy_exec, tool_name, {"query": "latest openai model"})
            results[tool_name] = {"success": True, "result": str(result)[:500]}
            break
        except Exception as e:
            results[tool_name] = {"success": False, "error": str(e)}
            
    with open("search_tool_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    asyncio.run(test_search())
