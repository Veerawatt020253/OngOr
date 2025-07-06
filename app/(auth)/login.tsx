import { auth } from "@/FirebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons'; // เพิ่ม import นี้

const FloatingLabelInput = ({
  placeholder,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedLabel = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedLabel, {
      toValue: isFocused || value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  return (
    <View style={styles.inputContainer}>
      <Animated.Text
        style={[
          styles.floatingLabel,
          {
            top: animatedLabel.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 6],
            }),
            fontSize: animatedLabel.interpolate({
              inputRange: [0, 1],
              outputRange: [18, 14],
            }),
            color: isFocused ? "#2423ff" : "#aaa",
          },
        ]}
      >
        {placeholder}
      </Animated.Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </View>
  );
};

const Login = () => {
  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, mail, password);
      await AsyncStorage.setItem("email", mail);
      console.log("Login success");
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("เข้าสู่ระบบล้มเหลว", "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      console.error(error);
    }
  };

  // ✅ เพิ่มฟังก์ชันย้อนกลับ
  const handleGoBack = () => {
    router.back(); // หรือใช้ router.push("/") ถ้าต้องการไปหน้าแรก
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          {/* ✅ เพิ่มปุ่มย้อนกลับ */}
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Ionicons name="arrow-back" size={24} color="#2423ff" />
          </TouchableOpacity>

          <Image
            source={{ uri: "https://img2.pic.in.th/pic/LogoRound.png" }}
            style={styles.logo}
          />
          <Text style={styles.title}>เข้าสู่ระบบ</Text>

          <FloatingLabelInput
            placeholder="อีเมล"
            value={mail}
            onChangeText={setMail}
            keyboardType="email-address"
          />

          <View style={styles.passwordContainer}>
            <FloatingLabelInput
              placeholder="รหัสผ่าน"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
          </View>

          <TouchableOpacity style={styles.submit} onPress={handleLogin}>
            <Text style={styles.submitText}>เข้าสู่ระบบ</Text>
          </TouchableOpacity>

          <View style={styles.underline} />
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>ยังไม่มีบัญชี?</Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
              <Text style={styles.registerLink}>สมัครเลย</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f1f1",
    alignItems: "center",
    marginHorizontal: 16,
    paddingTop: 90,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    marginTop: 30,
  },
  // ✅ ปรับปรุง style ของปุ่มย้อนกลับ
  backButton: { 
    position: "absolute", 
    top: 50, 
    left: 20, 
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    zIndex: 1,
  },
  title: {
    fontWeight: "bold",
    fontSize: 28,
    marginTop: 10,
    marginBottom: 20,
    color: "#2423ff",
    fontFamily: 'kanitM',
  },
  inputContainer: {
    width: "90%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 20,
    marginTop: 15,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  floatingLabel: {
    position: "absolute",
    left: 16,
    backgroundColor: "white",
    paddingHorizontal: 8,
    fontFamily: "kanitM",
  },
  input: { fontSize: 16, paddingVertical: 12, width: "100%" },
  passwordContainer: {
    alignItems: "center",
    width: "100%",
  },
  submit: {
    backgroundColor: "#2423ff",
    marginTop: 30,
    padding: 12,
    borderRadius: 12,
    width: "90%",
    alignItems: "center",
  },
  submitText: { color: "#fff", fontSize: 18, fontWeight: "bold", fontFamily: "kanitM" },
  logo: {
    width: 175,
    height: 175,
  },
  registerContainer: { flexDirection: "row", marginTop: 10 },
  registerText: { fontSize: 16, color: "#555", fontFamily: "kanitM" },
  registerLink: {
    fontSize: 16,
    color: "#2423ff",
    fontWeight: "bold",
    fontFamily: "kanitM",
    textDecorationStyle: "solid",
    textDecorationLine: "underline",
  },
  underline: {
    width: "85%",
    height: 1,
    backgroundColor: "#ccc",
    marginVertical: 15,
  },
});

export default Login;
