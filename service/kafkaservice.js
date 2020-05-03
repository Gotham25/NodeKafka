const { Kafka, logLevel } = require('kafkajs');

const kafkajs = new Kafka({
    logLevel: logLevel.INFO,
    brokers: process.env.KAFKA_BROKERS.split(","),
    ssl: true,
    sasl: {
        mechanism: 'scram-sha-256', // plain (or) scram-sha-256 or scram-sha-512
        username: process.env.KAFKA_USERNAME,
        password: process.env.KAFKA_PASSWORD
    },
    clientId: 'node-kafka-consumer'
});
const topic = "xm4e5fi5-node-kafka";
let messages = [];
let messageKeys = [];

const nodeConsumer = kafkajs.consumer({ groupId: "al813j1m-node-group", fromBeginning: false });

const runNodeConsumer = async () => {
    await nodeConsumer.connect();
    await nodeConsumer.subscribe({ topic: topic, fromBeginning: false });
    await nodeConsumer.run({
        eachMessage: ({kafkaTopic, kafkaPartition, message}) => {
            messages[message.key.toString()] = message.value.toString();
            messageKeys[message.key.toString()] = false;
        },
    });
};

runNodeConsumer().catch(e => console.error(`[kafkajs/nodeConsumer] ${e.message}`, e));


module.exports = {
    messageKeys: messageKeys,
    messages: messages,
    producer: kafkajs.producer(),
    consumer: nodeConsumer,
    topic: topic
};
