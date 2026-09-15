import { fail, ok } from '../../src/server/utils/api-response';

function mockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.body = undefined;
  res.status = jest.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((body: unknown) => {
    res.body = body;
    return res;
  });
  return res;
}

describe('api-response', () => {
  it('ok() wraps data with success:true', () => {
    const res = mockRes();
    ok(res, { a: 1 }, 'done');
    expect(res.json).toHaveBeenCalled();
    expect(res.body).toEqual({ success: true, data: { a: 1 }, message: 'done' });
  });

  it('fail() sets status and error envelope', () => {
    const res = mockRes();
    fail(res, 400, 'BAD_REQUEST', 'oops');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({ success: false, error: { code: 'BAD_REQUEST', message: 'oops' } });
  });
});
