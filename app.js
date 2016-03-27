var crypto = require("crypto"),
    config = require("./config"),
    clients = require("./app/redis").clients,
    redlock = require("./app/redis").redlock,
    Repository = require("./app/repository"),
    Helper = require("./app/helper"),
    id = crypto.randomBytes(20).toString("hex"),
    resource = "area";

var repo = new Repository(clients, redlock, resource),
    helper = new Helper(id, repo, resource);

helper.launchInstance(clients);

// Handle instance termination
process.on("SIGINT", () => {
    console.log("Gracefully shutting down from SIGINT (Ctrl+C)");
    helper.instanceTermination().done(() => helper.exit());
});

// List all errors
process.argv.forEach((val) => {
    if (val == "getErrors") {
        helper.getErrors();
    }
});