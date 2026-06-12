import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useIsDarkTheme } from '../services/theme';
import { useSettings } from '../services/settings';

const STARS = [
  ['7%', '9%', 2, 0.45], ['19%', '15%', 1, 0.55], ['33%', '7%', 2, 0.35],
  ['46%', '18%', 1, 0.55], ['61%', '10%', 2, 0.4], ['77%', '16%', 1, 0.5],
  ['91%', '8%', 2, 0.35], ['12%', '29%', 1, 0.45], ['27%', '38%', 2, 0.3],
  ['42%', '31%', 1, 0.55], ['58%', '42%', 2, 0.3], ['72%', '29%', 1, 0.5],
  ['87%', '39%', 2, 0.35], ['5%', '52%', 1, 0.5], ['21%', '61%', 2, 0.28],
  ['37%', '49%', 1, 0.5], ['53%', '64%', 2, 0.3], ['68%', '54%', 1, 0.48],
  ['83%', '66%', 2, 0.3], ['95%', '57%', 1, 0.45], ['13%', '76%', 2, 0.28],
  ['31%', '84%', 1, 0.45], ['49%', '73%', 2, 0.28], ['66%', '88%', 1, 0.45],
  ['81%', '78%', 2, 0.3], ['93%', '91%', 1, 0.5],
] as const;

export const StarryBackground = () => {
  const isDark = useIsDarkTheme();
  const { settings } = useSettings();

  if (settings.backgroundImageUri) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image source={{ uri: settings.backgroundImageUri }} style={styles.customImage} resizeMode="cover" />
        <View style={[styles.imageOverlay, { backgroundColor: isDark ? 'rgba(3, 9, 24, 0.54)' : 'rgba(246, 243, 236, 0.44)' }]} />
      </View>
    );
  }

  if (!isDark) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.night} />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      {STARS.map(([left, top, size, opacity], index) => (
        <View
          key={`${left}-${top}`}
          style={[styles.star, { left, top, width: size, height: size, borderRadius: size, opacity }]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  customImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  night: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#071126',
  },
  glowTop: {
    position: 'absolute',
    width: 320,
    height: 260,
    borderRadius: 160,
    top: -120,
    right: -100,
    backgroundColor: 'rgba(79, 91, 151, 0.16)',
  },
  glowBottom: {
    position: 'absolute',
    width: 360,
    height: 280,
    borderRadius: 180,
    bottom: -150,
    left: -140,
    backgroundColor: 'rgba(39, 92, 134, 0.14)',
  },
  star: {
    position: 'absolute',
    backgroundColor: '#FFF4D7',
  },
});
