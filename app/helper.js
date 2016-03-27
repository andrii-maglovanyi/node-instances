"use strict";

var q = require("q");

var id,
    repo,
    resource,
    generator = false;

function getMessage(obj) {
    obj.cnt = obj.cnt || 0;
    return obj.cnt++;
}

var Helper = function() {};

/**
 * Launch a new Node instance. If generator is already registered -
 * register a new subscriber, otherwise register a new generator
 * 
 * @param clients   Redis clients (publisher, subscriber)
 * @returns {*}     Promises/A+
 */
Helper.prototype.launchInstance = function (clients) {
    return q.Promise((resolve, reject) => {
        repo.checkIfGeneratorIsRegistered().done((result) => {
            if (result.generator === 0) {
                this.registerGenerator(result, resolve, reject);
            } else {
                repo.registerNewSubscriber(id).done(() => {
                    this.subscribeToChannels(clients, resolve, reject);
                });
            }
        }, (err) => reject(err));
    });
}

/**
 * The locking mechanism of registering of a new generator
 *
 * @param arg
 * @param resolve
 * @param reject
 */
Helper.prototype.registerGenerator = function(arg, resolve, reject) {
    repo.registerNewGenerator(id).done(() => {
        // New generator is registered - release the lock
        if (arg.lock) {
            arg.lock.unlock();
        }

        setInterval(() => repo.fireMessage(getMessage(this)), 500);
        generator = true;
        resolve()
    }, (err) => reject(err));
};

/**
 * Subscribe to message channels, register a new generator it stop message was received
 *
 * @param clients
 * @param resolve
 * @param reject
 */
Helper.prototype.subscribeToChannels = function (clients, resolve, reject) {
    clients.sub.subscribe(`message_${ id }`);
    clients.sub.on("subscribe", (channel, count) => console.log(`Subscribed to ${ channel }`));

    clients.sub.on("message", (channel, message) => {
        console.log(`Message from generator: ${ message }`);

        if (channel == "message_" + id && message == "stop") {
            console.log("Generator stopped, register new one");
            this.registerGenerator({}, resolve, reject);
        } else {
            console.log(message);

            setTimeout(() => {
                if (Math.random() > 0.85) {
                    repo.saveErrorMessage(500, message);
                }
            }, Math.floor(Math.random()*1000));
        }
    });

    resolve();
}

/**
 * List errors
 */
Helper.prototype.getErrors = function() {
    repo.getErrors().done((listOfErrors) => {
        console.log(`List of errors: ${ listOfErrors }`);
        this.exit();
    }, (error) => {
        console.log(`Error occured: ${ error }`);
        this.exit();
    });
}

/**
 * Unregister Node instance from Redis
 *
 * @returns {*}
 */
Helper.prototype.instanceTermination = function() {
    if (generator) {
        return repo.unregisterGenerator();
    } else {
        return repo.unregisterSubscriber(id);
    }
}

/**
 * Kill the instance
 */
Helper.prototype.exit = function() {
    console.log("Exiting...");
    process.exit();
}

module.exports = function (_id, _repo, _resource) {
    id = _id,
    repo = _repo,
    resource = _resource;

    return new Helper();
};