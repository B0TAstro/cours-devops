// jest.mock() is hoisted above these declarations, so its factory may only
// reference variables whose name starts with "mock"
const mockOn = jest.fn();
const mockSubscription = jest.fn(() => ({ on: mockOn }));

// the worker pulls in got (an ESM-only package jest cannot parse) through
// photo_archive
jest.mock('../../app/photo_archive');
jest.mock('../../app/storage');
jest.mock('../../app/firebase');

jest.mock('@google-cloud/pubsub', () => ({
  PubSub: jest.fn(() => ({ subscription: mockSubscription }))
}));

// worker.test.js covers the handlers; this covers the bootstrap guard, which
// needs the module loaded outside of the test environment
describe('worker bootstrap', () => {
  test('should subscribe by itself when not running under test', () => {
    const previousEnv = process.env.NODE_ENV;

    process.env.NODE_ENV = 'production';
    jest.resetModules();

    require('../../app/worker');

    process.env.NODE_ENV = previousEnv;

    expect(mockSubscription).toHaveBeenCalled();
  });
});
