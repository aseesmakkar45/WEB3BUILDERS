import os
import logging
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

async def transcribe_voice_payload(audio_bytes: bytes, content_type: str = "audio/webm") -> str:
    """
    Uses Google GenAI (Gemini 1.5 Flash) to transcribe audio.
    This avoids all Hugging Face network blocks and provides lightning-fast STT.
    """
    import asyncio
    
    def _sync_transcribe():
        try:
            client = genai.Client(
                api_key=os.environ.get("GEMINI_API_KEY"),
                http_options={'api_version': 'v1alpha'}
            )
            
            # Gemini natively supports audio/webm, audio/mp3, audio/wav
            response = client.models.generate_content(
                model='gemini-flash-latest',
                contents=[
                    types.Part.from_bytes(data=audio_bytes, mime_type=content_type),
                    "Transcribe the following audio accurately. Output strictly the transcribed text and nothing else."
                ]
            )
            return response.text.strip()
        except Exception as e:
            logger.error(f"Failed to transcribe audio via Google GenAI: {e}")
            return f"Error: Transcription failed ({str(e)})"
            
    return await asyncio.to_thread(_sync_transcribe)
