# Vibe File Sharing App

A modern web application to share files from the filesystem with authentication, filtering, and Docker support.

## Features

- Login system (SQLite)
- List and filter 2000+ files/folders by name or modified date
- Download files
- Modern React frontend (Vite)
- FastAPI backend (Python)
- Dockerized for easy deployment

## Quick Start

1. Install dependencies for frontend:

   ```bash
   npm install
   ```

2. Start the backend:

   ```bash
   cd backend
   pip install fastapi uvicorn pydantic
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

3. Start the frontend:

   ```bash
   npm run dev
   ```

4. Open the app in your browser at `http://localhost:5173`

## Docker

A `Dockerfile` will be provided for full-stack deployment.

---

Replace `../shared_files` in `backend/main.py` with your actual shared files directory.
