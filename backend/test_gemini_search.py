import asyncio
import os
from dotenv import load_dotenv

load_dotenv("c:/Users/lenovo/Desktop/JOURNEY/GITHUB/VIBEWRITE/backend/.env")

async def test_search():
    try:
        from google import genai
        from google.genai import types
        client = genai.Client()
        response = client.models.generate_content(
            model='gemini-3.6-flash',
            contents='What is the latest OpenAI model released?',
            config=types.GenerateContentConfig(
                tools=[{"google_search": {}}]
            )
        )
        print("Search response:")
        print(response.text)
        
        # Check if grounding chunks are present
        if hasattr(response, 'candidates') and response.candidates:
            cand = response.candidates[0]
            if hasattr(cand, 'grounding_metadata') and cand.grounding_metadata:
                print("Grounding chunks found!")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test_search())
