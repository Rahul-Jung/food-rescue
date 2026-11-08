import { compareVersions, needsUpdate } from './version';

describe('versions', () => {
  it('compares numerically, not as text', () => {
    expect(compareVersions('1.2.10', '1.2.9')).toBe(1);
    expect(compareVersions('0.9.0', '1.0.0')).toBe(-1);
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
  });

  it('flags installs older than the minimum', () => {
    expect(needsUpdate('0.0.0', '0.0.0')).toBe(false);
    expect(needsUpdate('0.0.0', '9.9.9')).toBe(true);
    expect(needsUpdate('1.4.0', '1.3.9')).toBe(false);
  });
});
