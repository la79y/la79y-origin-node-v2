#!/bin/bash

docker network create app-tier --driver bridge
docker pull bitnami/kafka:3.5.2
docker rm -f zookeeper-server
docker rm -f kafka-server
docker run -d --name zookeeper-server --network app-tier -e  ALLOW_ANONYMOUS_LOGIN=yes -p 2181:2181 bitnami/zookeeper:3.9.1
docker run -d --name kafka-server  --network app-tier \
 -e ALLOW_PLAINTEXT_LISTENER=yes  -e KAFKA_CFG_ZOOKEEPER_CONNECT=zookeeper-server:2181 \
 -p 9092:9092 -p 9093:9093 -e KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CLIENT:PLAINTEXT,EXTERNAL:PLAINTEXT \
 -e KAFKA_CFG_LISTENERS=CLIENT://kafka-server:9092,EXTERNAL://kafka-server:9093 \
 -e KAFKA_CFG_ADVERTISED_LISTENERS=CLIENT://kafka-server:9092,EXTERNAL://127.0.0.1:9093 \
 -e KAFKA_CFG_INTER_BROKER_LISTENER_NAME=CLIENT \
 -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1  \
 -e KAFKA_ENABLE_KRAFT=no \
 bitnami/kafka:3.5.2

docker run -d -it -p 8080:8080 --network app-tier -e DYNAMIC_CONFIG_ENABLED=true -e KAFKA_CLUSTERS_0_NAME=CLIENT -e KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS=kafka-server:9092 provectuslabs/kafka-ui
# - connect to list topics:
#   `docker run -it --rm --network app-tier -e KAFKA_CFG_ZOOKEEPER_CONNECT=zookeeper-server:2181 bitnami/kafka:latest kafka-topics.sh --list  --bootstrap-server kafka-server:9092`
# - connect to create topic livestream1:
#   `docker run -it --rm --network app-tier -e KAFKA_CFG_ZOOKEEPER_CONNECT=zookeeper-server:2181 bitnami/kafka:latest kafka-topics.sh --create --topic livestream1  --bootstrap-server kafka-server:9092`
#   `docker run -it --rm --network app-tier -e KAFKA_CFG_ZOOKEEPER_CONNECT=zookeeper-server:2181 bitnami/kafka:latest  kafka-console-consumer.sh –topic livestream1 –from-beginning  --bootstrap-server kafka-server:9092`