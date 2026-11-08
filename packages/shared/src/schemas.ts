import { z } from 'zod';

import { ORDER_STATUSES } from './orderStates';

// Base schemas reused by RPC / Edge Function inputs. Enums mirror migration 0002.

export const uuidSchema = z.uuid();
/** Money is integer paisa (Rs. 1 = 100). */
export const paisaSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const positivePaisaSchema = paisaSchema.positive();
/** timestamptz as ISO 8601 with offset. */
export const timestamptzSchema = z.iso.datetime({ offset: true });
export const localeSchema = z.enum(['en', 'ne']);
/** Nepal mobile in E.164: +97798XXXXXXXX or +97797XXXXXXXX. */
export const npPhoneSchema = z.string().regex(/^\+9779[78]\d{8}$/, 'Nepal mobile in E.164 (+97798…)');
export const basisPointsSchema = z.number().int().min(0).max(5000);
export const quantitySchema = z.number().int().positive();
export const latLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const appRoleSchema = z.enum(['customer', 'vendor', 'admin']);
export const accountStatusSchema = z.enum(['active', 'suspended', 'deleted']);
export const vendorTypeSchema = z.enum(['restaurant', 'grocery', 'bakery', 'cafe', 'hotel', 'other']);
export const vendorStatusSchema = z.enum(['draft', 'submitted', 'approved', 'rejected', 'suspended']);
export const offerKindSchema = z.enum(['surplus', 'happy_hour']);
export const foodTypeSchema = z.enum(['veg', 'non_veg', 'vegan']);
export const offerStatusSchema = z.enum(['draft', 'live', 'sold_out', 'expired', 'deactivated', 'deleted']);
export const orderStatusSchema = z.enum(ORDER_STATUSES);
export const payProviderSchema = z.enum(['esewa', 'khalti']);
export const paymentStatusSchema = z.enum(['initiated', 'verified', 'failed', 'refunded', 'partially_refunded']);
export const refundStatusSchema = z.enum(['requested', 'done', 'failed']);
export const ledgerTypeSchema = z.enum(['sale', 'commission', 'refund', 'payout', 'adjustment']);
export const ledgerBucketSchema = z.enum(['pending', 'available', 'paid_out']);
export const withdrawalStatusSchema = z.enum(['requested', 'approved', 'rejected', 'paid']);
export const payoutMethodSchema = z.enum(['bank', 'esewa', 'khalti']);

export type AppRole = z.infer<typeof appRoleSchema>;
export type OfferKind = z.infer<typeof offerKindSchema>;
export type OfferStatus = z.infer<typeof offerStatusSchema>;
export type PayProvider = z.infer<typeof payProviderSchema>;
