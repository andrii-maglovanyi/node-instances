"use strict";

var q = require("q");

var clients, // publisher and subscriber
    redlock,
    resource;

var Repository = function() {};

/**
 * Check if generator is already registered, this is the only blocking Redis transaction,
 * racing node instances are registered as subscribers if lock is not acquired
 *
 * @returns {*}
 */
Repository.prototype.checkIfGeneratorIsRegistered = function() {
    return q.Promise(function(resolve, reject) {
        redlock.lock(resource, 500, (err, lock) => {
            // Failed to acquire lock means generator to be already registered
            // register as a subscriber
            if (!lock) {
                resolve({generator: true});
            }

            clients.pub.exists(`${ resource }:generator`, (err, exists) => {
                if (err) {
                    reject(err);
                }

                console.log("Check if generator is already registered");
                resolve({generator: exists, lock: lock});
            });

        });
    });
};

/**
 * Register new generator, remove instance id from list of subscribers if any
 *
 * @param id
 * @returns {*}
 */
Repository.prototype.registerNewGenerator = function(id) {
    return q.Promise((resolve, reject) => {
        console.log("Register brand new generator");
        clients['pub'].multi()
            .set(`${ resource }:generator`, id)
            .srem(`${ resource }:subscribers`, id)
            .exec((err) => {
                if (err === null) {
                    console.log("Remove new generator from a list of subscribers");
                    clients.sub.unsubscribe(`message_${ id }`, (err, reply) => {
                        if (err) reject(err);

                        resolve(reply);
                    });
                } else {
                    reject(err);
                }
            });
    });
};

/**
 * Unregister generator and send STOP message to one of randomly picked subscribers
 *
 * @returns {*} Promises/A+
 */
Repository.prototype.unregisterGenerator = function() {
    return q.Promise((resolve, reject) => {
        clients.pub.del(`${ resource }:generator`, (err) => {
            if (err) {
                reject(err);
            }
            console.log("Unregister generator");

            clients.pub.smembers(`${ resource }:subscribers`, (err, reply) => {
                if (err) reject(err);

                if (reply) {
                    let id = reply[Math.floor(Math.random() * reply.length)];
                    console.log(`Get list of subscribers and assign "${ id }" as generator.`);
                    clients.pub.publish(`message_${ id }`, "stop", (err) => {
                        if (err) reject(err);

                        resolve(id);
                    });
                } else {
                    resolve();
                }
            });
        });
    });

}

/**
 * Add a subscriber instance to list subscribers area and subscribe on it's channel
 *
 * @param id
 */
Repository.prototype.registerNewSubscriber = function(id) {
    return q.Promise((resolve, reject) => {
        // Add instance to a list of subscribers
        clients.pub.sadd(`${ resource }:subscribers`, id, (err, reply) => {
            if (err) reject(err);

            resolve(reply);
        });
    });
}

/**
 * Remove current instance from list of subscribers
 *
 * @param id
 * @returns {*}
 */
Repository.prototype.unregisterSubscriber = function(id) {
    return q.Promise((resolve, reject) => {

        clients.pub.srem(`${ resource }:subscribers`, id, (err, reply) => {
            if (err) reject(err);

            console.log("Unsubscribe from subscribers list:", reply);
            resolve(reply);
        });
    });
}

/**
 * Store error message to Redis errors area
 *
 * @param code
 * @param message
 */
Repository.prototype.saveErrorMessage = function(code, message) {
    console.log(`Error (${ code }: ${ message })`);
    clients.pub.sadd(`${ resource }:errors`, JSON.stringify([code, message]));
}

/**
 * Send message to one of subscribers randomly
 *
 * @param message
 */
Repository.prototype.fireMessage = function(message) {
    clients.pub.smembers(`${ resource }:subscribers`, (err, reply) => {
        if (reply) {
            var id = reply[Math.floor(Math.random()*reply.length)];
            if (!id) {
                console.log("No subscribers found");
            } else {
                clients.pub.publish(`message_${ id }`, message, function(err, reply) {
                    console.log(`Fire message to ${ id }`);
                });
            }
        }
    });
}

/**
 * Get list of errors
 *
 * @returns {*}
 */
Repository.prototype.getErrors = function() {
    return q.Promise((resolve, reject) => {
        clients.pub.smembers(`${ resource }:errors`, (err, listOfErrors) => {
            if (err) reject(err);

            resolve(listOfErrors);
        });
    });
}

module.exports = function (_clients, _redlock, _resource) {
    clients = _clients,
    redlock = _redlock,
    resource = _resource;

    return new Repository();
};