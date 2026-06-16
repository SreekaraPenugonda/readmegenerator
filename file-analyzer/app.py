from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import requests

app = FastAPI()

# Enable CORS for all origins (React frontend on port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "The Python server is alive and listening!"}

# Dynamic GitHub Public Repository Parser
@app.get("/scan-github")
def scan_github_repo(repo_url: str = Query(..., description="The full GitHub URL")):
    try:
        parts = repo_url.replace("https://github.com/", "").strip("/").split("/")
        if len(parts) < 2:
            return {"status": "error", "message": "Invalid GitHub URL layout."}
        
        owner, repo = parts[0], parts[1]
        
        # Fetch the repository's default branch profile to get its file tree index
        api_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/main?recursive=1"
        
        headers = {"Accept": "application/vnd.github.v3+json"}
        response = requests.get(api_url, headers=headers)
        
        if response.status_code != 200:
            # Fallback if the default branch is named 'master' instead of 'main'
            api_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/master?recursive=1"
            response = requests.get(api_url, headers=headers)
            
        if response.status_code != 200:
            return {"status": "error", "message": f"GitHub API error. Code: {response.status_code}"}
        
        raw_tree = response.json().get("tree", [])
        
        ignored_paths = { 'node_modules', '.git', 'dist', '__pycache__', 'venv', '.env' }
        clean_files = []
        
        for item in raw_tree:
            if item["type"] == "blob":
                path_elements = item["path"].split("/")
                if not any(elem in ignored_paths for elem in path_elements):
                    clean_files.append(item["path"])
                    
        return {
            "status": "success",
            "repository": f"{owner}/{repo}",
            "total_files_found": len(clean_files),
            "files": clean_files
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}