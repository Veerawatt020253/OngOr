// firebaseConfig.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyA8dseBnpICQMeSn0wSsgfj9ZIXCT2lpN4",
  authDomain: "myneuro-43454.firebaseapp.com",
  databaseURL: "https://myneuro-43454-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "myneuro-43454",
  storageBucket: "myneuro-43454.firebasestorage.app",
  messagingSenderId: "800080342020",
  appId: "1:800080342020:web:470151c891dafce1e99951",
};

// ✅ single app
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ✅ Auth (กัน init ซ้ำตอน fast refresh)
let auth;
try {
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
} catch {
  auth = getAuth(app);
}

// ✅ Firestore (คงชื่อ db สำหรับ Firestore)
export const db = getFirestore(app);

// ✅ Realtime Database: ใช้รูปแบบเดียว "ทุกที่" — ไม่ส่ง URL ซ้ำ
export const rtdb = getDatabase(app);

// ✅ Storage
export const storage = getStorage(app);

export { auth };
export default app;
