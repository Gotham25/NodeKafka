
const express = require("express");
const http = require('http');
const bodyParser = require("body-parser");
const crypto = require("crypto");
const path = require("path");

const SERVER_PORT = process.env.PORT || 2573;
const MESSAGE_CONSUME_TOKEN = process.env.MESSAGE_CONSUME_TOKEN;
const MESSAGE_PRODUCE_TOKEN = process.env.MESSAGE_PRODUCE_TOKEN;
const MESSAGE_KEY_TOKEN = process.env.MESSAGE_KEY_TOKEN;
const PUT_USER_TOKEN = process.env.PUT_USER_TOKEN;
const AUTH_USER_TOKEN = process.env.AUTH_USER_TOKEN;
const AUTH_SECRET=process.env.AUTH_SECRET;
const FETCH_USER_KEYS_TOKEN=process.env.FETCH_USER_KEYS_TOKEN;

const expressApp = express();

const dbService = require("./service/dbservice");
const log = require("./service/logservice");
const kakfaService = require("./service/kafkaservice");
const redisDbService = require("./service/redisDbService");
let redisClient = redisDbService.redisClient;

expressApp.use(bodyParser.json());

expressApp.use((err, req, res, next) => {
    if(err) {
        res.status(400);
        res.send({
            errorMessage: ""+err,
            type: err.type,
            timestamp: getTimestamp()
        });
    } else {
        //Enabling CORS
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, contentType,Content-Type, Accept, Authorization");
        next();
    }
});

expressApp.get("/status", (req, res) => {
    log(new Date()+"\tPing Received");
    res.status(200);
    res.send({
        status: "UP",
        timestamp: getTimestamp()
    });
});

