FROM alpine:latest

# Install dependencies
RUN apk add --no-cache curl unzip nodejs npm

# Download PocketBase
RUN curl -L https://github.com/pocketbase/pocketbase/releases/download/v0.30.0/pocketbase_0.30.0_linux_amd64.zip -o pocketbase.zip && \
    unzip pocketbase.zip && \
    chmod +x pocketbase && \
    rm pocketbase.zip

# Copy data
COPY pb_data/ /pb_data/
COPY pb_migrations/ /pb_migrations/

# Copy worker and install dependencies
COPY worker/ /app/worker/
RUN cd /app/worker && npm install

EXPOSE 10000

# Start both services
CMD sh -c "
  echo '🚀 Starting PocketBase...' && 
  ./pocketbase serve --http=0.0.0.0:10000 &
  
  echo '⏳ Waiting for PocketBase to start...' && 
  sleep 15 &&
  
  echo '🤖 Starting Telegram Worker...' && 
  cd /app/worker && 
  node worker.js &
  
  echo '✅ Both services started' && 
  wait
"