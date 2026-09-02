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

const worker = require('../../app/worker');

function handlerFor(event) {
  return mockOn.mock.calls.find(call => call[0] === event)[1];
}

describe('listenForMessages(subscriptionNameOrId)', () => {
  beforeEach(() => {
    mockOn.mockClear();
    mockSubscription.mockClear();
    worker.listenForMessages('ecni2-5');
  });

  test('should subscribe to the given subscription', () => {
    expect(mockSubscription).toHaveBeenCalledWith('ecni2-5');
  });

  test('should register a message handler and an error handler', () => {
    const events = mockOn.mock.calls.map(call => call[0]);

    expect(events).toEqual(['message', 'error']);
  });

  test('should acknowledge every message it receives', () => {
    const message = {
      id: 'message-id-1',
      data: Buffer.from(JSON.stringify({ tags: 'california' })),
      ack: jest.fn()
    };

    // the handler now acks only once the archive is built and uploaded
    return handlerFor('message')(message).then(() => {
      expect(message.ack).toHaveBeenCalled();
    });
  });

  test('should acknowledge a message even when archiving fails', () => {
    const message = {
      id: 'message-id-2',
      data: Buffer.from(JSON.stringify({ tags: 'error' })),
      ack: jest.fn()
    };

    return handlerFor('message')(message).then(() => {
      expect(message.ack).toHaveBeenCalled();
    });
  });

  test('should survive a subscription error without throwing', () => {
    expect(() => handlerFor('error')(new Error('boom'))).not.toThrow();
  });
});
