'use strict';

const { getAuth } = require('firebase-admin/auth');
const { firebaseApp } = require('./firebase');

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

module.exports = {
  requireUser
};