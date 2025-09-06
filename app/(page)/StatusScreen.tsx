import { auth } from "@/FirebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { get, getDatabase, ref } from "firebase/database";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BarChart } from "react-native-chart-kit";
import { getStreak } from "@/lib/streakUtils";

const { width } = Dimensions.get("window");

// === Helper: YYYY-MM-DD (local) ===
const toLocalYMD = (d: Date) => {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

// === Helper: หาจันทร์ของสัปดาห์ปัจจุบัน (local) ===
const getMonday = (base = new Date()) => {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=อา.,1=จ.,...
  const diff = (day + 6) % 7; // ทำให้จันทร์เป็นจุดเริ่ม
  d.setDate(d.getDate() - diff);
  return d;
};

const weekdayLabels = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

export default function StatsScreen() {
  const [streak, setStreak] = useState(0);

  const [totalPoints, setTotalPoints] = useState(0);
  const [maxScore, setMaxScore] = useState(0);

  const [weekSeries, setWeekSeries] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [weekRangeText, setWeekRangeText] = useState<string>("");

  const navigation = useNavigation();
  const CARD_WIDTH = 360;
  const CARD_HEIGHT = 170;

  // โหลด streak
  useEffect(() => {
    (async () => {
      try {
        const currentStreak = await getStreak();
        setStreak(currentStreak);
      } catch {
        setStreak(0);
      }
    })();
  }, []);

  // โหลดคะแนนจาก RTDB
  useEffect(() => {
    let active = true;

    const fetchUserScores = async () => {
      const uid = auth.currentUser?.uid;
      const mon = getMonday();
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      const rangeText = `${mon.getDate()}/${mon.getMonth() + 1}/${mon.getFullYear()} - ${sun.getDate()}/${sun.getMonth() + 1}/${sun.getFullYear()}`;

      if (!uid) {
        if (!active) return;
        setTotalPoints(0);
        setMaxScore(0);
        setWeekSeries([0, 0, 0, 0, 0, 0, 0]);
        setWeekRangeText(rangeText);
        return;
      }

      try {
        const db = getDatabase();
        const dbRef = ref(db, `user_scores/${uid}`);
        const snapshot = await get(dbRef);

        if (!snapshot.exists()) {
          if (!active) return;
          setTotalPoints(0);
          setMaxScore(0);
          setWeekSeries([0, 0, 0, 0, 0, 0, 0]);
          setWeekRangeText(rangeText);
          return;
        }

        const allData = snapshot.val() as Record<string, any>;

        // รวมแต้มทั้งหมด + คะแนนสูงสุด
        let total = 0;
        let maxEver = 0;
        Object.values(allData).forEach((dayObj: any) => {
          Object.values(dayObj).forEach((session: any) => {
            const s = Number(session?.score ?? 0) || 0;
            total += s;
            if (s > maxEver) maxEver = s;
          });
        });

        // สัปดาห์นี้: คะแนนสูงสุดต่อวัน
        const dates: string[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(mon);
          d.setDate(mon.getDate() + i);
          dates.push(toLocalYMD(d));
        }

        const perDayMax: number[] = new Array(7).fill(0);
        dates.forEach((dateStr, idx) => {
          const daySessions = allData[dateStr];
          if (!daySessions) return;
          let maxDay = 0;
          Object.values(daySessions).forEach((session: any) => {
            const s = Number(session?.score ?? 0) || 0;
            if (s > maxDay) maxDay = s;
          });
          perDayMax[idx] = maxDay;
        });

        if (!active) return;
        setTotalPoints(total);
        setMaxScore(maxEver);
        setWeekSeries(perDayMax);
        setWeekRangeText(rangeText);
      } catch (error) {
        console.error("Error fetching scores:", error);
        if (!active) return;
        setTotalPoints(0);
        setMaxScore(0);
        setWeekSeries([0, 0, 0, 0, 0, 0, 0]);
      }
    };

    fetchUserScores();
    const intervalId = setInterval(() => {
      if (active) fetchUserScores();
    }, 10000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  // --- กราฟ: ข้อมูล + หน้าไส้ ---
  const chartData = useMemo(
    () => ({
      labels: weekdayLabels,       // ← ป้ายชื่อวันบนแกน X
      datasets: [{ data: weekSeries }],
    }),
    [weekSeries]
  );

  // ปรับสไตล์แท่ง + สีป้ายชื่อวัน
  const chartConfig = useMemo(
    () => ({
      backgroundGradientFrom: "#FFFFFF",
      backgroundGradientTo: "#FFFFFF",
      fillShadowGradient: "#4A90E2",
      fillShadowGradientOpacity: 1,
      color: (opacity = 1) => `rgba(53,120,208,${opacity})`,
      labelColor: (opacity = 1) => `rgba(36,95,156,${opacity})`, // สีป้ายชื่อวัน
      barRadius: 10,                    // ← มนขึ้น
      barPercentage: 0.55,              // ← แท่งเพรียวลง
      propsForBackgroundLines: { stroke: "#E3EEFF" },
      decimalPlaces: 0,
      propsForLabels: { fontSize: 12, fontFamily: "kanitM" }, // ← อ่านง่ายขึ้น
    }),
    []
  );

  const chartWidth = Math.min(CARD_WIDTH, width * 0.9 - 20);

  return (
    <View>
      {/* Back */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#1E3A8A" />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerBox}>
            <Image source={require("@/assets/FireOngor.png")} style={styles.brainImage} />
            <View style={styles.playedBox}>
              <Text style={styles.playedText}>คุณเล่นต่อเนื่องมาแล้ว</Text>
              <Text style={styles.playedDays}>{streak} วัน</Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.row}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>สะสมแล้ว</Text>
              <Text style={styles.statValue}>{totalPoints}</Text>
              <Text style={styles.statUnit}>แต้ม</Text>
              <Image source={require("@/assets/trophy.png")} style={styles.trophy} />
            </View>

            <View style={styles.doubleStatBox}>
              <View style={styles.halfBox}>
                <Text style={styles.statLabel}>คะแนนสูงสุด</Text>
                <Text style={styles.statValue}>{maxScore}</Text>
              </View>
              <View style={[styles.halfBox, styles.progressBox]}>
                <Text style={styles.statLabel}>พัฒนาการ</Text>
                <Text style={styles.statLevel}>ระดับ</Text>
                <Text style={styles.statValue}>1</Text>
              </View>
            </View>
          </View>

          {/* Chart */}
          <View style={styles.chartBox}>
            <Text style={styles.chartTitle}>สถิติ (สัปดาห์นี้)</Text>
            <View style={[styles.statsCard, { width: chartWidth, height: CARD_HEIGHT }]}>
              <View style={styles.innerRow}>
                <View style={{ flex: 1, justifyContent: "center" }}>
                  <BarChart
                    data={chartData}
                    width={chartWidth}
                    height={130}
                    chartConfig={chartConfig}
                    fromZero
                    withInnerLines={false}
                    withVerticalLabels={true}  
                    withHorizontalLabels={false}/* ← ซ่อนค่าแกน Y */
                    verticalLabelRotation={0}
                    xLabelsOffset={-2}         
                    showValuesOnTopOfBars={false}
                    style={{
                      borderRadius: 20,
                      backgroundColor: "#EAF6FF",
                      paddingRight: 12,
                    }}
                    formatXLabel={(l) => l}
                  />
                </View>
              </View>
            </View>
            <View style={styles.chartDateTag}>
              <Text style={styles.chartDateText}>{weekRangeText}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ================= Styles ================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EDF6FF",
    paddingTop: 48,
    alignItems: "center",
    marginTop: 60,
  },
  headerBox: {
    width: width * 0.9,
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E3EEFF",
  },
  brainImage: {
    width: 100,
    height: 100,
    marginLeft: -10,
    marginRight: 16,
    marginBottom: -20,
  },
  playedBox: { flex: 1 },
  playedText: { fontSize: 22, color: "#4C749C", fontFamily: "kanitB" },
  playedDays: {
    marginTop: 8,
    backgroundColor: "#78A5FF",
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 8,
    fontSize: 24,
    color: "#fff",
    alignSelf: "flex-start",
    fontFamily: "kanitB",
  },

  row: {
    flexDirection: "row",
    width: width * 0.9,
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    width: (width * 0.9 - 8) / 2,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E3EEFF",
  },
  progressBox: { borderWidth: 2, borderColor: "#fff" },
  statLabel: { fontSize: 22, color: "#1E3A8A", fontFamily: "kanitB" },
  statValue: { fontSize: 28, color: "#1E3A8A", marginTop: 4, fontFamily: "kanitB" },
  statUnit: { fontSize: 18, color: "#1E3A8A", fontFamily: "kanitB" },
  statLevel: { fontSize: 20, color: "#1E3A8A", marginVertical: 4, fontFamily: "kanitB" },
  trophy: { position: "absolute", right: 1, bottom: -7, width: 80, height: 80 },

  doubleStatBox: { width: (width * 0.9 - 8) / 2, justifyContent: "space-between" },
  halfBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E3EEFF",
  },

  chartBox: {
    width: width * 0.9,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 80,
    borderWidth: 1,
    borderColor: "#E3EEFF",
  },
  chartTitle: { fontSize: 18, color: "#1E3A8A", marginBottom: 4, fontFamily: "kanitB" },
  chartDateTag: {
    backgroundColor: "#78A5FF",
    alignSelf: "flex-end",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 8,
  },
  chartDateText: { color: "#fff" },

  statsCard: {
    padding: 18,
    marginBottom: 18,
    alignSelf: "center",
    overflow: "hidden",
  },
  innerRow: { flexDirection: "row", alignItems: "center", height: "100%" },

  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 999,
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  scrollContainer: { backgroundColor: "#EDF6FF" },
});
