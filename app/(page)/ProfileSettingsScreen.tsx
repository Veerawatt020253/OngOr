import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
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
import { updatePassword } from "firebase/auth";
import { useRouter } from "expo-router";

export default function ProfileSettingsScreen() {
  const [fullname, setFullname] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [docId, setDocId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const uid = auth.currentUser?.uid;
        const firestore = getFirestore();
        const q = query(collection(firestore, "users"), where("uid", "==", uid));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          setFullname(userDoc.data().fullname || "");
          setDocId(userDoc.id);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUserData();
  }, []);

  const handleSave = async () => {
    try {
      const firestore = getFirestore();

      // Update Firestore fullname
      if (docId) {
        const userRef = doc(firestore, "users", docId);
        await updateDoc(userRef, { fullname });
      }

      // Update Firebase Auth password
      if (newPassword.length >= 6) {
        await updatePassword(auth.currentUser, newPassword);
      }

      Alert.alert("สำเร็จ", "ข้อมูลบัญชีของคุณได้รับการอัปเดตแล้ว");
      router.back();
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("ผิดพลาด", "ไม่สามารถอัปเดตข้อมูลได้");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ตั้งค่าบัญชีผู้ใช้</Text>

      <TextInput
        style={styles.input}
        placeholder="ชื่อ - นามสกุล"
        value={fullname}
        onChangeText={setFullname}
      />

      <TextInput
        style={styles.input}
        placeholder="รหัสผ่านใหม่ (เว้นว่างหากไม่ต้องการเปลี่ยน)"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>บันทึก</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
        <Text style={styles.cancelText}>ย้อนกลับ</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eef4ff",
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    color: "#226cb0",
    marginBottom: 20,
    textAlign: "center",
    fontFamily: "kanitB",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    fontFamily: "kanitM",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  button: {
    backgroundColor: "#226cb0",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  buttonText: {
    color: "#fff",
    fontFamily: "kanitB",
    fontSize: 18,
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  cancelText: {
    color: "#888",
    fontFamily: "kanitM",
    fontSize: 16,
  },
});
