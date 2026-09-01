function publishZipRequest(tags) {
  if (tags === 'error') {
    return Promise.reject('Internal server error');
  }

  return Promise.resolve('message-id-1');
}

module.exports = {
  publishZipRequest
};
