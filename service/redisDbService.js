const redis = require("redis");
const log = require("./logservice");

const redisClient = redis.createClient(process.env.REDIS_URL);

redisClient.on("ready", function() {
    log("REDIS [READY]: Redis connection ready...");
});

redisClient.on("connect", function() {
    log("REDIS [CONNECT]: Connecting to Redis DB...");
});

redisClient.on("reconnecting", function() {
    console.warn("REDIS [RECONNECTING]: Connection lost. Attempting to reconnect to Redis DB...");
});

redisClient.on("error", function(errorMsg) {
    console.error("REDIS [ERROR]: "+errorMsg);
});

redisClient.on("end", function() {
    log("REDIS [END]: Closing Redis DB connection...");
});

redisClient.on("warning", function(warnMsg) {
    console.warn("REDIS [WARN]: "+warnMsg);
});


module.exports = {
    redisClient: redisClient
};
