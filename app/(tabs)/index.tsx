import { DevelopmentStatsCard } from "@/components/DevelopmentStatsCard";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";

const WIDTH = Dimensions.get("window").width;

export default function HomeScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <Text style={styles.header}>สถิติพัฒนาการ</Text>

      {/* กราฟและรูป */}
      <DevelopmentStatsCard />

      {/* เล่นต่อเนื่อง */}
      <View style={styles.cardRow}>
        {/* รูปไฟ - อยู่เลเยอร์หลัง */}
        <View style={styles.fireImageContainer}>
          <Image
            source={require("@/assets/FireOngor.png")}
            style={styles.cloudImg}
            resizeMode="contain"
          />
        </View>

        {/* เนื้อหาหลัก - อยู่เลเยอร์หน้า */}
        <View style={styles.contentContainer}>
          <Text style={styles.streakLabel}>คุณเล่นต่อเนื่องมาแล้ว</Text>
          <View style={styles.streakBox}>
            <Text style={styles.streakNum}>99</Text>
            <Text style={styles.streakUnit}>วัน</Text>
          </View>
        </View>
      </View>

      {/* ร้านค้าพ้อยท์ */}
      <TouchableOpacity style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.shopLabel}>ร้านค้าพ้อยท์</Text>
          <Text style={styles.pointText}>
            คุณมีพ้อยท์สะสม : <Text style={{ fontWeight: "bold" }}>2,450</Text>{" "}
            พ้อยท์
          </Text>
        </View>
        <Image
          source={require("@/assets/gift.png")}
          style={styles.giftImg}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* ตั้งค่าแอป */}
      <TouchableOpacity style={styles.cardSimple}>
        <Text style={styles.settingText}>ตั้งค่าแอปพลิเคชัน</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F7FE",
    paddingHorizontal: 16,
    paddingTop: 55,
  },
  header: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#3578d0",
    marginBottom: 16,
    fontFamily: "kanitB",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24, // เพิ่มจาก 20 เป็น 24
    padding: 24, // เพิ่มจาก 18 เป็น 24
    marginBottom: 20, // เพิ่มจาก 16 เป็น 20
    shadowColor: "#000",
    shadowOpacity: 0.08, // เพิ่มเงาเล็กน้อย
    shadowOffset: { width: 0, height: 3 }, // เพิ่มเงา
    shadowRadius: 10, // เพิ่มเงา
    elevation: 3, // เพิ่มเงา Android
  },
  cardRow: {
    backgroundColor: "#fff",
    borderRadius: 24, // เพิ่มจาก 20 เป็น 24
    flexDirection: "row",
    alignItems: "center",
    padding: 24, // เพิ่มจาก 18 เป็น 24
    marginBottom: 20, // เพิ่มจาก 16 เป็น 20
    minHeight: 100, // เพิ่มความสูงขั้นต่ำ
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 3,
    overflow: "hidden"
  },
  cardSimple: {
    backgroundColor: "#fff",
    borderRadius: 24, // เพิ่มจาก 20 เป็น 24
    padding: 28, // เพิ่มจาก 18 เป็น 28
    marginBottom: 20, // เพิ่มจาก 16 เป็น 20
    minHeight: 80, // เพิ่มความสูงขั้นต่ำ
    justifyContent: "center",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 3,
  },
  fireImageContainer: {
    position: "absolute",
    left: -20, // ปรับตำแหน่งให้เหมาะสม
    top: -10,
    bottom: -10,
    width: 140,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1, // เลเยอร์หลัง
  },

  cloudImg: {
    width: 190, // ลดขนาดลงเล็กน้อย
    height: 190,
    opacity: 0.7, // ทำให้โปร่งใสเล็กน้อยเพื่อให้ดูเป็นพื้นหลัง
    marginStart: -10,
    marginBottom: -30
  },

  contentContainer: {
    flex: 1,
    alignItems: "center",
    zIndex: 2, // เลเยอร์หน้า
    paddingLeft: 60, // เว้นพื้นที่ให้รูปไฟ
  },
  streakLabel: {
    color: "#3578d0",
    fontSize: 18, // เพิ่มจาก 16 เป็น 18
    fontFamily: "kanitM",
    marginBottom: 6, // เพิ่มจาก 3 เป็น 6
  },
  streakBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#78A5FF",
    borderRadius: 16, // เพิ่มจาก 12 เป็น 16
    paddingHorizontal: 24, // เพิ่มจาก 18 เป็น 24
    paddingVertical: 10, // เพิ่มจาก 6 เป็น 10
    marginTop: 4, // เพิ่มจาก 2 เป็น 4
  },
  streakNum: {
    color: "#fff",
    fontSize: 32, // เพิ่มจาก 28 เป็น 32
    fontWeight: "bold",
    fontFamily: "kanitM",
    marginRight: 8, // เพิ่มจาก 6 เป็น 8
  },
  streakUnit: {
    color: "#fff",
    fontSize: 20, // เพิ่มจาก 18 เป็น 20
    fontFamily: "kanitM",
    marginTop: 6,
  },
  shopLabel: {
    color: "#3578d0",
    fontSize: 18, // เพิ่มจาก 16 เป็น 18
    fontFamily: "kanitM",
    marginBottom: 6, // เพิ่มจาก 2 เป็น 6
  },
  pointText: {
    fontSize: 17, // เพิ่มจาก 15 เป็น 17
    fontFamily: "kanitM",
    color: "#4997E4",
  },
  giftImg: {
    width: 80, // เพิ่มจาก 40 เป็น 50
    height: 80, // เพิ่มจาก 40 เป็น 50
    marginRight: -15,
    marginBottom: -35
  },
  settingText: {
    color: "#3578d0",
    fontSize: 22, // เพิ่มจาก 16 เป็น 18
    fontFamily: "kanitM",
  },
});
