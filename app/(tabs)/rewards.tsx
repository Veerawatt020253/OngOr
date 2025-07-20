import { useFocusEffect } from "@react-navigation/native";
import React, { useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { get, getDatabase, ref } from "firebase/database";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth } from "@/FirebaseConfig"; // อย่าลืม import auth ด้วย
import { getTotalPoints } from "@/lib/scoreUtils";

export default function RewardScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [points, setPoints] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const fetchAllData = async () => {
        try {
          const uid = auth.currentUser?.uid;
          if (!uid) {
            console.log("No user logged in");
            return;
          }

          // Fetch total points
          const points = await getTotalPoints();
          if (isActive) {
            setPoints(points);
          }

          // Fetch user data from Firestore
          const firestore = getFirestore();
          const q = query(
            collection(firestore, "users"),
            where("uid", "==", uid)
          );
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty && isActive) {
            const userDoc = querySnapshot.docs[0];
          } else {
            console.log("ไม่พบผู้ใช้นี้ใน Firestore");
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      };

      fetchAllData(); // ดึงข้อมูลแต้ม

      return () => {}; // cleanup ไม่จำเป็นตอนนี้
    }, [])
  );

  const showModal = () => {
    setModalVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  };

  const closeModal = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.in(Easing.ease),
    }).start(() => {
      setModalVisible(false);
    });
  };

  useFocusEffect(
    React.useCallback(() => {
      showModal(); // เรียกทุกครั้งที่ Focus หน้า
      return () => {}; // ไม่ต้องทำอะไรเมื่อ Unfocus
    }, [])
  );

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.infoCard,
          { marginVertical: 20, marginHorizontal: 20, alignItems: "center" },
        ]}
      >
        <Text
          style={{
            fontFamily: "kanitB",
            textAlign: "center",
            color: "#226CB0",
            fontSize: 26,
          }}
        >
          พ้อยท์สะสม: {points} พ้อยท์
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.emptyMessage}>ตอนนี้ยังไม่มีของรางวัลให้แลก</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    paddingVertical: 30,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: "80%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 32,
    marginBottom: 12,
    color: "#2563eb",
    fontFamily: "kanitB",
  },
  modalMessage: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 24,
    fontFamily: "kanitM",
  },
  closeButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "kanitM",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  infoBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderColor: "#eef4ff",
    borderWidth: 3,
  },
  container: {
    flex: 1,
    backgroundColor: "#eef4ff",
    paddingTop: 50,
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  emptyMessage: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    fontFamily: "kanitM",
    marginTop: 40,
  },
});
