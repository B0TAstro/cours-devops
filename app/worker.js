'use strict';

const subscriptionNameOrId = process.env.PUBSUB_VAR;

// Imports the Google Cloud client library
const { PubSub } = require('@google-cloud/pubsub');
const photoArchive = require('./photo_archive');
const storage = require('./storage');
const jobStore = require('./job_store');
// Creates a client
const pubSubClient = new PubSub();

function listenForMessages(subscriptionNameOrId) {
  // References an existing subscription
  const subscription = pubSubClient.subscription(subscriptionNameOrId);

  subscription.on('message', message => {
    console.log(`[worker] received ${message.id}: ${message.data}`);

    const { tags, tagmode } = JSON.parse(message.data.toString());

    return photoArchive
      .createArchiveStream(tags, tagmode)
      .then(archive => storage.uploadArchiveStream(archive))
      .then(name =>
        storage
          .getDownloadUrl(name)
          .then(url => jobStore.saveJob(tags, name, url))
          .then(() => console.log(`[worker] archive ready for "${tags}": ${name}`))
      )
      .catch(error => {
        console.log(`[worker] failed to archive "${tags}"`, error);
      })
      .then(() => {
        // "Ack" the message once the work is done, otherwise Pub/Sub redelivers it forever
        message.ack();
      });
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
