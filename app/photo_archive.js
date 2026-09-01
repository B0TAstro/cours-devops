'use strict';

const got = require('got');
const { ZipArchive } = require('archiver');
const photoModel = require('./photo_model');

const MAX_PHOTOS = 10;

// Returns a readable zip stream. Each photo is piped straight from Flickr into the archive
function createArchiveStream(tags, tagmode) {
  return photoModel.getFlickrPhotos(tags, tagmode).then(photos => {
    const archive = new ZipArchive();

    photos.slice(0, MAX_PHOTOS).forEach((photo, index) => {
      // indexed names: two Flickr photos can share a filename, and duplicate entries corrupt a zip
      archive.append(got.default.stream(photo.media.b), {
        name: `photo-${index + 1}.jpg`
      });
    });

    // tells the archive that no further entry is coming; without it the stream never ends
    archive.finalize();

    return archive;
  });
}

module.exports = {
  createArchiveStream,
  MAX_PHOTOS
};
