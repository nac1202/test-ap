import os
import sys
import argparse
import hashlib
import json
import shutil
import tempfile
from datetime import datetime, timezone

try:
    from huggingface_hub import snapshot_download, hf_hub_download
except ImportError:
    print("Error: huggingface_hub is not installed. Please install it with 'pip install huggingface_hub'.")
    sys.exit(1)

# Fixed configurations
MODEL_ID = "intfloat/multilingual-e5-small"
# Fixed revision (commit hash) to prevent arbitrary updates and ensure reproducibility
REVISION = "614241f622f53c4eeff9890bdc4f31cfecc418b3"

def get_model_root():
    root_dir = os.environ.get("EMBEDDING_MODEL_ROOT", "data/models")
    if not os.path.isabs(root_dir):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        root_dir = os.path.join(base_dir, root_dir)
    return os.path.abspath(root_dir)

def calculate_sha256(filepath):
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        # Read and update hash string value in blocks of 4K
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def main():
    parser = argparse.ArgumentParser(description="Admin setup script for downloading real E5 embedding model.")
    parser.add_argument("--confirm", action="store_true", help="Acknowledge the external connection and proceed with download")
    parser.add_argument("--force", action="store_true", help="Overwrite existing model directory if it exists")
    
    args = parser.parse_args()
    
    print("=== Admin Model Setup Script ===")
    print(f"Model ID: {MODEL_ID}")
    print(f"Revision: {REVISION}")
    
    root_dir = get_model_root()
    target_dir = os.path.join(root_dir, MODEL_ID.replace("/", "--"))
    print(f"Target Directory: {target_dir}")
    
    if os.path.exists(target_dir):
        if not args.force:
            print("Error: Model directory already exists. Use --force to overwrite.")
            sys.exit(1)
        else:
            print("Warning: Model directory will be overwritten.")
            
    if not args.confirm:
        print("\nNote: This script will connect to huggingface.co to download model files.")
        print("This is an explicit admin operation. To proceed, run this script with --confirm.")
        sys.exit(0)
        
    print("\nConnecting to Hugging Face Hub...")
    # We download to a temporary directory first
    temp_dir = tempfile.mkdtemp(prefix="model_setup_")
    try:
        # snapshot_download gets all files in the repo at the specified revision
        # We ignore .git or large unnecessary files if any, but snapshot is fine for models.
        downloaded_path = snapshot_download(
            repo_id=MODEL_ID,
            revision=REVISION,
            cache_dir=temp_dir,
            local_dir=temp_dir, # Force download directly to temp_dir, ignoring symlinks cache
            local_files_only=False
        )
        
        print("\nDownload complete. Calculating hashes and building manifest...")
        manifest = {
            "model_id": MODEL_ID,
            "revision": REVISION,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "files": {}
        }
        
        # Calculate hashes for all files
        # Also compute a cumulative manifest hash
        cumulative_hash = hashlib.sha256()
        
        for root, _, files in os.walk(downloaded_path):
            for file in sorted(files):
                if file == "manifest.json": continue
                filepath = os.path.join(root, file)
                rel_path = os.path.relpath(filepath, downloaded_path)
                
                # Ignore git files if any
                if ".git" in rel_path: continue
                
                f_size = os.path.getsize(filepath)
                f_hash = calculate_sha256(filepath)
                
                manifest["files"][rel_path] = {
                    "size": f_size,
                    "sha256": f_hash
                }
                
                cumulative_hash.update(rel_path.encode('utf-8'))
                cumulative_hash.update(f_hash.encode('utf-8'))
                
        manifest["manifest_hash"] = cumulative_hash.hexdigest()
        
        # Write manifest
        manifest_path = os.path.join(downloaded_path, "manifest.json")
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
            
        # Move to target dir
        if os.path.exists(target_dir):
            shutil.rmtree(target_dir)
            
        os.makedirs(root_dir, exist_ok=True)
        shutil.move(downloaded_path, target_dir)
        
        print("\n=== Setup Complete ===")
        print(f"Placed model successfully at: {target_dir}")
        print(f"Manifest Hash: {manifest['manifest_hash']}")
        
        # Extract license if possible
        license_file = None
        for file in manifest["files"].keys():
            if "license" in file.lower():
                license_file = file
                break
                
        if license_file:
            print(f"Found License file: {license_file}")
            print(f"Please review {os.path.join(target_dir, license_file)} for commercial usage terms.")
        else:
            print("License file not found in repository. Please check model card manually.")
            
    except Exception as e:
        print(f"\nError during setup: {e}")
        sys.exit(1)
    finally:
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

if __name__ == "__main__":
    main()
