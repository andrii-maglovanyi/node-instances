"use strict";

var config = require("../config"),
    redis = require("redis"),
    Redlock = require("redlock"),
    url = require("url");

var clients = {};
var redisConfig = url.parse(config.REDISURL);

['pub', 'sub'].forEach((item) => {
    clients[item] = redis.createClient(redisConfig.port, redisConfig.hostname);
    clients[item].on("error", (err) => console.log(err));
})


var redlock = new Redlock(
    [clients['pub']],
    {
        // the max number of times Redlock will attempt to lock a resource before erroring
        retryCount:  3,

        // the time in ms between attempts
        retryDelay:  200
    }
);

module.exports.clients = clients;
module.exports.redlock = redlock;