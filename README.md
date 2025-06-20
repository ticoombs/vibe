# Vibe File Sharing App

A modern web application to securely share files from a server filesystem with authentication, filtering, and Docker support.

## Features

- User authentication (SQLite, FastAPI)
- Browse and filter files/folders by name or modified date
- Download files securely using one-time tokens (no direct or alternate download methods)
- Modern React frontend (Vite)
- FastAPI backend (Python)
- Dockerized for easy deployment

## How to Start (Development)

1. **Install frontend dependencies:**
   ```bash
   cd vibes/frontend
   npm install
   ```

2. **Start the backend:**
   ```bash
   cd ../backend
   pip install fastapi uvicorn pydantic
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Start the frontend:**
   ```bash
   cd ../frontend
   npm run dev
   ```

4. **Open the app in your browser:**
   - Go to [http://localhost:5173](http://localhost:5173)

## How to Start (Docker Compose)

1. **From the `/` directory:**
   ```bash
   make start-prod
   docker-compose up --build
   ```
2. **Open the app:**
   - Go to [http://localhost:8800](http://localhost:8800)

## Usage Notes
- All downloads require a one-time token, which is automatically handled by the frontend.
- Users must log in to access file listings and download links.
- File sizes are displayed in MB.
- Only files in the `shared_files` directory are accessible.

---

For more details, see the code in the `vibes/` directory.
