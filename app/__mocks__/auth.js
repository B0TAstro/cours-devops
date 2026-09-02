// Lets the route tests exercise the routes rather than the token check. The
// real middleware has its own unit tests in __tests__/auth.test.js.
function requireUser(req, res, next) {
  req.user = { uid: 'test-uid', email: 'test@example.com' };

  return next();
}

module.exports = {
  requireUser
};
