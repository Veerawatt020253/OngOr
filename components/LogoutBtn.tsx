// components/LogoutButton.jsx
import { auth } from "@/FirebaseConfig";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const LogoutButton = ({ style, textStyle }) => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      "ออกจากระบบ",
      "คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?",
      [
        {
          text: "ยกเลิก",
          style: "cancel",
        },
        {
          text: "ออกจากระบบ",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            try {
              await signOut(auth);
              await AsyncStorage.removeItem("email");
              console.log("Logout success");
              router.replace("/(auth)/login");
            } catch (error) {
              Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถออกจากระบบได้");
              console.error(error);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity 
      style={[styles.logoutButton, style]} 
      onPress={handleLogout}
      disabled={isLoading}
    >
      <View style={styles.content}>
        <Ionicons name="log-out-outline" size={20} color="#3b82f6" />
        {isLoading ? (
          <ActivityIndicator color="#3b82f6" size="small" style={{ marginLeft: 8 }} />
        ) : (
          <Text style={[styles.logoutText, textStyle]}>ออกจากระบบ</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  logoutButton: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    marginTop: "3%",
    borderWidth: 2,
    borderColor: "#77a5ff",
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    color: "#3b82f6",
    fontSize: 18,
    fontFamily: "kanitM",
    marginLeft: 8,
  },
});

export default LogoutButton;
