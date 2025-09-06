import { useFocusEffect } from "@react-navigation/native";
import React, { useRef, useState, useEffect } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "@/FirebaseConfig";
import { getTotalPoints } from "@/lib/scoreUtils";
import { DevelopmentStatsCard } from "@/components/DevelopmentStatsCard";
import { getStreak } from "@/lib/streakUtils";
import { router } from "expo-router";

const WIDTH = Dimensions.get("window").width;
const K_SPENT = "@ongor:dressup:spent";

/* ---------- Glass Skeleton Line ---------- */
function SkeletonLine({
  height = 12,
  width = "70%",
  round = 999,
}: {
  height?: number;
  width?: number | string;
  round?: number;
}) {
  const pulse = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.6,
          duration: 750,
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
        backgroundColor: "#D6E7FF",
        opacity: pulse,
      }}
    />
  );
}

/* ---------- Skeleton Card ---------- */
function SkeletonCard({ height = 190 }: { height?: number }) {
  return (
    <View style={[styles.cardSkeleton, { height }]}>
      <View style={{ gap: 10, width: "100%" }}>
        <SkeletonLine width="55%" />
        <SkeletonLine width="85%" />
        <SkeletonLine width="72%" />
        <SkeletonLine width="40%" />
      </View>
    </View>
  );
}

