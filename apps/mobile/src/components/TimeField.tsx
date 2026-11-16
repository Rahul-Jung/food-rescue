import { clockFrom12h, clockTo12h, formatClock } from '@food-rescue/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useLanguageStore } from '../store/language';
import { color, radius, space, touch } from '../theme';
import { Button } from './Button';
import { Chip } from './Chip';
import { Sheet } from './Sheet';
import { Text } from './Text';

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const MINUTES = [0, 15, 30, 45];

export interface TimeFieldProps {
  label: string;
  /** Wall-clock "HH:MM" (24-hour), the format the API stores. */
  value: string;
  onChange: (hhmm: string) => void;
  error?: string;
  hint?: string;
  /** Optional field: the sheet offers a Clear button that sets an empty value. */
  optional?: boolean;
}

/** Time picked by tapping (hour, minute, AM/PM) and shown as 12-hour; no typing, no native dependency. */
export function TimeField({ label, value, onChange, error, hint, optional }: TimeFieldProps) {
  const { t } = useTranslation();
  const { locale, digits } = useLanguageStore();
  const [open, setOpen] = useState(false);
  const parts = clockTo12h(value) ?? { hour: 12, minute: 0, pm: true };
  const minutes = MINUTES.includes(parts.minute)
    ? MINUTES
    : [...MINUTES, parts.minute].sort((a, b) => a - b);
  const pick = (patch: Partial<typeof parts>) => {
    const p = { ...parts, ...patch };
    onChange(clockFrom12h(p.hour, p.minute, p.pm));
  };
  const shown = clockTo12h(value) ? formatClock(value, locale, digits) : t('time.pick');

  return (
    <View style={styles.wrap}>
      <Text variant="caption" weight={600}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${shown}`}
        onPress={() => setOpen(true)}
        style={[styles.box, !!error && styles.boxError]}
      >
        <Text>{shown}</Text>
      </Pressable>
      {error ? (
        <Text variant="caption">⚠ {error}</Text>
      ) : hint ? (
        <Text variant="caption" color="grey500">
          {hint}
        </Text>
      ) : null}

      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        <Text variant="caption" weight={600}>
          {t('time.hour')}
        </Text>
        <View style={styles.chips}>
          {HOURS.map((h) => (
            <Chip
              key={h}
              label={String(h)}
              selected={parts.hour === h}
              onPress={() => pick({ hour: h })}
            />
          ))}
        </View>
        <Text variant="caption" weight={600}>
          {t('time.minute')}
        </Text>
        <View style={styles.chips}>
          {minutes.map((m) => (
            <Chip
              key={m}
              label={`:${String(m).padStart(2, '0')}`}
              selected={parts.minute === m}
              onPress={() => pick({ minute: m })}
            />
          ))}
        </View>
        <View style={styles.chips}>
          <Chip label={t('time.am')} selected={!parts.pm} onPress={() => pick({ pm: false })} />
          <Chip label={t('time.pm')} selected={parts.pm} onPress={() => pick({ pm: true })} />
        </View>
        <Text weight={600}>
          {formatClock(clockFrom12h(parts.hour, parts.minute, parts.pm), locale, digits)}
        </Text>
        <Button
          label={t('common.ok')}
          onPress={() => {
            if (!clockTo12h(value)) pick({});
            setOpen(false);
          }}
        />
        {optional && value ? (
          <Button
            variant="secondary"
            label={t('time.clear')}
            onPress={() => {
              onChange('');
              setOpen(false);
            }}
          />
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  box: {
    minHeight: touch + 4,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: color.grey300,
    borderRadius: radius.box,
    paddingHorizontal: space.m,
    paddingVertical: space.s,
    backgroundColor: color.paper,
  },
  boxError: { borderColor: color.ink, borderWidth: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
});
