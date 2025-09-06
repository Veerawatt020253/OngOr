// DevelopmentStatsCard.tsx
import { auth } from "@/FirebaseConfig";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { get, getDatabase, ref } from "firebase/database";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { BarChart } from "react-native-chart-kit";

export function DevelopmentStatsCard() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();

  // ทำการ์ดให้ยืดหยุ่น: กว้างสุด 350 แต่ไม่เกินหน้าจอ - padding
  const CARD_WIDTH_MAX = 350;
  const CARD_HEIGHT = 190;
  const cardW = Math.min(width - 24, CARD_WIDTH_MAX);

  // label วัน อาทิตย์(0) -> เสาร์(6)
  const weekdayLabels = useMemo(
    () => ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."],
    []
  );

  // state
  const [highScores, setHighScores] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [loading, setLoading] = useState<boolean>(true);
  const [noUser, setNoUser] = useState<boolean>(false);

  // ฟังก์ชันสร้าง YYYY-MM-DD แบบ "เขตเวลาเครื่อง" (กันเพี้ยนจาก toISOString/UTC)
  const toLocalYMD = (d: Date) => {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  };

  const fetchHighScores = useCallback(async () => {
    setLoading(true);
    try {
      const db = getDatabase();
      const uid = auth.currentUser?.uid || null;

      if (!uid) {
        setNoUser(true);
        setHighScores([0, 0, 0, 0, 0, 0, 0]);
        return;
      }
      setNoUser(false);

      // หา "อาทิตย์นี้ (อาทิตย์ -> เสาร์)" แบบเวลาท้องถิ่น
      const today = new Date();
      const sunday = new Date(today);
      sunday.setHours(0, 0, 0, 0);
      sunday.setDate(today.getDate() - today.getDay()); // 0 = อาทิตย์

      // รายชื่อวันที่ทั้ง 7 วัน
      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(sunday);
        d.setDate(sunday.getDate() + i);
        weekDates.push(toLocalYMD(d));
      }

      // ดึงจาก Realtime DB ของคุณ: user_scores/{uid}/{YYYY-MM-DD}/{sessionKey}: { score: number }
      const dbRef = ref(db, `user_scores/${uid}`);
      const snapshot = await get(dbRef);

      if (!snapshot.exists()) {
        setHighScores([0, 0, 0, 0, 0, 0, 0]);
        return;
      }

      const data = snapshot.val() || {};
      const perDayMax = [0, 0, 0, 0, 0, 0, 0];

      weekDates.forEach((dateStr, idx) => {
        const daySessions = data[dateStr];
        if (!daySessions) return;
        let maxScore = 0;
        Object.values(daySessions).forEach((session: any) => {
          const s = Number(session?.score ?? 0);
          if (!Number.isNaN(s) && s > maxScore) maxScore = s;
        });
        perDayMax[idx] = maxScore;
      });

      setHighScores(perDayMax);
    } catch (e) {
      console.log("Error fetching high scores:", e);
      setHighScores([0, 0, 0, 0, 0, 0, 0]);
    } finally {
      setLoading(false);
    }
  }, []);

  // โหลดทุกครั้งที่หน้าจอโฟกัส และกัน setState หลัง unmount
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await fetchHighScores();
      })();
      return () => {
        active = false;
      };
    }, [fetchHighScores])
  );

  const data = useMemo(
    () => ({
      labels: weekdayLabels,
      datasets: [{ data: highScores }],
    }),
    [weekdayLabels, highScores]
  );

  const chartConfig = useMemo(
    () => ({
      backgroundGradientFrom: "#CAE6FC",
      backgroundGradientTo: "#CAE6FC",
      fillShadowGradient: "#4A90E2",
      fillShadowGradientOpacity: 1,
      color: (opacity = 1) => `rgba(53,120,208,${opacity})`,
      labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
      barRadius: 4,
      propsForBackgroundLines: { stroke: "#CAE6FC" },
      decimalPlaces: 0,
      propsForLabels: { fontSize: 10, fontFamily: "KanitM" },
    }),
    []
  );

  const handlePress = useCallback(() => {
    // 🔁 เปลี่ยนให้ตรงกับระบบนำทางของคุณ
    // React Navigation:
    // @ts-ignore
    navigation.navigate("(page)/StatusScreen");
    // Expo Router (ตัวอย่าง):
    // navigation.navigate("/StatusScreen" as never);
  }, [navigation]);

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handlePress}>
      <View style={[styles.statsCard, { width: cardW, height: CARD_HEIGHT }]}>
        <View style={styles.innerRow}>
          <View style={{ flex: 1, justifyContent: "center" }}>
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#4A90E2" />
              </View>
            ) : noUser ? (
              <View style={styles.loadingBox}>
                <Text style={{ color: "#1f3b63" }}>
                  ยังไม่ได้เข้าสู่ระบบ — ไม่พบสถิติ
                </Text>
              </View>
            ) : (
              <BarChart
                data={data}
                width={cardW - 30}
                height={170}
                chartConfig={chartConfig}
                withInnerLines={false}
                fromZero
                showValuesOnTopOfBars
                style={{
                  borderRadius: 20,
                  backgroundColor: "#EAF6FF",
                  marginLeft: -55, // ถ้าล้น ลองเอาออกแล้วเพิ่ม padding แทน
                }}
                withHorizontalLabels
                withVerticalLabels
                yLabelsOffset={1}
                horizontalLabelRotation={0}
              />
            )}
          </View>

          <Image
            source={require("@/assets/elder.png")}
            style={styles.elderImg}
            resizeMode="contain"
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    backgroundColor: "#CAE6FC",
    borderRadius: 28,
    padding: 18,
    marginBottom: 18,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    elevation: 2,
    overflow: "hidden",
  },
  innerRow: {
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
  },
  loadingBox: {
    height: 170,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF6FF",
    borderRadius: 20,
    marginLeft: -55,
    paddingHorizontal: 10,
  },
  elderImg: {
    width: 90,
    height: 90,
    marginLeft: 10,
    marginRight: -40,
    marginBottom: -80,
  },
});
