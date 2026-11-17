import { useEffect, useRef, useState } from 'react';

import { supabase } from './supabase';

/**
 * T5.7 live quantity (plan section 6, Realtime): subscribes to
 * offers:id=eq.{id}; while the channel is not connected (weak networks) it
 * polls every 15 s instead. Reused later by C-10 offer detail and C-13 checkout.
 */
export const POLL_MS = 15_000;

export interface OfferQuantity {
  /** quantity_total - quantity_reserved; null for happy hour deals or before the first value. */
  quantityLeft: number | null;
  status: string | null;
  /** 'live' while the Realtime channel is joined, 'polling' otherwise. */
  mode: 'live' | 'polling';
}

interface OfferRow {
  quantity_total: number | null;
  quantity_reserved: number;
  status: string;
}

export function quantityFromRow(row: Partial<OfferRow> | null | undefined): number | null {
  if (!row || row.quantity_total == null) return null;
  return Math.max(0, row.quantity_total - (row.quantity_reserved ?? 0));
}

async function fetchQuantity(id: string): Promise<OfferRow | null> {
  const { data } = await supabase
    .from('offers')
    .select('quantity_total, quantity_reserved, status')
    .eq('id', id)
    .maybeSingle();
  return (data as OfferRow | null) ?? null;
}

export function useOfferQuantity(
  offerId: string | null | undefined,
  initialLeft: number | null = null,
): OfferQuantity {
  const [state, setState] = useState<OfferQuantity>({
    quantityLeft: initialLeft,
    status: null,
    mode: 'polling',
  });
  const joined = useRef(false);

  useEffect(() => {
    setState({ quantityLeft: initialLeft, status: null, mode: 'polling' });
    if (!offerId) return;
    let cancelled = false;
    const apply = (row: OfferRow | null) => {
      if (cancelled || !row) return;
      setState((s) => ({ ...s, quantityLeft: quantityFromRow(row), status: row.status }));
    };

    const channel = supabase
      // A unique topic per subscription: supabase.channel() hands back an
      // existing (already subscribed) channel for a reused name, and .on()
      // then throws while the old one is still being removed.
      .channel(`offer-qty-${offerId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'offers', filter: `id=eq.${offerId}` },
        (payload) => apply(payload.new as OfferRow),
      )
      .subscribe((status) => {
        joined.current = status === 'SUBSCRIBED';
        if (!cancelled) setState((s) => ({ ...s, mode: joined.current ? 'live' : 'polling' }));
        // Catch up on anything missed while joining.
        if (joined.current) void fetchQuantity(offerId).then(apply);
      });

    const timer = setInterval(() => {
      if (!joined.current) void fetchQuantity(offerId).then(apply);
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
      joined.current = false;
      void supabase.removeChannel(channel);
    };
    // initialLeft only seeds the first value; a new offer resets it.
  }, [offerId]);

  return state;
}
