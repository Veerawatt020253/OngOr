import { Ionicons } from "@expo/vector-icons"; // หรือใช้ icon ตัวอื่นก็ได้
import { useNavigation } from "@react-navigation/native";
import React from "react";
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

const { width } = Dimensions.get("window");

export default function StatsScreen() {
  const navigation = useNavigation(); // ต้องอยู่ในฟังก์ชัน StatsScreen
  const CARD_WIDTH = 320;
  const CARD_HEIGHT = 170;

  const data = {
    labels: ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."],
    datasets: [{ data: [3, 4, 5, 6, 4, 5, 7] }],
  };

  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    fillShadowGradient: "#4A90E2",
    fillShadowGradientOpacity: 1,
    color: (opacity = 1) => `rgba(53,120,208,${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 0, 0, ${opacity})`, // สีแดง
    barRadius: 0,
    propsForBackgroundLines: { stroke: "#CAE6FC" },
    decimalPlaces: 0,
  };
  return (
    <View>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={28} color="#1E3A8A" />
      </TouchableOpacity>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerBox}>
            <Image
              source={require("@/assets/FireOngor.png")}
              style={styles.brainImage}
            />
            <View style={styles.playedBox}>
              <Text style={styles.playedText}>คุณเล่นต่อเนื่องมาแล้ว</Text>
              <Text style={styles.playedDays}>99 วัน</Text>
            </View>
          </View>

          {/* Stats Row (สะสม + ขวาใหญ่) */}
          <View style={styles.row}>
            {/* กล่องสะสมคะแนน */}
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>สะสมแล้ว</Text>
              <Text style={styles.statValue}>2,450</Text>
              <Text style={styles.statUnit}>คะแนน</Text>
              <Image
                source={require("@/assets/trophy.png")}
                style={styles.trophy}
              />
            </View>

            {/* กล่องสูงฝั่งขวา */}
            <View style={styles.doubleStatBox}>
              {/* คะแนนสูงสุด */}
              <View style={styles.halfBox}>
                <Text style={styles.statLabel}>คะแนนสูงสุด</Text>
                <Text style={styles.statValue}>1,120</Text>
              </View>

              {/* พัฒนาการ */}
              <View style={[styles.halfBox, styles.progressBox]}>
                <Text style={styles.statLabel}>พัฒนาการ</Text>
                <Text style={styles.statLevel}>ระดับ</Text>
                <Text style={styles.statValue}>5</Text>
              </View>
            </View>
          </View>

          {/* Chart */}
          <View style={styles.chartBox}>
            <Text style={styles.chartTitle}>สถิติ</Text>
            <View
              style={[
                styles.statsCard,
                { width: CARD_WIDTH, height: CARD_HEIGHT },
              ]}
            >
              <View style={styles.innerRow}>
                <View style={{ flex: 1, justifyContent: "center" }}>
                  <BarChart
                    data={data}
                    width={360}
                    height={120}
                    chartConfig={chartConfig}
                    withInnerLines={false}
                    fromZero
                    showValuesOnTopOfBars={false}
                    style={{
                      borderRadius: 20,
                      backgroundColor: "#EAF6FF",
                      marginLeft: -55, // ขยับไปซ้าย 20px
                    }}
                    withHorizontalLabels
                    withVerticalLabels={false}
                    yAxisLabel=""
                    yAxisSuffix=""
                    yLabelsOffset={8}
                  />
                </View>
              </View>
            </View>
            <View style={styles.chartDateTag}>
              <Text style={styles.chartDateText}>5/22/2025</Text>
            </View>
            {/* <Image source={require('./assets/chart.png')} style={styles.chartImage} resizeMode="contain" /> */}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

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
  },
  brainImage: {
    width: 100,
    height: 100,
    marginLeft: -10,
    marginRight: 16,
    marginBottom: -20,
  },
  playedBox: {
    flex: 1,
  },
  playedText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#4C749C",
    fontFamily: "kanitB",
  },
  playedDays: {
    marginTop: 8,
    backgroundColor: "#78A5FF",
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 8,
    fontSize: 24,
    color: "#fff",
    fontWeight: "bold",
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
  },
  progressBox: {
    borderWidth: 2,
    borderColor: "#fff",
  },
  statLabel: {
    fontSize: 22,
    color: "#1E3A8A",
    fontWeight: "bold",
    fontFamily: "kanitB",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E3A8A",
    marginTop: 4,
    fontFamily: "kanitB",
  },
  statUnit: {
    fontSize: 18,
    color: "#1E3A8A",
    fontFamily: "kanitB",
  },
  statLevel: {
    fontSize: 20,
    color: "#1E3A8A",
    marginVertical: 4,
    fontWeight: "bold",
    fontFamily: "kanitB",
  },
  trophy: {
    position: "absolute",
    right: 1,
    bottom: -7,
    width: 80,
    height: 80,
  },
  fullStatBox: {
    width: width * 0.9,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  chartBox: {
    width: width * 0.9,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 80,
  },
  chartTitle: {
    fontSize: 18,
    color: "#1E3A8A",
    fontWeight: "bold",
    marginBottom: 4,
    fontFamily: "kanitB",
  },
  chartDateTag: {
    backgroundColor: "#78A5FF",
    alignSelf: "flex-end",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 8,
  },
  chartDateText: {
    color: "#fff",
    fontWeight: "bold",
  },
  chartImage: {
    width: "100%",
    height: 120,
  },
  bottomMenu: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    backgroundColor: "#fff",
    width: "100%",
    height: 80,
    justifyContent: "space-around",
    alignItems: "center",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  menuItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 24,
    height: 24,
    marginBottom: 4,
  },
  playIcon: {
    width: 48,
    height: 48,
  },
  doubleStatBox: {
    width: (width * 0.9 - 8) / 2,
    justifyContent: "space-between",
  },
  halfBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    alignItems: "center",
  },
  statsCard: {
    padding: 18,
    marginBottom: 18,
    alignSelf: "center",
    overflow: "hidden",
  },
  innerRow: {
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
  },
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

  scrollContainer: {
    backgroundColor: "#EDF6FF",
  },
});
