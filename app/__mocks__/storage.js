function uploadArchiveStream() {
  return Promise.resolve('zips/fake-object-name.zip');
}

function getDownloadUrl() {
  return Promise.resolve('https://storage.example/signed');
}

module.exports = {
  uploadArchiveStream,
  getDownloadUrl
};
