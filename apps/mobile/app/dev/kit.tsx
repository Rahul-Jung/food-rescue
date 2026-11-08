import { formatPrice } from '@food-rescue/shared';
import { Redirect } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import {
  Badge,
  Button,
  Chip,
  CodeDisplay,
  Countdown,
  EmptyState,
  Input,
  ListRow,
  OfferCard,
  OtpInput,
  PriceTag,
  Sheet,
  Skeleton,
  StatTile,
  Stepper,
  Text,
} from '../../src/components';
import { useLanguageStore } from '../../src/store/language';
import { color, space } from '../../src/theme';

function Section({ name, children }: { name: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="caption" color="grey500">
        {name}
      </Text>
      {children}
    </View>
  );
}

/** Dev-only storybook-style screen: every design kit component, in en and ne. */
export default function Kit() {
  const { t } = useTranslation();
  const { locale, digits, setLocale, setDigits } = useLanguageStore();
  const [otp, setOtp] = useState('12');
  const [qty, setQty] = useState(1);
  const [chip, setChip] = useState(true);
  const [sheet, setSheet] = useState(false);
  const until = useMemo(() => new Date(Date.now() + 10 * 60_000), []);

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="title">{t('kit.title')}</Text>
        <View style={styles.row}>
          <Button label={t('settings.switchLanguage')} onPress={() => setLocale(locale === 'en' ? 'ne' : 'en')} />
          <Chip
            label={t('kit.digits')}
            selected={digits === 'devanagari'}
            onPress={() => setDigits(digits === 'latin' ? 'devanagari' : 'latin')}
          />
        </View>

        <Section name="Text">
          <Text variant="number">{t('app.name')}</Text>
          <Text variant="title">{t('app.name')}</Text>
          <Text variant="button">{t('app.tagline')}</Text>
          <Text>{t('kit.emptyBody')}</Text>
          <Text variant="caption" color="grey700">
            {t('kit.inputHint')}
          </Text>
        </Section>

        <Section name="Button">
          <Button label={t('kit.buttonPrimary')} />
          <Button variant="secondary" label={t('kit.buttonSecondary')} />
          <Button variant="ghost" label={t('kit.buttonGhost')} />
          <Button variant="danger" label={t('kit.buttonDanger')} />
          <Button label={t('kit.buttonPrimary')} loading />
          <Button label={t('kit.buttonPrimary')} disabled />
        </Section>

        <Section name="Input">
          <Input label={t('kit.inputLabel')} hint={t('kit.inputHint')} placeholder="+977 98…" keyboardType="phone-pad" />
          <Input label={t('kit.inputLabel')} error={t('kit.inputError')} defaultValue="98123" />
        </Section>

        <Section name="OtpInput">
          <OtpInput value={otp} onChange={setOtp} accessibilityLabel={t('kit.otpLabel')} />
        </Section>

        <Section name="Chip">
          <View style={styles.row}>
            <Chip label={t('kit.chipVeg')} selected={chip} onPress={() => setChip(!chip)} />
            <Chip label={t('kit.chipBakery')} />
            <Chip label={t('kit.chipHappyHour')} />
          </View>
        </Section>

        <Section name="Badge">
          <View style={styles.row}>
            <Badge kind="live" />
            <Badge kind="happyHour" />
            <Badge kind="soldOut" />
            <Badge kind="paid" />
            <Badge kind="collected" />
          </View>
        </Section>

        <Section name="PriceTag">
          <PriceTag pricePaisa={25000} originalPaisa={60000} />
          <PriceTag pricePaisa={125050} />
        </Section>

        <Section name="Card / OfferCard">
          <OfferCard
            title={t('kit.offerTitle')}
            vendorName={t('kit.vendorName')}
            meta={t('kit.offerMeta')}
            pricePaisa={25000}
            originalPaisa={60000}
            badges={['live', 'happyHour']}
            onPress={() => undefined}
          />
        </Section>

        <Section name="Stepper">
          <Stepper value={qty} onChange={setQty} max={5} />
        </Section>

        <Section name="Sheet">
          <Button variant="secondary" label={t('kit.openSheet')} onPress={() => setSheet(true)} />
          <Sheet visible={sheet} onClose={() => setSheet(false)} title={t('kit.sheetTitle')}>
            <Stepper value={qty} onChange={setQty} max={5} />
          </Sheet>
        </Section>

        <Section name="EmptyState">
          <EmptyState
            title={t('kit.emptyTitle')}
            body={t('kit.emptyBody')}
            actionLabel={t('kit.emptyAction')}
            onAction={() => undefined}
          />
        </Section>

        <Section name="Skeleton">
          <Skeleton height={20} width="60%" />
          <Skeleton height={80} />
        </Section>

        <Section name="CodeDisplay">
          <CodeDisplay code="482913" />
        </Section>

        <Section name="StatTile">
          <View style={styles.row}>
            <StatTile label={t('kit.statEarned')} value={formatPrice(2640000, locale, digits)} />
            <StatTile label={t('kit.statOrders')} value={digits === 'devanagari' ? '१२' : '12'} />
          </View>
        </Section>

        <Section name="ListRow">
          <ListRow title={t('kit.rowTitle')} subtitle={t('kit.rowSubtitle')} right={t('kit.rowRight')} onPress={() => undefined} />
        </Section>

        <Section name="Countdown">
          <Countdown until={until} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  content: { padding: space.l, gap: space.xl },
  section: { gap: space.s },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, alignItems: 'center' },
});
