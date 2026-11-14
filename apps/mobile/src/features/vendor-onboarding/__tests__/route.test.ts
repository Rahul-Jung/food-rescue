import { nextStep, vendorRoute } from '../route';

describe('vendorRoute', () => {
  it('a new business account lands on V-02', () => {
    expect(vendorRoute('draft', 'vendor')).toBe('/onboarding/profile');
    expect(vendorRoute('draft', 'onboarding/status')).toBe('/onboarding/profile');
  });

  it('a draft may move between the three steps', () => {
    expect(vendorRoute('draft', 'onboarding/profile')).toBeNull();
    expect(vendorRoute('draft', 'onboarding/location')).toBeNull();
    expect(vendorRoute('draft', 'onboarding/documents')).toBeNull();
  });

  it('submitted waits on V-05', () => {
    expect(vendorRoute('submitted', 'vendor')).toBe('/onboarding/status');
    expect(vendorRoute('submitted', 'onboarding/profile')).toBe('/onboarding/status');
    expect(vendorRoute('submitted', 'onboarding/status')).toBeNull();
  });

  it('rejected sees V-05 and may edit the steps', () => {
    expect(vendorRoute('rejected', 'vendor')).toBe('/onboarding/status');
    expect(vendorRoute('rejected', 'onboarding/status')).toBeNull();
    expect(vendorRoute('rejected', 'onboarding/documents')).toBeNull();
  });

  it('approved goes home, not back to onboarding', () => {
    expect(vendorRoute('approved', 'vendor')).toBeNull();
    expect(vendorRoute('approved', 'business')).toBeNull();
    expect(vendorRoute('approved', 'onboarding/status')).toBe('/vendor');
  });

  it('suspended stays (the layout shows the notice); loading stays put', () => {
    expect(vendorRoute('suspended', 'vendor')).toBeNull();
    expect(vendorRoute(null, 'vendor')).toBeNull();
  });
});

describe('nextStep', () => {
  it('walks profile -> location -> documents -> status', () => {
    expect(nextStep('onboarding/profile')).toBe('/onboarding/location');
    expect(nextStep('onboarding/location')).toBe('/onboarding/documents');
    expect(nextStep('onboarding/documents')).toBe('/onboarding/status');
  });
});
