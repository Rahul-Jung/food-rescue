import { toDigits } from '@food-rescue/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useLanguageStore } from '../store/language';
import { Text } from './Text';

/** "09:59 left", ticking every second; shows the expired text at zero. */
export function Countdown({ until, onDone }: { until: Date; onDone?: () => void }) {
  const { t } = useTranslation();
  const digits = useLanguageStore((s) => s.digits);
  const [now, setNow] = useState(() => Date.now());
  const left = Math.max(0, Math.floor((until.getTime() - now) / 1000));

  useEffect(() => {
    if (left === 0) {
      onDone?.();
      return;
    }
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [left, onDone]);

  if (left === 0) return <Text weight={600}>{t('countdown.ended')}</Text>;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return (
    <Text weight={600} accessibilityLiveRegion="polite">
      {t('countdown.left', { time: toDigits(`${mm}:${ss}`, digits) })}
    </Text>
  );
}
