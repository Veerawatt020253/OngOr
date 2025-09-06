import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "@/FirebaseConfig";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { updatePassword, updateProfile } from "firebase/auth";
import { useRouter } from "expo-router";

const K_PREF_NOTI = "@ongor:prefs:notifications";
const K_PREF_DARK = "@ongor:prefs:darkmode";

export default function ProfileSettingsScreen() {
  const [docId, setDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ฟิลด์แก้ไขได้
  const [fullname, setFullname] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  // รหัสผ่าน (ออปชั่น)
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ค่าตั้งค่า (local preferences)
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const router = useRouter();

  // คำนวณอักษรย่อจากชื่อ
  const initials = useMemo(() => {
    const name = (fullname || displayName || auth.currentUser?.displayName || "User").trim();
    const parts = name.split(/\s+/).filter(Boolean);
    const take = (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
    return take.toUpperCase() || "U";
  }, [fullname, displayName]);

  // ความแข็งแรงของรหัส
  const passwordStrength = useMemo(() => {
    const p = newPassword || "";
    let score = 0;
    if (p.length >= 6) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[a-z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return Math.min(score, 5);
  }, [newPassword]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) {
          setLoading(false);
          return;
        }

        const firestore = getFirestore();
        const q = query(collection(firestore, "users"), where("uid", "==", uid));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          const d = userDoc.data() || {};
          if (alive) {
            setDocId(userDoc.id);
            setFullname(d.fullname || "");
            setDisplayName(d.displayName || auth.currentUser?.displayName || "");
            setBio(d.bio || "");
          }
        } else {
          // ถ้าไม่มีเอกสาร ก็เติมค่า default จาก auth
          if (alive) {
            setFullname("");
            setDisplayName(auth.currentUser?.displayName || "");
            setBio("");
          }
        }

        // โหลด preferences
        const [notiStr, darkStr] = await Promise.all([
          AsyncStorage.getItem(K_PREF_NOTI),
          AsyncStorage.getItem(K_PREF_DARK),
        ]);
        if (alive) {
          setNotifications(notiStr ? notiStr === "1" : true);
          setDarkMode(darkStr ? darkStr === "1" : false);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleSave = async () => {
    try {
      if (saving) return;
      setSaving(true);

      const uid = auth.currentUser?.uid;
      if (!uid) {
        Alert.alert("ยังไม่ได้เข้าสู่ระบบ");
        setSaving(false);
        return;
      }

      // ตรวจ input เบื้องต้น
      if (fullname.trim().length < 2) {
        Alert.alert("ชื่อสั้นเกินไป", "กรุณากรอกชื่อ-นามสกุลให้ถูกต้อง");
        setSaving(false);
        return;
      }

      // 1) อัปเดต Firestore
      const firestore = getFirestore();
      if (docId) {
        const userRef = doc(firestore, "users", docId);
        await updateDoc(userRef, {
          fullname: fullname.trim(),
          displayName: displayName.trim(),
          bio: bio.trim(),
        });
      }

      // 2) อัปเดตโปรไฟล์ใน Auth (displayName)
      if (displayName.trim().length > 0 && auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      }

      // 3) เปลี่ยนรหัสผ่าน (ถ้ากรอก)
      if (newPassword.length > 0) {
        if (newPassword.length < 6) {
          Alert.alert("รหัสสั้นเกินไป", "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
          setSaving(false);
          return;
        }
        try {
          await updatePassword(auth.currentUser!, newPassword);
        } catch (err: any) {
          if (err?.code === "auth/requires-recent-login") {
            Alert.alert(
              "ต้องยืนยันตัวตนอีกครั้ง",
              "กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่ จากนั้นลองเปลี่ยนรหัสผ่านอีกครั้ง"
            );
          } else {
            console.error("updatePassword error:", err);
            Alert.alert("เปลี่ยนรหัสผ่านไม่สำเร็จ", "โปรดลองอีกครั้ง");
          }
          setSaving(false);
          return;
        }
      }

      // 4) บันทึก preferences ลง AsyncStorage
      await Promise.all([
        AsyncStorage.setItem(K_PREF_NOTI, notifications ? "1" : "0"),
        AsyncStorage.setItem(K_PREF_DARK, darkMode ? "1" : "0"),
      ]);

      Alert.alert("สำเร็จ", "อัปเดตข้อมูลเรียบร้อยแล้ว");
      router.back();
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("ผิดพลาด", "ไม่สามารถอัปเดตข้อมูลได้");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#3578d0" />
        <Text style={{ marginTop: 12, color: "#2d67a8", fontFamily: "kanitM" }}>กำลังโหลดข้อมูล…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 36 }}>
        {/* Header */}
        <Text style={styles.title}>ตั้งค่าบัญชีผู้ใช้</Text>

        {/* Profile preview card */}
        <View style={styles.previewCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.previewName}>{fullname || displayName || "ผู้ใช้"}</Text>
            <Text style={styles.previewSub}>
              {auth.currentUser?.email || "—"}
            </Text>
          </View>
        </View>

        {/* Form card: ชื่อ—นามสกุล & displayName */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>ข้อมูลโปรไฟล์</Text>

          <Text style={styles.label}>ชื่อ - นามสกุล</Text>
          <TextInput
            style={styles.input}
            placeholder="กรอกชื่อ - นามสกุล"
            value={fullname}
            onChangeText={setFullname}
          />

          <Text style={styles.label}>ชื่อที่แสดง (Display Name)</Text>
          <TextInput
            style={styles.input}
            placeholder="ระบุชื่อเล่นหรือชื่อที่อยากให้แสดง"
            value={displayName}
            onChangeText={setDisplayName}
          />

          <Text style={styles.label}>แนะนำตัวสั้น ๆ (Bio)</Text>
          <TextInput
            style={[styles.input, { height: 90, textAlignVertical: "top" }]}
            placeholder="ฉันชอบเล่นเกมท่าทางทุกเช้า…"
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={160}
          />
          <Text style={styles.hint}>{bio.length}/160</Text>
        </View>

        {/* Form card: Password */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>ความปลอดภัย</Text>

          <Text style={styles.label}>รหัสผ่านใหม่ (เว้นว่างหากไม่เปลี่ยน)</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="อย่างน้อย 6 ตัวอักษร"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              style={styles.eyeBtn}
            >
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#3569A8" />
            </TouchableOpacity>
          </View>

          {/* แถบความแข็งแรงของรหัส */}
          <View style={styles.strengthRow}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.strengthBar,
                  { opacity: i < passwordStrength ? 1 : 0.25 },
                ]}
              />
            ))}
          </View>
          <Text style={styles.hint}>
            แนะนำให้มีตัวพิมพ์ใหญ่/เล็ก ตัวเลข และอักขระพิเศษผสมกัน
          </Text>
        </View>

        {/* Preferences */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>การตั้งค่า</Text>

          <View style={styles.rowBetween}>
            <Text style={styles.prefLabel}>การแจ้งเตือน</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: "#cfe0ff", true: "#77a5ff" }}
              thumbColor={notifications ? "#ffffff" : "#ffffff"}
            />
          </View>

          <View style={styles.rowBetween}>
            <Text style={styles.prefLabel}>ธีมเข้ม</Text>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: "#cfe0ff", true: "#77a5ff" }}
              thumbColor={darkMode ? "#ffffff" : "#ffffff"}
            />
          </View>
        </View>

        {/* Action buttons */}
        <TouchableOpacity
          style={[styles.button, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.buttonText}>บันทึก</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>ย้อนกลับ</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const CARD = {
  bg: "#FFFFFF",
  radius: 18,
  border: "#E3EEFF",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EEF4FF",
    paddingHorizontal: 16,
    paddingTop: 56,
  },
  title: {
    fontSize: 28,
    color: "#226cb0",
    marginBottom: 14,
    textAlign: "center",
    fontFamily: "kanitB",
  },

  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: CARD.bg,
    borderRadius: CARD.radius,
    borderWidth: 1,
    borderColor: CARD.border,
    padding: 14,
    marginBottom: 14,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: "#D6E9FF",
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#C6DFFF",
    borderWidth: 1,
  },
  avatarText: { color: "#1d4d8f", fontFamily: "kanitB", fontSize: 20 },
  previewName: { color: "#0F2B56", fontFamily: "kanitB", fontSize: 18 },
  previewSub: { color: "#3A6CA6", fontFamily: "kanitM", fontSize: 12, marginTop: 2 },

  formCard: {
    backgroundColor: CARD.bg,
    borderRadius: CARD.radius,
    borderWidth: 1,
    borderColor: CARD.border,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: "kanitB",
    color: "#245f9c",
    fontSize: 16,
    marginBottom: 10,
  },
  label: {
    fontFamily: "kanitM",
    color: "#2c517a",
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    fontFamily: "kanitM",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#D7E4FF",
    color: "#143a6b",
  },
  hint: {
    fontFamily: "kanitM",
    color: "#6C8DB8",
    fontSize: 12,
    marginTop: 2,
  },

  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eyeBtn: {
    backgroundColor: "#E6F0FF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#D7E4FF",
  },
  strengthRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    marginBottom: 6,
  },
  strengthBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#4A90E2",
    borderRadius: 8,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  prefLabel: {
    fontFamily: "kanitM",
    color: "#2c517a",
    fontSize: 15,
  },

  button: {
    backgroundColor: "#226cb0",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    color: "#fff",
    fontFamily: "kanitB",
    fontSize: 18,
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelText: {
    color: "#6a7f9e",
    fontFamily: "kanitM",
    fontSize: 16,
  },
});
