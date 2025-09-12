// app/(page)/ProfileScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import LogoutButton from "@/components/LogoutBtn";
import { getTotalPoints } from "@/lib/scoreUtils";
import { getStreak } from "@/lib/streakUtils";
import { router } from "expo-router";
import { auth } from "@/FirebaseConfig";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// ✅ Realtime Database (แต้ม/ของ/แต่ง)
import {
  getDatabase,
  ref as dbRef,
  get,
  child,
  onValue,
  runTransaction,
  set,
  update,
  push,
} from "firebase/database";

/* ========= constants ========= */
const FIXED_LEVEL = 1;
const K_USER = "@ongor:user"; // display only (fallback)
const K_OWNED = "@ongor:dressup:owned"; // legacy fallback (array of itemId)
const K_EQUIPPED = "@ongor:dressup:equipped"; // legacy fallback (Record<Slot,string|null>)
const K_OUTFIT_LOG = "@ongor:dressup:log"; // local outfit log
const K_SPENT_LEGACY = "@ongor:dressup:spent"; // legacy spent (migrate หนึ่งครั้ง)

/* ========= responsive helpers ========= */
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

/* ========= dress-up model ========= */
type Slot = "head" | "eyes" | "body" | "cape";
type Item = {
  id: string;
  name: string;
  slot: Slot;
  price: number;
  icon: any;
  variant: any;
};

// ★★ แก้ path ให้ตรงโปรเจกต์คุณ ★★
const SHOP_ITEMS: Item[] = [
  {
    id: "eyes_sunglasses",
    name: "แว่นเท่",
    slot: "eyes",
    price: 200,
    icon: require("@/assets/dressup/icons/glass.png"),
    variant: require("@/assets/dressup/variants/glass.png"),
  },
  {
    id: "body_hawaii",
    name: "เชิ้ตฮาวาย",
    slot: "body",
    price: 250,
    icon: require("@/assets/dressup/icons/Hawaii.png"),
    variant: require("@/assets/dressup/variants/Hawaii.png"),
  },
  {
    id: "head_beanie",
    name: "หมวกไหมพรม",
    slot: "head",
    price: 150,
    icon: require("@/assets/dressup/icons/hat.png"),
    variant: require("@/assets/dressup/variants/hat.png"),
  },
  {
    id: "cape_king",
    name: "มงกุฎ+ผ้าคลุม",
    slot: "cape",
    price: 500,
    icon: require("@/assets/dressup/icons/King.png"),
    variant: require("@/assets/dressup/variants/King.png"),
  },
];

// base art
const SCENE_BG = require("@/assets/dressup/bg-land.png");
const BRAIN_BASE = require("@/assets/dressup/brain-base.png");

/* ========= Firestore helpers (ชื่อผู้ใช้) ========= */
async function fetchFullnameByUid(uid: string): Promise<string | null> {
  const db = getFirestore();

  // 1) docId = uid
  const directRef = doc(db, "users", uid);
  const directSnap = await getDoc(directRef);
  if (directSnap.exists()) {
    const data = directSnap.data() as any;
    if (data?.fullname) return String(data.fullname);
  }

  // 2) docId สุ่ม → where uid == uid
  const q = query(collection(db, "users"), where("uid", "==", uid), limit(1));
  const qs = await getDocs(q);
  if (!qs.empty) {
    const data = qs.docs[0].data() as any;
    if (data?.fullname) return String(data.fullname);
  }
  return null;
}

/* ========= RTDB paths ========= */
const pathTotal = (uid: string) => `users/${uid}/totalPoints`;
const pathSpent = (uid: string) => `users/${uid}/spentPoints`;
const pathDressOwned = (uid: string) => `users/${uid}/dressup/owned`; // map { itemId: true }
const pathDressEquipped = (uid: string) => `users/${uid}/dressup/equipped`; // per slot
const pathDressLogs = (uid: string) => `users/${uid}/dressup/logs`; // push logs
const pathPurchases = (uid: string) => `users/${uid}/dressup/purchases`; // push purchase logs

