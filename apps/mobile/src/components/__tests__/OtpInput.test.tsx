import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { OtpInput } from '../OtpInput';

function Harness({ onChange }: { onChange: (v: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <OtpInput
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
      accessibilityLabel="6-digit code"
    />
  );
}

describe('OtpInput', () => {
  it('shows 6 boxes and fills them as digits are typed', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    const input = screen.getByTestId('otp-input');
    await fireEvent.changeText(input, '123');
    expect(onChange).toHaveBeenLastCalledWith('123');
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('keeps digits only and at most 6', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    const input = screen.getByTestId('otp-input');
    await fireEvent.changeText(input, '12a3-4 5678');
    expect(onChange).toHaveBeenLastCalledWith('123456');
  });

  it('uses the number pad and SMS one-time-code autofill', async () => {
    await render(<Harness onChange={jest.fn()} />);
    const input = screen.getByTestId('otp-input');
    expect(input.props.keyboardType).toBe('number-pad');
    expect(input.props.autoComplete).toBe('sms-otp');
    expect(input.props.maxLength).toBe(6);
  });

  it('has an accessible label', async () => {
    await render(<Harness onChange={jest.fn()} />);
    expect(screen.getByLabelText('6-digit code')).toBeTruthy();
  });
});
