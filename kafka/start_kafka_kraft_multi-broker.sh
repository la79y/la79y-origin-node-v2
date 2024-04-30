#!/bin/bash

# Create a Docker network
docker network create app-tier --driver bridge

# Define environment variables for version and configuration
KAFKA_VERSION="3.6.1"
KAFKA_REPLICATION_FACTOR="3"
# Assuming these environment variables are exported/set elsewhere in your environment

# Pull the Kafka image
docker pull bitnami/kafka:$KAFKA_VERSION

# Remove existing containers
docker rm -f zookeeper-server kafka-1 kafka-2 kafka-3

# Define resource limits
MEMORY_LIMIT="2g" # Limit memory to 1GB
CPU_LIMIT="1.0"   # Limit to 1.0 CPU

# Start Kafka brokers
for i in 1 2 3; do
  docker run -d --name kafka-$i --hostname kafka-$i \
      --network app-tier \
      -e KAFKA_ENABLE_KRAFT=yes \
      -e KAFKA_CFG_NODE_ID=$i \
      -e KAFKA_CFG_PROCESS_ROLES=controller,broker \
      -e KAFKA_CFG_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093 \
      -e KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT \
      -e KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093 \
      -e KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER \
      -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=$KAFKA_REPLICATION_FACTOR \
      -e BITNAMI_DEBUG=yes \
      -e KAFKA_KRAFT_CLUSTER_ID=OTMwNzFhYTY1ODNiNGE5OT \
      bitnami/kafka:$KAFKA_VERSION
done

#      --memory $MEMORY_LIMIT \
#      --cpus $CPU_LIMIT \
# Additional configurations for logging, security, and resource limits can be added here


#docker run -d -it -p 8080:8080 --network app-tier -e DYNAMIC_CONFIG_ENABLED=true -e KAFKA_CLUSTERS_0_NAME=CLIENT -e KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS=kafka-1:9092,kafka-2:9092,kafka-3:9092 provectuslabs/kafka-ui