/* ========= RTDB helpers (points) ========= */
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

async function setSpentPointsRTDB(uid: string, value: number) {
  const db = getDatabase();
  await runTransaction(dbRef(db, pathSpent(uid)), () => {
    const v = Math.max(0, Number(value) || 0);
    return v;
  });
}

/** ✅ Listener แบบไม่ทับค่าด้วย 0 เมื่อ snapshot ไม่มีค่า และรองรับค่าเริ่มต้น */
function subscribePoints(
  uid: string,
  onChange: (data: { total: number; spent: number; available: number }) => void,
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
    // ถ้าไม่มี node → ไม่แตะ total (กันถูกทับเป็น 0)
  });

  const unsubSpent = onValue(spentR, (snap) => {
    if (snap.exists()) {
      const v = Number(snap.val());
      if (Number.isFinite(v)) spent = v;
      emit();
    }
    // ถ้าไม่มี node → ไม่แตะ spent
  });

  // ยิงค่าตั้งต้นกันกระพริบ
  emit();

  return () => {
    unsubTotal();
    unsubSpent();
  };
}

/* ---- owned/equipped helpers ---- */
async function readOwnedFromRTDB(uid: string): Promise<string[]> {
  const db = getDatabase();
  const snap = await get(child(dbRef(db), pathDressOwned(uid)));
  if (!snap.exists()) return [];
  const obj = snap.val() || {};
  return Object.keys(obj).filter((k) => obj[k] === true);
}

async function readEquippedFromRTDB(
  uid: string
): Promise<Record<Slot, string | null>> {
  const db = getDatabase();
  const snap = await get(child(dbRef(db), pathDressEquipped(uid)));
  const base: Record<Slot, string | null> = {
    head: null,
    eyes: null,
    body: null,
    cape: null,
  };
  if (!snap.exists()) return base;
  const v = snap.val() || {};
  return {
    head: typeof v.head === "string" ? v.head : null,
    eyes: typeof v.eyes === "string" ? v.eyes : null,
    body: typeof v.body === "string" ? v.body : null,
    cape: typeof v.cape === "string" ? v.cape : null,
  };
}

async function addOwnedRTDB(uid: string, itemId: string) {
  const db = getDatabase();
  await update(dbRef(db, pathDressOwned(uid)), { [itemId]: true });
}

async function setEquippedRTDB(
  uid: string,
  slot: Slot,
  itemId: string | null
) {
  const db = getDatabase();
  await update(dbRef(db, pathDressEquipped(uid)), { [slot]: itemId ?? null });
}

async function logOutfitRTDB(uid: string, entry: any) {
  const db = getDatabase();
  await push(dbRef(db, pathDressLogs(uid)), entry);
}

async function logPurchaseRTDB(uid: string, entry: any) {
  const db = getDatabase();
  await push(dbRef(db, pathPurchases(uid)), entry);
}

