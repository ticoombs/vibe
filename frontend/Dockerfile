FROM node:20-slim AS front

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Set environment variable for backend API URL (Docker Compose can override this)
ENV VITE_API_BASE_URL=https://backend:8000

RUN npm run build


FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=front /app/dist /usr/share/nginx/html

