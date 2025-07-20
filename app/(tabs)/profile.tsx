import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import LogoutButton from "@/components/LogoutBtn";
import { Ionicons } from "@expo/vector-icons";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth } from "@/FirebaseConfig";
import { useEffect, useState } from "react";
import { getTotalPoints } from "@/lib/scoreUtils";
import { getStreak } from "@/lib/streakUtils";
import { router } from "expo-router";

export default function ProfileScreen() {
  const [totalPoints, setTotalPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [fullName, setFullName] = useState("");
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    let isActive = true;

    const fetchAllData = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) {
          console.log("No user logged in");
          return;
        }

        // Fetch streak
        const currentStreak = await getStreak();
        if (isActive) setStreak(currentStreak);

        // Fetch total points
        const points = await getTotalPoints();
        if (isActive) {
          setTotalPoints(points);
          setLevel(Math.floor(points / 1000) + 1);
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
          setFullName(userDoc.data().fullname || "");
        } else {
          console.log("ไม่พบผู้ใช้นี้ใน Firestore");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchAllData();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Section */}
        <View style={styles.profileCard}>
          <Image
            source={require("@/assets/user/oldperson.png")}
            style={styles.avatar}
          />
          <Text style={styles.name}>{fullName || "ไม่ทราบชื่อ"}</Text>
          <Text style={styles.level}>พัฒนาการระดับ {level}</Text>
        </View>

        {/* My Profile Section */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>โปรไฟล์ของฉัน</Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              เล่นต่อเนื่องมา {streak} วันแล้ว !
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              มีพ้อยท์สะสม {totalPoints} พ้อยท์
            </Text>
          </View>

          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => router.push("/(page)/ProfileSettingsScreen")}
          >
            <Ionicons name="settings-outline" size={20} color="white" />
            <Text style={styles.settingText}>ตั้งค่าโปรไฟล์</Text>
          </TouchableOpacity>

          <LogoutButton style={undefined} textStyle={undefined} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eef4ff",
    paddingTop: 50,
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 40,
    marginBottom: 12,
  },
  name: {
    fontSize: 32,
    color: "#226cb0",
    fontFamily: "kanitB",
  },
  level: {
    fontSize: 18,
    color: "#3b82f6",
    marginTop: 4,
    fontFamily: "kanitM",
    top: -10,
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
  sectionTitle: {
    fontSize: 22,
    color: "#226cb0",
    marginBottom: 12,
    textAlign: "center",
    fontFamily: "kanitB",
  },
  infoBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderColor: "#eef4ff",
    borderWidth: 3,
  },
  infoText: {
    textAlign: "center",
    color: "#3b82f6",
    fontSize: 16,
    fontFamily: "kanitM",
  },
  settingButton: {
    flexDirection: "row",
    backgroundColor: "#77a5ff",
    borderRadius: 12,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  settingText: {
    color: "#fff",
    fontFamily: "kanitB",
    fontSize: 20,
  },
});
