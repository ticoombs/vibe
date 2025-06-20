# Makefile for Vibe Application

.PHONY: help start-dev stop-dev start-prod stop-prod

help:
	@echo "Available targets:"
	@echo "  start-dev   Start backend (FastAPI) and frontend (Vite) in development mode"
	@echo "  stop-dev    Stop all dev servers (if running in background)"
	@echo "  start-prod  Start application using docker-compose (production)"
	@echo "  stop-prod   Stop application and remove containers (production)"

start-dev:
	cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000 & \
	npm run dev &
	@echo "Development servers started."

stop-dev:
	@echo "Stopping dev servers..."
	-pkill -f "uvicorn main:app"
	-pkill -f "vite"
	@echo "Dev servers stopped."

start-prod:
	docker-compose build --no-cache && \
	docker-compose up -d 
	@echo "Production application started with docker-compose."

stop-prod:
	docker-compose down
	@echo "Production application stopped and containers removed."
