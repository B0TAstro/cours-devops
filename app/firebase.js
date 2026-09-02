const { initializeApp } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

const app_firebase = initializeApp({
  databaseURL: process.env.FIREBASE_URL_DATABASE
});

const database = getDatabase(app_firebase);

module.exports = {
  firebaseApp: app_firebase,
  database
};
