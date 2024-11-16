# Use the official Node.js LTS as the base image
FROM node:

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy project files and wait-for-it script
COPY . .
COPY wait-for-it.sh /usr/src/app/wait-for-it.sh
RUN chmod +x /usr/src/app/wait-for-it.sh

# Expose the application's port
EXPOSE 3000

# Command to wait for SQL Server and start the backend
CMD ["./wait-for-it.sh", "sqlserver_container:1433", "--", "node", "initialize.js", "&&", "node", "server.js"]
