import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Image, StyleSheet, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { BarChart } from "react-native-chart-kit";

export function DevelopmentStatsCard() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation(); // 👈 เพิ่ม navigation hook
  const CARD_WIDTH = 350;
  const CARD_HEIGHT = 170;

  const data = {
    labels: ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."],
    datasets: [{ data: [3, 4, 5, 6, 4, 5, 7] }],
  };

  const chartConfig = {
    backgroundGradientFrom: "#CAE6FC",
    backgroundGradientTo: "#CAE6FC",
    fillShadowGradient: "#4A90E2",
    fillShadowGradientOpacity: 1,
    color: (opacity = 1) => `rgba(53,120,208,${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 0, 0, ${opacity})`, // สีแดง
    barRadius: 0,
    propsForBackgroundLines: { stroke: "#CAE6FC" },
    decimalPlaces: 0,
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate("(page)/StatusScreen")} // 👈 เปลี่ยน "TargetScreen" เป็นชื่อหน้าที่คุณต้องการ
    >
      <View
        style={[styles.statsCard, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
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
