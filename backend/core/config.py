try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings

from typing import Optional
from pathlib import Path

CORE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CORE_DIR.parent
ENV_PATH = BACKEND_DIR / ".env"

class Settings(BaseSettings):
    """
    Core Configuration Settings
    This allows the team to manage environment variables for the RAG pipeline.
    """
    APP_NAME: str = "PersonaTwin.AI API Gateway"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql://user:pass@localhost:5432/legalai"
    
    # ChromaDB
    CHROMA_PERSIST_DIR: str = str(BACKEND_DIR / "chroma_db")
    
    # Models
    MODEL_PATH: str = "google/gemma-4-it"
    
    # API Keys (Loaded from .env)
    COHERE_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    VLLM_BASE_URL: Optional[str] = None

    class Config:
        env_file = str(ENV_PATH)
        env_file_encoding = 'utf-8'
        extra = "ignore" # Safely ignore any other arbitrary env variables

settings = Settings()
