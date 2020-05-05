var logger = require('logzio-nodejs').createLogger({
    token: process.env.LOGZIO_SHIPPING_TOKEN,
    protocol: 'https',
    host: process.env.LOGZIO_HOST,
    port: '8071',
    type: 'LOGZIO_CLOUD_LOGGER',
    addTimestampWithNanoSecs: true
});

module.exports = function (message) {
    logger.log(message);
}