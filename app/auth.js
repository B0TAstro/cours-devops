'use strict';

const crypto = require('crypto');
const { getAuth } = require('firebase-admin/auth');
const { firebaseApp } = require('./firebase');

function timingSafeEqualString(a, b) {
  const digest = value => crypto.createHash('sha256').update(value).digest();

  return crypto.timingSafeEqual(digest(a), digest(b));
}

function bearerToken(req) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  return scheme === 'Bearer' && token ? token : null;
}

function requireUser(req, res, next) {
  const token = bearerToken(req);

  if (!token) {
    return res.status(401).send({ error: 'Missing bearer token' });
  }

  return getAuth(firebaseApp)
    .verifyIdToken(token)
    .then(decoded => {
      req.user = { uid: decoded.uid, email: decoded.email };
      return next();
    })
    .catch(error => {
      console.log('[auth] rejected token:', error.code);
      return res.status(401).send({ error: 'Invalid or expired token' });
    });
}

function requireApiKey(req, res, next) {
  const token = bearerToken(req);
  const expected = process.env.MCP_API_KEY;

  if (!expected) {
    console.log('[auth] MCP_API_KEY is not set, refusing every mcp call');
    return res.status(503).send({ error: 'Server not configured' });
  }

  if (!token || !timingSafeEqualString(token, expected)) {
    return res.status(401).send({ error: 'Invalid api key' });
  }

  return next();
}

module.exports = {
  requireUser,
  requireApiKey
};