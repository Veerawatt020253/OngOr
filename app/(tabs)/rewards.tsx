import { useFocusEffect } from "@react-navigation/native";
import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  Image,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "@/FirebaseConfig";
import { getTotalPoints } from "@/lib/scoreUtils";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// ✅ Realtime Database
import {
  getDatabase,
  ref as dbRef,
  get,
  child,
  onValue,
  runTransaction,
  push,
} from "firebase/database";

// ===== constants & keys =====
const K_SPENT = "@ongor:dressup:spent";
const CARD_RADIUS_BASE = 24;
const MILESTONE = 500;

// ===== paths (แนะนำให้เก็บโครงสร้างเดียว) =====
const pathTotal = (uid: string) => `users/${uid}/totalPoints`;
const pathSpent = (uid: string) => `users/${uid}/spentPoints`;
const pathRedemptions = (uid: string) => `users/${uid}/redemptions`;

// ===== responsive helpers (อิง BASE = iPhone 12/13/14) =====
function makeScalers(width: number, height: number, fontScale: number) {
  const BASE_W = 390,
    BASE_H = 844;
  const s = Math.min(width / BASE_W, 1.35);
  const vs = Math.min(height / BASE_H, 1.35);
  const scale = (n: number) => Math.round(n * s);
  const vscale = (n: number) => Math.round(n * vs);
  const fscale = (n: number) => Math.round((n * s) / Math.max(fontScale, 1));
  return { scale, vscale, fscale };
}

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

/* =========================
   Realtime DB helpers
   ========================= */

/** อ่าน totalPoints; รองรับ fallback หลาย path ตามที่คุณเคยใช้ */
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
        const val = snap.val();
        const n =
          typeof val === "number"
            ? val
            : typeof val === "string"
            ? parseInt(val, 10)
            : null;
        if (Number.isFinite(n)) return n as number;
      }
    }
    return null;
  } catch (e) {
    console.warn("RTDB total read error:", e);
    return null;
  }
}

/** อ่าน spentPoints จาก RTDB (ถ้าไม่มีให้คืน 0) */
async function getSpentPointsFromRTDB(uid: string): Promise<number> {
  try {
    const db = getDatabase();
    const snap = await get(child(dbRef(db), pathSpent(uid)));
    if (!snap.exists()) return 0;
    const v = snap.val();
    const n = typeof v === "number" ? v : parseInt(String(v), 10);
    return Number.isFinite(n) ? n : 0;
  } catch (e) {
    console.warn("RTDB spent read error:", e);
    return 0;
  }
}

/** เซ็ต spentPoints ลง RTDB แบบ overwrite (ใช้ตอน migrate/catch-up) */
async function setSpentPointsRTDB(uid: string, value: number) {
  const db = getDatabase();
  await runTransaction(dbRef(db, pathSpent(uid)), () => {
    const v = Math.max(0, Number(value) || 0);
    return v;
  });
}

/** ทำธุรกรรมแลกของรางวัล:
 * - ตรวจว่า available >= cost
 * - เขียน log ที่ users/{uid}/redemptions
 * - เพิ่ม spentPoints += cost ด้วย transaction (ป้องกัน race)
 * - หมายเหตุ: totalPoints = "สะสมทั้งหมด" จึงไม่หักออก
 */
