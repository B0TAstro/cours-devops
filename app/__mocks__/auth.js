// Lets the route tests exercise the routes rather than the token checks. The
// real middlewares have their own unit tests in __tests__/auth.test.js.
function requireUser(req, res, next) {
  req.user = { uid: 'test-uid', email: 'test@example.com' };

  return next();
}

function requireApiKey(req, res, next) {
  return next();
}

module.exports = {
  requireUser,
  requireApiKey
};
