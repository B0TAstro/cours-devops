const { PubSub } = require('@google-cloud/pubsub');

const pubSubClient = new PubSub();

function publishZipRequest(tags, tagmode) {
  const payload = { tags, tagmode };

  return pubSubClient
    .topic(process.env.PUBSUB_VAR)
    .publishMessage({ data: Buffer.from(JSON.stringify(payload)) });
}

module.exports = {
  publishZipRequest
};
