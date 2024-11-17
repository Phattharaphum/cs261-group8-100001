# Use the official Node.js LTS as the base image
FROM node:22

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy project files and wait-for-it script
COPY . .

# Expose the application's port
EXPOSE 3000

# Command to wait for SQL Server and start the backend
CMD ["node", "server.js"]
