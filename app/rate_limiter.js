'use strict';

const { consume } = require('./token_bucket');

const buckets = new Map();

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return req.socket.remoteAddress || null;
}

function rateLimit(req, res, next) {
  const ip = clientIp(req);
  const { allowed, state } = consume(buckets.get(ip) || null, Date.now());

  buckets.set(ip, state);

  if (!allowed) {
    return res.status(429).send({ error: 'Too many requests' });
  }

  return next();
}

module.exports = {
  rateLimit
};