async function redeemWithTransaction(
  uid: string,
  cost: number,
  meta?: { name?: string; note?: string }
) {
  if (cost <= 0) throw new Error("cost must be > 0");
  const db = getDatabase();
  const spentRef = dbRef(db, pathSpent(uid));
  const totalRef = dbRef(db, pathTotal(uid));

  // อ่าน total & spent ปัจจุบัน
  const [totalSnap, spentSnap] = await Promise.all([get(totalRef), get(spentRef)]);
  const total = totalSnap.exists() ? Number(totalSnap.val() || 0) : 0;
  const spent = spentSnap.exists() ? Number(spentSnap.val() || 0) : 0;
  const available = Math.max(0, total - spent);

  if (available < cost) throw new Error("แต้มคงเหลือไม่พอแลกของรางวัล");

  // log การแลกของรางวัล (ก่อนเพิ่ม spent เพื่อเก็บสถานะ)
  const redemptionRef = dbRef(db, pathRedemptions(uid));
  await push(redemptionRef, {
    cost,
    name: meta?.name ?? "Reward",
    note: meta?.note ?? "",
    createdAt: Date.now(), // ถ้าต้อง server time ใช้ Cloud Functions เขียนเวลาแทน
  });

  // เพิ่ม spent ด้วย transaction
  await runTransaction(spentRef, (cur) => {
    const current = Number.isFinite(Number(cur)) ? Number(cur) : 0;
    return current + cost;
  });
}

/** subscribe live updates ของ total/spent → คำนวณ available ให้ */
function subscribePoints(
  uid: string,
  onChange: (data: { total: number; spent: number; available: number }) => void
) {
  const db = getDatabase();
  const totalR = dbRef(db, pathTotal(uid));
  const spentR = dbRef(db, pathSpent(uid));

  let total = 0;
  let spent = 0;

  const emit = () =>
    onChange({ total, spent, available: Math.max(0, total - spent) });

  const unsubTotal = onValue(totalR, (snap) => {
    const v = snap.val();
    total = Number.isFinite(Number(v)) ? Number(v) : 0;
    emit();
  });
  const unsubSpent = onValue(spentR, (snap) => {
    const v = snap.val();
    spent = Number.isFinite(Number(v)) ? Number(v) : 0;
    emit();
  });

  return () => {
    unsubTotal();
    unsubSpent();
  };
}

/* =========================
   RewardScreen Component
   ========================= */

