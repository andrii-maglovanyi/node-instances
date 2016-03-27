module.exports = {
    lock: function(resource, ttl, callback) {
        return callback(null, this);
    },
    unlock: function() {
        return true;
    }
};