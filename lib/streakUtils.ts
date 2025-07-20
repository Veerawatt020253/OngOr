// lib/streakUtils.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ref, get, set, push, serverTimestamp } from "firebase/database";
import { database } from "@/FirebaseConfig"; // แก้ไขเป็น database แทน db

const STREAK_KEY = "user_streak";
const LAST_PLAY_KEY = "last_play_date";

/**
 * ดึงประวัติการเล่นจาก Firebase Realtime Database
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array ของ game history
 */
export const getGameHistory = async (userId) => {
  try {
    const userScoresRef = ref(database, `user_scores/${userId}`);
    const snapshot = await get(userScoresRef);

    if (!snapshot.exists()) return [];

    const data = snapshot.val();
    const history = [];

    // วนลูปทุก sessionId
    Object.entries(data).forEach(([sessionId, sessionData]) => {
      if (sessionData.timestamp) {
        history.push({
          id: sessionId,
          userId: userId,
          sessionId: sessionId,
          timestamp: sessionData.timestamp,
          playedAt: new Date(sessionData.timestamp),
          ...sessionData,
        });
      }
    });

    // เรียงจากใหม่ไปเก่า
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return history;
  } catch (error) {
    console.error("Error fetching game history:", error);
    return [];
  }
};

/**
 * คำนวณ streak จากประวัติการเล่น
 * @param {Array} history - Array ของ game history
 * @returns {number} จำนวนวันที่เล่นติดต่อกัน
 */
export const calculateStreakFromHistory = (history) => {
  if (!history || history.length === 0) return 0;

  // แปลง date เป็น string format YYYY-MM-DD เพื่อเปรียบเทียบ
  const formatDate = (date) => {
    return date.toISOString().split("T")[0];
  };

  // สร้าง Set ของวันที่เล่น (unique dates)
  const playDates = [
    ...new Set(history.map((game) => formatDate(game.playedAt))),
  ].sort((a, b) => new Date(b) - new Date(a)); // เรียงจากล่าสุดไปเก่าสุด

  if (playDates.length === 0) return 0;

  const today = formatDate(new Date());
  const yesterday = formatDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const dayBeforeYesterday = formatDate(
    new Date(Date.now() - 48 * 60 * 60 * 1000)
  );

  // ถ้าวันล่าสุดที่เล่นเกิน 2 วันแล้ว streak = 0
  const latestPlayDate = playDates[0];
  if (
    latestPlayDate !== today &&
    latestPlayDate !== yesterday &&
    latestPlayDate !== dayBeforeYesterday
  ) {
    return 0;
  }

  let streak = 0;
  let startDate = latestPlayDate;

  // นับ streak จากวันที่เริ่มต้น
  for (let i = 0; i < playDates.length; i++) {
    const expectedDate = new Date(startDate);
    expectedDate.setDate(expectedDate.getDate() - i);
    const expectedDateStr = formatDate(expectedDate);

    if (playDates[i] === expectedDateStr) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

/**
 * บันทึกการเล่นเกมใหม่ลง Firebase Realtime Database
 * @param {string} userId - User ID
 * @param {Object} gameData - ข้อมูลเกม (score, duration, etc.)
 * @returns {Promise<string>} sessionId ที่สร้างขึ้น
 */
export const recordGameSession = async (userId, gameData = {}) => {
  try {
    const newSessionRef = push(ref(database, `user_scores/${userId}`));
    const sessionData = {
      timestamp: serverTimestamp(),
      playedAt: new Date().toISOString(),
      ...gameData,
    };

    await set(newSessionRef, sessionData);

    return newSessionRef.key;
  } catch (error) {
    console.error("Error recording game session:", error);
    throw error;
  }
};

/**
 * อัพเดท streak ใน AsyncStorage
 * @param {string} userId - User ID
 * @returns {Promise<number>} streak ที่อัพเดทแล้ว
 */
export const updateStreak = async (userId) => {
  try {
    const history = await getGameHistory(userId);
    const newStreak = calculateStreakFromHistory(history);

    await AsyncStorage.setItem(STREAK_KEY, newStreak.toString());
    await AsyncStorage.setItem(LAST_PLAY_KEY, new Date().toISOString());

    return newStreak;
  } catch (error) {
    console.error("Error updating streak:", error);
    return 0;
  }
};

/**
 * ดึงค่า streak จาก AsyncStorage
 * @returns {Promise<number>} streak ปัจจุบัน
 */
export const getStreak = async () => {
  try {
    const streak = await AsyncStorage.getItem(STREAK_KEY);
    return streak ? parseInt(streak) : 0;
  } catch (error) {
    console.error("Error getting streak:", error);
    return 0;
  }
};

/**
 * รีเซ็ต streak
 * @returns {Promise<void>}
 */
export const resetStreak = async () => {
  try {
    await AsyncStorage.removeItem(STREAK_KEY);
    await AsyncStorage.removeItem(LAST_PLAY_KEY);
  } catch (error) {
    console.error("Error resetting streak:", error);
  }
};

/**
 * ตรวจสอบและอัพเดท streak เมื่อเริ่มเกม
 * @param {string} userId - User ID
 * @param {Object} gameData - ข้อมูลเกม (optional)
 * @returns {Promise<{streak: number, sessionId: string}>}
 */
export const checkAndUpdateStreak = async (userId, gameData = {}) => {
  try {
    // บันทึกการเล่นเกมใหม่
    const sessionId = await recordGameSession(userId, gameData);

    // อัพเดท streak
    const streak = await updateStreak(userId);

    return { streak, sessionId };
  } catch (error) {
    console.error("Error checking and updating streak:", error);
    return { streak: 0, sessionId: null };
  }
};

/**
 * ดึงสถิติการเล่นรายวัน
 * @param {string} userId - User ID
 * @param {number} days - จำนวนวันที่ต้องการดู (default: 7)
 * @returns {Promise<Array>} Array ของสถิติรายวัน
 */
export const getDailyStats = async (userId, days = 7) => {
  try {
    const history = await getGameHistory(userId);
    const stats = [];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const dayGames = history.filter(
        (game) => game.playedAt.toISOString().split("T")[0] === dateStr
      );

      stats.push({
        date: dateStr,
        gamesPlayed: dayGames.length,
        hasPlayed: dayGames.length > 0,
      });
    }

    return stats.reverse(); // เรียงจากเก่าสุดไปล่าสุด
  } catch (error) {
    console.error("Error getting daily stats:", error);
    return [];
  }
};
