import argparse
import sys
import httpx
import json
import logging
from pprint import pprint

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

OLLAMA_API_BASE = "http://127.0.0.1:11434/api"

def check_ollama():
    try:
        resp = httpx.get(f"{OLLAMA_API_BASE}/tags", timeout=5.0)
        resp.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"Ollama is not running or accessible: {e}")
        return False

def pull_model(model_name: str):
    logger.info(f"Downloading model '{model_name}'. This may take a while...")
    try:
        with httpx.stream("POST", f"{OLLAMA_API_BASE}/pull", json={"name": model_name}, timeout=300.0) as resp:
            resp.raise_for_status()
            for line in resp.iter_lines():
                if line:
                    data = json.loads(line)
                    status = data.get("status", "")
                    if "total" in data and "completed" in data:
                        completed_mb = data['completed'] / (1024*1024)
                        total_mb = data['total'] / (1024*1024)
                        print(f"\r{status}: {completed_mb:.1f}MB / {total_mb:.1f}MB", end="", flush=True)
                    else:
                        print(f"\r{status}".ljust(50), end="", flush=True)
        print("\nDownload complete.")
        return True
    except Exception as e:
        logger.error(f"\nFailed to pull model: {e}")
        return False

def print_model_info(model_name: str):
    try:
        resp = httpx.get(f"{OLLAMA_API_BASE}/tags", timeout=5.0)
        resp.raise_for_status()
        data = resp.json()
        models = data.get("models", [])
        
        for m in models:
            if m["name"] == model_name:
                logger.info(f"\n--- Model Metadata for {model_name} ---")
                details = m.get("details", {})
                size_gb = m.get("size", 0) / (1024**3)
                logger.info(f"Digest: {m.get('digest')}")
                logger.info(f"Size: {size_gb:.2f} GB")
                logger.info(f"Parameter Size: {details.get('parameter_size')}")
                logger.info(f"Quantization: {details.get('quantization_level')}")
                return
        logger.warning(f"Metadata for model '{model_name}' not found.")
    except Exception as e:
        logger.error(f"Failed to fetch model metadata: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ollama Model Setup Script")
    parser.add_argument("--model", type=str, default="qwen2.5:0.5b-instruct", help="Name of the model to pull")
    parser.add_argument("--yes", action="store_true", help="Skip confirmation prompt")
    args = parser.parse_args()

    logger.info("=== Ollama Model Setup ===")
    
    if not check_ollama():
        sys.exit(1)
        
    logger.info(f"Target model: {args.model}")
    
    if not args.yes:
        confirm = input(f"Do you want to pull the model '{args.model}'? (y/N): ")
        if confirm.lower() != 'y':
            logger.info("Operation cancelled by user.")
            sys.exit(0)
            
    if pull_model(args.model):
        print_model_info(args.model)
        logger.info("Model setup successful. You can now run the RAG demo with this model.")
    else:
        sys.exit(1)
