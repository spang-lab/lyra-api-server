
FROM node:11-alpine

# Create App directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ADD package.json package.json
ADD custom_modules custom_modules
RUN npm install
ADD . /usr/src/app

EXPOSE 8080
CMD ["node", "app.js"]
