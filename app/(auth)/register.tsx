import { FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
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

// Firebase
import { auth, db } from "@/FirebaseConfig";
import { sendEmailVerification, createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";

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

/* ---------------- Password Meter ---------------- */
function PasswordMeter({
  pwd,
  styles,
  fscale,
}: {
  pwd: string;
  styles: ReturnType<typeof StyleSheet.create>;
  fscale: (n: number) => number;
}) {
  const checks = [
    pwd.length >= 6,
    /[0-9]/.test(pwd),
    /[A-Z]/.test(pwd) || /[ก-ฮ]/.test(pwd),
  ];
  const passed = checks.filter(Boolean).length;
  const titles = ["อ่อน", "พอใช้", "ดี", "แข็งแรง"];
  const colors = ["#ef4444", "#f59e0b", "#22c55e", "#16a34a"];
  const idx = Math.min(passed, 3);

  return (
    <View style={{ width: "100%", marginTop: 6 }}>
      <View style={styles.meterTrack}>
        <View
          style={[
            styles.meterFill,
            { width: `${(idx / 3) * 100}%`, backgroundColor: colors[idx] },
          ]}
        />
      </View>
      <Text
        style={[
          styles.meterLabel,
          { color: colors[idx], fontSize: fscale(13) },
        ]}
      >
        {/* อัปเดตข้อความตามที่ขอ */}
        ความปลอดภัยของรหัสผ่าน: {titles[idx]}
      </Text>
    </View>
  );
}

/* ---------------- Floating Label Input (with icon + error) ---------------- */
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

export default function Register() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;

  const { scale, vscale, fscale } = useMemo(
    () => makeScalers(width, height, fontScale),
    [width, height, fontScale]
  );

  const TOP_GAP = Math.max(insets.top, 12);

  const [contact, setContact] = useState("");
  const [fullname, setFullname] = useState("");
  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [selectedSex, setSelectedSex] = useState<"male" | "female" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  // errors
  const [errFullname, setErrFullname] = useState<string | null>(null);
  const [errUsername, setErrUsername] = useState<string | null>(null);
  const [errMail, setErrMail] = useState<string | null>(null);
  const [errPwd, setErrPwd] = useState<string | null>(null);
  const [errAge, setErrAge] = useState<string | null>(null);
  const [errContact, setErrContact] = useState<string | null>(null);
  const [errSex, setErrSex] = useState<string | null>(null);

  const styles = useMemo(() => {
    const CARD_MAX = isTablet ? scale(640) : scale(560);
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
        left: scale(14),
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
      label: {
        color: "#3578d0",
        fontFamily: "kanitB",
        marginBottom: vscale(8),
        fontSize: fscale(14),
      },
      sexSelection: { flexDirection: "row", gap: scale(10) },
      sexBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: scale(8),
        borderWidth: 1.4,
        borderColor: "#dfe5ef",
        borderRadius: 999,
        paddingHorizontal: scale(16),
        paddingVertical: vscale(10),
        backgroundColor: "#fff",
      },
      sexBtnText: { fontSize: fscale(14), color: "#355b8a", fontFamily: "kanitM" },
      submit: {
        backgroundColor: "#2423ff",
        marginTop: vscale(18),
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
        textDecorationStyle: "solid",
        textDecorationLine: "underline",
      },
      underline: {
        width: "92%",
        height: StyleSheet.hairlineWidth,
        backgroundColor: "#e6eeff",
        alignSelf: "center",
        marginTop: vscale(18),
      },
      // password meter
      meterTrack: {
        width: "100%",
        height: vscale(8),
        backgroundColor: "#e8eefb",
        borderRadius: scale(999),
        overflow: "hidden",
      },
      meterFill: {
        height: "100%",
        borderRadius: scale(999),
      },
      meterLabel: {
        marginTop: vscale(6),
        fontFamily: "kanitM", // ให้ฟอนต์เดียวกับอินพุต/ตัวอื่น
      },
      // Scroll content keeps center on large/landscape
      scrollContent: {
        flexGrow: 1,
        minHeight: height,
        paddingBottom: vscale(16),
      },
      // deco blobs size/pos
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

  const handleSelectSex = (gender: "male" | "female") => {
    setSelectedSex(gender);
    setErrSex(null);
  };

  const validate = () => {
    let ok = true;

    if (!fullname.trim()) {
      setErrFullname("กรุณากรอกชื่อ-นามสกุล");
      ok = false;
    } else setErrFullname(null);

    if (!username.trim() || username.trim().length < 3) {
      setErrUsername("ชื่อผู้ใช้อย่างน้อย 3 ตัวอักษร");
      ok = false;
    } else setErrUsername(null);

    const emailOK = /^\S+@\S+\.\S+$/.test(mail);
    if (!emailOK) {
      setErrMail("รูปแบบอีเมลไม่ถูกต้อง");
      ok = false;
    } else setErrMail(null);

    if (password.length < 6) {
      setErrPwd("รหัสผ่านอย่างน้อย 6 ตัวอักษร");
      ok = false;
    } else setErrPwd(null);

    const ageNum = parseInt(age || "0", 10);
    if (!ageNum || ageNum < 1 || ageNum > 120) {
      setErrAge("กรุณากรอกอายุ 1-120 ปี");
      ok = false;
    } else setErrAge(null);

    const phoneOK = /^[0-9+\-\s]{8,}$/.test(contact);
    if (!phoneOK) {
      setErrContact("กรุณากรอกเบอร์โทรให้ถูกต้อง");
      ok = false;
    } else setErrContact(null);

    if (!selectedSex) {
      setErrSex("กรุณาเลือกเพศ");
      ok = false;
    } else setErrSex(null);

    return ok;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      setBusy(true);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        mail.trim().toLowerCase(),
        password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        fullname: fullname.trim(),
        username: username.trim(),
        email: mail.trim().toLowerCase(),
        age: parseInt(age, 10),
        sex: selectedSex,
        contact: contact.trim(),
        createdAt: serverTimestamp(),
      });

      await sendEmailVerification(user);

      Alert.alert(
        "สมัครสำเร็จ",
        "เราได้ส่งอีเมลยืนยันให้แล้ว กรุณาตรวจสอบกล่องจดหมาย"
      );

      // @ts-ignore
      navigation.navigate("(auth)/verify-email");
    } catch (error: any) {
      if (error?.code === "auth/email-already-in-use") {
        Alert.alert("ข้อผิดพลาด", "อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น");
      } else {
        Alert.alert("ข้อผิดพลาด", error?.message || "ไม่สามารถสมัครสมาชิกได้");
      }
    } finally {
      setBusy(false);
    }
  };

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
            {/* --- Decorative header --- */}
            <View style={styles.decorationWrap}>
              <View style={[styles.decoBlob, styles.decoBlobA]} />
              <View style={[styles.decoBlob, styles.decoBlobB]} />
            </View>

            {/* Back */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                // @ts-ignore
                navigation.navigate("index");
              }}
            >
              <FontAwesome name="arrow-left" size={scale(22)} color="#0F2B56" />
            </TouchableOpacity>

            {/* Logo */}
            <Image
              source={{ uri: "https://img2.pic.in.th/pic/LogoRound.png" }}
              style={styles.logo}
              resizeMode="contain"
            />

            {/* Title */}
            <Text style={styles.title}>สมัครสมาชิก</Text>
            <Text style={styles.subtitle}>สร้างบัญชี OngOr ของคุณ</Text>

            {/* Card */}
            <View style={styles.card}>
              <FloatingLabelInput
                placeholder="ชื่อจริง นามสกุล"
                value={fullname}
                onChangeText={setFullname}
                leftIcon={<FontAwesome name="user" size={scale(18)} color="#8aa0c2" />}
                autoCapitalize="words"
                error={errFullname}
                styles={styles}
                scale={scale}
                vscale={vscale}
                fscale={fscale}
              />

              <FloatingLabelInput
                placeholder="ชื่อผู้ใช้"
                value={username}
                onChangeText={setUsername}
                leftIcon={<FontAwesome name="id-badge" size={scale(18)} color="#8aa0c2" />}
                error={errUsername}
                styles={styles}
                scale={scale}
                vscale={vscale}
                fscale={fscale}
              />

              <FloatingLabelInput
                placeholder="เบอร์โทรติดต่อ"
                value={contact}
                onChangeText={setContact}
                keyboardType="phone-pad"
                leftIcon={<FontAwesome name="phone" size={scale(18)} color="#8aa0c2" />}
                error={errContact}
                styles={styles}
                scale={scale}
                vscale={vscale}
                fscale={fscale}
              />

              <FloatingLabelInput
                placeholder="อีเมล"
                value={mail}
                onChangeText={setMail}
                keyboardType="email-address"
                leftIcon={<FontAwesome name="envelope" size={scale(18)} color="#8aa0c2" />}
                error={errMail}
                styles={styles}
                scale={scale}
                vscale={vscale}
                fscale={fscale}
              />

              {/* Password + eye */}
              <FloatingLabelInput
                placeholder="รหัสผ่าน"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                leftIcon={<FontAwesome name="lock" size={scale(18)} color="#8aa0c2" />}
                rightElement={
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                    <FontAwesome
                      name={showPassword ? "eye-slash" : "eye"}
                      size={scale(18)}
                      color="#8aa0c2"
                    />
                  </TouchableOpacity>
                }
                error={errPwd}
                styles={styles}
                scale={scale}
                vscale={vscale}
                fscale={fscale}
              />

              <PasswordMeter pwd={password} styles={styles} fscale={fscale} />

              <FloatingLabelInput
                placeholder="อายุ"
                value={age}
                onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                leftIcon={<FontAwesome name="birthday-cake" size={scale(18)} color="#8aa0c2" />}
                error={errAge}
                styles={styles}
                scale={scale}
                vscale={vscale}
                fscale={fscale}
              />

              {/* Gender chips */}
              <View style={{ marginTop: vscale(12) }}>
                <Text style={styles.label}>เพศ</Text>
                <View style={styles.sexSelection}>
                  <TouchableOpacity
                    style={[
                      styles.sexBtn,
                      selectedSex === "male" && {
                        borderColor: "#2423ff",
                        backgroundColor: "#E0E7FF",
                      },
                    ]}
                    onPress={() => handleSelectSex("male")}
                  >
                    <FontAwesome
                      name="mars"
                      size={scale(18)}
                      color={selectedSex === "male" ? "#2423ff" : "#8aa0c2"}
                    />
                    <Text
                      style={[
                        styles.sexBtnText,
                        selectedSex === "male" && {
                          color: "#2423ff",
                          fontFamily: "kanitB",
                        },
                      ]}
                    >
                      ชาย
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.sexBtn,
                      selectedSex === "female" && {
                        borderColor: "#ff1493",
                        backgroundColor: "#FFE0F0",
                      },
                    ]}
                    onPress={() => handleSelectSex("female")}
                  >
                    <FontAwesome
                      name="venus"
                      size={scale(18)}
                      color={selectedSex === "female" ? "#ff1493" : "#8aa0c2"}
                    />
                    <Text
                      style={[
                        styles.sexBtnText,
                        selectedSex === "female" && {
                          color: "#ff1493",
                          fontFamily: "kanitB",
                        },
                      ]}
                    >
                      หญิง
                    </Text>
                  </TouchableOpacity>
                </View>
                {!!errSex && (
                  <Text style={[styles.errorText, { marginTop: vscale(4) }]}>
                    {errSex}
                  </Text>
                )}
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submit, busy && { opacity: 0.75 }]}
                onPress={handleRegister}
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
                    <Text style={styles.submitText}>กำลังสมัคร...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitText}>สมัครสมาชิก</Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.underline} />

              {/* Already have account */}
              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>คุณมีบัญชีแล้วใช่มั้ย? </Text>
                <TouchableOpacity
                  // @ts-ignore
                  onPress={() => navigation.navigate("(auth)/login")}
                >
                  <Text style={styles.registerLink}>เข้าสู่ระบบ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaProvider>
  );
}
