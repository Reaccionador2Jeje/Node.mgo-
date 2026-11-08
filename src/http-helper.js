'use strict';

async function run(args) {
  const [method, url, payload] = args;
  try {
    const options = {
      method,
      headers: { 'User-Agent': 'Memingo/0.2' },
    };
    if (method === 'POST') {
      options.headers['Content-Type'] = 'application/json';
      options.body = payload;
    }
    const response = await fetch(url, options);
    const body = await response.text();
    process.stdout.write(
      JSON.stringify({
        ok: response.ok,
        status: response.status,
        contentType: response.headers.get('content-type') || '',
        body,
      }),
    );
  } catch (error) {
    process.stdout.write(
      JSON.stringify({ error: String((error && error.message) || error) }),
    );
  }
}

module.exports = { run };
