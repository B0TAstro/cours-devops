const querystring = require('querystring');
const formValidator = require('./form_validator');
const photoModel = require('./photo_model');
const queueProducer = require('./queue_producer');
const storage = require('./storage');
const jobStore = require('./job_store');
const { requireUser } = require('./auth');

const ZIPS_PAGE_SIZE = 100;

function route(app) {
  app.get('/', (req, res) => {
    const tags = req.query.tags;
    const tagmode = req.query.tagmode;

    const ejsLocalVariables = {
      tagsParameter: tags || '',
      tagmodeParameter: tagmode || '',
      photos: [],
      searchResults: false,
      invalidParameters: false,
      downloadUrl: null
    };

    // if no input params are passed in then render the view with out querying the api
    if (!tags && !tagmode) {
      return res.render('index', ejsLocalVariables);
    }

    // validate query parameters
    if (!formValidator.hasValidFlickrAPIParams(tags, tagmode)) {
      ejsLocalVariables.invalidParameters = true;
      return res.render('index', ejsLocalVariables);
    }

    // get photos from flickr public feed api
    return photoModel
      .getFlickrPhotos(tags, tagmode)
      .then(photos => {
        ejsLocalVariables.photos = photos;
        ejsLocalVariables.searchResults = true;

        return jobStore.findJob(tags);
      })
      .then(job => {
        if (!job) {
          return res.render('index', ejsLocalVariables);
        }

        // rebuild the link from the stored gcs path: the saved url only lives for two days
        return storage.getDownloadUrl(job.path).then(downloadUrl => {
          ejsLocalVariables.downloadUrl = downloadUrl;
          return res.render('index', ejsLocalVariables);
        });
      })
      .catch(error => {
        console.log('failed to render the search results', error);
        return res.status(500).send({ error });
      });
  });

  app.post('/zip', requireUser, (req, res) => {
    const tags = req.query.tags;
    const tagmode = req.query.tagmode;

    console.log(`[zip] request received -- tags: "${tags}", tagmode: "${tagmode}"`);

    if (!formValidator.hasValidFlickrAPIParams(tags, tagmode)) {
      console.log('[zip] rejected -- invalid tags or tagmode');
      return res.status(400).send({
        error: 'Invalid value for "tags" or "tagmode" input parameters'
      });
    }

    return queueProducer
      .publishZipRequest(tags, tagmode)
      .then(messageId => {
        console.log(`[zip] published to ${process.env.PUBSUB_VAR} -- messageId: ${messageId}`);
        const qs = querystring.stringify({ tags, tagmode });
        return res.redirect(303, `/?${qs}`);
      })
      .catch(error => {
        console.log('failed to publish the zip request', error);
        return res.status(500).send({ error: 'Internal server error' });
      });
  });

  app.get('/zips', requireUser, (req, res) => {
    const tags = req.query.tags;
    return jobStore
      .listJobs()
      .then(jobs => {
        const matching = tags ? jobs.filter(job => job.tags === tags) : jobs;
        const page = matching.slice(0, ZIPS_PAGE_SIZE);

        return Promise.all(
          page.map(job =>
            (job.path ? storage.getDownloadUrl(job.path) : Promise.resolve(null)).then(url => ({
              tags: job.tags,
              filename: job.filename,
              createdAt: job.createdAt,
              url
            }))
          )
        ).then(zips =>
          res.json({
            total: matching.length,
            returned: zips.length,
            zips
          })
        );
      })
      .catch(error => {
        console.log('failed to list the generated zips', error);
        return res.status(500).send({ error: 'Internal server error' });
      });
  });
}

module.exports = route;
