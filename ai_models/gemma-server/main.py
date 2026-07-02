from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import os
import requests
from dotenv import load_dotenv
import sys

# Load .env from project root (two levels up)
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
load_dotenv(os.path.join(project_root, ".env"))

app = FastAPI(title="Gemma Local Server (Hybrid)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)  

# Configuration
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
MODEL_NAME = os.getenv("GEMMA_MODEL", "gemma2:2b")
MODEL_PATH = os.getenv("GEMMA_MODEL_PATH", os.path.join(project_root, "ai_models", "models"))
MODEL_FILENAME = os.getenv("GEMMA_MODEL_FILENAME", "gemma-2b-it.Q4_K_M.gguf")
FULL_MODEL_PATH = os.path.join(MODEL_PATH, MODEL_FILENAME)

# Use Gemini API key if available (same as backend)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", GEMINI_API_KEY)
OPENAI_API_BASE = os.getenv("GEMINI_API_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/")
OPENAI_MODEL = os.getenv("GEMMA_MODEL", "gemini-2.0-flash")

# Try to load llama-cpp-python
llama = None
try:
    from llama_cpp import Llama
    if os.path.exists(FULL_MODEL_PATH):
        print(f"[MODEL] Loading {FULL_MODEL_PATH}...")
        llama = Llama(
            model_path=FULL_MODEL_PATH,
            n_ctx=4096,
            n_threads=8,
            n_gpu_layers=0,
            verbose=False
        )
        print("[MODEL] Loaded successfully!")
except Exception as e:
    print(f"[MODEL] llama-cpp-python not available: {e}")
    llama = None

class GenerateRequest(BaseModel):
    prompt: str
    history: List[Dict[str, Any]] = []
    max_tokens: int = 512
    temperature: float = 0.7

class GenerateResponse(BaseModel):
    response: str

def build_prompt(prompt: str, history: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    messages = [{"role": "system", "content": "You are Gemma, a helpful and educational AI assistant!"}]
    for msg in history:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": prompt})
    return messages

@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    try:
        # First try llama-cpp-python if loaded
        if llama:
            try:
                print(f"[GENERATE] Using llama-cpp-python: {FULL_MODEL_PATH}")
                messages = build_prompt(req.prompt, req.history)
                # Build prompt for Gemma
                prompt_text = ""
                for msg in messages:
                    if msg["role"] == "user":
                        prompt_text += f"<start_of_turn>user\n{msg['content']}<end_of_turn>\n<start_of_turn>model\n"
                    elif msg["role"] == "assistant":
                        prompt_text += f"{msg['content']}<end_of_turn>\n"
                    elif msg["role"] == "system":
                        prompt_text += f"<start_of_turn>system\n{msg['content']}<end_of_turn>\n"
                output = llama(
                    prompt=prompt_text,
                    max_tokens=req.max_tokens,
                    temperature=req.temperature,
                    stop=["<end_of_turn>"],
                    echo=False
                )
                return GenerateResponse(response=output["choices"][0]["text"].strip())
            except Exception as e:
                print(f"[llama Error] {e}")

        # Then try Ollama (if installed and running)
        try:
            messages = build_prompt(req.prompt, req.history)
            response = requests.post(
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model": MODEL_NAME,
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "num_predict": req.max_tokens,
                        "temperature": req.temperature
                    }
                },
                timeout=60
            )
            if response.status_code == 200:
                data = response.json()
                print(f"[GENERATE] Using Ollama: {MODEL_NAME}")
                return GenerateResponse(response=data["message"]["content"])
        except Exception as e:
            print(f"[Ollama Error] {e}")

        # Then try Gemini/OpenAI API
        if OPENAI_API_KEY:
            try:
                import openai
                print(f"[GENERATE] Using Gemini API: {OPENAI_MODEL}")
                client = openai.OpenAI(
                    api_key=OPENAI_API_KEY,
                    base_url=OPENAI_API_BASE
                )
                messages = build_prompt(req.prompt, req.history)
                openai_response = client.chat.completions.create(
                    model=OPENAI_MODEL,
                    messages=messages,
                    max_tokens=req.max_tokens,
                    temperature=req.temperature
                )
                return GenerateResponse(response=openai_response.choices[0].message.content)
            except Exception as e:
                print(f"[API Error] {e}")

        # Fallback to demo
        prompt_lower = req.prompt.lower().strip()
        if "hi" in prompt_lower or "hello" in prompt_lower or "hey" in prompt_lower:
            return GenerateResponse(response="Hi there! I'm Gemma! How can I help you learn something new today?")
        elif "who are you" in prompt_lower:
            return GenerateResponse(response="I'm Gemma, your educational AI assistant! I specialize in clear, simple explanations!")
        else:
            return GenerateResponse(response=f"Thanks for your question! To get better responses, install Ollama or set an API key.")

    except Exception as e:
        print(f"[ERROR] {e}")
        return GenerateResponse(response=f"Sorry, I encountered an error: {str(e)}")

@app.get("/health")
def health():
    mode = "UNKNOWN"
    if llama:
        mode = "LLAMA"
    else:
        try:
            response = requests.get(f"{OLLAMA_URL}/api/tags", timeout=2)
            mode = "OLLAMA" if response.status_code == 200 else ("API" if OPENAI_API_KEY else "DEMO")
        except:
            mode = "API" if OPENAI_API_KEY else "DEMO"

    model_name = f"Gemma ({mode})"
    return {
        "status": "ok",
        "mode": mode,
        "model": model_name
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
