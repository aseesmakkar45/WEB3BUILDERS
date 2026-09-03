import sys
sys.path = [p for p in sys.path if "AppData\\Roaming" not in p]

import os
import asyncio
import logging
from typing import TypedDict, List, Optional
from dotenv import load_dotenv
from pathlib import Path

import chromadb
import chromadb.utils.embedding_functions as embedding_functions

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from swytchcode_runtime import Swytchcode

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

SERVICE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SERVICE_DIR.parent
ENV_PATH = BACKEND_DIR / ".env"
load_dotenv(str(ENV_PATH))

swy = Swytchcode()

from functools import lru_cache

@lru_cache(maxsize=1)
def get_chroma_collections():
    logger.info("📦 Initializing ChromaDB for Timeline Persona...")
    CHROMA_PERSIST_DIR = BACKEND_DIR / "chroma_db"
    chroma_client = chromadb.PersistentClient(path=str(CHROMA_PERSIST_DIR))
    emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="BAAI/bge-base-en-v1.5")
    
    tweets_collection = chroma_client.get_or_create_collection("elon_tweets", embedding_function=emb_fn)
    return tweets_collection

class AgentState(TypedDict, total=False):
    chat_id: str
    messages: List[dict]
    current_query: str
    optimized_query: str
    retrieved_context: str
    external_context: str
    style_context: str
    response_mode: dict
    vibe_mode: str
    diagnostics: dict

def _classify_intent(query: str) -> dict:
    query_lower = query.lower()
    tech_keywords = ["how", "why", "explain", "what is", "physics", "code", "engineer", "build", "design", "architecture", "algorithm", "tech"]
    
    conversational_questions = ["what's up", "how are you", "how's it going", "what are you doing"]
    
    if any(q in query_lower for q in conversational_questions):
        return {
            "mode": "CASUAL_CONVERSATION",
            "style_profile": "conversational, authentic, relaxed rhythm",
            "desired_length": "short"
        }
    elif len(query.split()) < 8 and "?" not in query and not any(k in query_lower for k in tech_keywords):
        return {
            "mode": "SHORT_REACTION",
            "style_profile": "concise, punchy, minimal framing, high use of emojis if appropriate",
            "desired_length": "very_short"
        }
    elif any(kw in query_lower for kw in tech_keywords):
        return {
            "mode": "TECHNICAL_EXPLANATION",
            "style_profile": "analytical, first-principles reasoning, structured, technical vocabulary",
            "desired_length": "medium"
        }
    elif "joke" in query_lower or "funny" in query_lower or "meme" in query_lower or "laugh" in query_lower:
        return {
            "mode": "HUMOR",
            "style_profile": "dry wit, meme references, ironic tone",
            "desired_length": "short"
        }
    elif "?" in query:
        return {
            "mode": "FACTUAL_ANSWER",
            "style_profile": "direct, informative, minimal fluff",
            "desired_length": "medium"
        }
    else:
        return {
            "mode": "CASUAL_CONVERSATION",
            "style_profile": "conversational, authentic, relaxed rhythm",
            "desired_length": "short"
        }

async def _node_classify_intent(state: AgentState) -> AgentState:
    query = state.get("current_query", "")
    mode_dict = _classify_intent(query)
    logger.info(f"🧠 Intent Classified: {mode_dict['mode']}")
    state["response_mode"] = mode_dict
    return state

async def _node_retrieve(state: AgentState) -> AgentState:
    query = state["current_query"]
    logger.info(f"🔍 Retrieving timeline context for query: '{query}'")
    
    tweets_collection = get_chroma_collections()
    
    section_results = await asyncio.to_thread(
        tweets_collection.query,
        query_texts=[query],
        n_results=10
    )
    
    context_str = ""
    diagnostics = {"total_retrieved": 0, "total_unique": 0}
    
    if section_results['documents'] and section_results['documents'][0]:
        raw_chunks = section_results['documents'][0]
        metadatas = section_results['metadatas'][0]
        distances = section_results.get('distances', [[999.0]])[0]
        
        diagnostics["total_retrieved"] = len(raw_chunks)
        diagnostics["total_unique"] = len(raw_chunks)
        
        top_distance = distances[0] if distances else 999.0
        
        import re
        query_lower = query.lower()
        mode_name = state.get("response_mode", {}).get("mode", "CASUAL_CONVERSATION")
        is_conversational = mode_name in ["SHORT_REACTION", "CASUAL_CONVERSATION", "HUMOR"]
        has_current_signals = bool(re.search(r'\b(latest|new|news|yesterday|today|recent|current|this week|announcement)\b', query_lower))
        
        if is_conversational:
            knowledge_confidence = "LOW" if top_distance > 0.28 else "HIGH"
        else:
            knowledge_confidence = "LOW" if (top_distance > 0.22 or has_current_signals) else "HIGH"
            
        diagnostics["knowledge_confidence"] = knowledge_confidence
        diagnostics["top_distance"] = top_distance
        
        for idx, chunk in enumerate(raw_chunks):
            likes = metadatas[idx].get("likes", 0)
            date = metadatas[idx].get("createdAt", "Unknown")
            context_str += f"\n--- [Tweet Date: {date} | Likes: {likes}] ---\n{chunk}\n"
            
    if not context_str.strip():
        context_str = "No specific past tweets match this exact query."
        diagnostics["knowledge_confidence"] = "LOW"
        
    state["retrieved_context"] = context_str
    state["diagnostics"] = diagnostics
    return state

