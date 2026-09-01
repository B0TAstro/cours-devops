const jobStore = require('../../app/job_store');

describe('job store', () => {
  test('should return the archive name saved for a set of tags', () => {
    jobStore.saveJob('california', 'zips/first.zip');

    expect(jobStore.findJob('california')).toEqual('zips/first.zip');
  });

  test('should return the latest name when a job runs twice', () => {
    jobStore.saveJob('sunset', 'zips/old.zip');
    jobStore.saveJob('sunset', 'zips/new.zip');

    expect(jobStore.findJob('sunset')).toEqual('zips/new.zip');
  });

  test('should return undefined for tags that were never archived', () => {
    expect(jobStore.findJob('never-searched')).toBeUndefined();
  });
});
