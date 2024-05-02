#!/bin/bash

# Enable BuildKit and build Docker image
DOCKER_BUILDKIT=1 docker build --platform linux/amd64 . -t nodejs-origin-rdkafka-v6-amd64

# Tag Docker image
docker tag nodejs-origin-rdkafka-v6-amd64:latest bandersaeed94/la79y:origin-v6

# Push Docker image to Docker Hub
docker push bandersaeed94/la79y:origin-v6