async def _node_retrieve_style(state: AgentState) -> AgentState:
    vibe_mode_str = state.get("vibe_mode", "x_mode").replace("_", " ")
    mode_dict = state.get("response_mode", {})
    response_mode_name = mode_dict.get("mode", "CASUAL_CONVERSATION")
    
    if response_mode_name in ["SHORT_REACTION", "CASUAL_CONVERSATION", "HUMOR"]:
        query_text = f"{vibe_mode_str} {response_mode_name} {mode_dict.get('style_profile', '')}"
        where_filter = {"is_reply": True}
    else:
        query_text = f"{state.get('current_query', '')} {vibe_mode_str} {response_mode_name}"
        where_filter = None
    
    logger.info(f"🔍 Retrieving style context for query/vibe: '{query_text}'")
    tweets_collection = get_chroma_collections()
    
    section_results = await asyncio.to_thread(
        tweets_collection.query,
        query_texts=[query_text],
        n_results=5,
        where=where_filter
    )
    
    style_str = ""
    if section_results['documents'] and section_results['documents'][0]:
        raw_chunks = section_results['documents'][0]
        for chunk in raw_chunks:
            style_str += f"- {chunk}\n"
            
    if not style_str.strip():
        style_str = "No specific style examples found."
        
    state["style_context"] = style_str
    return state

async def _node_external_search(state: AgentState) -> AgentState:
    confidence = state.get("diagnostics", {}).get("knowledge_confidence", "HIGH")
    if confidence == "HIGH":
        state["external_context"] = ""
        state["diagnostics"]["external_search_triggered"] = False
        return state
        
    query = state.get("current_query", "")
    
    # Deterministic query rewriting
    import re
    objective = query.lower()
    objective = re.sub(r'\b(what do you think about|what are your thoughts on|can you explain|tell me about|what is|who is|the|latest|new)\b', '', objective)
    objective = re.sub(r'[?!]', '', objective)
    search_query = " ".join(objective.split()).strip()
    if not search_query:
        search_query = query
        
    logger.info(f"🌐 Knowledge confidence LOW. Triggering factual search for objective: '{search_query}'")
    
    state["diagnostics"]["external_search_triggered"] = True
    state["diagnostics"]["search_query"] = search_query
    
    try:
        import urllib.request
        import urllib.parse
        import re
        
        url = "https://lite.duckduckgo.com/lite/"
        data = urllib.parse.urlencode({'q': search_query}).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        html = await asyncio.to_thread(lambda: urllib.request.urlopen(req).read().decode('utf-8'))
        
        snippets = re.findall(r'<td class=\'result-snippet\'[^>]*>(.*?)</td>', html, flags=re.IGNORECASE|re.DOTALL)
        clean = []
        for s in snippets:
            text = re.sub(r'<[^>]+>', '', s).strip()
            if text:
                clean.append(text)
        
        results = clean[:3]
        if results:
            external_ctx = "\n".join([f"- {r}" for r in results])
            result_count = len(results)
        else:
            external_ctx = ""
            result_count = 0
            
        state["external_context"] = external_ctx
        state["diagnostics"]["external_result_count"] = result_count
        state["diagnostics"]["external_search_success"] = True
    except Exception as e:
        logger.warning(f"⚠️ Factual search failed: {e}. Degrading gracefully.")
        state["external_context"] = ""
        state["diagnostics"]["external_search_success"] = False
        state["diagnostics"]["external_result_count"] = 0
        
    return state

workflow = StateGraph(AgentState)
workflow.add_node("classify", _node_classify_intent)
workflow.add_node("retrieve", _node_retrieve)
workflow.add_node("external_search", _node_external_search)
workflow.add_node("retrieve_style", _node_retrieve_style)
workflow.add_edge(START, "classify")
workflow.add_edge("classify", "retrieve")
workflow.add_edge("retrieve", "external_search")
workflow.add_edge("external_search", "retrieve_style")
workflow.add_edge("retrieve_style", END)

memory = MemorySaver()
rag_app = workflow.compile(checkpointer=memory)

MODEL_ROUTER = {
    "Gemma 4 26B MoE": "gemma-4-26b-a4b-it",
    "Gemma 4 31B Dense": "gemma-4-31b-it"
}

