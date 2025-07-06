import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function PlayScreen() {
  const router = useRouter();

  useEffect(() => {
    // เปลี่ยนไปหน้าอื่นทันทีเมื่อ component โหลดเสร็จ
    router.replace('/(game)/play'); // เปลี่ยนเป็น path ที่ต้องการ
  }, []);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
