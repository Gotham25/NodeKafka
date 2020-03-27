
const express = require("express");
const { Kafka, logLevel } = require('kafkajs');
const bodyParser = require("body-parser");
const mysql = require("mysql");
const SERVER_PORT = process.env.PORT || 2573;
const MESSAGE_CONSUME_TOKEN = process.env.MESSAGE_CONSUME_TOKEN;
const MESSAGE_PRODUCE_TOKEN = process.env.MESSAGE_PRODUCE_TOKEN;
const MESSAGE_KEY_TOKEN = process.env.MESSAGE_KEY_TOKEN;
const app = express();
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
const topic = "al813j1m-node-kafka";
let messages = [];
let messageKeys = [];

const mysqlConnection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

mysqlConnection.connect((err) => {
    if(err) throw err;
    log("Connected to DB schema nodekafka !!!");
});

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

app.use(bodyParser.json());

app.use((err, req, res, next) => {
    if(err) {
        res.status(400);
        res.send({
            errorMessage: ""+err,
            type: err.type,
            timestamp: getTimestamp()
        });
    } else {
        next();
    }
});

app.get("/status", (req, res) => {
    res.send({
        status: "UP",
        timestamp: getTimestamp()
    });
});

app.post("/getMessage", (req, res) => {

    try {
        let messageConsumeToken = req.get("X-MESSAGE-CONSUME-TOKEN");
        if (messageConsumeToken === undefined) {
            res.status(400);
            res.send(getErrorMessage("Missing MESSAGE-CONSUME-TOKEN header"));
        } else if (messageConsumeToken !== MESSAGE_CONSUME_TOKEN) {
            res.status(400);
            res.send(getErrorMessage("Invalid MESSAGE-CONSUME-TOKEN specified"));
        } else if (req.body === undefined || JSON.stringify(req.body) === "{}") {
            res.status(400);
            res.send(getErrorMessage("Missing request body"));
        } else if (req.body.key === undefined) {
            res.status(400);
            res.send(getErrorMessage("msg key missing in request body"));
        } else if (!req.body.key.trim()) {
            res.status(400);
            res.send(getErrorMessage("msg key is blank or empty in request body"));
        } else {
            let sortedMessageKeys = Object.keys(messageKeys).sort();
            for (let keys = 0; keys < sortedMessageKeys.length; keys++) {
                const msgKey = sortedMessageKeys[keys];
                const msg = messages[msgKey];
                if(msgKey.startsWith(req.body.key) && messageKeys[msgKey] === false) {
                    messageKeys[msgKey] = true;
                    res.send({
                        message: msg,
                        hasMessage: true,
                        timestamp: getTimestamp()
                    });
                    return;
                }
            }

            res.send({
                hasMessage: false,
                timestamp: getTimestamp()
            });
        }
    } catch (error) {
        res.status(400);
        res.send(getErrorMessage(""+error));
    }
});

app.post("/putMessage", (req, res) => {

    try {
        let messageProduceToken = req.get("X-MESSAGE-PRODUCE-TOKEN");
        if (messageProduceToken === undefined) {
            res.status(400);
            res.send(getErrorMessage("Missing MESSAGE-PRODUCE-TOKEN header"));
        } else if (messageProduceToken !== MESSAGE_PRODUCE_TOKEN) {
            res.status(400);
            res.send(getErrorMessage("Invalid MESSAGE-PRODUCE-TOKEN specified"));
        }  else if (req.body === undefined || JSON.stringify(req.body) === "{}") {
            res.status(400);
            res.send(getErrorMessage("Missing request body"));
        } else if (req.body.key === undefined || req.body.message === undefined) {
            res.status(400);
            res.send(getErrorMessage("key/message missing in request body"));
        } else if (!req.body.key.trim() || !req.body.message.trim()) {
            res.status(400);
            res.send(getErrorMessage("key/message is blank or empty in request body"));
        } else {
            let nodeProducer = kafkajs.producer();
            nodeProducer.connect();
            nodeProducer.send({
                topic: topic,
                messages: [
                    {
                        key: req.body.key+"-"+getTimestamp(),
                        value: req.body.message
                    }
                ],
            });
            nodeProducer.disconnect();
            res.send({
                status: "success",
                timestamp: getTimestamp()
            });
        }
    } catch (error) {
        res.status(400);
        res.send(getErrorMessage(""+error));
    }
});


