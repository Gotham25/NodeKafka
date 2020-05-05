const logToCloud = require("./cloudlogservice");

module.exports = function (message) {
    console.log(message);
    logToCloud(message);
}