'use strict';

const jobs = new Map();

function saveJob(tags, name) {
  jobs.set(tags, name);
  return name;
}

function findJob(tags) {
  return jobs.get(tags);
}

module.exports = {
  saveJob,
  findJob
};
