#!/bin/bash

docker network create app-tier --driver bridge
docker pull bitnami/kafka:3.6.1
docker rm -f zookeeper-server
docker rm -f kafka-server
#docker run -d --name zookeeper-server --network app-tier -e  ALLOW_ANONYMOUS_LOGIN=yes -p 2181:2181 bitnami/zookeeper:3.9.1
docker run -d --name kafka-1 --hostname kafka-1 \
    --network app-tier \
    -e KAFKA_ENABLE_KRAFT=yes \
    -e KAFKA_CFG_NODE_ID=1 \
    -e KAFKA_CFG_PROCESS_ROLES=controller,broker \
    -e KAFKA_CFG_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093 \
    -e KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT \
    -e KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=1@kafka-1:9093 \
    -e KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER \
    -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1  \
    -e BITNAMI_DEBUG=yes \
    -e KAFKA_KRAFT_CLUSTER_ID=OTMwNzFhYTY1ODNiNGE5OT \
    bitnami/kafka:latest

#docker run -d --name kafka-server  \
#  --network app-tier \
#  -e KAFKA_ENABLE_KRAFT=yes \
# -e ALLOW_PLAINTEXT_LISTENER=yes  -e KAFKA_CFG_ZOOKEEPER_CONNECT=zookeeper-server:2181 \
# -p 9092:9092 -p 9093:9093 -e KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CLIENT:PLAINTEXT,EXTERNAL:PLAINTEXT \
# -e KAFKA_CFG_LISTENERS=CLIENT://kafka-server:9092,EXTERNAL://kafka-server:9093 \
# -e KAFKA_CFG_ADVERTISED_LISTENERS=CLIENT://kafka-server:9092,EXTERNAL://127.0.0.1:9093 \
# -e KAFKA_CFG_INTER_BROKER_LISTENER_NAME=CLIENT \
# -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1  \
# bitnami/kafka:3.5.2
#
#      - KAFKA_CFG_PROCESS_ROLES=broker,controller
#      - KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER
#      - KAFKA_CFG_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093,EXTERNAL://:9094
#      - KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,EXTERNAL:PLAINTEXT
#      - KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://127.0.0.1:9092,EXTERNAL://kafka_b:9094
#      - KAFKA_BROKER_ID=1
#      - KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=1@127.0.0.1:9093
#      - ALLOW_PLAINTEXT_LISTENER=yes
#      - KAFKA_CFG_NODE_ID=1
#      - KAFKA_AUTO_CREATE_TOPICS_ENABLE=true
#      - BITNAMI_DEBUG=yes
#      - KAFKA_CFG_NUM_PARTITIONS=2

docker run -d -it -p 8080:8080 --network app-tier -e DYNAMIC_CONFIG_ENABLED=true -e KAFKA_CLUSTERS_0_NAME=CLIENT -e KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS=kafka-1:9092 provectuslabs/kafka-ui
# - connect to list topics:
#   `docker run -it --rm --network app-tier -e KAFKA_CFG_ZOOKEEPER_CONNECT=zookeeper-server:2181 bitnami/kafka:latest kafka-topics.sh --list  --bootstrap-server kafka-server:9092`
# - connect to create topic livestream1:
#   `docker run -it --rm --network app-tier -e KAFKA_CFG_ZOOKEEPER_CONNECT=zookeeper-server:2181 bitnami/kafka:latest kafka-topics.sh --create --topic livestream1  --bootstrap-server kafka-server:9092`
#   `docker run -it --rm --network app-tier -e KAFKA_CFG_ZOOKEEPER_CONNECT=zookeeper-server:2181 bitnami/kafka:latest  kafka-console-consumer.sh –topic livestream1 –from-beginning  --bootstrap-server kafka-server:9092`