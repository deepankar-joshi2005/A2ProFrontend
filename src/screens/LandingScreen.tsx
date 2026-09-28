import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const REDIRECT_DELAY_MS = 5000;

type Props = {
  onFinish: () => void;
};

export default function LandingScreen({ onFinish }: Props) {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: REDIRECT_DELAY_MS,
      useNativeDriver: false,
    });
    animation.start();

    const timer = setTimeout(onFinish, REDIRECT_DELAY_MS);
    return () => {
      animation.stop();
      clearTimeout(timer);
    };
  }, [onFinish, progress]);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Pressable
      onPress={onFinish}
      style={[
        styles.root,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <StatusBar style="light" />

      <View style={styles.imageWrapper}>
        <Image
          source={require('../../assets/A2ProLandingPage.png')}
          style={styles.hero}
          resizeMode="stretch"
        />

        {/* Dark overlay to hide image's static/baked-in loader bar.
            Measured directly from the source PNG (849x1852px): the baked-in
            bar spans x:355-494, y:1730-1740. Cover uses a small padding
            margin around those bounds so no sliver of it peeks out. */}
        <View style={styles.staticBarCover} pointerEvents="none" />

        {/* Our animated loader bar — sits just above the cover */}
        <View style={styles.barTrack} pointerEvents="none">
          <Animated.View style={[styles.barFill, { width: barWidth }]} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  imageWrapper: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  hero: {
    width: '100%',
    height: '100%',
  },

  // Covers the static baked-in loader in the image (padded around the
  // measured bar bounds: x 355-494, y 1730-1740 of the 849x1852 source)
  staticBarCover: {
    position: 'absolute',
    top: '93.2%',
    left: '41.1%',
    width: '17.8%',
    height: '0.97%',
    backgroundColor: '#000000',
  },

  // Our animated bar, centered on the same spot as the covered image bar
  // but stretched a bit longer than the original
  barTrack: {
    position: 'absolute',
    top: '93.41%',
    left: '38%',
    width: '24%',
    height: '0.54%',
    backgroundColor: '#2D313E',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#FC1044',
    borderRadius: 5,
  },
});