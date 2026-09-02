// jest.mock() is hoisted above these declarations, so its factory may only
// reference variables whose name starts with "mock"
const mockVerifyIdToken = jest.fn();

jest.mock('../../app/firebase');
jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({ verifyIdToken: mockVerifyIdToken }))
}));

const { requireUser } = require('../../app/auth');

function responseSpy() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    send(payload) {
      res.body = payload;
      return res;
    }
  };

  return res;
}

describe('requireUser(req, res, next)', () => {
  beforeEach(() => {
    mockVerifyIdToken.mockReset();
  });

  test('should answer 401 when no authorization header is sent', () => {
    const res = responseSpy();
    const next = jest.fn();

    requireUser({ headers: {} }, res, next);

    expect(res.statusCode).toEqual(401);
    expect(next).not.toHaveBeenCalled();
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  test('should answer 401 when the scheme is not bearer', () => {
    const res = responseSpy();
    const next = jest.fn();

    requireUser({ headers: { authorization: 'Basic aGVsbG8=' } }, res, next);

    expect(res.statusCode).toEqual(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('should answer 401 when the token does not verify', () => {
    const error = new Error('nope');
    error.code = 'auth/argument-error';
    mockVerifyIdToken.mockReturnValue(Promise.reject(error));

    const res = responseSpy();
    const next = jest.fn();

    return requireUser({ headers: { authorization: 'Bearer forged' } }, res, next).then(() => {
      expect(res.statusCode).toEqual(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  test('should attach the verified user and hand over to the route', () => {
    mockVerifyIdToken.mockReturnValue(
      Promise.resolve({ uid: 'uid-1', email: 'someone@example.com' })
    );

    const req = { headers: { authorization: 'Bearer valid' } };
    const res = responseSpy();
    const next = jest.fn();

    return requireUser(req, res, next).then(() => {
      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid');
      expect(req.user).toEqual({ uid: 'uid-1', email: 'someone@example.com' });
      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBeNull();
    });
  });
});
