import type { TFunction } from 'i18next';

/** i18n text for an offer / deal form error key (vendorOffers.errors.*). */
export function fieldError(t: TFunction, key: string | undefined): string | undefined {
  if (!key) return undefined;
  return t(`vendorOffers.errors.${key}` as 'vendorOffers.errors.title', {
    defaultValue: t('errors.VALIDATION_FAILED'),
  });
}
