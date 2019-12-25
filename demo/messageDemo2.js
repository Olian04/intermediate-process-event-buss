//@ts-check
const { ProcessClient } = require('../dist/api');

const processClient = new ProcessClient('message demo 2');

processClient.on('ping', (message) => {
  // @ts-ignore
  console.log(message);
});