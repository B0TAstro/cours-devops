'use strict';

const { createClient } = require('redis');

const KEY_PREFIX = 'ratelimit:tom:';

let connecting = null;

function getClient() {
  if (!connecting) {
    const client = createClient({
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      socket: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT)
      }
    });

    client.on('error', error => {
      console.log('[redis] client error:', error.message);
    });

    connecting = client.connect().catch(error => {
      connecting = null;
      throw error;
    });
  }

  return connecting;
}

module.exports = {
  getClient,
  KEY_PREFIX
};
