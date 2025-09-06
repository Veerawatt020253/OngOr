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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import LogoutButton from "@/components/LogoutBtn";
import { getTotalPoints } from "@/lib/scoreUtils";
import { getStreak } from "@/lib/streakUtils";
import { router } from "expo-router";
import { auth } from "@/FirebaseConfig";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

/** ===== ค่าคงที่ตามที่ขอ ===== */
const FIXED_LEVEL = 1;

/** ===== โมเดลไอเท็ม (แบบใช้ภาพตัวละครรวมแล้ว) ===== */
type Slot = "head" | "eyes" | "body" | "cape";
type Item = {
  id: string;
  name: string;
  slot: Slot;
  price: number;
  icon: any;    // ไอคอนในกริด
  variant: any; // **ภาพตัวละครหลักแบบรวมแล้ว**
};

// ★★ เปลี่ยนพาธ require() ให้ตรงไฟล์ของคุณ ★★
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

// ภาพพื้นหลังฉาก + ตัวน้องอ่องออ “ปกติ”
const SCENE_BG = require("@/assets/dressup/bg-land.png");
const BRAIN_BASE = require("@/assets/dressup/brain-base.png");

/** ===== storage keys ===== */
const K_USER = "@ongor:user";
const K_OWNED = "@ongor:dressup:owned";
const K_EQUIPPED = "@ongor:dressup:equipped";
const K_SPENT = "@ongor:dressup:spent";

