import { StyleSheet, Text, View } from 'react-native';

import en from '../locales/en.json';

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{en.app.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  title: { color: '#000000', fontSize: 20 },
});
