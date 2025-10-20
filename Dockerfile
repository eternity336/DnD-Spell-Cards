# Use a lightweight Nginx image to serve the web app
FROM nginx:alpine

# Copy the web app files into the Nginx public directory
COPY . /usr/share/nginx/html/

# Expose port 80 for the web server
EXPOSE 80
