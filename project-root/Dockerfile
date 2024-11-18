# Use the official Node.js LTS as the base image
FROM node:22

# Set the working directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install
RUN npm install -g nodemon # ติดตั้ง nodemon แบบ global

# Expose the application's port
EXPOSE 3000

# Default command (ใช้ nodemon)
CMD ["nodemon", "server.js"]
