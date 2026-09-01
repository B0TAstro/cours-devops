const querystring = require('querystring');
const formValidator = require('./form_validator');
const photoModel = require('./photo_model');
const queueProducer = require('./queue_producer');

function route(app) {
  app.get('/', (req, res) => {
    const tags = req.query.tags;
    const tagmode = req.query.tagmode;

    const ejsLocalVariables = {
      tagsParameter: tags || '',
      tagmodeParameter: tagmode || '',
      photos: [],
      searchResults: false,
      invalidParameters: false
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
        return res.render('index', ejsLocalVariables);
      })
      .catch(error => {
        console.log('aspdfonaposd', error);
        return res.status(500).send({ error });
      });
  });

  app.post('/zip', (req, res) => {
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
}

module.exports = route;
