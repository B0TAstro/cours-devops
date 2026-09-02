'use strict';

const REQUIRED_VARS = [
  'FIREBASE_CONFIG_APIKEY',
  'FIREBASE_CONFIG_AUTHDOMAIN',
  'FIREBASE_URL_DATABASE',
  'FIREBASE_CONFIG_PROJECTID',
  'FIREBASE_CONFIG_STORAGEBUCKET',
  'FIREBASE_CONFIG_MESSAGINGSENDERID',
  'FIREBASE_CONFIG_APPID'
];

function buildWebConfig() {
  const missing = REQUIRED_VARS.filter(name => !process.env[name]);

  if (missing.length) {
    throw new Error(`missing firebase web config: ${missing.join(', ')}`);
  }

  return {
    apiKey: process.env.FIREBASE_CONFIG_APIKEY,
    authDomain: process.env.FIREBASE_CONFIG_AUTHDOMAIN,
    databaseURL: process.env.FIREBASE_URL_DATABASE,
    projectId: process.env.FIREBASE_CONFIG_PROJECTID,
    storageBucket: process.env.FIREBASE_CONFIG_STORAGEBUCKET,
    messagingSenderId: process.env.FIREBASE_CONFIG_MESSAGINGSENDERID,
    appId: process.env.FIREBASE_CONFIG_APPID
  };
}

function serializeWebConfig() {
  return JSON.stringify(buildWebConfig()).replace(/</g, '\\u003c');
}

module.exports = {
  buildWebConfig,
  serializeWebConfig
};
