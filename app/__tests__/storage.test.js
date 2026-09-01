const { PassThrough, Writable } = require('stream');

// jest.mock() is hoisted above these declarations, so its factory may only
// reference variables whose name starts with "mock"
const mockCreateWriteStream = jest.fn();
const mockGetSignedUrl = jest.fn(() =>
  Promise.resolve(['https://storage.example/signed'])
);
const mockFile = jest.fn(() => ({
  createWriteStream: mockCreateWriteStream,
  getSignedUrl: mockGetSignedUrl
}));
const mockBucket = jest.fn(() => ({ file: mockFile }));

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn(() => ({ bucket: mockBucket }))
}));

const storage = require('../../app/storage');

// a readable zip stream, as photo_archive would hand it over
function fakeArchive() {
  const archive = new PassThrough();
  process.nextTick(() => archive.end('zip payload'));
  return archive;
}

// a bucket write stream that reports failure instead of accepting data
function failingUpload(error) {
  const upload = new Writable({
    write(chunk, encoding, callback) {
      callback(error);
    }
  });
  return upload;
}

describe('uploadArchiveStream(archive)', () => {
  beforeEach(() => {
    process.env.STORAGE_BUCKET = 'ecni22026bucket';
    mockBucket.mockClear();
    mockFile.mockClear();
    mockCreateWriteStream.mockClear();
  });

  test('should upload to the bucket named by the environment', () => {
    mockCreateWriteStream.mockReturnValueOnce(new PassThrough());

    return storage.uploadArchiveStream(fakeArchive()).then(() => {
      expect(mockBucket).toHaveBeenCalledWith('ecni22026bucket');
    });
  });

  test('should resolve with a random .zip object name', () => {
    mockCreateWriteStream.mockReturnValueOnce(new PassThrough());

    return storage.uploadArchiveStream(fakeArchive()).then(name => {
      expect(name).toMatch(/^zips\/[0-9a-f-]{36}\.zip$/);
      expect(mockFile).toHaveBeenCalledWith(name);
    });
  });

  test('should give two archives different names', () => {
    mockCreateWriteStream.mockReturnValueOnce(new PassThrough());
    mockCreateWriteStream.mockReturnValueOnce(new PassThrough());

    return Promise.all([
      storage.uploadArchiveStream(fakeArchive()),
      storage.uploadArchiveStream(fakeArchive())
    ]).then(([first, second]) => {
      expect(first).not.toEqual(second);
    });
  });

  test('should declare the zip content type and skip resumable uploads', () => {
    mockCreateWriteStream.mockReturnValueOnce(new PassThrough());

    return storage.uploadArchiveStream(fakeArchive()).then(() => {
      expect(mockCreateWriteStream).toHaveBeenCalledWith({
        metadata: {
          contentType: 'application/zip',
          cacheControl: 'private'
        },
        resumable: false
      });
    });
  });

  test('should reject when the upload fails', () => {
    mockCreateWriteStream.mockReturnValueOnce(failingUpload(new Error('boom')));

    return expect(
      storage.uploadArchiveStream(fakeArchive())
    ).rejects.toThrow('boom');
  });
});

describe('getDownloadUrl(name)', () => {
  beforeEach(() => {
    process.env.STORAGE_BUCKET = 'ecni22026bucket';
    mockFile.mockClear();
    mockGetSignedUrl.mockClear();
  });

  test('should return the url rather than the array wrapping it', () => {
    return storage.getDownloadUrl('zips/abc.zip').then(url => {
      expect(mockFile).toHaveBeenCalledWith('zips/abc.zip');
      expect(mockGetSignedUrl.mock.calls[0][0].action).toEqual('read');
      expect(url).toEqual('https://storage.example/signed');
    });
  });
});
