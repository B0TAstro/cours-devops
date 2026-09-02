const path = require('path');
const { database } = require('./firebase');

const FORBIDDEN_KEY_CHARS = /[.#$[\]/]/g;

function helperRegex(value) {
  return String(value).replace(FORBIDDEN_KEY_CHARS, '_');
}

function saveJob(tags, name, url) {
  const zippedAt = helperRegex(new Date().toISOString());
  const filename = helperRegex(path.basename(name));

  return database.ref(`/tom/${zippedAt}/${filename}`).set({
    path: name,
    url,
    tags,
    createdAt: Date.now()
  });
}

function normalizeJob(record, filenameKey) {
  if (!record) {
    return null;
  }

  const createdAt = typeof record.createdAt === 'number' ? record.createdAt : Date.parse(record.createdAt);
  return {
    tags: typeof record.tags === 'string' ? record.tags : null,
    filename: record.filename || filenameKey,
    path: typeof record.path === 'string' ? record.path : null,
    createdAt: Number.isNaN(createdAt) ? 0 : createdAt
  };
}

async function listJobs() {
  const snapshot = await database.ref('/tom').get();
  const jobs = [];

  // two levels to walk: /tom/<zippedAt>/<filename>
  snapshot.forEach(byTime => {
    byTime.forEach(byFile => {
      const job = normalizeJob(byFile.val(), byFile.key);
      if (job) {
        jobs.push(job);
      }
    });
  });

  return jobs.sort((a, b) => b.createdAt - a.createdAt);
}

async function findJob(tags) {
  const jobs = await listJobs();
  return jobs.find(job => job.path && job.tags === tags);
}

module.exports = {
  saveJob,
  listJobs,
  findJob
};
