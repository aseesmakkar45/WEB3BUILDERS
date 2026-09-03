from fastapi import APIRouter, Form, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from typing import List, Optional
import logging

from services.rag_engine import generate_rag_stream
from services.audio_engine import transcribe_voice_payload

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/stream")
async def chat_stream(
    prompt: Optional[str] = Form(None, alias="text"),
    activeChatId: str = Form(..., alias="chatId"),
    model_requested: Optional[str] = Form(None),
    vibe_mode: Optional[str] = Form("x_mode"),
    files: Optional[List[UploadFile]] = File(None)
):
    """
    Endpoint for streaming the PersonaTwin RAG response.
    Accepts multipart/form-data from the React client.
    Delegates the heavy lifting to the isolated RAG & Persona engine service.
    
    Note: The async generator pattern intrinsically handles 
    asyncio.CancelledError from the ASGI server when the client 
    (React AbortController) disconnects, terminating LLM inference automatically.
    """
    
    # Initialize prompt safely to avoid TypeErrors
    if prompt is None:
        prompt = ""
        
    # Safety Validation Fallback
    if not prompt.strip() and not files:
        raise HTTPException(status_code=400, detail="Missing both text prompt and audio payload.")
        
    # Extract file byte streams
    attached_documents = ""
    
    if files:
        for f in files:
            content = await f.read()
            # Check if this is a voice recording
            if f.content_type.startswith('audio') or f.filename.endswith(('.webm', '.wav', '.mp3', '.ogg')):
                logger.info(f"🎙️ Intercepted Voice Query Payload: {f.filename} ({len(content)} bytes)")
                try:
                    transcription = await transcribe_voice_payload(content, f.content_type or 'audio/webm')
                    if transcription.startswith("Error:"):
                        raise Exception(transcription)
                        
                    logger.info(f"[Audio Pipeline] Successfully converted voice query to text: {transcription}")
                    
                    # Merge logic: if there's typed text, append the voice query. Otherwise, replace it.
                    if prompt.strip() and prompt.strip() != "New Message":
                        prompt = f"{prompt}\n[Transcribed Voice]: {transcription}"
                    else:
                        prompt = transcription
                        
                except Exception as e:
                    error_msg = str(e)
                    logger.error(f"Voice Transcription Failed: {error_msg}")
                    # Yielding an error back directly using a mock generator
                    async def error_stream():
                        yield f"data: ⚠️ Error transcribing your audio file: {error_msg}\n\n"
                        yield "data: [DONE]\n\n"
                    return StreamingResponse(error_stream(), media_type="text/event-stream")
            else:
                # Store non-audio files and extract text for document-based context
                try:
                    extracted_text = ""
                    if f.filename.endswith('.pdf'):
                        import fitz
                        doc = fitz.open(stream=content, filetype="pdf")
                        for page in doc:
                            extracted_text += page.get_text("text") + "\n"
                    elif f.filename.lower().endswith(('.txt', '.md', '.csv', '.json', '.html', '.xml')):
                        extracted_text = content.decode('utf-8', errors='ignore')
                    else:
                        extracted_text = f"[ATTACHED FILE: {f.filename}]"
                        
                    if extracted_text.strip():
                        logger.info(f"📄 Successfully extracted text from document: {f.filename}")
                        attached_documents += f"\n\n[Attached Document: {f.filename}]\n{extracted_text}"
                except Exception as e:
                    logger.error(f"Failed to read attached file {f.filename}: {e}")
                    
    # Return the Server-Sent Events stream from the intelligence boundary
    return StreamingResponse(
        generate_rag_stream(
            prompt=prompt, 
            chat_id=activeChatId, 
            attached_docs=attached_documents, 
            model_requested=model_requested,
            vibe_mode=vibe_mode or "x_mode"
        ),
        media_type="text/event-stream"
    )
