"use strict";

var expect = require("chai").expect,
    async = require("async"),
    redlock = require("./../mocks/redlock.mock"),
    fakeredis = require("fakeredis"),
    Repository = require("./../../app/repository"),
    Helper = require("./../../app/helper");

var resource = "TEST";
var clients = {
    "pub": fakeredis.createClient("test-pub"),
    "sub": fakeredis.createClient("test-sub")
};
var repo = new Repository(clients, redlock, resource),
    helper = new Helper("test-instance", repo, resource);

describe("Helper methods test", function() {
    beforeEach((done) => clients.pub.flushdb(()=> done()));

    it("should register one instance as generator, while other one as subscriber", (done) => {
        async.series([
            (callback) => {
                let helper = new Helper("test-instance-one", repo, resource);
                helper.launchInstance(clients).done(() => callback());
            },
            (callback) => {
                let helper = new Helper("test-instance-two", repo, resource);
                helper.launchInstance(clients).done(() => callback());
            },
            () => {
                clients.pub.get(resource + ":generator", (err, generatorId) => {
                    expect(generatorId).to.equal("test-instance-one");
                    clients.pub.smembers(resource + ":subscribers", (err, subscribers) => {
                        expect(subscribers[0]).to.equal("test-instance-two");
                        done();
                    });
                });
            }
        ]);
    });

    it("should switch instance role on terminating of generator", (done) => {
        let generator;
        async.series([
            (callback) => {
                generator = new Helper("test-instance-one", repo, resource);
                generator.launchInstance(clients).done(() => callback());
            },
            (callback) => {
                let subscriber = new Helper("test-instance-two", repo, resource);
                subscriber.launchInstance(clients).done(() => callback());
            },
            () => {
                generator.instanceTermination().done((generatorId) => {
                    expect(generatorId).to.equal("test-instance-two");
                    done();
                })
            }
        ]);
    });

    it("should list all error messages", function(done) {
        let generator = new Helper("test-generator", repo, resource);
        helper.launchInstance(clients).done(() => {
            repo.saveErrorMessage(500, "Test error");

            repo.getErrors().done((listOfErrors) => {
                expect(listOfErrors).to.eql(['[500,"Test error"]']);
                done();
            });
        });
    });
});