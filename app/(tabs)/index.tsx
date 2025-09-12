import { useFocusEffect } from "@react-navigation/native";
import React, { useRef, useState, useEffect, useMemo } from "react";
import * as Notifications from "expo-notifications"; // (ยังไม่ใช้ในหน้า—คงไว้ได้)
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
  Platform,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "@/FirebaseConfig";
import { getTotalPoints } from "@/lib/scoreUtils";
import { DevelopmentStatsCard } from "@/components/DevelopmentStatsCard";
import { getStreak } from "@/lib/streakUtils";
import { router } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// ✅ Realtime Database (เพิ่ม)
import {
  getDatabase,
  ref as dbRef,
  get,
  child,
  onValue,
  set,
} from "firebase/database";

const K_SPENT = "@ongor:dressup:spent";

/* ---------- RTDB paths (เพิ่ม) ---------- */
const pathTotal = (uid: string) => `users/${uid}/totalPoints`;
const pathSpent = (uid: string) => `users/${uid}/spentPoints`;

/* ---------- helpers: points from RTDB (เพิ่ม) ---------- */
async function getTotalPointsFromRTDB(uid: string): Promise<number | null> {
  try {
    const db = getDatabase();
    const candidates = [
      pathTotal(uid),
      `userPoints/${uid}/total`,
      `points/${uid}/total`,
      `scores/${uid}/totalPoints`,
    ];
    for (const p of candidates) {
      const snap = await get(child(dbRef(db), p));
      if (snap.exists()) {
        const v = snap.val();
        const n =
          typeof v === "number"
            ? v
            : typeof v === "string"
            ? parseInt(v, 10)
            : null;
        if (Number.isFinite(n)) return n as number;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function getSpentPointsFromRTDB(uid: string): Promise<number> {
  try {
    const db = getDatabase();
    const snap = await get(child(dbRef(db), pathSpent(uid)));
    if (!snap.exists()) return 0;
    const v = snap.val();
    const n = typeof v === "number" ? v : parseInt(String(v), 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

async function setSpentPointsRTDB(uid: string, value: number) {
  const db = getDatabase();
  await set(dbRef(db, pathSpent(uid)), Math.max(0, Number(value) || 0));
}

/** ✅ listener แบบไม่ทับ state ด้วย 0 ถ้า snapshot ไม่มีค่า + รับ initial กันกระพริบ */
function subscribePoints(
  uid: string,
  onChange: (d: { total: number; spent: number; available: number }) => void,
  initial?: { total?: number; spent?: number }
) {
  const db = getDatabase();
  const totalR = dbRef(db, pathTotal(uid));
  const spentR = dbRef(db, pathSpent(uid));

  let total = Number.isFinite(initial?.total) ? (initial!.total as number) : 0;
  let spent = Number.isFinite(initial?.spent) ? (initial!.spent as number) : 0;

  const emit = () =>
    onChange({ total, spent, available: Math.max(0, total - spent) });

  const unsubTotal = onValue(totalR, (snap) => {
    if (snap.exists()) {
      const v = Number(snap.val());
      if (Number.isFinite(v)) total = v;
      emit();
    }
  });
  const unsubSpent = onValue(spentR, (snap) => {
    if (snap.exists()) {
      const v = Number(snap.val());
      if (Number.isFinite(v)) spent = v;
      emit();
    }
  });

  // ยิงค่าเริ่มต้นก่อนกันแว้บ
  emit();

  return () => {
    unsubTotal();
    unsubSpent();
  };
}

/* ---------- responsive helpers (base width 390, base height 844) ---------- */
function makeScalers(width: number, height: number, fontScale: number) {
  const BASE_W = 390;
  const BASE_H = 844;
  const s = Math.min(width / BASE_W, 1.35);
  const vs = Math.min(height / BASE_H, 1.35);
  const scale = (n: number) => Math.round(n * s);
  const vscale = (n: number) => Math.round(n * vs);
  const fscale = (n: number) => Math.round((n * s) / Math.max(fontScale, 1));
  return { scale, vscale, fscale };
}

/* ---------- Glass Skeleton Line ---------- */
function SkeletonLine({
  height = 12,
  width = "70%",
  round = 999,
  pulseValue,
}: {
  height?: number;
  width?: number | string;
  round?: number;
  pulseValue?: Animated.Value;
}) {
  const localPulse = useRef(new Animated.Value(0.6)).current;
  const pulse = pulseValue ?? localPulse;

  useEffect(() => {
    if (pulseValue) return;
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
  }, [pulse, pulseValue]);

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
function SkeletonCard({
  height = 190,
  styles,
  vscale,
}: {
  height?: number;
  styles: ReturnType<typeof StyleSheet.create>;
  vscale: (n: number) => number;
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
    <View style={[styles.cardSkeleton, { height: vscale(height) }]}>
      <View style={{ gap: vscale(10), width: "100%" }}>
        <SkeletonLine width="55%" pulseValue={pulse} height={vscale(10)} />
        <SkeletonLine width="85%" pulseValue={pulse} height={vscale(10)} />
        <SkeletonLine width="72%" pulseValue={pulse} height={vscale(10)} />
        <SkeletonLine width="40%" pulseValue={pulse} height={vscale(10)} />
      </View>
    </View>
  );
}

/* ---------- Themed Loading Overlay (Glass) ---------- */
function LoadingOverlay({
  visible,
  width,
  styles,
  scale,
}: {
  visible: boolean;
  width: number;
  styles: ReturnType<typeof StyleSheet.create>;
  scale: (n: number) => number;
}) {
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

  const cardWidth = Math.min(width - scale(48), scale(380));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.overlayTint, { opacity: fade }]}
      pointerEvents="none"
    >
      <View style={[styles.overlayCard, { width: cardWidth }]}>
        <View style={styles.overlayIconCircle}>
          <Text style={styles.overlayIconText}>ONGOR</Text>
        </View>

        <Animated.Text style={[styles.overlayTitle, { opacity: pulse }]}>
          กำลังโหลดข้อมูล…
        </Animated.Text>
        <Text style={styles.overlayHint}>
          ขอเวลาสักครู่ กำลังดึงสถิติและแต้มของคุณ
        </Text>

        <View style={{ width: "100%", gap: scale(8), marginTop: scale(6) }}>
          <SkeletonLine width="78%" height={scale(10)} />
          <SkeletonLine width="62%" height={scale(10)} />
          <SkeletonLine width="86%" height={scale(10)} />
        </View>
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;
  const { scale, vscale, fscale } = useMemo(
    () => makeScalers(width, height, fontScale),
    [width, height, fontScale]
  );
  const TOP_GAP = insets.top;

  const TAB_BAR_HEIGHT = 84;
  const EXTRA_SPACE = 12;
  const BOTTOM_GAP = Math.max(insets.bottom, 10) + TAB_BAR_HEIGHT + EXTRA_SPACE;

  const styles = useMemo(() => {
    const H_PADDING = isTablet ? scale(22) : scale(16);
    return StyleSheet.create({
      // layout
      root: { flex: 1, backgroundColor: "#F2F7FE" },
      container: {
        flex: 1,
        backgroundColor: "#F2F7FE",
        paddingHorizontal: H_PADDING,
        paddingTop: vscale(12),
      },
      contentPad: { paddingBottom: vscale(32) },
      header: {
        fontSize: fscale(isTablet ? 36 : 34),
        color: "#3578d0",
        marginBottom: vscale(16),
        fontFamily: "kanitB",
      },

      /* ----- Real Cards ----- */
      cardRow: {
        backgroundColor: "#fff",
        borderRadius: scale(24),
        flexDirection: "row",
        alignItems: "center",
        padding: scale(24),
        marginBottom: vscale(20),
        minHeight: vscale(100),
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
        borderRadius: scale(24),
        padding: scale(28),
        marginBottom: vscale(20),
        minHeight: vscale(80),
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
        left: -scale(20),
        top: -vscale(10),
        bottom: -vscale(10),
        width: scale(140),
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
      },
      cloudImg: {
        width: scale(190),
        height: scale(190),
        opacity: 0.7,
        marginStart: -scale(10),
        marginBottom: -vscale(30),
      },
      contentContainer: {
        flex: 1,
        alignItems: "center",
        zIndex: 2,
        paddingLeft: scale(60),
      },
      streakLabel: {
        color: "#3578d0",
        fontSize: fscale(18),
        fontFamily: "kanitM",
        marginBottom: vscale(6),
      },
      streakBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#78A5FF",
        borderRadius: scale(16),
        paddingHorizontal: scale(24),
        paddingVertical: vscale(10),
        marginTop: vscale(4),
      },
      streakNum: {
        color: "#fff",
        fontSize: fscale(32),
        fontFamily: "kanitM",
        marginRight: scale(8),
      },
      streakUnit: {
        color: "#fff",
        fontSize: fscale(20),
        fontFamily: "kanitM",
        marginTop: vscale(6),
      },
      shopLabel: {
        color: "#3578d0",
        fontSize: fscale(18),
        fontFamily: "kanitM",
        marginBottom: vscale(6),
      },
      pointText: {
        fontSize: fscale(17),
        fontFamily: "kanitM",
        color: "#4997E4",
      },
      giftImg: {
        width: scale(80),
        height: scale(80),
        marginRight: -scale(15),
        marginBottom: -vscale(35),
      },
      settingText: {
        color: "#3578d0",
        fontSize: fscale(22),
        fontFamily: "kanitM",
      },

      /* ----- Overlay (glass theme) ----- */
      overlayTint: {
        backgroundColor: "rgba(238,244,255,0.92)",
        justifyContent: "center",
        alignItems: "center",
      },
      overlayCard: {
        backgroundColor: "rgba(255,255,255,0.86)",
        borderRadius: scale(28),
        paddingVertical: vscale(26),
        paddingHorizontal: scale(22),
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(53,120,208,0.18)",
        shadowColor: "#3578d0",
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 16,
      },
      overlayIconCircle: {
        width: scale(68),
        height: scale(68),
        borderRadius: 999,
        backgroundColor: "#E0EEFF",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: vscale(10),
        borderWidth: 1,
        borderColor: "#CFE3FF",
      },
      overlayIconText: {
        color: "#245f9c",
        fontSize: fscale(18),
        fontFamily: "kanitB",
        letterSpacing: 1.2,
      },
      overlayTitle: {
        color: "#1f3b63",
        fontSize: fscale(18),
        fontFamily: "kanitB",
        marginBottom: vscale(6),
      },
      overlayHint: {
        color: "#35649a",
        fontSize: fscale(14),
        fontFamily: "kanitM",
        marginBottom: vscale(14),
        textAlign: "center",
      },

      /* ----- Card Skeleton ----- */
      cardSkeleton: {
        backgroundColor: "#FFFFFF",
        borderRadius: scale(24),
        padding: scale(24),
        marginBottom: vscale(20),
        minHeight: vscale(100),
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
  }, [isTablet, scale, vscale, fscale, TOP_GAP]);

  const [streak, setStreak] = useState(0);
  const [points, setPoints] = useState(0); // ✅ available points = total - spent
  const [streakLoading, setStreakLoading] = useState(true);
  const [pointsLoading, setPointsLoading] = useState(true);
  const [minHoldDone, setMinHoldDone] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinHoldDone(true), 500);
    return () => clearTimeout(t);
  }, []);

  // โหลด streak รอบแรก (เดิม)
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

  // ✅ โหลด/subscribe แต้มจาก RTDB ทุกครั้งที่หน้าโฟกัส (กันแว้บเป็น 0)
  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      let unsubscribe: null | (() => void) = null;
      (async () => {
        setPointsLoading(true);
        try {
          const uid = auth.currentUser?.uid;
          if (!uid) {
            if (alive) setPoints(0);
            return;
          }

          // โหลดค่าตั้งต้น
          const [fallbackTotal, cloudTotal, cloudSpent, localSpentStr] =
            await Promise.all([
              getTotalPoints(), // fallback
              getTotalPointsFromRTDB(uid),
              getSpentPointsFromRTDB(uid),
              AsyncStorage.getItem(K_SPENT), // legacy
            ]);

          const total = Number.isFinite(cloudTotal as number)
            ? (cloudTotal as number)
            : fallbackTotal;

          let spent = cloudSpent;
          const localSpent = parseInt(localSpentStr || "0", 10) || 0;

          // migrate local -> RTDB ครั้งแรก (ถ้า cloud ยัง 0 แต่ local มี)
          if (spent === 0 && localSpent > 0) {
            await setSpentPointsRTDB(uid, localSpent);
            spent = localSpent;
            await AsyncStorage.removeItem(K_SPENT);
          }

          // (ทางเลือก) hydrate total ลง RTDB ถ้ายังไม่มี node
          try {
            const tRef = dbRef(getDatabase(), pathTotal(uid));
            const tSnap = await get(tRef);
            if (!tSnap.exists() && Number.isFinite(total)) {
              await set(tRef, total);
            }
          } catch {}

          if (alive) {
            setPoints(Math.max(0, total - spent));
          }

          // subscribe realtime โดยส่ง initial กันกระพริบ
          unsubscribe = subscribePoints(
            uid,
            ({ available }) => {
              if (!alive) return;
              setPoints(available);
            },
            { total, spent }
          );
        } catch (e) {
          console.log("points load/subscribe error:", e);
          if (alive) setPoints(0);
        } finally {
          if (alive) setPointsLoading(false);
        }
      })();

      return () => {
        alive = false;
        unsubscribe?.();
      };
    }, [])
  );

  // Pull-to-refresh → อ่านจาก RTDB (ไม่ทับด้วย 0)
  const onRefresh = async () => {
    setRefreshing(true);
    setStreakLoading(true);
    setPointsLoading(true);
    try {
      const uid = auth.currentUser?.uid;

      const s = await getStreak();
      setStreak(s);

      if (!uid) {
        setPoints(0);
      } else {
        const [cloudTotal, cloudSpent] = await Promise.all([
          getTotalPointsFromRTDB(uid),
          getSpentPointsFromRTDB(uid),
        ]);

        if (Number.isFinite(cloudTotal as number)) {
          setPoints(Math.max(0, (cloudTotal as number) - cloudSpent));
        } else {
          // fallback: ใช้ระบบเดิม + local legacy
          const total = await getTotalPoints();
          const spentStr = await AsyncStorage.getItem(K_SPENT);
          const spent = parseInt(spentStr || "0", 10) || 0;
          setPoints(Math.max(0, total - spent));
        }
      }
    } catch {
      setPoints(0);
    } finally {
      setStreakLoading(false);
      setPointsLoading(false);
      setRefreshing(false);
    }
  };

  const isLoading = streakLoading || pointsLoading || !minHoldDone;

  return (
    <View style={styles.root}>
      <SafeAreaView
        edges={["top", "left", "right", "bottom"]}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.contentPad,
            { paddingBottom: BOTTOM_GAP },
          ]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3578d0"
            />
          }
        >
          <Text style={styles.header}>สถิติพัฒนาการ</Text>

          {/* กราฟและรูป */}
          {isLoading ? (
            <SkeletonCard height={190} styles={styles} vscale={vscale} />
          ) : (
            <DevelopmentStatsCard />
          )}

          {/* เล่นต่อเนื่อง */}
          {isLoading ? (
            <SkeletonCard height={120} styles={styles} vscale={vscale} />
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

          {/* ร้านค้าแต้ม */}
          {isLoading ? (
            <SkeletonCard height={120} styles={styles} vscale={vscale} />
          ) : (
            <TouchableOpacity
              style={styles.cardRow}
              // @ts-ignore
              onPress={() => router.push("rewards")}
              activeOpacity={0.9}
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
            <SkeletonCard height={90} styles={styles} vscale={vscale} />
          ) : (
            <TouchableOpacity
              style={styles.cardSimple}
              // @ts-ignore
              onPress={() => router.push("/(page)/ProfileSettingsScreen")}
              activeOpacity={0.9}
            >
              <Text style={styles.settingText}>ตั้งค่าแอปพลิเคชัน</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Overlay โหลดรวม (glass) */}
      <LoadingOverlay
        visible={isLoading}
        width={width}
        styles={styles}
        scale={scale}
      />
    </View>
  );
}
