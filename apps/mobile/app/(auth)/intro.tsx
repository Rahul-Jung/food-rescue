import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '../../src/components';
import { useOnboardingStore } from '../../src/store/onboarding';
import { color, radius, space } from '../../src/theme';

const SLIDES = [
  { title: 'auth.intro.slide1Title', body: 'auth.intro.slide1Body' },
  { title: 'auth.intro.slide2Title', body: 'auth.intro.slide2Body' },
  { title: 'auth.intro.slide3Title', body: 'auth.intro.slide3Body' },
] as const;

/** C-02 How it works: 3 slides, skippable, shown once. */
export default function IntroScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setIntroSeen = useOnboardingStore((s) => s.setIntroSeen);
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index] ?? SLIDES[0];
  const last = index === SLIDES.length - 1;

  const finish = () => {
    setIntroSeen();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        {!last ? <Button variant="ghost" label={t('auth.intro.skip')} onPress={finish} /> : null}
      </View>
      <View style={styles.body}>
        <Text variant="number" style={styles.center}>
          {`${index + 1} / ${SLIDES.length}`}
        </Text>
        <Text variant="title" style={styles.center}>
          {t(slide.title)}
        </Text>
        <Text color="grey700" style={styles.center}>
          {t(slide.body)}
        </Text>
        <View style={styles.dots} accessibilityElementsHidden>
          {SLIDES.map((s, i) => (
            <View key={s.title} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      </View>
      <View style={styles.bottom}>
        <Button
          label={last ? t('auth.intro.start') : t('auth.intro.next')}
          onPress={last ? finish : () => setIndex(index + 1)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.paper },
  top: { alignItems: 'flex-end', padding: space.s, minHeight: 56 },
  body: { flex: 1, justifyContent: 'center', padding: space.xl, gap: space.l },
  center: { textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.s },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: color.grey300 },
  dotActive: { width: 24, backgroundColor: color.ink },
  bottom: { padding: space.xl },
});
