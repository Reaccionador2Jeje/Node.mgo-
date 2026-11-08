#!/usr/bin/env node
'use strict';

for (const stream of [process.stdout, process.stderr]) {
  stream.on('error', (error) => {
    if (error && error.code === 'EPIPE') process.exit(0);
    throw error;
  });
}

if (process.env.MGO_HTTP_HELPER === '1') {
  require('../src/http-helper')
    .run([
      process.env.MGO_HTTP_METHOD,
      process.env.MGO_HTTP_URL,
      process.env.MGO_HTTP_PAYLOAD,
    ])
    .then(() => {
      process.exitCode = 0;
    })
    .catch((error) => {
      process.stderr.write(`Error: ${error && error.message ? error.message : error}\n`);
      process.exitCode = 1;
    });
} else {
  const { main } = require('../src/cli');

  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      process.stderr.write(`Error: ${error && error.message ? error.message : error}\n`);
      process.exitCode = 1;
    });
}
