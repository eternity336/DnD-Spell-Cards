FROM node:18

WORKDIR /usr/src/app

# Install build tools for sqlite3 and sqlite-dev
RUN apt-get update && apt-get install -y python3 make g++ libsqlite3-dev libtool sqlite3 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# If you have a package-lock.json, uncomment the next line
# COPY package-lock.json ./

RUN npm install --production

COPY . .

EXPOSE 3000

CMD [ "node", "server/server.js" ]