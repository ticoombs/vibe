FROM node:20-slim

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Set environment variable for backend API URL (Docker Compose can override this)
ENV VITE_API_BASE_URL=https://backend:8000

RUN npm run build

EXPOSE 5173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
