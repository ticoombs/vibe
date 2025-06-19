FROM python:3.11-slim

# Backend setup
WORKDIR /app/backend
COPY backend/ /app/backend/
RUN pip install fastapi uvicorn pydantic

# Frontend setup
WORKDIR /app/frontend
COPY package*.json /app/frontend/
RUN apt-get update && apt-get install -y npm && npm install && npm run build
COPY . /app/frontend/

# Expose ports
EXPOSE 8000 5173

# Start both backend and frontend (use a process manager in production)
CMD ["sh", "-c", "cd /app/backend && uvicorn main:app --host 0.0.0.0 --port 8000 & cd /app/frontend && npm run preview -- --host 0.0.0.0 --port 5173"]
