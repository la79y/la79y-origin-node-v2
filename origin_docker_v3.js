"use strict";

const { SRT, SRTServer, AsyncSRT, SRTReadStream, SRTSockOpt } = require("@eyevinn/srt");
const Kafka = require("node-rdkafka");
const Transform = require("stream").Transform;
const Stream = require("stream");

let fds = [];

const srtListenTransform = new Transform({
  objectMode: false,
  decodeStrings: true,
  transform(text, encoding, callback) {
    if (text == null || text === undefined || text.length === 0) {
      console.log("received empty");
    } else if (text.length > 1) {
      callback(null, text);
    } else {
      console.log(`text ${text}`);
      callback(null, Buffer.from("Hello"));
    }
  },
});

async function onClientConnected(connection) {
  console.log("Got new connection:", connection.fd);

  const fd = {
    fd: connection.fd,
    readerWriter: connection.getReaderWriter(),
  };

  fds.push(fd);

  const asyncSrt = new AsyncSRT();
  console.log(SRT.SRTO_STREAMID);

  const SRTO_RCVBUF = await asyncSrt.getSockOpt(fd.fd, SRT.SRTO_RCVBUF);
  console.log(`SRTO_RCVBUF ${SRTO_RCVBUF}`);

  const SRTO_FC = await asyncSrt.getSockOpt(fd.fd, SRT.SRTO_FC);
  console.log(`SRTO_FC ${SRTO_FC}`);

  let streamId = await asyncSrt.getSockOpt(fd.fd, SRT.SRTO_STREAMID);
  console.log(`streamId ${streamId}`);

  let requestedResource = streamId.substring(streamId.indexOf("r="));
  requestedResource = requestedResource.substring(2, requestedResource.indexOf(","));
  console.log(`requestedResource ${requestedResource}`);

  const stream = Kafka.Producer.createWriteStream(
      {
        "metadata.broker.list": `${process.env.KAFKA_BROKER_LIST}`,
        "client.id": `origin-${process.env.HOSTNAME != null && process.env.HOSTNAME != undefined ? process.env.HOSTNAME : process.env.SERVER_ID}-${connection.fd}-${Date.now()}`,
        // "compression.codec": "lz4",
        // "compression.type": "lz4",
        // "linger.ms": 10,
        // "batch.size": 1000000,
      },
      {},
      {
        topic: requestedResource,
        objectMode: false,
      },
  );

  const readableStream = new Stream.Readable();
  readableStream._read = function () {};
  readableStream.pipe(srtListenTransform).pipe(stream);

  connection.on("data", async () => {
    onClientData();
  });

  connection.on("closing", async () => {
    // handle connection closing
  });

  connection.on("closed", async () => {
    console.log(`closed ${connection.fd}`);
    stream.destroy();
    stream.producer.disconnect();
    const index = fds.findIndex((fd) => fd.fd == connection.fd);
    if (index > -1) {
      fds.splice(index, 1);
    }
  });

  async function onClientData() {
    const chunks = await fd.readerWriter.readChunks();
    chunks.forEach(item => readableStream.push(item));
  }
}

function startServer() {
  const asyncSrtServer = new SRTServer(Number(process.env.SERVER_PORT), "0.0.0.0");

  asyncSrtServer.on("connection", (connection) => {
    onClientConnected(connection);
  });

  asyncSrtServer.create().then(async (s) => {
    // await s.setSocketFlags([SRT.SRTO_FC, SRT.SRTO_RCVBUF ], [12058624 *2,12058624*2    ])//25600 *2, 12058624*2 . &latency=200000&maxbw=12399073&rcvbuf=48234496&fc=102400
    // await s.setSocketFlags([SRT.SRTO_FC,SRT.SRTO_RCVBUF,SRT.SRTO_TLPKTDROP ], [25600,12058624 ,true  ])//25600 *2, 12058624*2 . &latency=200000&maxbw=12399073&rcvbuf=48234496&fc=102400
    //3600076
    //12058624
    s.open();
  }).then(() => {
    console.log(`listening server ${process.env.SERVER_PORT}. server id: ${process.env.SERVER_ID}`);
  }).catch((err) => {
    console.log(`failed to start server ${err}`);
  });
}

startServer();