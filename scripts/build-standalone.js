'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const TARGETS = {
  'node18-linux-x64': 'node_mgo-linux-x64',
  'node18-linux-arm64': 'node_mgo-linux-arm64',
  'node18-macos-x64': 'node_mgo-macos-x64',
  'node18-macos-arm64': 'node_mgo-macos-arm64',
  'node18-win-x64': 'node_mgo-win-x64.exe',
};

const requested = (process.env.PKG_TARGETS || 'node18-linux-x64')
  .split(',')
  .map((target) => target.trim())
  .filter(Boolean);
const outputDirectory = path.resolve(process.env.PKG_OUTPUT || 'dist');
const entry = path.resolve(__dirname, '..', 'bin', 'node_mgo.js');
const pkgBinary = require.resolve('@yao-pkg/pkg/lib-es5/bin.js');

fs.mkdirSync(outputDirectory, { recursive: true });

for (const target of requested) {
  const asset = TARGETS[target];
  if (!asset) {
    throw new Error(`Unknown standalone target: ${target}`);
  }
  const output = path.join(outputDirectory, asset);
  process.stdout.write(`Building ${asset} (${target})...\n`);
  const result = spawnSync(
    process.execPath,
    [pkgBinary, entry, '--targets', target, '--output', output],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
  if (process.platform !== 'win32') {
    fs.chmodSync(output, 0o755);
  }
  process.stdout.write(`Built ${output}\n`);
}
