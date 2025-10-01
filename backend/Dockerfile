FROM alpine:latest

RUN apk add --no-cache curl unzip

# Download the SAME PocketBase version you're using locally (v0.30.0)
RUN curl -L https://github.com/pocketbase/pocketbase/releases/download/v0.30.0/pocketbase_0.30.0_linux_amd64.zip -o pocketbase.zip && \
    unzip pocketbase.zip && \
    chmod +x pocketbase && \
    rm pocketbase.zip

# Copy your data
COPY pb_data/ /pb_data/
COPY pb_migrations/ /pb_migrations/

EXPOSE 10000

CMD ["./pocketbase", "serve", "--http=0.0.0.0:10000"]