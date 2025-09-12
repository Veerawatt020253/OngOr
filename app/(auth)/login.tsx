import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { auth } from "@/FirebaseConfig";

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

/* ========= Floating Label Input (moved OUTSIDE to keep identity stable) ========= */
function FloatingLabelInput({
  placeholder,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
  leftIcon,
  rightElement,
  error,
  autoCapitalize = "none",
  returnKeyType,
  onSubmitEditing,
  styles,
  scale,
  vscale,
  fscale,
}: {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: any;
  secureTextEntry?: boolean;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  error?: string | null;
  autoCapitalize?: "none" | "words" | "sentences" | "characters";
  returnKeyType?: "done" | "go" | "next" | "search" | "send";
  onSubmitEditing?: () => void;
  styles: ReturnType<typeof StyleSheet.create>;
  scale: (n: number) => number;
  vscale: (n: number) => number;
  fscale: (n: number) => number;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const animatedLabel = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedLabel, {
      toValue: isFocused || !!value ? 1 : 0,
      duration: 170,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  return (
    <View style={{ width: "100%", marginTop: vscale(14) }}>
      <View
        style={[
          styles.inputContainer,
          {
            borderColor: error ? "#ef4444" : isFocused ? "#2423ff" : "#dfe5ef",
            backgroundColor: "#fff",
          },
        ]}
      >
        {leftIcon && <View style={styles.leftIconWrap}>{leftIcon}</View>}

        <Animated.Text
          style={[
            styles.floatingLabel,
            {
              top: animatedLabel.interpolate({
                inputRange: [0, 1],
                outputRange: [vscale(18), vscale(5)],
              }),
              fontSize: animatedLabel.interpolate({
                inputRange: [0, 1],
                outputRange: [fscale(16), fscale(13)],
              }) as any,
              color: error ? "#ef4444" : isFocused ? "#2423ff" : "#9aa3b2",
              left: leftIcon ? scale(44) : scale(16),
            },
          ]}
        >
          {placeholder}
        </Animated.Text>

        <TextInput
          style={[
            styles.input,
            {
              paddingLeft: leftIcon ? scale(44) : scale(16),
              paddingRight: rightElement ? scale(44) : scale(16),
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
        />

        {rightElement && (
          <View style={styles.rightElementWrap}>{rightElement}</View>
        )}
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

/* ======================== Login Screen ======================== */
const Login = () => {
  const router = useRouter();

  // --- safe area + responsive env ---
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;

  const { scale, vscale, fscale } = useMemo(
    () => makeScalers(width, height, fontScale),
    [width, height, fontScale]
  );

  // เว้นระยะด้านบนให้พ้นแถบระบบ/รอยบากเสมอ
  const TOP_GAP = Math.max(insets.top, 12);

  // ---------------- state ----------------
  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);
  const [busy, setBusy] = useState(false);

  // per-field errors
  const [errMail, setErrMail] = useState<string | null>(null);
  const [errPwd, setErrPwd] = useState<string | null>(null);

  // ---------- styles (dynamic per screen + safe area) ----------
  const styles = useMemo(() => {
    const CARD_MAX = isTablet ? scale(620) : scale(540);
    const H_PADDING = isTablet ? scale(22) : scale(16);

    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: "#EEF4FF",
        alignItems: "center",
        paddingHorizontal: H_PADDING,
        paddingTop: TOP_GAP + vscale(44),
        paddingBottom: vscale(24),
      },
      decorationWrap: {
        position: "absolute",
        top: TOP_GAP * 0.3,
        left: 0,
        right: 0,
        height: vscale(170),
      },
      decoBlob: {
        position: "absolute",
        backgroundColor: "#3578d0",
        borderRadius: 999,
        transform: [{ rotate: "25deg" }],
      },
      backButton: {
        position: "absolute",
        top: TOP_GAP,
        left: scale(12),
        zIndex: 10,
        backgroundColor: "#ffffff",
        padding: scale(8),
        borderRadius: 999,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 2,
      },
      logo: {
        width: isTablet ? scale(180) : scale(140),
        height: isTablet ? scale(180) : scale(140),
        marginTop: vscale(12) + TOP_GAP * 0.2,
      },
      title: {
        fontSize: fscale(isTablet ? 30 : 28),
        marginTop: vscale(6),
        color: "#2423ff",
        fontFamily: "kanitB",
        textAlign: "center",
      },
      subtitle: {
        fontSize: fscale(14),
        color: "#3b6fb6",
        fontFamily: "kanitM",
        marginTop: vscale(2),
        marginBottom: vscale(12),
      },
      card: {
        width: "100%",
        maxWidth: CARD_MAX,
        backgroundColor: "#FFFFFF",
        borderRadius: scale(20),
        paddingHorizontal: scale(16),
        paddingVertical: vscale(18),
        borderWidth: 1,
        borderColor: "#D8E6FF",
        shadowColor: "#3578d0",
        shadowOpacity: 0.07,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 18,
        elevation: 2,
        alignSelf: "center",
      },
      inputContainer: {
        width: "100%",
        borderWidth: 1.5,
        borderRadius: scale(14),
        paddingTop: vscale(16),
        paddingBottom: vscale(8),
        position: "relative",
      },
      floatingLabel: {
        position: "absolute",
        backgroundColor: "white",
        paddingHorizontal: scale(8),
        fontFamily: "kanitM",
      },
      input: {
        fontSize: fscale(16),
        paddingVertical: vscale(10),
        width: "100%",
        fontFamily: "kanitM",
        color: "#0F2B56",
      },
      leftIconWrap: {
        position: "absolute",
        left: scale(14),
        top: vscale(14),
        width: scale(22),
        height: scale(22),
        alignItems: "center",
        justifyContent: "center",
      },
      rightElementWrap: {
        position: "absolute",
        right: scale(12),
        top: vscale(12),
        width: scale(24),
        height: scale(24),
        alignItems: "center",
        justifyContent: "center",
      },
      errorText: {
        color: "#ef4444",
        marginTop: vscale(6),
        fontSize: fscale(12),
        fontFamily: "kanitM",
      },
      rowBetween: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: vscale(10),
      },
      rememberWrap: { flexDirection: "row", alignItems: "center", gap: scale(8) },
      checkbox: {
        width: scale(18),
        height: scale(18),
        borderRadius: scale(4),
        borderWidth: 1.5,
        borderColor: "#b9c7dd",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
      },
      checkboxChecked: { backgroundColor: "#2423ff", borderColor: "#2423ff" },
      rememberText: { color: "#355b8a", fontFamily: "kanitM", fontSize: fscale(13) },
      forgotText: {
        color: "#2423ff",
        fontFamily: "kanitB",
        fontSize: fscale(13),
        textDecorationLine: "underline",
      },
      submit: {
        backgroundColor: "#2423ff",
        marginTop: vscale(16),
        paddingVertical: vscale(12),
        borderRadius: scale(14),
        alignItems: "center",
        shadowColor: "#2423ff",
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 10,
        elevation: 3,
      },
      submitText: { color: "#fff", fontSize: fscale(16), fontFamily: "kanitB" },
      registerContainer: {
        flexDirection: "row",
        marginTop: vscale(8),
        alignSelf: "center",
      },
      registerText: { fontSize: fscale(14), color: "#5878a6", fontFamily: "kanitM" },
      registerLink: {
        fontSize: fscale(14),
        color: "#2423ff",
        fontFamily: "kanitB",
        textDecorationLine: "underline",
      },
      underline: {
        width: "92%",
        height: StyleSheet.hairlineWidth,
        backgroundColor: "#e6eeff",
        alignSelf: "center",
        marginTop: vscale(18),
      },
      scrollContent: {
        flexGrow: 1,
        minHeight: height,
        paddingBottom: vscale(16),
      },
      decoBlobA: {
        top: -vscale(40),
        left: -scale(30),
        width: scale(160),
        height: scale(160),
        opacity: 0.25,
      },
      decoBlobB: {
        top: vscale(40),
        right: -scale(50),
        width: scale(220),
        height: scale(220),
        opacity: 0.16,
      },
    });
  }, [width, height, fontScale, scale, vscale, fscale, isTablet, TOP_GAP]);

  useEffect(() => {
    (async () => {
      try {
        const flag = await AsyncStorage.getItem("@rememberEmail");
        const last = await AsyncStorage.getItem("email");
        if (flag === "1" && last) {
          setMail(last);
          setRememberEmail(true);
        }
      } catch {}
    })();
  }, []);

  const validate = () => {
    let ok = true;
    const emailOK = /^\S+@\S+\.\S+$/.test(mail);
    if (!emailOK) {
      setErrMail("รูปแบบอีเมลไม่ถูกต้อง");
      ok = false;
    } else setErrMail(null);

    if (!password) {
      setErrPwd("กรุณากรอกรหัสผ่าน");
      ok = false;
    } else setErrPwd(null);

    return ok;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    try {
      setBusy(true);

      const cred = await signInWithEmailAndPassword(
        auth,
        mail.trim().toLowerCase(),
        password
      );
      const user = cred.user;

      if (rememberEmail) {
        await AsyncStorage.multiSet([
          ["email", mail.trim().toLowerCase()],
          ["@rememberEmail", "1"],
        ]);
      } else {
        await AsyncStorage.multiRemove(["email", "@rememberEmail"]);
        await AsyncStorage.setItem("@rememberEmail", "0");
      }

      if (!user.emailVerified) {
        try {
          await sendEmailVerification(user);
        } catch (e) {
          console.log("sendEmailVerification error:", e);
        }
        Alert.alert("ต้องยืนยันอีเมล", "เราได้ส่งลิงก์ยืนยันไปที่อีเมลของคุณแล้ว");
        router.replace("/(auth)/verify-email");
        return;
      }

      router.replace("/(tabs)");
    } catch (error: any) {
      let msg = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
      switch (error?.code) {
        case "auth/invalid-email":
          msg = "รูปแบบอีเมลไม่ถูกต้อง";
          break;
        case "auth/user-disabled":
          msg = "บัญชีนี้ถูกปิดใช้งาน";
          break;
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          msg = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
          break;
        case "auth/too-many-requests":
          msg = "พยายามเข้าสู่ระบบบ่อยเกินไป โปรดลองใหม่ภายหลัง";
          break;
        case "auth/network-request-failed":
          msg = "เครือข่ายขัดข้อง โปรดตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";
          break;
      }
      Alert.alert("เข้าสู่ระบบล้มเหลว", msg);
      console.error("[handleLogin]", error);
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async () => {
    if (!/^\S+@\S+\.\S+$/.test(mail)) {
      Alert.alert("ลืมรหัสผ่าน", "กรุณากรอกอีเมลให้ถูกต้องก่อน");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, mail.trim());
      Alert.alert("ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว", "กรุณาตรวจสอบกล่องอีเมลของคุณ");
    } catch (e: any) {
      Alert.alert("ส่งลิงก์ไม่สำเร็จ", e?.message || "ลองใหม่อีกครั้ง");
    }
  };

  const handleGoBack = () => router.replace("/");

  return (
    <SafeAreaProvider>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? Math.max(TOP_GAP, 60) : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            {/* BG Decorations */}
            <View style={styles.decorationWrap}>
              <View style={[styles.decoBlob, styles.decoBlobA]} />
              <View style={[styles.decoBlob, styles.decoBlobB]} />
            </View>

            {/* Back */}
            <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
              <Ionicons name="arrow-back" size={scale(22)} color="#0F2B56" />
            </TouchableOpacity>

            {/* Logo */}
            <Image
              source={{ uri: "https://img2.pic.in.th/pic/LogoRound.png" }}
              style={styles.logo}
              resizeMode="contain"
            />

            {/* Title */}
            <Text style={styles.title}>เข้าสู่ระบบ</Text>
            <Text style={styles.subtitle}>ยินดีต้อนรับกลับเข้าสู่ OngOr</Text>

            {/* Card */}
            <View style={styles.card}>
              <FloatingLabelInput
                placeholder="อีเมล"
                value={mail}
                onChangeText={setMail}
                keyboardType="email-address"
                leftIcon={
                  <Ionicons name="mail-outline" size={scale(18)} color="#8aa0c2" />
                }
                error={errMail}
                returnKeyType="next"
                styles={styles}
                scale={scale}
                vscale={vscale}
                fscale={fscale}
              />

              <FloatingLabelInput
                placeholder="รหัสผ่าน"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                leftIcon={
                  <Ionicons name="lock-closed-outline" size={scale(18)} color="#8aa0c2" />
                }
                rightElement={
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={scale(20)}
                      color="#8aa0c2"
                    />
                  </TouchableOpacity>
                }
                error={errPwd}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                styles={styles}
                scale={scale}
                vscale={vscale}
                fscale={fscale}
              />

              {/* Remember / Forgot */}
              <View style={styles.rowBetween}>
                <TouchableOpacity
                  style={styles.rememberWrap}
                  onPress={() => setRememberEmail((v) => !v)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.checkbox,
                      rememberEmail && styles.checkboxChecked,
                    ]}
                  >
                    {rememberEmail && (
                      <Ionicons name="checkmark" size={scale(14)} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.rememberText}>จำอีเมลไว้</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")}>
                  <Text style={styles.forgotText}>ลืมรหัสผ่าน?</Text>
                </TouchableOpacity>
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submit, busy && { opacity: 0.8 }]}
                onPress={handleLogin}
                disabled={busy}
                activeOpacity={0.9}
              >
                {busy ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.submitText}>กำลังเข้าสู่ระบบ...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitText}>เข้าสู่ระบบ</Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.underline} />

              {/* Register */}
              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>ยังไม่มีบัญชี? </Text>
                <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
                  <Text style={styles.registerLink}>สมัครเลย</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaProvider>
  );
};

export default Login;
