'use strict';

const subscriptionNameOrId = process.env.PUBSUB_VAR;

// Imports the Google Cloud client library
const { PubSub } = require('@google-cloud/pubsub');
// Creates a client
const pubSubClient = new PubSub();

function listenForMessages(subscriptionNameOrId) {
  // References an existing subscription
  const subscription = pubSubClient.subscription(subscriptionNameOrId);

  subscription.on('message', message => {
    console.log(`[worker] received ${message.id}: ${message.data}`);
    // "Ack" the message, otherwise Pub/Sub redelivers it forever
    message.ack();
  });

  subscription.on('error', error => {
    console.log('[worker] subscription error', error);
  });

  console.log(`[worker] listening on ${subscriptionNameOrId}`);

  return subscription;
}

// Need for testing files
if (process.env.NODE_ENV !== 'test') {
  listenForMessages(subscriptionNameOrId);
}

module.exports = {
  listenForMessages
};
