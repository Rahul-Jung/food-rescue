import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '../../components';
import { pickImage, type PickSource } from '../../lib/images';
import { color, radius, space } from '../../theme';
import { photoUrl, type OfferPhoto } from './api';

/** Up to `max` photos: add from camera or library, tap a photo to remove it. */
export function PhotoSlots({
  photos,
  onChange,
  max,
  error,
}: {
  photos: OfferPhoto[];
  onChange: (next: OfferPhoto[]) => void;
  max: number;
  error?: string;
}) {
  const { t } = useTranslation();

  const add = async (source: PickSource) => {
    const uri = await pickImage(source);
    if (uri) onChange([...photos, { kind: 'new' as const, uri }].slice(0, max));
  };

  return (
    <View style={styles.wrap}>
      <Text variant="caption" weight={600}>
        {t('vendorOffers.photos', { max })}
      </Text>
      <View style={styles.row}>
        {photos.map((p, i) => (
          <Pressable
            key={p.kind === 'new' ? p.uri : p.path}
            accessibilityRole="button"
            accessibilityLabel={t('vendorOffers.removePhoto', { n: i + 1 })}
            onPress={() => onChange(photos.filter((_, j) => j !== i))}
          >
            <Image
              source={{ uri: p.kind === 'new' ? p.uri : photoUrl(p.path, true) }}
              style={styles.photo}
            />
            <Text variant="caption" style={styles.remove}>
              ✕
            </Text>
          </Pressable>
        ))}
      </View>
      {photos.length < max ? (
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button
              variant="secondary"
              label={t('vendorOnboarding.photo.camera')}
              onPress={() => void add('camera')}
            />
          </View>
          <View style={styles.flex}>
            <Button
              variant="secondary"
              label={t('vendorOnboarding.photo.library')}
              onPress={() => void add('library')}
            />
          </View>
        </View>
      ) : null}
      {error ? <Text>{`⚠ ${error}`}</Text> : null}
    </View>
  );
}

const SIZE = 88;

const styles = StyleSheet.create({
  wrap: { gap: space.s },
  row: { flexDirection: 'row', gap: space.s, flexWrap: 'wrap' },
  flex: { flex: 1 },
  photo: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.box,
    borderWidth: 1,
    borderColor: color.grey300,
  },
  remove: {
    position: 'absolute',
    top: 2,
    right: 4,
    color: color.paper,
    backgroundColor: color.ink,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
  },
});
