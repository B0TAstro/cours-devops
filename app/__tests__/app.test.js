const request = require('supertest');

jest.mock('../../app/photo_model');
jest.mock('../../app/queue_producer');
// server.js loads the worker, which pulls in got (an ESM-only package jest
// cannot parse); mocking the archive keeps it out of the module graph
jest.mock('../../app/photo_archive');
jest.mock('../../app/storage');
// the database and the web config both need real credentials or env vars, and
// the token check has its own tests -- here we want to exercise the routes
jest.mock('../../app/firebase');
jest.mock('../../app/web_config');
jest.mock('../../app/auth');
const firebase = require('../../app/firebase');
const jobStore = require('../../app/job_store');
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

  test('should show a download link once the worker archived those tags', () => {
    return jobStore
      .saveJob('archived', 'zips/ready.zip', 'https://storage.example/stale')
      .then(() =>
        request(app)
          .get('/?tags=archived&tagmode=all')
          .expect(200)
      )
      .then(response => {
        expect(response.text).toMatch(/https:\/\/storage.example\/signed/);
      });
  });

  test('should not show a download link when no archive exists yet', () => {
    return request(app)
      .get('/?tags=california&tagmode=all')
      .expect(200)
      .then(response => {
        expect(response.text).not.toMatch(/zip-download/);
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

describe('zips route', () => {
  beforeEach(() => {
    firebase.__reset();
  });

  afterEach(() => {
    app.server.close();
  });

  test('should answer the archives already recorded', () => {
    return jobStore
      .saveJob('california', 'zips/ready.zip', 'https://storage.example/stale')
      .then(() =>
        request(app)
          .get('/zips')
          .expect('Content-Type', /json/)
          .expect(200)
      )
      .then(response => {
        expect(response.body.total).toEqual(1);
        expect(response.body.zips[0].tags).toEqual('california');
        // the url stored at zip time is stale, a fresh one is signed per request
        expect(response.body.zips[0].url).toEqual('https://storage.example/signed');
        // the gcs path stays internal
        expect(response.body.zips[0].path).toBeUndefined();
      });
  });

  test('should narrow the archives down to one set of tags', () => {
    return jobStore
      .saveJob('california', 'zips/a.zip', 'https://storage.example/stale')
      .then(() => jobStore.saveJob('sunset', 'zips/b.zip', 'https://storage.example/stale'))
      .then(() =>
        request(app)
          .get('/zips?tags=sunset')
          .expect(200)
      )
      .then(response => {
        expect(response.body.total).toEqual(1);
        expect(response.body.zips[0].tags).toEqual('sunset');
      });
  });
});

describe('zips route, degraded cases', () => {
  beforeEach(() => {
    firebase.__reset();
  });

  afterEach(() => {
    app.server.close();
  });

  test('should list a record with no archive behind it, and no link', () => {
    return firebase.database
      .ref('/tom/whenever/10_0_zip')
      .set({
        createdAt: 1000,
        filename: '10_0.zip',
        status: 'successful',
        tags: 'stress-test'
      })
      .then(() =>
        request(app)
          .get('/zips')
          .expect(200)
      )
      .then(response => {
        expect(response.body.total).toEqual(1);
        expect(response.body.zips[0].filename).toEqual('10_0.zip');
        expect(response.body.zips[0].url).toBeNull();
      });
  });

  test('should respond with a 500 when the database cannot be read', () => {
    // mockImplementation and not mockReturnValue: the rejected promise has to
    // be created when the route calls it, so its catch is attached right away
    const listJobs = jest
      .spyOn(jobStore, 'listJobs')
      .mockImplementation(() => Promise.reject(new Error('database unreachable')));

    return request(app)
      .get('/zips')
      .expect('Content-Type', /json/)
      .expect(500)
      .then(response => {
        expect(response.body).toEqual({ error: 'Internal server error' });
        listJobs.mockRestore();
      });
  });
});
