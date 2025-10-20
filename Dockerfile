# Use a lightweight Nginx image to serve the web app
FROM nginx:alpine

# Copy the web app files into the Nginx public directory
COPY spellbook_app.html /usr/share/nginx/html/index.html
COPY spells.json /usr/share/nginx/html/spells.json

# Expose port 80 for the web server
EXPOSE 80
