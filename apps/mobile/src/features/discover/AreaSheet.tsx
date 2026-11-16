import { ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ListRow, Sheet } from '../../components';
import { useAppSettings } from '../../lib/appSettings';
import { pilotAreas } from '../../lib/location';
import { useLanguageStore } from '../../store/language';
import type { PilotArea } from '../../store/onboarding';

/** C-06 area selector: "Near me" (GPS) or a pilot area's centre point. */
export function AreaSheet({
  visible,
  onClose,
  onPick,
  onNearMe,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (area: PilotArea) => void;
  onNearMe?: () => void;
}) {
  const { t } = useTranslation();
  const locale = useLanguageStore((s) => s.locale);
  const areas = pilotAreas(useAppSettings().data?.pilot_areas);
  return (
    <Sheet visible={visible} onClose={onClose} title={t('discover.chooseArea')}>
      <ScrollView style={styles.list}>
        {onNearMe ? <ListRow title={`⌖ ${t('discover.nearMe')}`} onPress={onNearMe} /> : null}
        {areas.map((a) => (
          <ListRow
            key={a.name}
            title={locale === 'ne' && a.name_ne ? a.name_ne : a.name}
            onPress={() => onPick(a)}
          />
        ))}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({ list: { maxHeight: 360 } });
