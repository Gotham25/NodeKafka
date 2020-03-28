
const http = require('http');
const options = {
    host: '127.0.0.1',
    path: '/status',
    method: "GET",
    headers: { "Content-Type": "application/json" },
    port: 2573,
    timeout: 2000
};

const healthCheck = http.request(options, (res) => {
    console.log(`HEALTHCHECK STATUS: ${res.statusCode}`);
    let responseString = "";

    res.on("data", function (response) {
	console.log("response: "+response);
    });

    if (res.statusCode != 200) {
        process.exit(1);
    }

});

healthCheck.on('error', function (err) {
    console.error('ERROR');
    process.exit(1);
});

healthCheck.end();

