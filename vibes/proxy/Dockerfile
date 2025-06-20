FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=vibes-frontend /app/dist /usr/share/nginx/html
