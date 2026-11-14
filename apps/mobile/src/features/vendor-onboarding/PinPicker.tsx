import { insidePilotArea } from '@food-rescue/shared';
import * as Location from 'expo-location';
import { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '../../components';
import { useAppSettings } from '../../lib/appSettings';
import { env } from '../../lib/env';
import { color, radius, space } from '../../theme';

export interface Pin {
  lat: number;
  lng: number;
}

/** Kathmandu centre, used until there is a saved pin or a GPS fix. */
const KATHMANDU: Region = {
  latitude: 27.7172,
  longitude: 85.324,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

/**
 * Map pin picker (V-03, V-21): drag the map under a fixed centre pin, or jump
 * to the phone's location. Warns when the pin is outside the pilot area.
 */
export function PinPicker({
  initial,
  pin,
  onChange,
  error,
}: {
  initial: Pin | null;
  pin: Pin | null;
  onChange: (pin: Pin) => void;
  error?: string;
}) {
  const { t } = useTranslation();
  const map = useRef<MapView>(null);
  const polygon = useAppSettings().data?.pilot_polygon;
  const [message, setMessage] = useState<string | null>(null);

  const initialRegion: Region = initial
    ? {
        latitude: initial.lat,
        longitude: initial.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }
    : KATHMANDU;

  const locateMe = async () => {
    setMessage(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setMessage(t('vendorOnboarding.location.noPermission'));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const region = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.004,
        longitudeDelta: 0.004,
      };
      map.current?.animateToRegion(region, 400);
      onChange({ lat: region.latitude, lng: region.longitude });
    } catch {
      setMessage(t('vendorOnboarding.location.noFix'));
    }
  };

  const outside = pin ? !insidePilotArea(pin.lat, pin.lng, polygon) : false;
  // Google Maps on Android crashes without an API key (local builds without
  // EXPO_PUBLIC_GOOGLE_MAPS_KEY). Then the phone's location sets the pin.
  const mapAvailable = Platform.OS !== 'android' || env.googleMapsKey !== '';

  return (
    <View style={styles.wrap}>
      {mapAvailable ? (
        <View style={styles.mapWrap}>
          <MapView
            ref={map}
            style={styles.map}
            initialRegion={initialRegion}
            onRegionChangeComplete={(r, details) => {
              // Only a drag by the user places the pin, not the first render.
              if (details?.isGesture !== false) onChange({ lat: r.latitude, lng: r.longitude });
            }}
            accessibilityLabel={t('vendorOnboarding.location.mapLabel')}
          />
          {/* Fixed pin in the middle: the map moves under it. */}
          <View pointerEvents="none" style={styles.pinWrap}>
            <View style={styles.pinHead} />
            <View style={styles.pinStem} />
          </View>
        </View>
      ) : (
        <View style={[styles.mapWrap, styles.noMap]}>
          <Text color="grey700" style={styles.noMapText}>
            {t('vendorOnboarding.location.noMap')}
          </Text>
          {pin ? (
            <Text variant="caption" color="grey700">
              {`${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`}
            </Text>
          ) : null}
        </View>
      )}
      <Button
        variant="secondary"
        label={t('vendorOnboarding.location.useMine')}
        onPress={() => void locateMe()}
      />
      {error ? <Text>{`⚠ ${error}`}</Text> : null}
      {message ? <Text>{`⚠ ${message}`}</Text> : null}
      {pin ? (
        <Text variant="caption" color="grey700">
          {t('vendorOnboarding.location.pinSet')}
        </Text>
      ) : null}
      {outside ? <Text>{`⚠ ${t('vendorOnboarding.location.outside')}`}</Text> : null}
    </View>
  );
}

const PIN = 18;

const styles = StyleSheet.create({
  wrap: { gap: space.m },
  mapWrap: {
    height: 280,
    borderRadius: radius.box,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: color.grey300,
  },
  map: { flex: 1 },
  noMap: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s,
    padding: space.l,
  },
  noMapText: { textAlign: 'center' },
  pinWrap: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -PIN / 2,
    marginTop: -PIN - 14,
    alignItems: 'center',
  },
  pinHead: {
    width: PIN,
    height: PIN,
    borderRadius: PIN / 2,
    backgroundColor: color.ink,
    borderWidth: 3,
    borderColor: color.paper,
  },
  pinStem: { width: 2, height: 14, backgroundColor: color.ink },
});