expressApp.post("/getMessage", (req, res) => {

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
            let sortedMessageKeys = Object.keys(kakfaService.messageKeys).sort();
            for (let keys = 0; keys < sortedMessageKeys.length; keys++) {
                const msgKey = sortedMessageKeys[keys];
                const msg = kakfaService.messages[msgKey];
                if(msgKey.startsWith(req.body.key) && kakfaService.messageKeys[msgKey] === false) {
                    kakfaService.messageKeys[msgKey] = true;
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

expressApp.get("/js/*", (req, res) => {
    log("js_req.url: "+req.url);
    res.sendFile(path.join(__dirname+req.url));
    //res.sendFile(path.resolve(req.url));
});

expressApp.get("/webfonts/*", (req, res) => {
    log("webfonts.url: "+req.url);
    res.sendFile(path.join(__dirname+req.url));
    //res.sendFile(path.resolve(req.url));
});

expressApp.get("/css/*", (req, res) => {
    log("css_req.url: "+req.url);
    res.sendFile(path.join(__dirname+req.url));
    //res.sendFile(path.resolve(req.url));
});

expressApp.get("/", (req, res) => {
    res.sendFile(path.join(__dirname+'/index.html'));
});

expressApp.get("/index.html", (req, res) => {
    res.sendFile(path.join(__dirname+'/index.html'));
});

expressApp.get("/adminLogin.html", (req, res) => {
    res.sendFile(path.join(__dirname+'/adminLogin.html'));
});


expressApp.get("/index2.html", (req, res) => {
    res.sendFile(path.join(__dirname+'/index2.html'));
});



expressApp.post("/putMessage", (req, res) => {

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
            let nodeProducer = kakfaService.producer;
            nodeProducer.connect();
            nodeProducer.send({
                topic: kakfaService.topic,
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


expressApp.get("/getKey", (req, res) => {
    try {
        let messageKeyToken = req.get("X-MESSAGE-KEY-TOKEN");
        if (messageKeyToken === undefined) {
            res.status(400);
            res.send(getErrorMessage("Missing MESSAGE-KEY-TOKEN header"));
        } else if (messageKeyToken !== MESSAGE_KEY_TOKEN) {
            res.status(400);
            res.send(getErrorMessage("Invalid MESSAGE-KEY-TOKEN specified"));
        } else {
            dbService.mysqlConnection.query('CALL GenerateUniqueValue(\'user_keys\', \'MESSAGE_KEY\')' , function(err, rows) {
                if(err) throw err;
                let msgKey = rows[0][0].uniqueValue;
                dbService.mysqlConnection.query('INSERT INTO `user_keys` (`MESSAGE_KEY`) VALUES(\''+msgKey+'\')', function(insErr, insRows) {
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


expressApp.post("/lockKey", (req, res) => {
    try {
        let messageKeyToken = req.get("X-MESSAGE-KEY-TOKEN");
        if (messageKeyToken === undefined) {
            res.status(400);
            res.send(getErrorMessage("Missing MESSAGE-KEY-TOKEN header"));
        } else if (messageKeyToken !== MESSAGE_KEY_TOKEN) {
            res.status(400);
            res.send(getErrorMessage("Invalid MESSAGE-KEY-TOKEN specified"));
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

            dbService.mysqlConnection.query('SELECT * FROM `user_keys` WHERE MESSAGE_KEY = \''+req.body.key+'\'' , function(err, rows) {
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
                        dbService.mysqlConnection.query('UPDATE `user_keys` SET IS_LOCKED = true WHERE MESSAGE_KEY = \''+req.body.key+'\'' , function(updErr, updRows) {
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

expressApp.post("/putUser", (req, res) => {

    try {
        let putUserToken = req.get("X-PUT-USER-TOKEN");
        if (putUserToken === undefined) {
            res.status(400);
            res.send(getErrorMessage("Missing PUT-USER-TOKEN header"));
        } else if (putUserToken !== PUT_USER_TOKEN) {
            res.status(400);
            res.send(getErrorMessage("Invalid PUT-USER-TOKEN specified"));
        } else if (req.body === undefined || JSON.stringify(req.body) === "{}") {
            res.status(400);
            res.send(getErrorMessage("Missing request body"));
        } else if (req.body.username === undefined || req.body.password === undefined) {
            res.status(400);
            res.send(getErrorMessage("username/password missing in request body"));
        } else if (!req.body.username.trim() || !req.body.password.trim()) {
            res.status(400);
            res.send(getErrorMessage("username/password is blank or empty in request body"));
        } else {

            redisClient.get(req.body.username, function(redis_err, redis_res) {
                if (redis_err===null && redis_res===null) {
                    let encryptedPassword = crypto.createHmac('SHA256', AUTH_SECRET).update(req.body.password).digest('base64');
                    redisClient.set(req.body.username, encryptedPassword, function(redis_err2, redis_res2) {
                        if(redis_res2 === "OK") {
                            res.send({
                                result: "success",
                                timestamp: getTimestamp()
                            });
                        } else if(redis_err2 != null) {
                            res.status(400);
                            res.send(getErrorMessage("Error in creating user, "+redis_err2));
                        }
                    });
                } else {
                    res.send({
                        result: "User exists already",
                        timestamp: getTimestamp()
                    });
                }
            });

        }
    } catch (error) {
        res.status(400);
        res.send(getErrorMessage(""+error));
    }
});


expressApp.post("/authenticateUser", (req, res) => {

    try {
        let authenticateUserToken = req.get("X-AUTH-USER-TOKEN");
        if (authenticateUserToken === undefined) {
            res.status(400);
            res.send(getErrorMessage("Missing AUTH-USER-TOKEN header"));
        } else if (authenticateUserToken !== AUTH_USER_TOKEN) {
            res.status(400);
            res.send(getErrorMessage("Invalid AUTH-USER-TOKEN specified"));
        } else if (req.body === undefined || JSON.stringify(req.body) === "{}") {
            res.status(400);
            res.send(getErrorMessage("Missing request body"));
        } else if (req.body.username === undefined || req.body.password === undefined) {
            res.status(400);
            res.send(getErrorMessage("username/password missing in request body"));
        } else if (!req.body.username.trim() || !req.body.password.trim()) {
            res.status(400);
            res.send(getErrorMessage("username/password is blank or empty in request body"));
        } else {

            redisClient.get(req.body.username, function(redis_err, redis_res) {

                if (redis_err===null && redis_res===null) {
                    res.send({
                        result: "Authentication failed. Invalid credentials...",
                        timestamp: getTimestamp()
                    });
                } else if(redis_res != null) {

                    let encryptedPassword = crypto.createHmac('SHA256', AUTH_SECRET).update(req.body.password).digest('base64');
                    if(encryptedPassword === redis_res) {
                        res.send({
                            result: "success",
                            timestamp: getTimestamp()
                        });
                    } else {
                        res.send({
                            result: "Authentication failed. Invalid credentials...",
                            timestamp: getTimestamp()
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

expressApp.post("/fetchUserKeys", (req, res) => {

    try {

        let fetchUserKeysToken = req.get("X-FETCH-USER-KEYS-TOKEN");
        if (fetchUserKeysToken === undefined) {
            res.status(400);
            res.send(getErrorMessage("Missing FETCH-USER-KEYS-TOKEN header"));
        } else if (fetchUserKeysToken !== FETCH_USER_KEYS_TOKEN) {
            res.status(400);
            res.send(getErrorMessage("Invalid FETCH-USER-KEYS-TOKEN specified"));
        } else {
            dbService.mysqlConnection.query('SELECT * FROM `user_keys`' , function(err, rows) {
                if(err != null) {
                    res.send({
                        result: "error",
                        errorMessage: err,
                        timestamp: getTimestamp()
                    });
                } else {
                    let userKeys = [];
                    
                    rows.forEach( (row) => {
                        let userKey = {
                            "id": row.ID,
                            "messageKey": row.MESSAGE_KEY,
                            "isLocked": row.IS_LOCKED,
                            "createdDate": row.CREATED_AT,
                            "updatedAt": row.UPDATED_AT
                        };
                        userKeys.push(userKey);
                    });

                    res.send({
                        result: "success",
                        keys: userKeys,
                        timestamp: getTimestamp()
                    });
                }
            });
        }
    } catch (error) {
        res.status(400);
        res.send(getErrorMessage(""+error));
    }
});

const expressServer = expressApp.listen(SERVER_PORT, () => {
    log("Listening on port " + SERVER_PORT);
    setInterval(() => {
        let pDomain = process.env.PROJECT_DOMAIN;
        if( pDomain === '' || pDomain === undefined || pDomain === null) {
            http.get(`http://localhost:2573/status`);
        }else{
            http.get(`http://${pDomain}.glitch.me/status`);
        }
        
    }, 180000);
});

function getTimestamp() {
    return new Date().getTime();
}

function getErrorMessage(message) {
    return {
        errorMessage: message,
        timestamp: getTimestamp()
    };
}

function terminateServer() {
    expressServer.close();
    log("Nodejs Express server stopped...");
}

process.on('SIGTERM', () => {
    redisClient.quit(() => {
        log("Redis DB connection gracefully closed...");
        terminateServer();
        dbService.destroyMySQLConnection();
        kakfaService.consumer.disconnect();
        process.exit(0);
    });
});



process.on('SIGINT', function() {
    
    // some other closing procedures go here
    terminateServer();
    dbService.destroyMySQLConnection();
    kakfaService.consumer.disconnect();
    redisClient.end(true);
    log( "\nRedis DB connection terminated..." );
    log( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
    process.exit(1);
});