BASE_PERSONA_PROMPT = """You are an authentic AI digital twin of Elon Musk.

=========================================
RESPONSE MODE
=========================================
Mode: {response_mode}
Style Profile: {style_profile}

=========================================
DATASET KNOWLEDGE (FACTS)
=========================================
{context}

=========================================
EXTERNAL FACTUAL CONTEXT
=========================================
{external_context}

=========================================
STYLE & CONVERSATIONAL EXEMPLARS
=========================================
Observe how Elon actually communicates in similar conversational modes:
{style_context}

=========================================
GENERATION RULES & SAFETY DIRECTIVE
=========================================
- Match communication behavior, not merely vocabulary.
- Adapt response length strictly to the demonstrated behavior (Desired length: {desired_length}).
  * very_short: 1-2 short sentences maximum.
  * short: 2-3 sentences.
  * medium: 1-2 paragraphs.
- Do not blindly repeat phrases or copy exemplar wording unless naturally appropriate.
- Preserve conversational rhythm and characteristic directness. Do not turn every answer into an essay.
- Do not overuse emojis. Use them sparingly and only if they naturally fit the context.
- Avoid turning the persona into a caricature. Do not force catchphrases unless contextually appropriate.
- Match his authentic voice: direct, sometimes dry, occasionally playful, but rarely exaggerated.
- Use the EXTERNAL FACTUAL CONTEXT as pure facts. Do not attribute these external facts to your past statements or memories.
- Do not claim you previously said the external facts.
- Use the demonstrated style to formulate a plausible response incorporating the facts.
- If the user asks about an unseen topic not present in the KNOWLEDGE section, DO NOT hallucinate facts or product launches.
- Instead, extrapolate conversational behavior, not unsupported personal history. Provide a principled opinion rather than a fake fact.

{vibe_instruction}
"""

VIBE_INSTRUCTIONS = {
    "x_mode": """[CURRENT VIBE MODE: 🔥 X Mode (Punchy & Direct)]
Style directive: Respond in the authentic style of an X (Twitter) reply or short post. Be concise, witty, punchy, and direct. Use short sentences, occasional dry humor or exclamation points, and dive right to the point without filler.""",
    
    "first_principles": """[CURRENT VIBE MODE: 🚀 First Principles (Hardcore Engineering)]
Style directive: Break down the question into fundamental physical, engineering, and economic limits. Talk in terms of raw materials, energy per unit, thermodynamics, manufacturing constraints, and the 5-step algorithm. Be analytical, rigorous, and deeply technical.""",
    
    "visionary": """[CURRENT VIBE MODE: 🌌 Visionary (Civilizational & Multiverse)]
Style directive: Expand the question into the grand civilizational scale. Connect it to the future of consciousness, multi-planetary survival, AI alignment, the Fermi paradox, Kardashev energy scales, or simulation theory. Thoughtful, visionary, with philosophical depth."""
}

def estimate_tokens(text: str) -> int:
    return int(len(text.split()) * 1.3)

