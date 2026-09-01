'use strict';

const crypto = require('crypto');
const { Storage } = require('@google-cloud/storage');

const storage = new Storage();
const TWO_DAYS_IN_MS = 2 * 24 * 60 * 60 * 1000;

function bucket() {
  return storage.bucket(process.env.STORAGE_BUCKET);
}

// Pipes a readable zip stream straight into the bucket and resolves with the
// object name it was stored under. Nothing is buffered on the way.
function uploadArchiveStream(archive) {
  const name = `zips/${crypto.randomUUID()}.zip`;
  const upload = bucket()
    .file(name)
    .createWriteStream({
      metadata: {
        contentType: 'application/zip',
        cacheControl: 'private'
      },
      resumable: false
    });

  return new Promise((resolve, reject) => {
    archive.on('error', reject);
    upload.on('error', reject);
    upload.on('finish', () => resolve(name));

    archive.pipe(upload);
  });
}

// Part V: a temporary read link on the stored archive.
function getDownloadUrl(name) {
  return bucket()
    .file(name)
    .getSignedUrl({
      action: 'read',
      expires: Date.now() + TWO_DAYS_IN_MS
    })
    .then(signedUrls => signedUrls[0]);
}

module.exports = {
  uploadArchiveStream,
  getDownloadUrl
};