export default function ProfileScreen() {
  const [userName, setUserName] = useState<string>("ผู้เล่น");
  const [totalPoints, setTotalPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [spentPoints, setSpentPoints] = useState(0);
  const [owned, setOwned] = useState<string[]>([]);
  const [equipped, setEquipped] = useState<Record<Slot, string | null>>({
    head: null,
    eyes: null,
    body: null,
    cape: null,
  });

  // พ้อยท์ใช้จ่ายได้ = คะแนนรวม - ที่เคยใช้ไป (เก็บ local)
  const pointsAvailable = useMemo(
    () => Math.max(0, totalPoints - spentPoints),
    [totalPoints, spentPoints]
  );

  // ✅ โหลด: ชื่อจริงจาก Firestore + แต้ม/สตรีค + ของที่เป็นเจ้าของ + ชุดที่ใส่ + spent
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // ----- 1) ชื่อจริงจาก Firestore -----
        const uid = auth.currentUser?.uid;
        let name: string | undefined;

        if (uid) {
          const firestore = getFirestore();
          const q = query(collection(firestore, "users"), where("uid", "==", uid));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            if (data?.fullname) name = String(data.fullname);
          }
        }

        // fallback เป็น displayName หรือ email
        if (!name) {
          name =
            auth.currentUser?.displayName ||
            (auth.currentUser?.email
              ? auth.currentUser.email.split("@")[0]
              : undefined);
        }

        // fallback เป็น local / "ผู้เล่น"
        if (!name) {
          const stored = await AsyncStorage.getItem(K_USER);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.name) name = parsed.name;
          }
        }
        if (!name) name = "ผู้เล่น";
        if (alive) setUserName(name);

        // ----- 2) แต้ม/สตรีค -----
        const [s, p] = await Promise.all([getStreak(), getTotalPoints()]);
        if (!alive) return;
        setStreak(s);
        setTotalPoints(p);

        // ----- 3) Owned/Equipped/Spent จาก AsyncStorage -----
        const [ownStr, eqStr, spStr] = await Promise.all([
          AsyncStorage.getItem(K_OWNED),
          AsyncStorage.getItem(K_EQUIPPED),
          AsyncStorage.getItem(K_SPENT),
        ]);

        if (ownStr && alive) setOwned(JSON.parse(ownStr));

        if (eqStr && alive) {
          // ทำให้แน่ใจว่ามี “แค่ 1 ชิ้นรวมทุกช่อง”
          const parsed: Record<Slot, string | null> = JSON.parse(eqStr);
          const pickedId =
            (parsed.head as string) ||
            (parsed.eyes as string) ||
            (parsed.body as string) ||
            (parsed.cape as string) ||
            null;

          const normalized: Record<Slot, string | null> = {
            head: null,
            eyes: null,
            body: null,
            cape: null,
          };
          if (pickedId) {
            const def = SHOP_ITEMS.find((x) => x.id === pickedId);
            if (def) normalized[def.slot] = pickedId;
          }
          setEquipped(normalized);
        }

        if (spStr && alive) setSpentPoints(parseInt(spStr, 10) || 0);

        // ----- 4) seed K_USER ถ้ายังไม่มี -----
        const hasSeed = await AsyncStorage.getItem(K_USER);
        if (!hasSeed) {
          await AsyncStorage.setItem(
            K_USER,
            JSON.stringify({ name, level: FIXED_LEVEL })
          );
        }
      } catch (e) {
        console.error("ProfileScreen init error:", e);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const saveOwned = async (list: string[]) => {
    setOwned(list);
    await AsyncStorage.setItem(K_OWNED, JSON.stringify(list));
  };
  const saveEquipped = async (eq: Record<Slot, string | null>) => {
    setEquipped(eq);
    await AsyncStorage.setItem(K_EQUIPPED, JSON.stringify(eq));
  };
  const saveSpent = async (n: number) => {
    setSpentPoints(n);
    await AsyncStorage.setItem(K_SPENT, String(n));
  };

  /** ✅ เลือกได้ทีละ “ชิ้นเดียวรวมทุกช่อง” */
  const handleSelectItem = async (item: Item) => {
    const isOwned = owned.includes(item.id);

    // ตอนนี้ใส่อะไรอยู่
    const currentEquippedId =
      equipped.head || equipped.eyes || equipped.body || equipped.cape;

    // ถ้ากดชิ้นที่ใส่อยู่ → ถอด
    if (currentEquippedId === item.id) {
      await handleUnequipAll();
      return;
    }

    // ยังไม่เป็นเจ้าของ → ซื้อ (ถ้าพ้อยท์พอ)
    if (!isOwned) {
      if (item.price > pointsAvailable) {
        Alert.alert("พ้อยท์ไม่พอ", "ยังซื้อไอเท็มนี้ไม่ได้");
        return;
      }
      const confirm = await new Promise<boolean>((resolve) => {
        Alert.alert("ยืนยันการซื้อ", `${item.name} ราคา ${item.price} พ้อยท์`, [
          { text: "ยกเลิก", style: "cancel", onPress: () => resolve(false) },
          { text: "ซื้อเลย", onPress: () => resolve(true) },
        ]);
      });
      if (!confirm) return;

      await saveOwned([...owned, item.id]);
      await saveSpent(spentPoints + item.price);
    }

    // ใส่อันเดียว: เคลียร์ทุกช่องก่อน แล้วใส่ชิ้นใหม่
    const next: Record<Slot, string | null> = {
      head: null,
      eyes: null,
      body: null,
      cape: null,
    };
    next[item.slot] = item.id;
    await saveEquipped(next);
  };

  /** ✅ ถอดทุกอย่าง */
  const handleUnequipAll = async () => {
    const next: Record<Slot, string | null> = {
      head: null,
      eyes: null,
      body: null,
      cape: null,
    };
    await saveEquipped(next);
  };

  /** เลือกภาพตัวละครที่จะแสดง */
  const avatarVariant = (() => {
    const currentEquippedId =
      equipped.head || equipped.eyes || equipped.body || equipped.cape;
    if (!currentEquippedId) return BRAIN_BASE;
    const def = SHOP_ITEMS.find((x) => x.id === currentEquippedId);
    return def?.variant || BRAIN_BASE;
  })();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header ชื่อผู้เล่นจริง */}
        <View style={styles.headerTextWrap}>
          <Text style={styles.mainTitle}>{userName}</Text>
          <Text style={styles.subTitle}>พัฒนาการระดับ {FIXED_LEVEL}</Text>
        </View>

        {/* ฉาก + ตัวละครหลัก */}
        <View style={styles.sceneCard}>
          <Image source={SCENE_BG} resizeMode="cover" style={styles.sceneBg} />
          <View style={styles.avatarBox}>
            <Image source={avatarVariant} style={styles.avatarFull} />
          </View>
        </View>

        {/* หัวข้อ “ตกแต่งน้องอ่องออ” */}
        <View style={{ alignItems: "center", marginTop: 8, marginBottom: 6 }}>
          <Text style={styles.dressTitle}>ตกแต่งน้องอ่องออ</Text>
        </View>

        {/* พ้อยท์/ตั้งค่า */}
        <View style={styles.infoRow}>
          <View style={styles.pointsPill}>
            <Ionicons name="sparkles" size={16} color="#1f51ff" />
            <Text style={styles.pointsText}>
              พ้อยท์คงเหลือ {Math.max(0, pointsAvailable)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => router.push("/(page)/ProfileSettingsScreen")}
          >
            <Ionicons name="settings-outline" size={18} color="#fff" />
            <Text style={styles.settingText}>ตั้งค่าโปรไฟล์</Text>
          </TouchableOpacity>
        </View>

        {/* กรุไอเท็ม */}
        <View style={styles.grid}>
          {SHOP_ITEMS.map((item) => {
            const isOwned = owned.includes(item.id);
            const currentEquippedId =
              equipped.head || equipped.eyes || equipped.body || equipped.cape;
            const isEquipped = currentEquippedId === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.card,
                  isEquipped && { borderColor: "#3b82f6", borderWidth: 3 },
                ]}
                onPress={() => handleSelectItem(item)}
                onLongPress={handleUnequipAll}
              >
                <Image source={item.icon} style={styles.cardIcon} />
                <View style={{ height: 8 }} />
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.name}
                </Text>

                {!isOwned ? (
                  <View style={styles.pricePill}>
                    <Ionicons name="diamond-outline" size={14} color="#1f51ff" />
                    <Text style={styles.priceText}>{item.price}</Text>
                  </View>
                ) : isEquipped ? (
                  <View className="ownedPill">
                    <View style={styles.ownedPill}>
                      <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                      <Text style={styles.ownedText}>สวมใส่แล้ว</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.ownedPill}>
                    <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                    <Text style={styles.ownedText}>มีแล้ว</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Streak + logout */}
        <View style={styles.bottomInfo}>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>เล่นต่อเนื่องมา {streak} วันแล้ว !</Text>
          </View>
          <LogoutButton style={undefined} textStyle={undefined} />
        </View>
      </ScrollView>
    </View>
  );
}

