# la79y-origin-node-v2

`git clone  --recurse-submodules https://github.com/la79y/la79y-origin-node-v2.git`

## Requirement

- docker

# Dependencies

- https://github.com/Eyevinn/node-srt

has been customized to do some fixes:
`git submodule add https://github.com/bander-saeed94/node-srt`

## Start Kafka

cd kafka
./start_kafka.sh
or
./start_kafka_kraft_multi-broker.sh

## Build and run origin application

cd ..

- With custom origin ID (-i) and exposed port (-p), (-f) file to start, (-t) image tag, (-s) for the global passphrase:
  ```sh
  ./build_start_origin.sh -s theonlypassphrase -i 1 -p 1234 -b kafka-server:9092 -f origin_docker_v4.js -t nodejs-origin-rdkafka-v4
  ```

```sh
  ./build_start_origin.sh -s theonlypassphrase -i 1 -p 1234 -b kafka-1:9092 -f origin_docker_v4.js -t nodejs-origin-rdkafka-v4
```

```sh
./build_start_origin.sh -s origin_pass -i 1 -p 1234 -h 9999 -b kafka-1:9092,kafka-2:9092,kafka-3:9092 -f origin_docker_v4.js -t nodejs-origin-rdkafka-v4
```

## To stream to origin

streamid to identify resource so a topic with livestream3 will be created, latency in microseconds, should be RTT \* 4, set below in pref in obs app, stream server:

```
srt://127.0.0.1:1234?streamid=#!::r=livestream3,m=publish,t=stream&transtype=live&mode=caller&latency=3200000
&passphrase=<YOUR_PASSPHRASE>&pbkeylen=<KEY_LENGTH>
```

```shell
srt://127.0.0.1:1234?streamid=#!::r=livestream3,m=publish,t=stream&transtype=live&mode=caller&latency=10000&passphrase=theonlypassphrase&pbkeylen=16
```

## Deploy on K8S

```shell
gcloud container clusters get-credentials lahthi-cluster --region me-central1 --project final-project-413218
```

```shell
kubectl apply -f 00-namespace.yaml
kubectl apply -f k8s.yaml

#check service has external ip
kubectl get service -n origin-namespace
kubectl describe service origin-service-udp -n origin-namespace
```

## Stream

```shell
srt://34.18.27.156:10080?streamid=#!::r=livestream4,m=publish,t=stream&transtype=live&mode=caller&latency=1000&passphrase=theonlypassphrase&pbkeylen=16
```

digital ocean

```shell
srt://209.38.176.82:10080?streamid=#!::r=livestream4,m=publish,t=stream&transtype=live&mode=caller&latency=1000&passphrase=theonlypassphrase&pbkeylen=16
```
