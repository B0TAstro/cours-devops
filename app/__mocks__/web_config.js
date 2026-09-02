// The real one reads seven environment variables and refuses to boot without
// them; the tests only need server.js to be able to render a view.
function buildWebConfig() {
  return {
    apiKey: 'test-api-key',
    authDomain: 'test.firebaseapp.com',
    databaseURL: 'https://test.firebaseio.com',
    projectId: 'test-project',
    storageBucket: 'test.firebasestorage.app',
    messagingSenderId: '0',
    appId: 'test-app-id'
  };
}

function serializeWebConfig() {
  return JSON.stringify(buildWebConfig());
}

module.exports = {
  buildWebConfig,
  serializeWebConfig
};
