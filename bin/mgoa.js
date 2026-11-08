#!/usr/bin/env node
'use strict';

const { main } = require('../src/mgoa');

for (const stream of [process.stdout, process.stderr]) {
  stream.on('error', (error) => {
    if (error && error.code === 'EPIPE') process.exit(0);
    throw error;
  });
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    process.stderr.write(`Error: ${error && error.message ? error.message : error}\n`);
    process.exitCode = 1;
  });
