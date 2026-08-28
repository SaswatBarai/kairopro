FROM node:20-slim

# Install Python, git, and build dependencies for running user apps
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    git \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

CMD ["/bin/sh", "-c", "tail -f /dev/null"]