app.get("/getKey", (req, res) => {
    try {
        let messageKeyToken = req.get("X-MESSAGE_KEY_TOKEN");
        if (messageKeyToken === undefined) {
            res.status(400);
            res.send(getErrorMessage("Missing MESSAGE_KEY_TOKEN header"));
        } else if (messageKeyToken !== MESSAGE_KEY_TOKEN) {
            res.status(400);
            res.send(getErrorMessage("Invalid MESSAGE_KEY_TOKEN specified"));
        } else {
            mysqlConnection.query('CALL GenerateUniqueValue(\'user_keys\', \'MESSAGE_KEY\')' , function(err, rows) {
                if(err) throw err;
                let msgKey = rows[0][0].uniqueValue;
                mysqlConnection.query('INSERT INTO `user_keys` (`MESSAGE_KEY`) VALUES(\''+msgKey+'\')', function(insErr, insRows) {
                    if(insErr) throw insErr;
                    if(insRows.affectedRows === 1) {
                        res.send({
                            key: msgKey,
                            comment: "You need to lock this key using lockKey API to proceed further else this key will be expired in 1 minute",
                            timestamp: getTimestamp()
                        });
                    }
                });
            });
            
        }
    } catch (error) {
        res.status(400);
        res.send(getErrorMessage(""+error));
    }
});


app.post("/lockKey", (req, res) => {
    try {
        let messageKeyToken = req.get("X-MESSAGE_KEY_TOKEN");
        if (messageKeyToken === undefined) {
            res.status(400);
            res.send(getErrorMessage("Missing MESSAGE_KEY_TOKEN header"));
        } else if (messageKeyToken !== MESSAGE_KEY_TOKEN) {
            res.status(400);
            res.send(getErrorMessage("Invalid MESSAGE_KEY_TOKEN specified"));
        } else if (req.body === undefined || JSON.stringify(req.body) === "{}") {
            res.status(400);
            res.send(getErrorMessage("Missing request body"));
        } else if (req.body.key === undefined || req.body.status === undefined) {
            res.status(400);
            res.send(getErrorMessage("key/status missing in request body"));
        } else if (!req.body.key.trim() || !req.body.status.trim()) {
            res.status(400);
            res.send(getErrorMessage("key/status is blank or empty in request body"));
        } else {

            mysqlConnection.query('SELECT * FROM `user_keys` WHERE MESSAGE_KEY = \''+req.body.key+'\'' , function(err, rows) {
                if(err) throw err;
                if(rows.length === 0) {
                    res.send({
                        key: req.body.key,
                        comment: "The key you entered is not generated using getKey API. Use the generated key and try again",
                        timestamp: getTimestamp()
                    });
                } else {
                    if(rows[0].IS_LOCKED === 1) {
                        res.send({
                            key: req.body.key,
                            comment: "Your key is already locked and available for message producing/consuming",
                            timestamp: getTimestamp()
                        });
                    } else {
                        mysqlConnection.query('UPDATE `user_keys` SET IS_LOCKED = true WHERE MESSAGE_KEY = \''+req.body.key+'\'' , function(updErr, updRows) {
                            if(updErr) throw updErr;
                            if(updRows.affectedRows === 1) {
                                res.send({
                                    key: req.body.key,
                                    comment: "Your key is been locked and available for message producing/consuming. Kindly save this key for future reference",
                                    timestamp: getTimestamp()
                                });
                            }
                        });
                    }
                }
                
            });
            
        }
    } catch (error) {
        res.status(400);
        res.send(getErrorMessage(""+error));
    }
});


app.listen(SERVER_PORT, () => {
    log("Listening on port " + 2573);
});

function log(message) {
    console.log(message);
}

function getTimestamp() {
    return new Date().getTime();
}

function getErrorMessage(message) {
    return {
        errorMessage: message,
        timestamp: getTimestamp()
    };
}