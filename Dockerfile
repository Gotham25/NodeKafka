
FROM node:slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

# Healthcheck to stat the status of container
HEALTHCHECK --interval=5s --timeout=3s CMD node healthcheck.js

EXPOSE 2573

CMD [ "node", "server.js" ]

