FROM alpine:latest

RUN apk add --no-cache curl unzip

# Download PocketBase
RUN curl -L https://github.com/pocketbase/pocketbase/releases/download/v0.21.1/pocketbase_0.21.1_linux_amd64.zip -o pocketbase.zip && \
    unzip pocketbase.zip && \
    chmod +x pocketbase && \
    rm pocketbase.zip

# Copy your data
COPY pb_data/ /pb_data/
COPY pb_migrations/ /pb_migrations/

EXPOSE 8080

CMD ["./pocketbase", "serve", "--http=0.0.0.0:8080"]