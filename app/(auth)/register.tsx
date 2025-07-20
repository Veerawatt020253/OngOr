import { FontAwesome } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

// Firebase imports
import { auth, db } from "@/FirebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { addDoc, collection, setDoc, doc } from "firebase/firestore";

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

export default function Register() {
  const [contact, setContact] = useState("");
  const [fullname, setFullname] = useState("");
  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [selectedSex, setSelectedSex] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation();

  const handleSelectSex = (gender) => {
    setSelectedSex(gender);
  };

  const handleRegister = async () => {
    if (!fullname || !username || !mail || !age || !password || !selectedSex) {
      Alert.alert("ข้อผิดพลาด", "กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        mail,
        password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        fullname,
        username,
        email: mail,
        age,
        sex: selectedSex,
        contact, // ← เพิ่มตรงนี้
      });

      Alert.alert("สำเร็จ", "สมัครสมาชิกเรียบร้อย!");
      navigation.navigate("(auth)/login");
    } catch (error) {
      // Handle email already in use error
      if (error.code === "auth/email-already-in-use") {
        Alert.alert("ข้อผิดพลาด", "อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น");
      } else {
        Alert.alert("ข้อผิดพลาด", error.message);
      }
    }
  };

  return (
    <SafeAreaProvider>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0} // ปรับตามตำแหน่ง SafeArea/ปุ่ม
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <SafeAreaView style={styles.container}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.navigate("index")}
            >
              <FontAwesome name="arrow-left" size={24} color="black" />
            </TouchableOpacity>

            <Image
              source={{ uri: "https://img2.pic.in.th/pic/LogoRound.png" }}
              style={styles.logo}
            />

            <Text style={styles.title}>สมัครสมาชิก</Text>

            <FloatingLabelInput
              placeholder="ชื่อจริง นามสกุล"
              value={fullname}
              onChangeText={setFullname}
            />

            {/* Floating Label Input */}
            <FloatingLabelInput
              placeholder="ชื่อผู้ใช้"
              value={username}
              onChangeText={setUsername}
            />
            <FloatingLabelInput
              placeholder="เบอร์โทรติดต่อ"
              value={contact}
              onChangeText={setContact}
              keyboardType="phone-pad"
            />

            <FloatingLabelInput
              placeholder="อีเมล"
              value={mail}
              onChangeText={setMail}
              keyboardType="email-address"
            />

            {/* รหัสผ่าน */}
            <View style={styles.passwordContainer}>
              <FloatingLabelInput
                placeholder="รหัสผ่าน"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.showPasswordButton}
              >
                <FontAwesome
                  name={showPassword ? "eye-slash" : "eye"}
                  size={20}
                  color="#aaa"
                  style={{
                    alignContent: "center",
                    alignSelf: "center",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingTop: 8,
                  }}
                />
              </TouchableOpacity>
            </View>

            <FloatingLabelInput
              placeholder="อายุ"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
            />

            {/* ช่องเลือกเพศ */}
            <View style={styles.sexSelection}>
              <TouchableOpacity
                style={[
                  styles.sexBtn,
                  selectedSex === "male" && styles.selectedMale,
                ]}
                onPress={() => handleSelectSex("male")}
              >
                <FontAwesome
                  name={"mars"}
                  size={20}
                  color={selectedSex === "male" ? "#2423ff" : "#aaa"}
                />
                <Text
                  style={[
                    styles.sexBtnText,
                    selectedSex === "male" && { color: "#2423ff" },
                  ]}
                >
                  ชาย
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sexBtn,
                  selectedSex === "female" && styles.selectedFemale,
                ]}
                onPress={() => handleSelectSex("female")}
              >
                <FontAwesome
                  name={"venus"}
                  size={20}
                  color={selectedSex === "female" ? "#ff1493" : "#aaa"}
                />
                <Text
                  style={[
                    styles.sexBtnText,
                    selectedSex === "female" && { color: "#ff1493" },
                  ]}
                >
                  หญิง
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.submit} onPress={handleRegister}>
              <Text style={styles.submitText}>สมัครสมาชิก</Text>
            </TouchableOpacity>

            <View style={styles.underline} />

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>คุณมีบัญชีแล้วใช่มั้ย? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("(auth)/login")}
              >
                <Text style={styles.registerLink}>เข้าสู่ระบบ</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaProvider>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f1f1",
    alignItems: "center",
    marginHorizontal: 16,
    paddingTop: 30,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    marginTop: 30,
  },
  backButton: { position: "absolute", top: 30, left: 20, padding: 10 },
  title: {
    fontSize: 28,
    marginTop: 10,
    marginBottom: 20,
    color: "#2423ff",
    fontFamily: "kanitB",
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
  sexSelection: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 15,
  },
  sexBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#fff",
    marginHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  selectedMale: { borderColor: "#2423ff", backgroundColor: "#E0E7FF" },
  selectedFemale: { borderColor: "#ff1493", backgroundColor: "#FFE0F0" },
  sexBtnText: { fontSize: 16, marginLeft: 8, fontFamily: "kanitM" },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "89%",
  },
  showPasswordButton: {
    padding: 12,
    marginLeft: 10,
    backgroundColor: "#FFFFFFFF",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    height: 62,
    marginTop: 13,
  },
  submit: {
    backgroundColor: "#2423ff",
    marginTop: 30,
    padding: 12,
    borderRadius: 12,
    width: "90%",
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: 18,

    fontFamily: "kanitB",
  },
  logo: {
    width: 175,
    height: 175,
  },
  registerContainer: { flexDirection: "row", marginTop: 10 },
  registerText: { fontSize: 16, color: "#555", fontFamily: "kanitM" },
  registerLink: {
    fontSize: 16,
    color: "#2423ff",

    fontFamily: "kanitB",
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
