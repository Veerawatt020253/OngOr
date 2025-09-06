import { useFocusEffect } from "@react-navigation/native";
import React, { useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "@/FirebaseConfig";
import { getTotalPoints } from "@/lib/scoreUtils";

// ✅ ใช้ key เดียวกับ ProfileScreen
const K_SPENT = "@ongor:dressup:spent";

// -------- Skeleton Block (แถบกระพริบแบบนุ่ม ๆ) --------
function SkeletonBlock({
  height = 18,
  width = "60%",
  round = 10,
}: {
  height?: number;
  width?: number | string;
  round?: number;
}) {
  const pulse = useRef(new Animated.Value(0.6)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.6,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View
      style={{
        height,
        width,
        borderRadius: round,
        backgroundColor: "#DDE9FF",
        opacity: pulse,
        marginVertical: 6,
      }}
    />
  );
}

export default function RewardScreen() {
  // เก็บทั้ง total / spent / available เพื่อไม่งง
  const [totalPoints, setTotalPoints] = useState(0);
  const [spentPoints, setSpentPoints] = useState(0);
  const [availablePoints, setAvailablePoints] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAllData = React.useCallback(async () => {
    try {
      setLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setTotalPoints(0);
        setSpentPoints(0);
        setAvailablePoints(0);
        return;
      }

      // 1) รวมแต้มทั้งหมด
      const total = await getTotalPoints();

      // 2) แต้มที่ใช้ไป (อ่านจาก AsyncStorage – ให้ตรงกับ Profile)
      const spentStr = await AsyncStorage.getItem(K_SPENT);
      const spent = parseInt(spentStr || "0", 10) || 0;

      // 3) คงเหลือ
      const available = Math.max(0, total - spent);

      setTotalPoints(total);
      setSpentPoints(spent);
      setAvailablePoints(available);
    } catch (error) {
      console.error("RewardScreen fetch error:", error);
      setTotalPoints(0);
      setSpentPoints(0);
      setAvailablePoints(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      (async () => {
        await fetchAllData();
      })();
      return () => {
        alive = false;
      };
    }, [fetchAllData])
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }, [fetchAllData]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>ร้านค้าแต้ม</Text>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3578d0"
          />
        }
      >
        {/* การ์ดแต้มคงเหลือ (Glass card) */}
        <View style={styles.pointsCard}>
          <View style={styles.pointsRow}>
            <View style={{ flex: 1 }}>
              {loading ? (
                <>
                  <SkeletonBlock height={20} width={"50%"} />
                  <SkeletonBlock height={42} width={140} round={14} />
                  <SkeletonBlock height={14} width={"40%"} />
                </>
              ) : (
                <>
                  <Text style={styles.pointsLabel}>แต้มคงเหลือ</Text>
                  <Text style={styles.pointsValue}>
                    {availablePoints}
                    <Text style={styles.pointsUnit}> แต้ม</Text>
                  </Text>
                  <Text style={styles.pointsSub}>
                    สะสมทั้งหมด {totalPoints} แต้ม · ใช้ไป {spentPoints} แต้ม
                  </Text>
                </>
              )}
            </View>

            {/* ไอคอนของขวัญ */}
            <View style={styles.giftCircle}>
              <Image
                source={require("@/assets/gift.png")}
                style={{ width: 46, height: 46 }}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* แถบความคืบหน้าเล็ก ๆ (Progress ต่อ milestone) */}
          <View style={styles.milestoneRow}>
            <Text style={styles.milestoneText}>ใกล้แลกของรางวัล</Text>
            <Text style={styles.milestoneValue}>
              {Math.min(100, Math.round((availablePoints % 500) / 5))}%
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, (availablePoints % 500) / 5)}%` },
              ]}
            />
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>พร้อมแลกเมื่อครบ 500 แต้ม</Text>
          </View>
        </View>

        {/* ลิสต์ของรางวัล (ว่าง) */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>ของรางวัล</Text>
          <Text style={styles.sectionHint}>เร็ว ๆ นี้</Text>
        </View>

        <View style={styles.emptyCard}>
          <Image
            source={require("@/assets/elder.png")}
            style={{ width: 88, height: 88, opacity: 0.9 }}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>ตอนนี้ยังไม่มีของรางวัลให้แลก</Text>
          <Text style={styles.emptyDesc}>
            เก็บแต้มไว้ก่อนได้เลย เมื่อเปิดแลกจะมีแจ้งเตือนให้ทราบทันที
          </Text>
        </View>

        {/* ข้อมูลเพิ่มเติม (ถ้าต้องการ) */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>วิธีได้แต้ม</Text>
            <Text style={styles.infoValue}>เล่นเกม, ภารกิจรายวัน</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>วันหมดอายุ</Text>
            <Text style={styles.infoValue}>ไม่มี (ณ ตอนนี้)</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const CARD_RADIUS = 24;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EEF4FF", paddingTop: 52, marginBottom: 70, },
  header: {
    fontSize: 32,
    color: "#3578d0",
    fontFamily: "kanitB",
    paddingHorizontal: 18,
    marginBottom: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  // --- Points Glass Card ---
  pointsCard: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: CARD_RADIUS,
    padding: 18,
    marginTop: 12,
    marginBottom: 18,
    shadowColor: "#3578d0",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(53,120,208,0.18)",
    overflow: "hidden",
  },
  pointsRow: { flexDirection: "row", alignItems: "center" },
  pointsLabel: {
    color: "#2664A5",
    fontFamily: "kanitM",
    fontSize: 16,
    marginBottom: 2,
  },
  pointsValue: { color: "#0F2B56", fontFamily: "kanitB", fontSize: 40 },
  pointsUnit: { fontSize: 18, color: "#2A5FA0", fontFamily: "kanitM" },
  pointsSub: {
    color: "#3C6EA8",
    fontFamily: "kanitM",
    fontSize: 13,
    marginTop: 4,
  },

  giftCircle: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: "#E0EEFF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    borderWidth: 1,
    borderColor: "#CFE3FF",
  },

  milestoneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 6,
  },
  milestoneText: { color: "#2D69AA", fontFamily: "kanitM", fontSize: 13 },
  milestoneValue: { color: "#2D69AA", fontFamily: "kanitB", fontSize: 13 },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#D6E7FF",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4A90E2",
    borderRadius: 999,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#E7F2FF",
    borderColor: "#CDE4FF",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 12,
  },
  badgeText: { color: "#2C6EAF", fontFamily: "kanitM", fontSize: 12 },

  // --- Section ---
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 4,
    marginBottom: 8,
  },
  sectionTitle: { color: "#3578d0", fontFamily: "kanitB", fontSize: 20 },
  sectionHint: { color: "#6D94C8", fontFamily: "kanitM", fontSize: 13 },

  // --- Empty card ---
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: CARD_RADIUS,
    paddingVertical: 26,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E3EEFF",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
  },
  emptyTitle: {
    fontSize: 18,
    color: "#245F9C",
    fontFamily: "kanitB",
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 14,
    color: "#3A74B3",
    fontFamily: "kanitM",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },

  // --- Info row ---
  infoRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  infoItem: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E3EEFF",
  },
  infoLabel: { color: "#2E71B5", fontFamily: "kanitB", fontSize: 13 },
  infoValue: {
    color: "#3A74B3",
    fontFamily: "kanitM",
    fontSize: 13,
    marginTop: 4,
  },
});
