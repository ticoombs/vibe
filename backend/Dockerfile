FROM python:3.11-slim

WORKDIR /app/backend
COPY requirements.txt ./
RUN pip install -r requirements.txt
# Only copy backend code, not users.db or shared_files
COPY main.py ./

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
