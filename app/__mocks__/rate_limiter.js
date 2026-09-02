// Lets the route tests exercise the routes rather than the bucket. The real
// middleware keeps one bucket per client at module level, so six requests to
// /zip in a row would otherwise run into the limit mid-suite.
function rateLimit(req, res, next) {
  return next();
}

module.exports = {
  rateLimit
};
