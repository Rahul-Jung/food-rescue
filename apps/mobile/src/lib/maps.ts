import { Linking, Platform } from 'react-native';

/** Section 9: Directions opens Google Maps (Android) or Apple Maps (iOS) at the vendor's pin. */
export function directionsUrl(lat: number, lng: number, label?: string): string {
  if (Platform.OS === 'ios') {
    const q = label ? `&q=${encodeURIComponent(label)}` : '';
    return `http://maps.apple.com/?ll=${lat},${lng}${q}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function openDirections(lat: number, lng: number, label?: string): void {
  void Linking.openURL(directionsUrl(lat, lng, label));
}

export function callPhone(phone: string): void {
  void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`);
}
