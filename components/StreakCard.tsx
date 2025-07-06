import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

export function StreakCard() {
  return (
    <View style={styles.streakCard}>
      <Image
        source={require("../../assets/cloud.png")}
        style={styles.cloudImg}
        resizeMode="contain"
      />
      <View style={{ flex: 1, alignItems: "center" }}>
        <Text style={styles.streakLabel}>คุณเล่นต่อเนื่องมาแล้ว</Text>
        <View style={styles.streakBox}>
          <Text style={styles.streakNum}>99</Text>
          <Text style={styles.streakUnit}>วัน</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  streakCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  cloudImg: {
    width: 60,
    height: 60,
    marginRight: 10,
  },
  streakLabel: {
    color: "#3578d0",
    fontSize: 16,
    fontFamily: "kanitM",
    marginBottom: 3,
  },
  streakBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E6F0FF",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginTop: 2,
  },
  streakNum: {
    color: "#3578d0",
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: "kanitM",
    marginRight: 6,
  },
  streakUnit: {
    color: "#3578d0",
    fontSize: 18,
    fontFamily: "kanitM",
    marginTop: 6,
  },
});
