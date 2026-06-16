from fastapi import FastAPI
import os

app = FastAPI()

@app.get("/")
def home():
    return {"message": "The Python server is alive and listening!"}

# NEW ROUTE: This reads files inside a folder on your computer
@app.get("/scan")
def scan_folder():
    # We want to scan the entire project folder, so we step out one level up
    target_path = "../"
    
    # Folders we want to skip completely
    ignored_folders = { 'node_modules', '.git', 'dist', '__pycache__', 'venv' }
    
    clean_file_list = []
    
    try:
        # os.walk travels deep inside all folders automatically
        for root, dirs, files in os.walk(target_path):
            # Modify dirs in-place to tell Python to skip ignored folders
            dirs[:] = [d for d in dirs if d not in ignored_folders]
            
            for file in files:
                # Get the path relative to our main project directory
                relative_path = os.path.relpath(os.path.join(root, file), target_path)
                clean_file_list.append(relative_path)
                
        return {
            "status": "success",
            "total_files_found": len(clean_file_list),
            "files": clean_file_list
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

