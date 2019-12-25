//@ts-check
const { ProcessClient } = require('../dist/api');

const processClient = new ProcessClient('message demo 1');

let i = 0;
setInterval(() => processClient.emit('ping', {
  counter: i++,
}), 3000);
