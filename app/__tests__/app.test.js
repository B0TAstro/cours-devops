const request = require('supertest');

jest.mock('../../app/photo_model');
jest.mock('../../app/queue_producer');
// server.js loads the worker, which pulls in got (an ESM-only package jest
// cannot parse); mocking the archive keeps it out of the module graph
jest.mock('../../app/photo_archive');
const app = require('../../app/server');

describe('index route', () => {
  afterEach(() => {
    app.server.close();
  });

  test('should respond with a 200 with no query parameters', () => {
    return request(app)
      .get('/')
      .expect('Content-Type', /html/)
      .expect(200)
      .then(response => {
        expect(response.text).toMatch(
          /<title>Express App Testing Demo<\/title>/
        );
      });
  });

  test('should respond with a 200 with valid query parameters', () => {
    return request(app)
      .get('/?tags=california&tagmode=all')
      .expect('Content-Type', /html/)
      .expect(200)
      .then(response => {
        expect(response.text).toMatch(
          /<div class="panel panel-default search-results">/
        );
      });
  });

  test('should respond with a 200 with invalid query parameters', () => {
    return request(app)
      .get('/?tags=california123&tagmode=all')
      .expect('Content-Type', /html/)
      .expect(200)
      .then(response => {
        expect(response.text).toMatch(/<div class="alert alert-danger">/);
      });
  });

  test('should respond with a 500 error due to bad jsonp data', () => {
    return request(app)
      .get('/?tags=error&tagmode=all')
      .expect('Content-Type', /json/)
      .expect(500)
      .then(response => {
        expect(response.body).toEqual({ error: 'Internal server error' });
      });
  });
});

describe('zip route', () => {
  afterEach(() => {
    app.server.close();
  });

  test('should redirect back to the results page with valid query parameters', () => {
    return request(app)
      .post('/zip?tags=california&tagmode=all')
      .expect(303)
      .expect('Location', '/?tags=california&tagmode=all');
  });

  test('should url-encode the tags in the redirect location', () => {
    return request(app)
      .post('/zip?tags=california,sunset&tagmode=any')
      .expect(303)
      .expect('Location', '/?tags=california%2Csunset&tagmode=any');
  });

  test('should respond with a 400 with invalid tags', () => {
    return request(app)
      .post('/zip?tags=california123&tagmode=all')
      .expect('Content-Type', /json/)
      .expect(400)
      .then(response => {
        expect(response.body).toEqual({
          error: 'Invalid value for "tags" or "tagmode" input parameters'
        });
      });
  });

  test('should respond with a 400 with an invalid tagmode', () => {
    return request(app)
      .post('/zip?tags=california&tagmode=nonsense')
      .expect('Content-Type', /json/)
      .expect(400);
  });

  test('should respond with a 400 with no query parameters', () => {
    return request(app)
      .post('/zip')
      .expect('Content-Type', /json/)
      .expect(400);
  });

  test('should respond with a 500 when the queue cannot be reached', () => {
    return request(app)
      .post('/zip?tags=error&tagmode=all')
      .expect('Content-Type', /json/)
      .expect(500)
      .then(response => {
        expect(response.body).toEqual({ error: 'Internal server error' });
      });
  });
});