export default function RewardScreen() {
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const { scale, vscale, fscale } = useMemo(
    () => makeScalers(width, height, fontScale),
    [width, height, fontScale]
  );
  const isTablet = Math.min(width, height) >= 600;

  // เก็บทั้ง total / spent / available
  const [totalPoints, setTotalPoints] = useState(0);
  const [spentPoints, setSpentPoints] = useState(0);
  const [availablePoints, setAvailablePoints] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cardRadius = scale(CARD_RADIUS_BASE);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: "#EEF4FF",
          paddingTop: Math.max(insets.top, vscale(12)),
          paddingBottom: Math.max(insets.bottom, vscale(10)),
        },
        header: {
          fontSize: fscale(isTablet ? 36 : 32),
          color: "#3578d0",
          fontFamily: "kanitB",
          paddingHorizontal: scale(18),
          marginBottom: vscale(6),
        },
        scrollContent: {
          paddingHorizontal: scale(16),
          paddingBottom: vscale(32),
        },

        // --- Points Glass Card ---
        pointsCard: {
          backgroundColor: "rgba(255,255,255,0.8)",
          borderRadius: cardRadius,
          padding: scale(18),
          marginTop: vscale(12),
          marginBottom: vscale(18),
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
          fontSize: fscale(16),
          marginBottom: vscale(2),
        },
        pointsValue: {
          color: "#0F2B56",
          fontFamily: "kanitB",
          fontSize: fscale(isTablet ? 46 : 40),
        },
        pointsUnit: {
          fontSize: fscale(18),
          color: "#2A5FA0",
          fontFamily: "kanitM",
        },
        pointsSub: {
          color: "#3C6EA8",
          fontFamily: "kanitM",
          fontSize: fscale(13),
          marginTop: vscale(4),
        },

        giftCircle: {
          width: scale(isTablet ? 74 : 64),
          height: scale(isTablet ? 74 : 64),
          borderRadius: 999,
          backgroundColor: "#E0EEFF",
          alignItems: "center",
          justifyContent: "center",
          marginLeft: scale(12),
          borderWidth: 1,
          borderColor: "#CFE3FF",
        },

        milestoneRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: vscale(14),
          marginBottom: vscale(6),
        },
        milestoneText: {
          color: "#2D69AA",
          fontFamily: "kanitM",
          fontSize: fscale(13),
        },
        milestoneValue: {
          color: "#2D69AA",
          fontFamily: "kanitB",
          fontSize: fscale(13),
        },
        progressTrack: {
          height: vscale(8),
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
          paddingHorizontal: scale(10),
          paddingVertical: vscale(6),
          borderRadius: 999,
          marginTop: vscale(12),
        },
        badgeText: {
          color: "#2C6EAF",
          fontFamily: "kanitM",
          fontSize: fscale(12),
        },

        // --- Section ---
        sectionHead: {
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          paddingHorizontal: scale(4),
          marginTop: vscale(4),
          marginBottom: vscale(8),
        },
        sectionTitle: {
          color: "#3578d0",
          fontFamily: "kanitB",
          fontSize: fscale(20),
        },
        sectionHint: {
          color: "#6D94C8",
          fontFamily: "kanitM",
          fontSize: fscale(13),
        },

        // --- Empty card ---
        emptyCard: {
          backgroundColor: "#FFFFFF",
          borderRadius: cardRadius,
          paddingVertical: vscale(26),
          paddingHorizontal: scale(18),
          alignItems: "center",
          borderWidth: 1,
          borderColor: "#E3EEFF",
          shadowColor: "#000",
          shadowOpacity: 0.04,
          shadowOffset: { width: 0, height: 3 },
          shadowRadius: 10,
        },
        emptyTitle: {
          fontSize: fscale(18),
          color: "#245F9C",
          fontFamily: "kanitB",
          marginTop: vscale(10),
          textAlign: "center",
        },
        emptyDesc: {
          fontSize: fscale(14),
          color: "#3A74B3",
          fontFamily: "kanitM",
          textAlign: "center",
          marginTop: vscale(6),
          lineHeight: fscale(20),
        },

        // --- Info row ---
        infoRow: {
          flexDirection: isTablet ? "row" : "column",
          gap: scale(10),
          marginTop: vscale(18),
        },
        infoItem: {
          flex: 1,
          backgroundColor: "#FFFFFF",
          paddingVertical: vscale(14),
          paddingHorizontal: scale(14),
          borderRadius: scale(16),
          borderWidth: 1,
          borderColor: "#E3EEFF",
        },
        infoLabel: {
          color: "#2E71B5",
          fontFamily: "kanitB",
          fontSize: fscale(13),
          textAlign: "center",
        },
        infoValue: {
          color: "#3A74B3",
          fontFamily: "kanitM",
          fontSize: fscale(13),
          marginTop: vscale(4),
          textAlign: "center",
        },
      }),
    [scale, vscale, fscale, isTablet, insets.top, insets.bottom, cardRadius]
  );

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

      // 1) total จาก RTDB (fallback ไป scoreUtils ถ้าไม่มี)
      const fromRTDB = await getTotalPointsFromRTDB(uid);
      const total = Number.isFinite(fromRTDB)
        ? (fromRTDB as number)
        : await getTotalPoints();

      // 2) spent จาก RTDB (ถ้า RTDB ยัง 0 แต่ local มีค่า → migrate)
      const spentOnCloud = await getSpentPointsFromRTDB(uid);

      const localStr = await AsyncStorage.getItem(K_SPENT);
      const localSpent = parseInt(localStr || "0", 10) || 0;

      let spent = spentOnCloud;
      if (spentOnCloud === 0 && localSpent > 0) {
        // migrate → อัป RTDB แล้วล้าง local
        await setSpentPointsRTDB(uid, localSpent);
        await AsyncStorage.removeItem(K_SPENT);
        spent = localSpent;
      }

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
      (async () => {
        await fetchAllData();
      })();

      const uid = auth.currentUser?.uid;
      if (!uid) return () => {};

      // live subscribe → เด้งตัวเลขอัตโนมัติ
      const unsub = subscribePoints(uid, ({ total, spent, available }) => {
        setTotalPoints(total);
        setSpentPoints(spent);
        setAvailablePoints(available);
      });

      return () => {
        unsub?.();
      };
    }, [fetchAllData])
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }, [fetchAllData]);

  const milestonePct = Math.min(
    100,
    Math.round(((availablePoints % MILESTONE) / MILESTONE) * 100)
  );

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right", "bottom"]}
    >
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
                  <SkeletonBlock height={fscale(20)} width={"50%"} />
                  <SkeletonBlock
                    height={fscale(42)}
                    width={scale(160)}
                    round={scale(14)}
                  />
                  <SkeletonBlock height={fscale(14)} width={"40%"} />
                </>
              ) : (
                <>
                  <Text style={styles.pointsLabel}>แต้มคงเหลือ</Text>
                  <Text style={styles.pointsValue}>
                    {availablePoints}
                    <Text style={styles.pointsUnit}> แต้ม</Text>
                  </Text>
                  {/* <Text style={styles.pointsSub}>
                    สะสมทั้งหมด {totalPoints} แต้ม · ใช้ไป {spentPoints} แต้ม
                  </Text> */}
                </>
              )}
            </View>

            {/* ไอคอนของขวัญ */}
            <View style={styles.giftCircle}>
              <Image
                source={require("@/assets/gift.png")}
                style={{ width: scale(46), height: scale(46) }}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* แถบความคืบหน้าเล็ก ๆ (Progress ต่อ milestone) */}
          <View style={styles.milestoneRow}>
            <Text style={styles.milestoneText}>ใกล้แลกของรางวัล</Text>
            <Text style={styles.milestoneValue}>{milestonePct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${milestonePct}%` }]} />
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>พร้อมแลกเมื่อครบ {MILESTONE} แต้ม</Text>
          </View>

          {/* ปุ่มทดสอบแลก 100 แต้ม (เอาออกได้เมื่อขึ้น Production) */}
          {/* <View style={{ marginTop: vscale(12), alignItems: "flex-start" }}>
            <Text
              onPress={async () => {
                try {
                  const uid = auth.currentUser?.uid;
                  if (!uid) {
                    alert("กรุณาเข้าสู่ระบบก่อน");
                    return;
                  }
                  await redeemWithTransaction(uid, 100, {
                    name: "คูปองทดสอบ",
                    note: "dev test",
                  });
                  alert("แลกสำเร็จ - หัก 100 แต้มแล้ว");
                } catch (e: any) {
                  alert(e?.message || "แลกไม่สำเร็จ");
                }
              }}
              style={{
                backgroundColor: availablePoints >= 100 ? "#2D69AA" : "#9DBBE2",
                color: "#fff",
                fontFamily: "kanitB",
                fontSize: fscale(14),
                paddingHorizontal: scale(14),
                paddingVertical: vscale(8),
                borderRadius: 999,
              }}
            >
              แลกคูปอง 100 แต้ม (ทดสอบ)
            </Text>
          </View> */}
        </View>

        {/* ลิสต์ของรางวัล (ว่าง) */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>ของรางวัล</Text>
          <Text style={styles.sectionHint}>เร็ว ๆ นี้</Text>
        </View>

        <View style={styles.emptyCard}>
          <Image
            source={require("@/assets/elder.png")}
            style={{ width: scale(88), height: scale(88), opacity: 0.9 }}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>ตอนนี้ยังไม่มีของรางวัลให้แลก</Text>
          <Text style={styles.emptyDesc}>
            เก็บแต้มไว้ก่อนได้เลย เมื่อเปิดแลกจะมีแจ้งเตือนให้ทราบทันที
          </Text>
        </View>

        {/* ข้อมูลเพิ่มเติม */}
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
    </SafeAreaView>
  );
}
