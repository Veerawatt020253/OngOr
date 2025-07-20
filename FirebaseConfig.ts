// firebaseConfig.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA8dseBnpICQMeSn0wSsgfj9ZIXCT2lpN4",
  authDomain: "myneuro-43454.firebaseapp.com",
  databaseURL: "https://myneuro-43454-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "myneuro-43454",
  storageBucket: "myneuro-43454.firebasestorage.app",
  messagingSenderId: "800080342020",
  appId: "1:800080342020:web:470151c891dafce1e99951"
};

// ✅ ตรวจสอบว่า Firebase ถูก initialize แล้วหรือยัง
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ✅ ใช้ initializeAuth() สำหรับ React Native พร้อม AsyncStorage
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
