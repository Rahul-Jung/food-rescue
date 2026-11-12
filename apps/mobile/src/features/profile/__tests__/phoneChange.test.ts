import { PHONE_CHANGE_START, phoneChangeReducer, type PhoneChangeEvent } from '../phoneChange';

const run = (...events: PhoneChangeEvent[]) =>
  events.reduce(phoneChangeReducer, PHONE_CHANGE_START);
const NEW = '+9779712345678';

describe('phone change flow (code goes to the new number)', () => {
  it('happy path: enter -> sending -> code -> verifying -> done', () => {
    expect(run({ type: 'send', phone: NEW })).toEqual({ step: 'sending', phone: NEW });
    expect(run({ type: 'send', phone: NEW }, { type: 'sent' })).toEqual({
      step: 'code',
      phone: NEW,
    });
    expect(
      run({ type: 'send', phone: NEW }, { type: 'sent' }, { type: 'verify' }, { type: 'verified' }),
    ).toEqual({ step: 'done', phone: NEW });
  });

  it('a failed send goes back to entering the number', () => {
    expect(run({ type: 'send', phone: NEW }, { type: 'sendFailed' })).toEqual({ step: 'enter' });
  });

  it('a wrong code stays on the code step for another try', () => {
    expect(
      run(
        { type: 'send', phone: NEW },
        { type: 'sent' },
        { type: 'verify' },
        { type: 'verifyFailed' },
      ),
    ).toEqual({ step: 'code', phone: NEW });
  });

  it('cannot verify before a code was sent', () => {
    expect(run({ type: 'verify' })).toEqual(PHONE_CHANGE_START);
    expect(run({ type: 'verified' })).toEqual(PHONE_CHANGE_START);
  });

  it('resend from the code step sends again', () => {
    expect(
      run({ type: 'send', phone: NEW }, { type: 'sent' }, { type: 'send', phone: NEW }),
    ).toEqual({ step: 'sending', phone: NEW });
  });

  it('reset starts over', () => {
    expect(run({ type: 'send', phone: NEW }, { type: 'sent' }, { type: 'reset' })).toEqual(
      PHONE_CHANGE_START,
    );
  });
});
