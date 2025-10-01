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

# Create a startup script instead of complex CMD
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'echo "🚀 Starting PocketBase..."' >> /start.sh && \
    echo './pocketbase serve --http=0.0.0.0:10000 &' >> /start.sh && \
    echo 'echo "⏳ Waiting for PocketBase to start..."' >> /start.sh && \
    echo 'sleep 15' >> /start.sh && \
    echo 'echo "🤖 Starting Telegram Worker..."' >> /start.sh && \
    echo 'cd /app/worker' >> /start.sh && \
    echo 'node worker.js &' >> /start.sh && \
    echo 'echo "✅ Both services started"' >> /start.sh && \
    echo 'wait' >> /start.sh && \
    chmod +x /start.sh

CMD ["/start.sh"]