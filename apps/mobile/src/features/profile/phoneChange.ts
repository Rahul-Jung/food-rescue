// C-24 phone change: enter the new number -> code sent to it -> verify.
// Pure state machine so the flow is unit tested; the screen wires it to the API.

export type PhoneChangeState =
  | { step: 'enter' }
  | { step: 'sending'; phone: string }
  | { step: 'code'; phone: string }
  | { step: 'verifying'; phone: string }
  | { step: 'done'; phone: string };

export type PhoneChangeEvent =
  | { type: 'send'; phone: string }
  | { type: 'sent' }
  | { type: 'sendFailed' }
  | { type: 'verify' }
  | { type: 'verified' }
  | { type: 'verifyFailed' }
  | { type: 'reset' };

export const PHONE_CHANGE_START: PhoneChangeState = { step: 'enter' };

export function phoneChangeReducer(
  state: PhoneChangeState,
  event: PhoneChangeEvent,
): PhoneChangeState {
  switch (event.type) {
    case 'send':
      return state.step === 'enter' || state.step === 'code'
        ? { step: 'sending', phone: event.phone }
        : state;
    case 'sent':
      return state.step === 'sending' ? { step: 'code', phone: state.phone } : state;
    case 'sendFailed':
      return state.step === 'sending' ? { step: 'enter' } : state;
    case 'verify':
      return state.step === 'code' ? { step: 'verifying', phone: state.phone } : state;
    case 'verified':
      return state.step === 'verifying' ? { step: 'done', phone: state.phone } : state;
    case 'verifyFailed':
      return state.step === 'verifying' ? { step: 'code', phone: state.phone } : state;
    case 'reset':
      return PHONE_CHANGE_START;
  }
}
