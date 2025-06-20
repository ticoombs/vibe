from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
import sqlite3
from datetime import datetime
from fastapi.responses import FileResponse
from fastapi import Query
import hashlib
import secrets
import time
from fastapi.responses import StreamingResponse
from urllib.parse import unquote

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE = "/app/backend/users.db"
FILES_ROOT = "/app/shared_files"  # Use absolute path for Docker compatibility

# --- Auth ---
def get_db():
    conn = sqlite3.connect(DATABASE)
    try:
        yield conn
    finally:
        conn.close()

def create_user_table():
    with sqlite3.connect(DATABASE) as conn:
        conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
        """)
create_user_table()

# --- Secure password hashing ---
def hash_password(password: str, salt: str = None):
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100_000)
    return f"{salt}${hashed.hex()}"

def verify_password(password: str, hashed: str):
    salt, hash_val = hashed.split('$')
    return hash_password(password, salt) == hashed

# --- Models ---
class FileInfo(BaseModel):
    name: str
    is_dir: bool
    size: int
    modified: float

# --- Auth Endpoints ---
@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute("SELECT password FROM users WHERE username=?", (form_data.username,))
    row = cur.fetchone()
    if not row or not verify_password(form_data.password, row[0]):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    # In production, use JWT. For demo, return username as token.
    return {"access_token": form_data.username, "token_type": "bearer"}

def get_current_user(authorization: str = Header(None), db=Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    cur = db.cursor()
    cur.execute("SELECT username FROM users WHERE username=?", (token,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid token")
    return token

# # --- Utility to ensure test user exists ---
# def ensure_test_user():
#     with sqlite3.connect(DATABASE) as conn:
#         cur = conn.cursor()
#         cur.execute("SELECT * FROM users WHERE username=?", ("test",))
#         if not cur.fetchone():
#             hashed = hash_password("test")
#             cur.execute("INSERT INTO users (username, password) VALUES (?, ?)", ("test", hashed))
#             conn.commit()
# ensure_test_user()

# --- File Listing Endpoint ---
@app.get("/files", response_model=List[FileInfo])
def list_files(q: str = "", sort: str = "name", order: str = "asc", path: str = Query(default=""), user=Depends(get_current_user)):
    dir_path = os.path.join(FILES_ROOT, path) if path else FILES_ROOT
    if not os.path.isdir(dir_path):
        raise HTTPException(status_code=404, detail="Directory not found")
    files = []
    for entry in os.scandir(dir_path):
        if q.lower() in entry.name.lower():
            stat = entry.stat()
            files.append(FileInfo(
                name=entry.name,
                is_dir=entry.is_dir(),
                size=stat.st_size,
                modified=stat.st_mtime
            ))
    reverse = order == "desc"
    if sort == "name":
        files.sort(key=lambda x: x.name, reverse=reverse)
    elif sort == "modified":
        files.sort(key=lambda x: x.modified, reverse=reverse)
    return files

# --- Token-based Download ---
# Store tokens in memory for demo (use Redis or DB in production)
download_tokens = {}
TOKEN_EXPIRY_SECONDS = 300  # 5 minutes

@app.post("/download-token/{path:path}")
def get_download_token(path: str, user=Depends(get_current_user)):
    # Always decode the path
    decoded_path = unquote(path)
    file_path = os.path.join(FILES_ROOT, decoded_path)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    token = secrets.token_urlsafe(32)
    expires = int(time.time()) + TOKEN_EXPIRY_SECONDS
    download_tokens[token] = {"path": file_path, "expires": expires}
    return {"token": token}

@app.get("/download/{path:path}")
def download_file(path: str, token: str = None):
    if not token:
        raise HTTPException(status_code=401, detail="Token required for download")
    decoded_path = unquote(path)
    file_path = os.path.join(FILES_ROOT, decoded_path)
    token_data = download_tokens.get(token)
    now = int(time.time())
    if not token_data or token_data["path"] != file_path or token_data["expires"] < now:
        raise HTTPException(status_code=409, detail="Invalid or expired token")
    del download_tokens[token]
    return FileResponse(file_path, filename=os.path.basename(file_path))
