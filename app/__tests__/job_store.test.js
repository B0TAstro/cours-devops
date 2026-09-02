jest.mock('../../app/firebase');

const firebase = require('../../app/firebase');
const jobStore = require('../../app/job_store');

// a record shaped like the ones the previous exercise left under /tom: an iso
// string instead of milliseconds, a filename, and no gcs path at all
const FOREIGN_RECORD = {
  createdAt: '2026-09-01T14:16:37.942Z',
  filename: '10_0.zip',
  status: 'successful',
  tags: 'stress-test'
};

describe('job store', () => {
  beforeEach(() => {
    firebase.__reset();
  });

  test('should record an archive and read it back', () => {
    return jobStore
      .saveJob('california', 'zips/first.zip', 'https://signed/first')
      .then(() => jobStore.listJobs())
      .then(jobs => {
        expect(jobs).toHaveLength(1);
        expect(jobs[0].tags).toEqual('california');
        expect(jobs[0].path).toEqual('zips/first.zip');
        expect(typeof jobs[0].createdAt).toEqual('number');
      });
  });

  test('should store the archive under the prenom/time/filename path', () => {
    return jobStore
      .saveJob('california', 'zips/first.zip', 'https://signed/first')
      .then(() => firebase.database.ref('/tom').get())
      .then(snapshot => {
        const times = Object.keys(snapshot.val());

        expect(times).toHaveLength(1);
        // the dot of ".zip" is forbidden in a key, so it must have been replaced
        expect(Object.keys(snapshot.val()[times[0]])).toEqual(['first_zip']);
        expect(times[0]).not.toMatch(/\./);
      });
  });

  test('should find the archive saved for a set of tags', () => {
    return jobStore
      .saveJob('sunset', 'zips/sunset.zip', 'https://signed/sunset')
      .then(() => jobStore.findJob('sunset'))
      .then(job => {
        expect(job.path).toEqual('zips/sunset.zip');
      });
  });

  test('should resolve undefined for tags that were never archived', () => {
    return jobStore.findJob('never-searched').then(job => {
      expect(job).toBeUndefined();
    });
  });

  test('should resolve an empty list when nothing was ever recorded', () => {
    return jobStore.listJobs().then(jobs => {
      expect(jobs).toEqual([]);
    });
  });

  test('should return the most recent archive first', () => {
    return firebase.database
      .ref('/tom/older/a_zip')
      .set({ path: 'zips/a.zip', url: 'u', tags: 'a', createdAt: 1000 })
      .then(() =>
        firebase.database
          .ref('/tom/newer/b_zip')
          .set({ path: 'zips/b.zip', url: 'u', tags: 'b', createdAt: 2000 })
      )
      .then(() => jobStore.listJobs())
      .then(jobs => {
        expect(jobs.map(job => job.tags)).toEqual(['b', 'a']);
      });
  });

  test('should normalize records written by other tools', () => {
    return firebase.database
      .ref('/tom/2026-09-01T14:16:37_942Z/10_0_zip')
      .set(FOREIGN_RECORD)
      .then(() => jobStore.listJobs())
      .then(jobs => {
        expect(jobs).toHaveLength(1);
        // the iso string became milliseconds, so sorting still works
        expect(jobs[0].createdAt).toEqual(Date.parse(FOREIGN_RECORD.createdAt));
        expect(jobs[0].filename).toEqual('10_0.zip');
        expect(jobs[0].path).toBeNull();
      });
  });

  test('should not hand back a record that has no archive behind it', () => {
    return firebase.database
      .ref('/tom/2026-09-01T14:16:37_942Z/10_0_zip')
      .set(FOREIGN_RECORD)
      .then(() => jobStore.findJob('stress-test'))
      .then(job => {
        expect(job).toBeUndefined();
      });
  });
});

describe('job store, records it cannot fully make sense of', () => {
  beforeEach(() => {
    firebase.__reset();
  });

  test('should keep a record listed when its date and tags are unusable', () => {
    return firebase.database
      .ref('/tom/whenever/broken_zip')
      .set({ createdAt: 'not-a-date', filename: 'broken.zip', tags: 42 })
      .then(() => jobStore.listJobs())
      .then(jobs => {
        expect(jobs).toHaveLength(1);
        // an unparseable date sorts last instead of poisoning the comparator
        expect(jobs[0].createdAt).toEqual(0);
        expect(jobs[0].tags).toBeNull();
        expect(jobs[0].filename).toEqual('broken.zip');
      });
  });

  test('should skip a child that holds no record at all', () => {
    return firebase.database
      .ref('/tom/whenever/empty_zip')
      .set(null)
      .then(() => jobStore.listJobs())
      .then(jobs => {
        expect(jobs).toEqual([]);
      });
  });
});
