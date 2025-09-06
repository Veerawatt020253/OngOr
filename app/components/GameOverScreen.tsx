import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Share,
} from "react-native";
import { useRouter } from "expo-router";

type Props = {
  visible: boolean;
  waves: number;
  timeSpent: number; // วินาที
  score: number;
  onPlayAgain: () => void;
  onGoHome: () => void; // 👈 ปุ่มกลับหน้า Home
};

export default function GameOverScreen({
  visible,
  waves,
  timeSpent,
  score,
  onPlayAgain,
  onGoHome,
}: Props) {
  const handleShare = async () => {
    try {
      await Share.share({
        message: `ฉันทำได้ ${score} คะแนน ผ่าน ${waves} wave ใน ${timeSpent}s! 💪`,
      });
    } catch {}
  };

  const router = useRouter();

  const handleGoHome = () => {
    router.replace("/(tabs)");
  };

  return (
    <Modal animationType="fade" visible={visible} transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Game Over</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Wave ที่ผ่าน</Text>
            <Text style={styles.value}>{waves}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>เวลา</Text>
            <Text style={styles.value}>{timeSpent}s</Text>
          </View>
          <View style={[styles.row, styles.rowScore]}>
            <Text style={styles.labelScore}>คะแนน</Text>
            <Text style={styles.valueScore}>{score}</Text>
          </View>

          <View style={styles.actions}>
            {/* ▶️ ปุ่มเริ่มเล่นเกมใหม่ */}
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={onPlayAgain}
            >
              <Text style={styles.btnTextPrimary}>เล่นอีกครั้ง</Text>
            </TouchableOpacity>

            {/* 📤 ปุ่มแชร์คะแนนไปที่ social / app อื่น ๆ */}
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={handleShare}
            >
              <Text style={styles.btnText}>แชร์คะแนน</Text>
            </TouchableOpacity>

            {/* 🏠 ปุ่มกลับไปหน้า Home */}
            <TouchableOpacity
              style={[styles.btn, styles.btnHome]}
              onPress={handleGoHome}
            >
              <Text style={styles.btnTextHome}>กลับหน้า Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)", // กลบทั้งหน้าจอให้ไม่เห็นแท็บ/ขอบ
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#0B0B0B",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  title: {
    color: "#FF5A5F",
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  rowScore: {
    marginTop: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  label: { color: "#BFBFBF", fontSize: 16 },
  value: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  labelScore: { color: "#FFD600", fontSize: 18, fontWeight: "700" },
  valueScore: { color: "#FFD600", fontSize: 24, fontWeight: "800" },
  actions: {
    marginTop: 16,
    gap: 10,
  },
  btn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: "#22c55e" },
  btnSecondary: { backgroundColor: "#1F2937" },
  btnHome: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  btnTextPrimary: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  btnTextHome: { color: "#E5E7EB", fontWeight: "700", fontSize: 16 },
});
