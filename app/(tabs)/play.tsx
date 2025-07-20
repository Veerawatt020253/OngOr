import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function PlayScreen() {
  const router = useRouter();
  const hasNavigatedRef = useRef(false); // ป้องกันไม่ให้ navigate ซ้ำ

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        router.replace('/(game)/play'); // เปลี่ยน path ตามจริง
      }
    }, 50); // รอ 50ms ให้ component mount เสร็จก่อน

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