async def generate_rag_stream(
    prompt: str, 
    chat_id: str, 
    attached_docs: str = "", 
    model_requested: str = None,
    vibe_mode: str = "x_mode"
):
    logger.info(f"🔗 Initiating PersonaTwin RAG pipeline for Chat: {chat_id} (Vibe: {vibe_mode})")
    
    target_model = MODEL_ROUTER.get(model_requested, "gemma-4-26b-a4b-it")
    vibe_directive = VIBE_INSTRUCTIONS.get(vibe_mode, VIBE_INSTRUCTIONS["x_mode"])
    
    try:
        config = {"configurable": {"thread_id": chat_id}}
        current_state = rag_app.get_state(config)
        
        if not current_state.values:
            state_input = {
                "chat_id": chat_id,
                "messages": [],
                "current_query": prompt,
                "optimized_query": "",
                "retrieved_context": "",
                "external_context": "",
                "style_context": "",
                "response_mode": {},
                "vibe_mode": vibe_mode,
                "diagnostics": {}
            }
        else:
            state_input = current_state.values
            state_input["current_query"] = prompt
            state_input["vibe_mode"] = vibe_mode
            
        final_state = await rag_app.ainvoke(state_input, config)
        context = final_state.get("retrieved_context", "")
        style_ctx = final_state.get("style_context", "")
        mode_dict = final_state.get("response_mode", {})
        
        formatted_sys_prompt = (
            BASE_PERSONA_PROMPT
            .replace("{response_mode}", mode_dict.get("mode", "UNKNOWN"))
            .replace("{style_profile}", mode_dict.get("style_profile", "default"))
            .replace("{desired_length}", mode_dict.get("desired_length", "default"))
            .replace("{context}", context)
            .replace("{external_context}", final_state.get("external_context", "None needed."))
            .replace("{style_context}", style_ctx)
            .replace("{vibe_instruction}", vibe_directive)
        )
        
        if attached_docs.strip():
            formatted_sys_prompt += f"\n\n[USER ATTACHED DOCUMENTS]:\n{attached_docs}\n(Analyze this document through Elon's first-principles lens)\n"
        
        final_state["messages"].append({"role": "user", "parts": [{"text": prompt}]})
        if len(final_state["messages"]) > 10:
            final_state["messages"] = final_state["messages"][-10:]
            
        logger.info(f"⚡ Requesting API execution (Model: {target_model}, Vibe: {vibe_mode})...")
        
        conversation_history = formatted_sys_prompt + "\n\nChat History:\n"
        for msg in final_state["messages"]:
            conversation_history += f"{msg['role'].capitalize()}: {msg['parts'][0]['text']}\n"
        
        try:
            import swytchcode_runtime.exec as swy_exec
            result = await asyncio.to_thread(
                swy_exec, 
                "google.gemini.generateContent", 
                {"prompt": conversation_history, "model": target_model}
            )
            candidate_response = result.get("text", "Swytchcode executed successfully, but returned no text.")
        except Exception as swy_err:
            logger.warning(f"Swytchcode execution fallback to direct SDK: {swy_err}")
            from google import genai
            genai_client = genai.Client()
            response = await genai_client.aio.models.generate_content(
                model=target_model,
                contents=conversation_history
            )
            candidate_response = response.text
            
        # PERSONA CRITIC STAGE
        logger.info("🧐 Running Persona Critic...")
        
        # Load genai client if not already loaded by fallback
        try:
            from google import genai
            critic_client = genai.Client()
            critic_available = True
        except Exception:
            critic_available = False
            
        if critic_available:
            critic_prompt = f"""Evaluate this candidate response for an Elon Musk persona digital twin.
User Query: {prompt}
Response Mode: {mode_dict.get('mode')}
Candidate Response: {candidate_response}

Evaluate based on:
1. Tone consistency (is it authentic, or does it sound like a forced caricature?)
2. Length consistency (does it strictly match '{mode_dict.get('desired_length')}' length limits?)
3. False attribution (does it hallucinate personal history or state external facts as personal memory?)
4. Over-caricature (is it too forced with memes, excessive emojis, or repetitive catchphrases?)

Respond ONLY with a valid JSON object matching this schema:
{{
  "score": 0.0 to 1.0 (float),
  "pass": true if score >= 0.7 else false,
  "issues": ["list of issues"],
  "revision_instructions": "string or null"
}}"""
            try:
                critic_response = await critic_client.aio.models.generate_content(
                    model="gemini-3.6-flash",
                    contents=critic_prompt
                )
                import json
                import re
                critic_text = critic_response.text
                json_match = re.search(r'\{.*\}', critic_text, re.DOTALL)
                if json_match:
                    critic_result = json.loads(json_match.group(0))
                else:
                    critic_result = {"pass": True, "score": 1.0}
                    
                logger.info(f"Critic Score: {critic_result.get('score')} - Pass: {critic_result.get('pass')}")
                final_state.setdefault("diagnostics", {})["critic_score"] = critic_result.get("score")
                final_state["diagnostics"]["revision_performed"] = not critic_result.get("pass", True)
                
                if not critic_result.get("pass", True):
                    logger.info("♻️ Revising response based on critic feedback...")
                    revision_prompt = f"""Rewrite this response to fix these stylistic issues: {critic_result.get('issues')}
Instructions: {critic_result.get('revision_instructions')}
Keep it true to Elon Musk's demonstrated conversational rhythm.

Original Response: {candidate_response}

Return ONLY the new revised response text."""
                    revised = await critic_client.aio.models.generate_content(
                        model=target_model,
                        contents=revision_prompt
                    )
                    full_response = revised.text
                else:
                    full_response = candidate_response
            except Exception as critic_err:
                logger.error(f"Critic failed, falling back to candidate: {critic_err}")
                full_response = candidate_response
        else:
            full_response = candidate_response
            
        chunk_size = 40
        for i in range(0, len(full_response), chunk_size):
            chunk = full_response[i:i+chunk_size]
            lines = chunk.split('\n')
            sse_payload = "".join(f"data: {line}\n" for line in lines) + "\n"
            yield sse_payload
            await asyncio.sleep(0.03)
            
        final_state["messages"].append({"role": "model", "parts": [{"text": full_response}]})
        rag_app.update_state(config, final_state)
        
        yield "data: [DONE]\n\n"
        logger.info("✅ Inference Stream Completed.")
        
    except Exception as e:
        logger.error(f"❌ Error in PersonaTwin Pipeline: {str(e)}")
        yield f"data: An error occurred during generation: {str(e)}\n\n"
        yield "data: [DONE]\n\n"
