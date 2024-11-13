# Use Node.js as the base image
FROM node:22

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json for dependency installation
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files from the root directory
COPY . .

# Expose the port the app runs on
EXPOSE 3000


# Start the Express application
CMD ["bash", "-c", "node initialize.js && node server.js"]
