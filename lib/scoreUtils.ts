// lib/scoreUtils.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, rtdb } from "@/FirebaseConfig"; // ✅ ใช้ rtdb ที่ export มาจริง ๆ
import { get, ref } from "firebase/database";

const K_POINTS_CACHE = "@ongor:points:total_cache_v1";

/**
 * รวมคะแนนทั้งหมดจาก RTDB:
 * user_scores/{uid}/{YYYY-MM-DD}/{sessionKey}: { score: number }
 * - เซฟลง AsyncStorage เป็นแคช
 * - ถ้า error จะคืนค่าจากแคชแทน
 */
export const getTotalPoints = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      const cached = await AsyncStorage.getItem(K_POINTS_CACHE);
      return cached ? parseInt(cached, 10) || 0 : 0;
    }

    const uid = user.uid;
    const snap = await get(ref(rtdb, `user_scores/${uid}`)); // ✅ ใช้ rtdb

    if (!snap.exists()) {
      await AsyncStorage.setItem(K_POINTS_CACHE, "0");
      return 0;
    }

    const data = snap.val() || {};
    let total = 0;

    Object.values(data).forEach((dayData) => {
      if (!dayData || typeof dayData !== "object") return;
      Object.values(dayData).forEach((session) => {
        if (!session || typeof session !== "object") return;
        const s = Number(session.score) || 0;
        total += s;
      });
    });

    total = Math.floor(total);
    await AsyncStorage.setItem(K_POINTS_CACHE, String(total));
    return total;
  } catch (err) {
    console.log("[getTotalPoints] Error:", err);
    const cached = await AsyncStorage.getItem(K_POINTS_CACHE);
    return cached ? parseInt(cached, 10) || 0 : 0;
  }
};
