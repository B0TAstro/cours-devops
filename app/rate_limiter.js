'use strict';

const { getClient, KEY_PREFIX } = require('./redis');
const { consume, BUCKET_SIZE, REFILL_PER_SECOND } = require('./token_bucket');

const KEY_TTL_SECONDS = Math.ceil(BUCKET_SIZE / REFILL_PER_SECOND);

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return req.socket.remoteAddress || null;
}

async function rateLimit(req, res, next) {
  const key = KEY_PREFIX + clientIp(req);
  let allowed = true;
  try {
    const client = await getClient();
    const stored = await client.get(key);
    const outcome = consume(stored ? JSON.parse(stored) : null, Date.now());

    allowed = outcome.allowed;

    await client.set(key, JSON.stringify(outcome.state), {
      expiration: { type: 'EX', value: KEY_TTL_SECONDS }
    });
  } catch (error) {
    console.log('[rate limiter] redis unavailable, letting through:', error.message);
  }

  if (!allowed) {
    return res.status(429).send({ error: 'Too many requests' });
  }

  return next();
}

module.exports = {
  rateLimit
};
