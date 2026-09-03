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
    try:
        # We invoke Gemini via Swytchcode but tell it to use Google Search
        result = await asyncio.to_thread(
            swy_exec, 
            "google.gemini.generateContent", 
            {
                "prompt": "who is the CEO of OpenAI as of 2026?", 
                "model": "gemini-2.5-flash",
                "tools": [{"googleSearch": {}}]
            }
        )
        results["gemini_search"] = {"success": True, "result": result}
    except Exception as e:
        results["gemini_search"] = {"success": False, "error": str(e)}
            
    with open("search_tool_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    asyncio.run(test_search())
