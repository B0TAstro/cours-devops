// jest.mock() is hoisted above these declarations, so its factory may only
// reference variables whose name starts with "mock"
const mockPublishMessage = jest.fn(() => Promise.resolve('message-id-1'));
const mockTopic = jest.fn(() => ({ publishMessage: mockPublishMessage }));

jest.mock('@google-cloud/pubsub', () => ({
  PubSub: jest.fn(() => ({ topic: mockTopic }))
}));

const queueProducer = require('../../app/queue_producer');

describe('publishZipRequest(tags, tagmode)', () => {
  beforeEach(() => {
    process.env.PUBSUB_VAR = 'ecni2-5';
    mockPublishMessage.mockClear();
    mockTopic.mockClear();
  });

  test('should publish to the topic named by the environment', () => {
    return queueProducer.publishZipRequest('california', 'all').then(() => {
      expect(mockTopic).toHaveBeenCalledWith('ecni2-5');
    });
  });

  test('should publish the tags and tagmode as a JSON buffer', () => {
    return queueProducer.publishZipRequest('california', 'all').then(() => {
      const message = mockPublishMessage.mock.calls[0][0];

      expect(Buffer.isBuffer(message.data)).toBe(true);
      expect(JSON.parse(message.data.toString())).toEqual({
        tags: 'california',
        tagmode: 'all'
      });
    });
  });

  test('should reject when publishing fails', () => {
    mockPublishMessage.mockReturnValueOnce(Promise.reject(new Error('boom')));

    return expect(
      queueProducer.publishZipRequest('california', 'all')
    ).rejects.toThrow('boom');
  });
});
