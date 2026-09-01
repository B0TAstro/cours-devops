// jest.mock() is hoisted above these declarations, so its factory may only
// reference variables whose name starts with "mock"
const mockOn = jest.fn();
const mockSubscription = jest.fn(() => ({ on: mockOn }));

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

    handlerFor('message')(message);

    expect(message.ack).toHaveBeenCalled();
  });

  test('should survive a subscription error without throwing', () => {
    expect(() => handlerFor('error')(new Error('boom'))).not.toThrow();
  });
});