/* ========= Screen ========= */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const { scale, vscale, fscale } = useMemo(
    () => makeScalers(width, height, fontScale),
    [width, height, fontScale]
  );
  const isTablet = Math.min(width, height) >= 600;

  const TAB_BAR_HEIGHT = scale(84);
  const BOTTOM_GAP = Math.max(insets.bottom, 10) + TAB_BAR_HEIGHT + vscale(8);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: "#EEF4FF" },
        scroll: { paddingBottom: BOTTOM_GAP, paddingTop: vscale(24) },

        headerTextWrap: { alignItems: "center", paddingVertical: vscale(6) },
        mainTitle: {
          fontSize: fscale(isTablet ? 32 : 28),
          color: "#226cb0",
          fontFamily: "kanitB",
        },
        subTitle: {
          fontSize: fscale(16),
          color: "#3b82f6",
          fontFamily: "kanitB",
          marginTop: vscale(2),
        },

        sceneCard: {
          marginHorizontal: scale(16),
          backgroundColor: "#9dd4ff",
          borderRadius: scale(20),
          overflow: "hidden",
          borderColor: "#6ec0ff",
          borderWidth: scale(3),
        },
        sceneBg: { width: "100%", height: vscale(180) },
        avatarBox: {
          position: "absolute",
          left: 0,
          right: 0,
          top: vscale(22),
          height: vscale(160),
          alignItems: "center",
          justifyContent: "center",
        },
        avatarFull: { width: scale(190), height: scale(190), resizeMode: "contain" },

        dressTitleWrap: {
          alignItems: "center",
          marginTop: vscale(8),
          marginBottom: vscale(6),
        },
        dressTitle: { fontSize: fscale(20), color: "#226cb0", fontFamily: "kanitB" },

        infoRow: {
          marginTop: vscale(8),
          marginHorizontal: scale(16),
          flexDirection: "row",
          alignItems: "center",
          gap: scale(10),
        },
        pointsPill: {
          flexDirection: "row",
          alignItems: "center",
          gap: scale(6),
          backgroundColor: "#e8f0ff",
          borderColor: "#cfe0ff",
          borderWidth: 2,
          paddingHorizontal: scale(12),
          paddingVertical: vscale(8),
          borderRadius: 999,
        },
        pointsText: {
          color: "#1f51ff",
          fontFamily: "kanitB",
          fontSize: fscale(14),
        },
        pointsSub: {
          color: "#225f9e",
          fontFamily: "kanitM",
          fontSize: fscale(12),
          marginTop: vscale(4),
        },

        settingButton: {
          marginLeft: "auto",
          flexDirection: "row",
          gap: scale(6),
          alignItems: "center",
          backgroundColor: "#77a5ff",
          paddingHorizontal: scale(12),
          paddingVertical: vscale(8),
          borderRadius: scale(12),
        },
        settingText: { color: "#fff", fontFamily: "kanitB", fontSize: fscale(13) },

        grid: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: scale(14),
          paddingHorizontal: scale(16),
          paddingTop: vscale(14),
        },
        card: {
          width: "46%",
          aspectRatio: 1.05,
          backgroundColor: "#cfe1ff",
          borderRadius: scale(18),
          padding: scale(14),
          alignItems: "center",
          justifyContent: "center",
          borderColor: "#b6cffc",
          borderWidth: 2,
        },
        cardIcon: { width: "80%", height: "60%", resizeMode: "contain" },
        cardName: {
          fontSize: fscale(15),
          color: "#225f9e",
          fontFamily: "kanitB",
        },
        pricePill: {
          marginTop: vscale(6),
          flexDirection: "row",
          alignItems: "center",
          gap: scale(6),
          backgroundColor: "#eef4ff",
          borderColor: "#d4e2ff",
          borderWidth: 2,
          paddingHorizontal: scale(10),
          paddingVertical: vscale(6),
          borderRadius: 999,
        },
        priceText: {
          color: "#1f51ff",
          fontFamily: "kanitB",
          fontSize: fscale(13),
        },
        ownedPill: {
          marginTop: vscale(6),
          flexDirection: "row",
          alignItems: "center",
          gap: scale(6),
          backgroundColor: "#e8fff6",
          borderColor: "#bff0df",
          borderWidth: 2,
          paddingHorizontal: scale(10),
          paddingVertical: vscale(6),
          borderRadius: 999,
        },
        ownedText: {
          color: "#059669",
          fontFamily: "kanitB",
          fontSize: fscale(13),
        },

        bottomInfo: {
          paddingHorizontal: scale(16),
          marginTop: vscale(38),
          gap: vscale(10),
        },
        infoBox: {
          backgroundColor: "#fff",
          borderRadius: scale(12),
          padding: scale(12),
          borderColor: "#eef4ff",
          borderWidth: scale(3),
          alignItems: "center",
        },
        infoText: { color: "#3b82f6", fontSize: fscale(16), fontFamily: "kanitM" },
      }),
    [scale, vscale, fscale, isTablet, BOTTOM_GAP]
  );

  /* ---------- state ---------- */
  const [userName, setUserName] = useState("ผู้เล่น");
  const [streak, setStreak] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [pointsSpent, setPointsSpent] = useState(0);
  const [owned, setOwned] = useState<string[]>([]);
  const [equipped, setEquipped] = useState<Record<Slot, string | null>>({
    head: null,
    eyes: null,
    body: null,
    cape: null,
  });

  const pointsAvailable = Math.max(0, totalPoints - pointsSpent);

  /* ---------- avatar (simple) ---------- */
  const avatarVariant = (() => {
    const chosenId =
      equipped.head || equipped.eyes || equipped.body || equipped.cape;
    if (!chosenId) return BRAIN_BASE;
    const def = SHOP_ITEMS.find((x) => x.id === chosenId);
    return def?.variant || BRAIN_BASE;
  })();

  /* ---------- load/init + migrate + subscribe ---------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        // 1) Display name
        const fn = await fetchFullnameByUid(uid);
        if (alive)
          setUserName(
            fn ||
              auth.currentUser?.displayName ||
              auth.currentUser?.email?.split("@")[0] ||
              "ผู้เล่น"
          );

        // 2) streak + total (fallback)
        const [s, totalFallback] = await Promise.all([
          getStreak(),
          getTotalPoints(),
        ]);

        // 3) read points (RTDB) + migrate spent จาก local
        const fromRTDB = await getTotalPointsFromRTDB(uid);
        const total = Number.isFinite(fromRTDB)
          ? (fromRTDB as number)
          : totalFallback;

        const spentOnCloud = await getSpentPointsFromRTDB(uid);
        const localSpentStr = await AsyncStorage.getItem(K_SPENT_LEGACY);
        const localSpent = parseInt(localSpentStr || "0", 10) || 0;
        if (spentOnCloud === 0 && localSpent > 0) {
          await setSpentPointsRTDB(uid, localSpent);
          await AsyncStorage.removeItem(K_SPENT_LEGACY);
        }

        if (!alive) return;
        setStreak(s);
        setTotalPoints(total);
        setPointsSpent(spentOnCloud || localSpent || 0);

        // 4) read dressup from cloud
        const [ownedCloud, equippedCloud] = await Promise.all([
          readOwnedFromRTDB(uid),
          readEquippedFromRTDB(uid),
        ]);
        let ownedState = ownedCloud;
        let equippedState = equippedCloud;

        // 5) MIGRATE legacy local → cloud (ถ้า cloud ยังว่าง)
        const [ownStr, eqStr] = await Promise.all([
          AsyncStorage.getItem(K_OWNED),
          AsyncStorage.getItem(K_EQUIPPED),
        ]);
        if (ownedCloud.length === 0 && ownStr) {
          const arr: string[] = JSON.parse(ownStr);
          if (arr?.length) {
            await update(
              dbRef(getDatabase(), pathDressOwned(uid)),
              Object.fromEntries(arr.map((id) => [id, true]))
            );
            ownedState = arr;
          }
        }
        if (
          !equippedCloud.head &&
          !equippedCloud.eyes &&
          !equippedCloud.body &&
          !equippedCloud.cape &&
          eqStr
        ) {
          const parsed = JSON.parse(eqStr) as Record<Slot, string | null>;
          await set(dbRef(getDatabase(), pathDressEquipped(uid)), {
            head: parsed?.head ?? null,
            eyes: parsed?.eyes ?? null,
            body: parsed?.body ?? null,
            cape: parsed?.cape ?? null,
          });
          equippedState = {
            head: parsed?.head ?? null,
            eyes: parsed?.eyes ?? null,
            body: parsed?.body ?? null,
            cape: parsed?.cape ?? null,
          };
        }

        if (!alive) return;
        setOwned(ownedState);
        setEquipped(equippedState);

        // 6) seed display-only local
        const hasSeed = await AsyncStorage.getItem(K_USER);
        if (!hasSeed) {
          await AsyncStorage.setItem(
            K_USER,
            JSON.stringify({ name: fn || "ผู้เล่น", level: FIXED_LEVEL })
          );
        }

        // 6.1 (ทางเลือก) Hydrate total ลง RTDB ถ้า node ยังไม่มี (ลดโอกาส listener เจอค่าว่าง)
        try {
          const tRef = dbRef(getDatabase(), pathTotal(uid));
          const tSnap = await get(tRef);
          if (!tSnap.exists() && Number.isFinite(total)) {
            await set(tRef, total);
          }
        } catch (e) {
          console.warn("hydrate total to RTDB failed:", e);
        }

        // 7) subscribe realtime points โดยส่งค่าเริ่มต้นกันกระพริบ
        const initialSpent = spentOnCloud || localSpent || 0;
        const unsub = subscribePoints(
          uid,
          ({ total, spent }) => {
            if (!alive) return;
            setTotalPoints(total);
            setPointsSpent(spent);
          },
          { total, spent: initialSpent }
        );

        // cleanup
        return () => {
          unsub?.();
        };
      } catch (e) {
        console.error("ProfileScreen init error:", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ---------- local outfit log ---------- */
  async function appendLocalOutfitLog(entry: any) {
    try {
      const prev = await AsyncStorage.getItem(K_OUTFIT_LOG);
      const list = prev ? JSON.parse(prev) : [];
      list.unshift(entry);
      await AsyncStorage.setItem(
        K_OUTFIT_LOG,
        JSON.stringify(list.slice(0, 200))
      );
    } catch (e) {
      console.warn("local outfit log error:", e);
    }
  }

  /* ---------- actions ---------- */
  async function handleUnequip(slot: Slot) {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await setEquippedRTDB(uid, slot, null);
    const newEq = { ...equipped, [slot]: null };
    setEquipped(newEq);
    const time = Date.now();
    const log = { type: "unequip", slot, itemId: null, at: time };
    appendLocalOutfitLog(log);
    logOutfitRTDB(uid, log);
  }

  async function handleEquip(item: Item) {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // ถ้ากำลังใส่ → ถอด
    if (equipped[item.slot] === item.id) {
      await handleUnequip(item.slot);
      return;
    }

    // ยังไม่มี → ต้องซื้อก่อน (transaction กับ spentPoints)
    if (!owned.includes(item.id)) {
      const db = getDatabase();
      // อ่าน total & spent สดอีกครั้งก่อนเช็ค
      const [totalSnap2, spentSnap2] = await Promise.all([
        get(dbRef(db, pathTotal(uid))),
        get(dbRef(db, pathSpent(uid))),
      ]);
      const totalNow = totalSnap2.exists()
        ? Number(totalSnap2.val() || 0)
        : totalPoints;
      const spentNow = spentSnap2.exists()
        ? Number(spentSnap2.val() || 0)
        : pointsSpent;

      const ok = await new Promise<boolean>((resolve) => {
        if (item.price > Math.max(0, totalNow - spentNow)) {
          Alert.alert("พ้อยท์ไม่พอ", "ยังซื้อไอเท็มนี้ไม่ได้");
          return resolve(false);
        }
        Alert.alert("ยืนยันการซื้อ", `${item.name} ราคา ${item.price} พ้อยท์`, [
          { text: "ยกเลิก", style: "cancel", onPress: () => resolve(false) },
          { text: "ซื้อเลย", onPress: () => resolve(true) },
        ]);
      });
      if (!ok) return;

      // Transaction: เพิ่ม spentPoints ถ้า available พอ
      const spentRef = dbRef(db, pathSpent(uid));
      await runTransaction(spentRef, (cur) => {
        const curN = Number.isFinite(Number(cur)) ? Number(cur) : 0;
        if (totalNow - curN < item.price) return cur; // ไม่พอ → no-op
        return curN + item.price;
      });

      // บันทึกของ + purchase log (UI จะ sync ผ่าน listener)
      await addOwnedRTDB(uid, item.id);
      setOwned((prev) => Array.from(new Set([...prev, item.id])));
      await logPurchaseRTDB(uid, {
        itemId: item.id,
        slot: item.slot,
        price: item.price,
        name: item.name,
        at: Date.now(),
      });
    }

    // equip แทนที่ในช่องเดียวกัน
    await setEquippedRTDB(uid, item.slot, item.id);
    const newEq = { ...equipped, [item.slot]: item.id };
    setEquipped(newEq);
    const time = Date.now();
    const log = { type: "equip", slot: item.slot, itemId: item.id, at: time };
    appendLocalOutfitLog(log);
    logOutfitRTDB(uid, log);
  }

  async function handleUnequipAll() {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await set(dbRef(getDatabase(), pathDressEquipped(uid)), {
      head: null,
      eyes: null,
      body: null,
      cape: null,
    });
    setEquipped({ head: null, eyes: null, body: null, cape: null });
    const time = Date.now();
    const log = { type: "unequip_all", at: time };
    appendLocalOutfitLog(log);
    logOutfitRTDB(uid, log);
  }

  /* ---------- render ---------- */
  return (
    <SafeAreaView
      style={styles.root}
      edges={["top", "left", "right", "bottom"]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.headerTextWrap}>
          <Text style={styles.mainTitle}>{userName}</Text>
          <Text style={styles.subTitle}>พัฒนาการระดับ {FIXED_LEVEL}</Text>
        </View>

        {/* Scene + Avatar */}
        <View style={styles.sceneCard}>
          <Image source={SCENE_BG} resizeMode="cover" style={styles.sceneBg} />
          <View style={styles.avatarBox}>
            <Image source={avatarVariant} style={styles.avatarFull} />
          </View>
        </View>

        <View style={styles.dressTitleWrap}>
          <Text style={styles.dressTitle}>ตกแต่งน้องอ่องออ</Text>
        </View>

        {/* Points + Settings */}
        <View style={styles.infoRow}>
          <View style={{ flex: 1 }}>
            <View className="points-pill" style={styles.pointsPill}>
              <Ionicons name="sparkles" size={16} color="#1f51ff" />
              <Text style={styles.pointsText}>
                แต้มคงเหลือ {Math.max(0, totalPoints - pointsSpent)}
              </Text>
            </View>
            
          </View>

          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => router.push("/(page)/ProfileSettingsScreen")}
            activeOpacity={0.9}
          >
            <Ionicons name="settings-outline" size={18} color="#fff" />
            <Text style={styles.settingText}>ตั้งค่าโปรไฟล์</Text>
          </TouchableOpacity>
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {SHOP_ITEMS.map((item) => {
            const isOwned = owned.includes(item.id);
            const isEquipped = equipped[item.slot] === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.card,
                  isEquipped && { borderColor: "#3b82f6", borderWidth: 3 },
                ]}
                onPress={() => handleEquip(item)}
                onLongPress={() => handleUnequip(item.slot)}
                activeOpacity={0.9}
              >
                <Image source={item.icon} style={styles.cardIcon} />
                <View style={{ height: 8 }} />
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.name}
                </Text>

                {!isOwned ? (
                  <View style={styles.pricePill}>
                    <Ionicons
                      name="diamond-outline"
                      size={14}
                      color="#1f51ff"
                    />
                    <Text style={styles.priceText}>{item.price}</Text>
                  </View>
                ) : isEquipped ? (
                  <View style={styles.ownedPill}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color="#10b981"
                    />
                    <Text style={styles.ownedText}>สวมใส่แล้ว</Text>
                  </View>
                ) : (
                  <View style={styles.ownedPill}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color="#10b981"
                    />
                    <Text style={styles.ownedText}>มีแล้ว</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Extra controls */}
        <View style={{ paddingHorizontal: 16, marginTop: 16, gap: 10 }}>
          {/* <TouchableOpacity
            onPress={handleUnequipAll}
            style={{
              alignSelf: "flex-start",
              backgroundColor: "#9DBBE2",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
            }}
          >
            <Text style={{ color: "#0b2e61", fontFamily: "kanitB" }}>
              ถอดทั้งหมด
            </Text>
          </TouchableOpacity> */}
        </View>

        {/* Streak + Logout */}
        <View style={styles.bottomInfo}>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>เล่นต่อเนื่องมา {streak} วันแล้ว !</Text>
          </View>
          <LogoutButton style={undefined} textStyle={undefined} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
