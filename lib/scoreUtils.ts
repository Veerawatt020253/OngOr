// lib/scoreUtils.js
import { auth } from "@/FirebaseConfig";
import { get, getDatabase, ref } from "firebase/database";

/**
 * ดึงคะแนนรวมทั้งหมดของผู้ใช้จาก Firebase Realtime Database
 * @returns {Promise<number>} คะแนนรวมทั้งหมด หรือ 0 ถ้าไม่มีข้อมูล
 */
export const getTotalPoints = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log("No user logged in");
      return 0;
    }

    const db = getDatabase();
    const uid = user.uid;
    const dbRef = ref(db, `user_scores/${uid}`);
    const snapshot = await get(dbRef);

    if (!snapshot.exists()) {
      console.log("No score data found");
      return 0;
    }

    const data = snapshot.val();
    let totalPoints = 0;

    Object.values(data).forEach((dayData) => {
      Object.values(dayData).forEach((session) => {
        const score = Number(session.score) || 0;
        totalPoints += score;
      });
    });

    return totalPoints;
  } catch (error) {
    console.error("Error fetching total points:", error);
    return 0;
  }
};
