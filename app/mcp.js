'use strict';

const { z } = require('zod');
const { McpServer } = require('@modelcontextprotocol/server');
const formValidator = require('./form_validator');
const photoModel = require('./photo_model');
const jobStore = require('./job_store');
const storage = require('./storage');

const ARCHIVE_LIST_LIMIT = 50;

function text(value) {
  return {
    content: [
      {
        type: 'text',
        text: typeof value === 'string' ? value : JSON.stringify(value, null, 2)
      }
    ]
  };
}

function registerTools(server) {
  server.registerTool(
    'search_flickr_photos',
    {
      title: 'Search Flickr photos',
      description:
        'Search the public Flickr feed by tags and return the photos found. ' +
        'Use this to find out what a set of tags returns before asking for an archive.',
      inputSchema: {
        tags: z
          .string()
          .describe(
            'Comma separated list of tags, letters commas and spaces only, e.g. "california,sunset"'
          ),
        tagmode: z
          .enum(['all', 'any'])
          .describe(
            '"all" matches photos carrying every tag, "any" matches photos carrying at least one'
          )
      }
    },
    async ({ tags, tagmode }) => {
      if (!formValidator.hasValidFlickrAPIParams(tags, tagmode)) {
        return text(
          'Those parameters are not usable. Tags must only contain letters, commas and spaces, ' +
            'and tagmode must be "all" or "any".'
        );
      }

      const photos = await photoModel.getFlickrPhotos(tags, tagmode);

      if (!photos.length) {
        return text(`No photo matches the tags "${tags}" with tagmode "${tagmode}".`);
      }

      return text({
        tags,
        tagmode,
        count: photos.length,
        photos: photos.map(photo => ({
          title: photo.title,
          page: photo.link,
          image: photo.media && photo.media.b
        }))
      });
    }
  );

  server.registerTool(
    'list_archives',
    {
      title: 'List generated archives',
      description:
        'List the zip archives already generated, most recent first. ' +
        'Entries with downloadable set to false have no archive behind them any more.',
      inputSchema: {
        tags: z
          .string()
          .optional()
          .describe(
            'Only return the archives generated for exactly these tags. Omit to list everything.'
          )
      }
    },
    async ({ tags }) => {
      const jobs = await jobStore.listJobs();
      const matching = tags ? jobs.filter(job => job.tags === tags) : jobs;

      if (!matching.length) {
        return text(
          tags
            ? `No archive has been generated for the tags "${tags}" yet.`
            : 'No archive has been generated yet.'
        );
      }

      return text({
        total: matching.length,
        returned: Math.min(matching.length, ARCHIVE_LIST_LIMIT),
        archives: matching.slice(0, ARCHIVE_LIST_LIMIT).map(job => ({
          tags: job.tags,
          filename: job.filename,
          createdAt: new Date(job.createdAt).toISOString(),
          downloadable: Boolean(job.path)
        }))
      });
    }
  );

  server.registerTool(
    'get_archive_download_url',
    {
      title: 'Get an archive download url',
      description:
        'Return a temporary download link for the archive generated for a set of tags. ' +
        'The link is signed on every call and expires after two days.',
      inputSchema: {
        tags: z.string().describe('The tags the archive was generated for')
      }
    },
    async ({ tags }) => {
      const job = await jobStore.findJob(tags);

      if (!job) {
        return text(
          `No downloadable archive exists for the tags "${tags}". ` +
            'Call list_archives to see what is available.'
        );
      }

      const url = await storage.getDownloadUrl(job.path);

      return text({
        tags: job.tags,
        createdAt: new Date(job.createdAt).toISOString(),
        url,
        expiresInHours: 48
      });
    }
  );

  return server;
}

function createServer() {
  return registerTools(new McpServer({ name: 'cours-devops-zipper', version: '1.0.0' }));
}

module.exports = {
  createServer,
  registerTools
};
