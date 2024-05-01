"use strict";
const {SRT, SRTServer, AsyncSRT, SRTReadStream, SRTSockOpt} = require("@eyevinn/srt");
const Kafka = require("node-rdkafka");
const Transform = require("stream").Transform;
const Stream = require("stream");
const {fetchConfigByKey, fetchSessionIdByResourceAndUser, updateSessionToUsed} = require('./getConfigByKey');

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

    let username = streamId.substring(streamId.indexOf("u="));
    username = username.substring(2, username.indexOf(","));
    console.log(`username=${username}`)

    let sessionId = streamId.substring(streamId.indexOf("s="));
    sessionId = sessionId.substring(2, sessionId.indexOf(","));
    console.log(`sessionId=${sessionId}`)

    let requestedResource = streamId.substring(streamId.indexOf("r="));
    requestedResource = requestedResource.substring(2, requestedResource.indexOf(","));
    console.log(`requestedResource ${requestedResource}`);

    if (process.env.ENABLE_TEST_SESSION_ID == 'true' && process.env.TEST_SESSION_ID == sessionId) {
        //do nothing
        console.log('bypassing check')
    } else {
        let rows = await fetchSessionIdByResourceAndUser(sessionId, username, requestedResource, false);
        console.log(`row: ${JSON.stringify(rows)}`);
        if (rows.length < 1) {
            await connection.close();//todo close with some error so client wont reconnect, or do connection error
        } else {
            updateSessionToUsed(sessionId, username, requestedResource)
        }
    }

    const stream = Kafka.Producer.createWriteStream(
        {
            "metadata.broker.list": `${process.env.KAFKA_BROKER_LIST}`,
            "client.id": `origin-${process.env.HOSTNAME != null && process.env.HOSTNAME != undefined ? process.env.HOSTNAME : process.env.SERVER_ID}-${connection.fd}-${Date.now()}`,
            "acks": "0", // Set acks to 0 for no acknowledgments
            // "compression.codec": "lz4",
            // "compression.type": "lz4",
            // "linger.ms": 10, default to zero
            // "batch.size": 1000000,
        },
        {},
        {
            topic: requestedResource,
            objectMode: false,
        },
    );
    stream.on('error', (err) => {
        console.error('Kafka Producer Stream Error:', err);
        stream.destroy();
        stream.producer.disconnect();
        connection.close();
    });
    // Connection error handling
    connection.on('error', (err) => {
        console.error(`Connection Error for FD ${connection.fd}:`, err);
        stream.destroy();
        stream.producer.disconnect();
        connection.close();
    });


    const readableStream = new Stream.Readable();
    readableStream._read = function () {
    };
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
        connection.close();
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

// function startServer() {
const asyncSrtServer = new SRTServer(Number(process.env.SERVER_PORT), "0.0.0.0");

asyncSrtServer.on("connection", (connection) => {
    onClientConnected(connection);
});

asyncSrtServer.create().then(async (s) => {
    // Set encryption options here
    let passphrase = process.env.SRT_PASSPHRASE; // Ensure you have this environment variable set
    let keyLength = 16; // 128 bits. You can also use 24 for 192 bits or 32 for 256 bits
    try {
        const result = await fetchConfigByKey('origin_passphrase')
        if (result.length > 0 && result[0].value) {
            passphrase = result[0].value;
        }
    } catch (err) {
        console.error(`failed fetching config will default to env passphrase`, err)
    }
    try {
        const result = await fetchConfigByKey('origin_keyLength')
        if (result.length > 0 && result[0].value) {
            keyLength = Number(result[0].value);
        }
    } catch (err) {
        console.error(`failed fetching config will default to hardcoded keylength`, err)
    }
    // // Check if passphrase is set, then enable encryption
    if (passphrase && passphrase.length > 0) {
        await s.setSocketFlags([SRT.SRTO_PASSPHRASE, SRT.SRTO_PBKEYLEN], [passphrase, keyLength]);
    }

    let enable_test_session = await fetchConfigByKey('enable_test_session_id');
    let test_session_id = await fetchConfigByKey('test_session_id');
    if (enable_test_session.length == 1) {
        process.env.ENABLE_TEST_SESSION_ID = enable_test_session[0].value;
    } else {
        process.env.ENABLE_TEST_SESSION_ID = 'false'
    }
    if (test_session_id.length == 1) {
        process.env.TEST_SESSION_ID = test_session_id[0].value;
    } else {
        process.env.TEST_SESSION_ID = 'null'
    }

    s.open();
}).then(() => {
    console.log(`listening server ${process.env.SERVER_PORT}. server id: ${process.env.SERVER_ID}`);
}).catch((err) => {
    console.log(`failed to start server ${err}`);
});
// }

// startServer();

const net = require('net');

const HEALTH_CHECK_PORT = process.env.HEALTH_CHECK_PORT || 9999; // Choose an appropriate port

const healthCheckServer = net.createServer((socket) => {
    console.log("Received health check request");
    socket.end('OK\n'); // Respond with OK and close the connection
});

healthCheckServer.listen(HEALTH_CHECK_PORT, () => {
    console.log(`Health check server listening on port ${HEALTH_CHECK_PORT}`);
});