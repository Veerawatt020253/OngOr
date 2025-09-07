import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { sendEmailVerification } from "firebase/auth";
import { useEffect, useRef, useState } from "react";

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
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { auth } from "@/FirebaseConfig";

const router = useRouter();

/* ========= Floating Label Input (with icons & error) ========= */
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
    <View style={{ width: "100%", marginTop: 14 }}>
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
                outputRange: [18, 5],
              }),
              fontSize: animatedLabel.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 13],
              }),
              color: error ? "#ef4444" : isFocused ? "#2423ff" : "#9aa3b2",
              left: leftIcon ? 44 : 16,
            },
          ]}
        >
          {placeholder}
        </Animated.Text>

        <TextInput
          style={[
            styles.input,
            {
              paddingLeft: leftIcon ? 44 : 16,
              paddingRight: rightElement ? 44 : 16,
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

  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);
  const [busy, setBusy] = useState(false);

  // per-field errors
  const [errMail, setErrMail] = useState<string | null>(null);
  const [errPwd, setErrPwd] = useState<string | null>(null);

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

      // ล็อกอิน
      const cred = await signInWithEmailAndPassword(
        auth,
        mail.trim().toLowerCase(),
        password
      );
      const user = cred.user;

      // จำอีเมล (หรือเคลียร์) ให้เป็นชุดเดียวกัน
      if (rememberEmail) {
        await AsyncStorage.multiSet([
          ["email", mail.trim().toLowerCase()],
          ["@rememberEmail", "1"],
        ]);
      } else {
        await AsyncStorage.multiRemove(["email", "@rememberEmail"]);
        // เก็บสถานะเผื่อ logic อื่น ๆ อ้างอิง
        await AsyncStorage.setItem("@rememberEmail", "0");
      }

      // ถ้ายังไม่ยืนยันอีเมล → ส่งอีเมลยืนยัน + พาไปหน้า verify
      if (!user.emailVerified) {
        try {
          await sendEmailVerification(user);
        } catch (e) {
          // เงียบ ๆ ไว้ (บางครั้งโดน throttle) ให้ไปกด "ส่งอีกครั้ง" ในหน้าตรวจได้
          console.log("sendEmailVerification error:", e);
        }
        Alert.alert(
          "ต้องยืนยันอีเมล",
          "เราได้ส่งลิงก์ยืนยันไปที่อีเมลของคุณแล้ว"
        );
        router.replace("/(auth)/verify-email");
        return; // อย่าเข้าแอปก่อน
      }

      // ยืนยันแล้ว → เข้าแอป
      router.replace("/(tabs)");
    } catch (error: any) {
      // แปล error code เป็นข้อความไทยอ่านง่าย
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
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <SafeAreaView style={styles.container}>
            {/* โทนตกแต่งพื้นหลังให้อยู่ในธีม */}
            <View style={styles.decorationWrap}>
              <View
                style={[
                  styles.decoBlob,
                  {
                    top: -40,
                    left: -30,
                    width: 160,
                    height: 160,
                    opacity: 0.25,
                  },
                ]}
              />
              <View
                style={[
                  styles.decoBlob,
                  {
                    top: 40,
                    right: -50,
                    width: 220,
                    height: 220,
                    opacity: 0.16,
                  },
                ]}
              />
            </View>

            {/* Back */}
            <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
              <Ionicons name="arrow-back" size={22} color="#0F2B56" />
            </TouchableOpacity>

            {/* Logo */}
            <Image
              source={{ uri: "https://img2.pic.in.th/pic/LogoRound.png" }}
              style={styles.logo}
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
                  <Ionicons name="mail-outline" size={18} color="#8aa0c2" />
                }
                error={errMail}
                returnKeyType="next"
              />

              <FloatingLabelInput
                placeholder="รหัสผ่าน"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                leftIcon={
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color="#8aa0c2"
                  />
                }
                rightElement={
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#8aa0c2"
                    />
                  </TouchableOpacity>
                }
                error={errPwd}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
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
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.rememberText}>จำอีเมลไว้</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push("/(auth)/forgot-password")}
                >
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
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
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
                <TouchableOpacity
                  onPress={() => router.push("/(auth)/register")}
                >
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

/* ======================== Styles ======================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 24,
  },
  decorationWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  decoBlob: {
    position: "absolute",
    backgroundColor: "#3578d0",
    borderRadius: 999,
    transform: [{ rotate: "25deg" }],
  },
  backButton: {
    position: "absolute",
    top: 18,
    left: 14,
    zIndex: 10,
    backgroundColor: "#ffffff",
    padding: 8,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  logo: { width: 140, height: 140, marginTop: 12 },
  title: {
    fontSize: 28,
    marginTop: 6,
    color: "#2423ff",
    fontFamily: "kanitB",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#3b6fb6",
    fontFamily: "kanitM",
    marginTop: 2,
    marginBottom: 12,
  },

  card: {
    width: "100%",
    maxWidth: 540,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "#D8E6FF",
    shadowColor: "#3578d0",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 2,
  },

  inputContainer: {
    width: "100%",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingTop: 16,
    paddingBottom: 8,
    position: "relative",
  },
  floatingLabel: {
    position: "absolute",
    backgroundColor: "white",
    paddingHorizontal: 8,
    fontFamily: "kanitM",
  },
  input: {
    fontSize: 16,
    paddingVertical: 10,
    width: "100%",
    fontFamily: "kanitM",
    color: "#0F2B56",
  },
  leftIconWrap: {
    position: "absolute",
    left: 14,
    top: 14,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  rightElementWrap: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  errorText: {
    color: "#ef4444",
    marginTop: 6,
    fontSize: 12,
    fontFamily: "kanitM",
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  rememberWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#b9c7dd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkboxChecked: { backgroundColor: "#2423ff", borderColor: "#2423ff" },
  rememberText: { color: "#355b8a", fontFamily: "kanitM", fontSize: 13 },
  forgotText: {
    color: "#2423ff",
    fontFamily: "kanitB",
    fontSize: 13,
    textDecorationLine: "underline",
  },

  submit: {
    backgroundColor: "#2423ff",
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#2423ff",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3,
  },
  submitText: { color: "#fff", fontSize: 16, fontFamily: "kanitB" },

  registerContainer: {
    flexDirection: "row",
    marginTop: 8,
    alignSelf: "center",
  },
  registerText: { fontSize: 14, color: "#5878a6", fontFamily: "kanitM" },
  registerLink: {
    fontSize: 14,
    color: "#2423ff",
    fontFamily: "kanitB",
    textDecorationLine: "underline",
  },
  underline: {
    width: "90%",
    height: 1,
    backgroundColor: "#e6eeff",
    alignSelf: "center",
    marginTop: 18,
  },
});