/* ---------- Themed Loading Overlay (Glass) ---------- */
function LoadingOverlay({ visible }: { visible: boolean }) {
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fade, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
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
    } else {
      Animated.timing(fade, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fade, pulse]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.overlayTint, { opacity: fade }]}
    >
      <View style={styles.overlayCard}>
        <View style={styles.overlayIconCircle}>
          <Text style={styles.overlayIconText}>ONGOR</Text>
        </View>

        <Animated.Text style={[styles.overlayTitle, { opacity: pulse }]}>
          กำลังโหลดข้อมูล…
        </Animated.Text>
        <Text style={styles.overlayHint}>
          ขอเวลาสักครู่ กำลังดึงสถิติและแต้มของคุณ
        </Text>

        <View style={{ width: "100%", gap: 8, marginTop: 6 }}>
          <SkeletonLine width="78%" height={10} />
          <SkeletonLine width="62%" height={10} />
          <SkeletonLine width="86%" height={10} />
        </View>
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const [streak, setStreak] = useState(0);
  const [points, setPoints] = useState(0);
  const [streakLoading, setStreakLoading] = useState(true);
  const [pointsLoading, setPointsLoading] = useState(true);
  const [minHoldDone, setMinHoldDone] = useState(false); // ให้ overlay แสดงอย่างน้อย 500ms กันกระพริบ

  useEffect(() => {
    const t = setTimeout(() => setMinHoldDone(true), 500);
    return () => clearTimeout(t);
  }, []);

  // โหลด streak รอบแรก
  useEffect(() => {
    (async () => {
      try {
        const currentStreak = await getStreak();
        setStreak(currentStreak);
      } catch (e) {
        console.log("fetch streak error", e);
        setStreak(0);
      } finally {
        setStreakLoading(false);
      }
    })();
  }, []);

  // โหลด/รีโหลดแต้มทุกครั้งที่หน้าโฟกัส
  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      setPointsLoading(true);
      (async () => {
        try {
          const total = await getTotalPoints();
          const spentStr = await AsyncStorage.getItem(K_SPENT);
          const spent = parseInt(spentStr || "0", 10) || 0;
          const available = Math.max(0, total - spent);
          if (alive) setPoints(available);
        } catch (e) {
          console.log("fetch points error", e);
          if (alive) setPoints(0);
        } finally {
          if (alive) setPointsLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  const isLoading = streakLoading || pointsLoading || !minHoldDone;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          // ให้ผู้ใช้ดึงรีเฟรชได้ (จะเห็น overlay สั้น ๆ)
          <RefreshControl
            refreshing={false}
            onRefresh={async () => {
              // trigger โหลดใหม่สั้น ๆ
              setStreakLoading(true);
              setPointsLoading(true);
              try {
                const [s, total] = await Promise.all([
                  getStreak(),
                  getTotalPoints(),
                ]);
                const spentStr = await AsyncStorage.getItem(K_SPENT);
                const spent = parseInt(spentStr || "0", 10) || 0;
                setStreak(s);
                setPoints(Math.max(0, total - spent));
              } catch {
                setPoints(0);
              } finally {
                setStreakLoading(false);
                setPointsLoading(false);
              }
            }}
            tintColor="#3578d0"
          />
        }
      >
        <Text style={styles.header}>สถิติพัฒนาการ</Text>

        {/* กราฟและรูป */}
        {isLoading ? <SkeletonCard height={190} /> : <DevelopmentStatsCard />}

        {/* เล่นต่อเนื่อง */}
        {isLoading ? (
          <SkeletonCard height={120} />
        ) : (
          <View style={styles.cardRow}>
            <View style={styles.fireImageContainer}>
              <Image
                source={require("@/assets/FireOngor.png")}
                style={styles.cloudImg}
                resizeMode="contain"
              />
            </View>

            <View style={styles.contentContainer}>
              <Text style={styles.streakLabel}>คุณเล่นต่อเนื่องมาแล้ว</Text>
              <View style={styles.streakBox}>
                <Text style={styles.streakNum}>{streak}</Text>
                <Text style={styles.streakUnit}>วัน</Text>
              </View>
            </View>
          </View>
        )}

        {/* ร้านค้าแต้ม (ข้อความในหน้าอื่นอาจใช้ “แต้ม” แล้ว—ที่นี่คงเดิมได้ตามต้องการ) */}
        {isLoading ? (
          <SkeletonCard height={120} />
        ) : (
          <TouchableOpacity
            style={styles.cardRow}
            // @ts-ignore
            onPress={() => router.push("rewards")}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.shopLabel}>ร้านค้าแต้ม</Text>
              <Text style={styles.pointText}>
                คุณมีแต้มสะสม :{" "}
                <Text style={{ fontFamily: "kanitB" }}>{points}</Text> แต้ม
              </Text>
            </View>
            <Image
              source={require("@/assets/gift.png")}
              style={styles.giftImg}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}

        {/* ตั้งค่าแอป */}
        {isLoading ? (
          <SkeletonCard height={90} />
        ) : (
          <TouchableOpacity
            style={styles.cardSimple}
            // @ts-ignore
            onPress={() => router.push("/(page)/ProfileSettingsScreen")}
          >
            <Text style={styles.settingText}>ตั้งค่าแอปพลิเคชัน</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Overlay โหลดรวม (glass) */}
      <LoadingOverlay visible={isLoading} />
    </View>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F7FE",
    paddingHorizontal: 16,
    paddingTop: 55,
    marginBottom: 70,
  },
  header: {
    fontSize: 34,
    color: "#3578d0",
    marginBottom: 16,
    fontFamily: "kanitB",
  },

  /* ----- Real Cards ----- */
  cardRow: {
    backgroundColor: "#fff",
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    marginBottom: 20,
    minHeight: 100,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 3,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E3EEFF",
  },
  cardSimple: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    marginBottom: 20,
    minHeight: 80,
    justifyContent: "center",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E3EEFF",
  },

  /* ----- Inside card ----- */
  fireImageContainer: {
    position: "absolute",
    left: -20,
    top: -10,
    bottom: -10,
    width: 140,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  cloudImg: {
    width: 190,
    height: 190,
    opacity: 0.7,
    marginStart: -10,
    marginBottom: -30,
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    zIndex: 2,
    paddingLeft: 60,
  },
  streakLabel: {
    color: "#3578d0",
    fontSize: 18,
    fontFamily: "kanitM",
    marginBottom: 6,
  },
  streakBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#78A5FF",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 4,
  },
  streakNum: {
    color: "#fff",
    fontSize: 32,
    fontFamily: "kanitM",
    marginRight: 8,
  },
  streakUnit: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "kanitM",
    marginTop: 6,
  },
  shopLabel: {
    color: "#3578d0",
    fontSize: 18,
    fontFamily: "kanitM",
    marginBottom: 6,
  },
  pointText: { fontSize: 17, fontFamily: "kanitM", color: "#4997E4" },
  giftImg: { width: 80, height: 80, marginRight: -15, marginBottom: -35 },
  settingText: { color: "#3578d0", fontSize: 22, fontFamily: "kanitM" },

  /* ----- Overlay (glass theme) ----- */
  overlayTint: {
    backgroundColor: "rgba(238,244,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayCard: {
    backgroundColor: "rgba(255,255,255,0.86)",
    borderRadius: 28,
    paddingVertical: 26,
    paddingHorizontal: 22,
    width: Math.min(WIDTH - 48, 380),
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(53,120,208,0.18)",
    shadowColor: "#3578d0",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
  },
  overlayIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 999,
    backgroundColor: "#E0EEFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#CFE3FF",
  },
  overlayIconText: {
    color: "#245f9c",
    fontSize: 18,
    fontFamily: "kanitB",
    letterSpacing: 1.2,
  },
  overlayTitle: {
    color: "#1f3b63",
    fontSize: 18,
    fontFamily: "kanitB",
    marginBottom: 6,
  },
  overlayHint: {
    color: "#35649a",
    fontSize: 14,
    fontFamily: "kanitM",
    marginBottom: 14,
  },

  /* ----- Card Skeleton ----- */
  cardSkeleton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    minHeight: 100,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 2,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E3EEFF",
  },
});
