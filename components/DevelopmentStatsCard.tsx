import { auth } from "@/FirebaseConfig";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { get, getDatabase, ref } from "firebase/database";
import { useCallback, useState } from "react";
import {
  Image,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { BarChart } from "react-native-chart-kit";

export function DevelopmentStatsCard() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const CARD_WIDTH = 350;
  const CARD_HEIGHT = 190;

  // เก็บคะแนนสูงสุดของแต่ละวัน อาทิตย์ถึงเสาร์
  const [highScores, setHighScores] = useState([0, 0, 0, 0, 0, 0, 0]);

  // ชื่อวันภาษาไทยเรียงตามอาทิตย์ -> เสาร์
  const weekdayLabels = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

  const fetchHighScores = async () => {
    const db = getDatabase();
    const uid = auth.currentUser?.uid;
    if (!uid) {
      console.log("No user logged in");
      return;
    }

    try {
      // คำนวณวันอาทิตย์ของสัปดาห์นี้
      const today = new Date();
      const sunday = new Date(today);
      sunday.setHours(0, 0, 0, 0);
      sunday.setDate(today.getDate() - today.getDay());

      // สร้าง list ของวันที่ในสัปดาห์นี้
      const weekDates = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(sunday);
        date.setDate(sunday.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];
        weekDates.push(dateStr);
      }

      console.log("Week dates:", weekDates);

      // ดึงข้อมูลจาก Firebase
      const dbRef = ref(db, `user_scores/${uid}`);
      const snapshot = await get(dbRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log("Firebase data:", data);

        // เตรียมเก็บคะแนนสูงสุดของแต่ละวัน
        const newWeekScores = [0, 0, 0, 0, 0, 0, 0];

        weekDates.forEach((dateStr, index) => {
          const daySessions = data[dateStr];
          console.log(`Day ${dateStr}:`, daySessions);
          
          if (daySessions) {
            let maxScore = 0;
            Object.values(daySessions).forEach((session) => {
              const score = Number(session.score || 0);
              console.log(`Session score for ${dateStr}:`, score);
              if (score > maxScore) maxScore = score;
            });
            newWeekScores[index] = maxScore;
            console.log(`Max score for ${dateStr}:`, maxScore);
          }
        });

        console.log("Final week scores:", newWeekScores);
        setHighScores(newWeekScores);
      } else {
        console.log("No score data found");
        setHighScores([0, 0, 0, 0, 0, 0, 0]);
      }
    } catch (error) {
      console.error("Error fetching high scores:", error);
      setHighScores([0, 0, 0, 0, 0, 0, 0]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHighScores();
      console.log("fetchHighScores called");
    }, [])
  );

  const data = {
    labels: weekdayLabels,
    datasets: [{ data: highScores }],
  };

  const chartConfig = {
    backgroundGradientFrom: "#CAE6FC",
    backgroundGradientTo: "#CAE6FC",
    fillShadowGradient: "#4A90E2",
    fillShadowGradientOpacity: 1,
    color: (opacity = 1) => `rgba(53,120,208,${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`, // เปลี่ยนเป็นสีดำให้เห็นชัด
    barRadius: 4,
    propsForBackgroundLines: { stroke: "#CAE6FC" },
    decimalPlaces: 0,
    // เพิ่มการตั้งค่า font
    propsForLabels: {
      fontSize: 10,
      fontFamily: "KanitM",
    },
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate("(page)/StatusScreen")}
    >
      <View
        style={[styles.statsCard, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
      >
        <View style={styles.innerRow}>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <BarChart
              data={data}
              width={CARD_WIDTH - 30} // responsive width
              height={170}
              chartConfig={chartConfig}
              withInnerLines={false}
              fromZero
              showValuesOnTopOfBars
              style={{
                borderRadius: 20,
                backgroundColor: "#EAF6FF",
                marginLeft: -55,
              }}
              withHorizontalLabels={true}
              withVerticalLabels={true}
              yLabelsOffset={1}
              horizontalLabelRotation={0} // ตั้งชื่อวันให้อ่านง่าย
            />
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
  elderImg: {
    width: 90,
    height: 90,
    marginLeft: 10,
    marginRight: -40,
    marginBottom: -80,
  },
});