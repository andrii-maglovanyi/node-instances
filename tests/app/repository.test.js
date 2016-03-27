var expect = require("chai").expect,
    redlock = require("./../mocks/redlock.mock"),
    fakeredis = require("fakeredis"),
    Repository = require("./../../app/repository");

var resource = "TEST";
var clients = {
    "pub": fakeredis.createClient("test-pub"),
    "sub": fakeredis.createClient("test-sub")
};
var repo = new Repository(clients, redlock, resource);

describe("Repository test", function() {
    beforeEach((done) => clients.pub.flushdb(()=> done()));

    it("checkIfGeneratorIsRegistered should return null", (done) => {
        repo.checkIfGeneratorIsRegistered().done((result) => {
            expect(result.generator).to.equal(0);
            done();
        });
    });

    it("should register and unregister new subscriber", (done) => {
       repo.registerNewSubscriber("test-subscriber-id").done((result) => {
           expect(result).to.equal(1);
           clients.pub.smembers(`${ resource }:subscribers`, (err, subscribers) => {
               expect(subscribers[0]).to.equal("test-subscriber-id");

               repo.unregisterSubscriber("test-subscriber-id").done((result) => {
                   expect(result).to.equal(1);
                   clients.pub.smembers(`${ resource }:subscribers`, (err, subscribers) => {
                       expect(subscribers.length).to.equal(0);
                       done();
                   });
               })
           });
       });
    });

    it("should register new generator", (done) => {
        repo.registerNewGenerator('test-generator-id').done((result) => {
            expect(result).to.equal("OK");
            clients.pub.get(resource + ":generator", (err, generatorId) => {
                expect(generatorId).to.equal("test-generator-id");
                clients["pub"].flushdb();
                done();
            });
        });
    });
});