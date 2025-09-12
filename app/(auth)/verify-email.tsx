// app/(auth)/verify-email.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { auth } from "@/FirebaseConfig";
import { sendEmailVerification, signOut, reload } from "firebase/auth";

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

export default function VerifyEmailScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const email = user?.email ?? "-";

  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;
  const { scale, vscale, fscale } = useMemo(
    () => makeScalers(width, height, fontScale),
    [width, height, fontScale]
  );
  const TOP_GAP = Math.max(insets.top, 12);

  const styles = useMemo(() => {
    const CARD_MAX = isTablet ? scale(640) : scale(520);
    const H_PADDING = isTablet ? scale(22) : scale(16);

    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: "#EEF4FF",
        alignItems: "center",
      },
      wrap: {
        width: "100%",
        paddingHorizontal: H_PADDING,
        paddingTop: TOP_GAP + vscale(24),
        paddingBottom: vscale(24),
        alignItems: "center",
      },
      title: {
        fontSize: fscale(isTablet ? 26 : 24),
        color: "#226cb0",
        fontFamily: "kanitB",
        marginBottom: vscale(6),
        textAlign: "center",
      },
      desc: {
        fontSize: fscale(14),
        color: "#35649a",
        fontFamily: "kanitM",
        textAlign: "center",
        lineHeight: fscale(20),
        maxWidth: CARD_MAX,
      },
      emph: { color: "#0F2B56", fontFamily: "kanitB" },
      illus: {
        width: isTablet ? scale(200) : scale(180),
        height: isTablet ? scale(200) : scale(180),
        marginVertical: vscale(12),
      },
      btn: {
        width: "100%",
        maxWidth: CARD_MAX,
        marginTop: vscale(10),
        paddingVertical: vscale(12),
        borderRadius: scale(14),
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: scale(8),
      },
      btnText: { color: "#fff", fontFamily: "kanitB", fontSize: fscale(15) },
      btnMail: { backgroundColor: "#3578d0" },
      btnCheck: { backgroundColor: "#10b981" },
      btnGhost: {
        width: "100%",
        maxWidth: CARD_MAX,
        marginTop: vscale(12),
        paddingVertical: vscale(12),
        borderRadius: scale(14),
        borderWidth: 1.5,
        borderColor: "#CDE4FF",
        backgroundColor: "#fff",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: scale(8),
      },
      btnGhostText: {
        color: "#3578d0",
        fontFamily: "kanitB",
        fontSize: fscale(15),
      },
      // center on large/landscape; allow scroll if content taller (small screens)
      scrollContent: {
        flexGrow: 1,
        minHeight: height,
        justifyContent: "center",
      },
    });
  }, [width, height, fontScale, scale, vscale, fscale, isTablet, TOP_GAP]);

  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleResend = async () => {
    const u = auth.currentUser;
    if (!u) return;
    try {
      setSending(true);
      await sendEmailVerification(u);
      Alert.alert("ส่งอีเมลแล้ว", "กรุณาตรวจสอบกล่องจดหมายของคุณ");
    } catch (e: any) {
      Alert.alert("ส่งไม่สำเร็จ", e?.message || "ลองใหม่อีกครั้ง");
    } finally {
      setSending(false);
    }
  };

  const handleCheck = async () => {
    const u = auth.currentUser;
    if (!u) return;
    try {
      setChecking(true);
      await reload(u); // refresh สถานะจากเซิร์ฟเวอร์
      if (auth.currentUser?.emailVerified) {
        Alert.alert("ยืนยันสำเร็จ", "ขอบคุณ! กำลังพาเข้าสู่แอป");
        router.replace("/(tabs)");
      } else {
        Alert.alert("ยังไม่ยืนยัน", "ตรวจสอบลิงก์ในอีเมลแล้วกดปุ่มนี้อีกครั้ง");
      }
    } catch (e: any) {
      Alert.alert("ตรวจสอบไม่สำเร็จ", e?.message || "ลองใหม่อีกครั้ง");
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.wrap}>
            <Text style={styles.title}>ยืนยันอีเมลของคุณ</Text>
            <Text style={styles.desc}>
              เราได้ส่งอีเมลยืนยันไปที่ <Text style={styles.emph}>{email}</Text>
              {"\n"}โปรดเปิดลิงก์ในอีเมล จากนั้นกด “ตรวจสอบอีกครั้ง”
            </Text>

            <Image
              source={{ uri: "https://img2.pic.in.th/pic/verify-mail.png" }}
              style={styles.illus}
              resizeMode="contain"
            />

            {/* Resend */}
            <TouchableOpacity
              style={[styles.btn, styles.btnMail, sending && { opacity: 0.85 }]}
              onPress={handleResend}
              disabled={sending}
              activeOpacity={0.9}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="mail-outline" size={scale(18)} color="#fff" />
                  <Text style={styles.btnText}>ส่งอีเมลยืนยันอีกครั้ง</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Check */}
            <TouchableOpacity
              style={[styles.btn, styles.btnCheck, checking && { opacity: 0.85 }]}
              onPress={handleCheck}
              disabled={checking}
              activeOpacity={0.9}
            >
              {checking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={scale(18)}
                    color="#fff"
                  />
                  <Text style={styles.btnText}>ตรวจสอบอีกครั้ง</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Logout */}
            <TouchableOpacity
              style={styles.btnGhost}
              onPress={handleLogout}
              activeOpacity={0.9}
            >
              <Ionicons name="log-out-outline" size={scale(18)} color="#3578d0" />
              <Text style={styles.btnGhostText}>ออกจากระบบ</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
