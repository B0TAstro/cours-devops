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

// Reads every archive recorded under /tom into a array
async function listJobs() {
  const snapshot = await database.ref('/tom').get();
  const jobs = [];

  // two levels to walk: /tom/<zippedAt>/<filename>
  snapshot.forEach(byTime => {
    byTime.forEach(byFile => {
      jobs.push(byFile.val());
    });
  });

  return jobs.sort((a, b) => b.createdAt - a.createdAt);
}

async function findJob(tags) {
  const jobs = await listJobs();
  return jobs.find(job => job.tags === tags);
}

module.exports = {
  saveJob,
  findJob
};