/** ============ Styles ============ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EEF4FF" },
  scroll: { paddingBottom: 122, paddingTop: 32 },
  headerTextWrap: { alignItems: "center", paddingTop: 8, paddingBottom: 8 },
  mainTitle: {
    fontSize: 30,
    color: "#226cb0",
    fontFamily: "kanitB",
    textShadowColor: "rgba(255,255,255,0.9)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subTitle: {
    fontSize: 18,
    color: "#3b82f6",
    fontFamily: "kanitB",
    marginTop: 2,
    textShadowColor: "rgba(255,255,255,0.9)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  sceneCard: {
    marginHorizontal: 16,
    backgroundColor: "#9dd4ff",
    borderRadius: 20,
    overflow: "hidden",
    borderColor: "#6ec0ff",
    borderWidth: 3,
  },
  sceneBg: { width: "100%", height: 180 },
  avatarBox: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 22,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFull: { width: 190, height: 190, resizeMode: "contain" },

  dressTitle: {
    fontSize: 22,
    color: "#226cb0",
    fontFamily: "kanitB",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 3,
    borderColor: "#e6f0ff",
    textShadowColor: "rgba(255,255,255,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  infoRow: {
    marginTop: 8,
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pointsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e8f0ff",
    borderColor: "#cfe0ff",
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pointsText: { color: "#1f51ff", fontFamily: "kanitB" },
  settingButton: {
    marginLeft: "auto",
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    backgroundColor: "#77a5ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  settingText: { color: "#fff", fontFamily: "kanitB" },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  card: {
    width: "46%",
    aspectRatio: 1.05,
    backgroundColor: "#cfe1ff",
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#b6cffc",
    borderWidth: 2,
  },
  cardIcon: { width: "80%", height: "60%", resizeMode: "contain" },
  cardName: { fontSize: 16, color: "#225f9e", fontFamily: "kanitB" },
  pricePill: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eef4ff",
    borderColor: "#d4e2ff",
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  priceText: { color: "#1f51ff", fontFamily: "kanitB" },
  ownedPill: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#e8fff6",
    borderColor: "#bff0df",
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  ownedText: { color: "#059669", fontFamily: "kanitB" },

  bottomInfo: { paddingHorizontal: 16, marginTop: 46, gap: 10 },
  infoBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderColor: "#eef4ff",
    borderWidth: 3,
    alignItems: "center",
  },
  infoText: { color: "#3b82f6", fontSize: 16, fontFamily: "kanitM" },
});
