const { PassThrough } = require('stream');

function createArchiveStream(tags) {
  if (tags === 'error') {
    return Promise.reject(new Error('archive failed'));
  }

  const archive = new PassThrough();
  process.nextTick(() => archive.end('fake zip payload'));

  return Promise.resolve(archive);
}

module.exports = {
  createArchiveStream,
  MAX_PHOTOS: 10
};
