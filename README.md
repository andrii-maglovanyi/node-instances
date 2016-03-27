## node-instances-communication

### Description

A Node.js application that works with Redis, and can generate messages as well as process them.
It is possible to run any amount of Node instances simultaneously. The data is exchanged between instances via Redis.
All other copies of an application (in addition to the Generator) are message handlers (Subscribers) and randomly receive messages from Redis.
All messages are to be processed only once and by only one of handlers.

Only one running Node instance may become a Generator, it means that any application may become a Generator, but only one at single moment of time.
If the current application generator is forced to exit, one of the applications should replace the finished one and become a generator.

If eventHandler results to an error - it should be written to Redis under errors section.
If the application was launched with 'getErrors' parameter - it should echo all error messages and terminate.

#### Setup

* Clone the project
* Install the Redis server
* Run the *npm install* command to install all dependencies
* Run *REDISURL=redis://localhost:6379 npm start* to launch an application with a path to Redis instance as environment variable
* Run several more instances in the same way as described above

#### Usage

Running few instances simultaneously will show the communication between them
Run a redis instance with "getError" parameter to show all errors

#### Used technologies
Application's been made using:

* Node.js
* Redis (Redlock)
* Mocha
* Istanbul
* Chai

#### Application directory Layout

```
app/
  helper.js             --> application helper methods
  redis.js              --> initialise publisher and subscriber, and also redlock mechanism
  repository.js         --> repository pattern using dependency injection
tests/
  app/
    helper.test.js
    repository.test.js
  mocks/
    redlock.mock.js     --> mocking redlock helper
app.js                  --> the main application
config.js               --> configuration and environment variables
```

##### Who do I talk to?

Should you have any questions or seek further clarifications, please feel free to contact me at andrii.maglovanyi@gmail.com
