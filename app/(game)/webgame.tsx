import React, { useCallback, useRef, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  Linking,
  Platform,
  BackHandler,
} from "react-native";
import { WebView } from "react-native-webview";
import { Camera } from "expo-camera";
import GameOverScreen from "../components/GameOverScreen";

// ✅ เพิ่ม: Firebase (ใช้ modular v9)
import {
  getDatabase,
  ref,
  push,
  set,
  serverTimestamp,
} from "firebase/database";
import { auth } from "@/FirebaseConfig"; // ต้องมีการ initialize app ไว้แล้ว

const GAME_URL = "http://ongor.fun/App/game";

type WebMsg =
  | { type: "GAME_READY" }
  | { type: "INIT_ACK" }
  | { type: "PAUSED" }
  | { type: "RESUMED" }
  | { type: "SCORE_POSTED"; payload: { ok: boolean; [k: string]: any } }
  | {
      type: "GAME_OVER";
      payload: { waves: number; timeSpent: number; score: number };
    }
  | { type: string; payload?: any };

export default function WebGame() {
  const webRef = useRef<WebView>(null);
  const [webKey, setWebKey] = useState(0);

  const [webLoaded, setWebLoaded] = useState(false);
  const [gameReady, setGameReady] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  const [gameOver, setGameOver] = useState(false);
  const [gameOverData, setGameOverData] = useState<{
    waves: number;
    timeSpent: number;
    score: number;
  } | null>(null);

  // ✅ helper: ทำวันที่แบบ local (ตรงกับ DevelopmentStatsCard)
  const toLocalYMD = (d: Date) => {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  };

  // ✅ ฟังก์ชันบันทึกคะแนนเข้า RTDB
  const saveScore = useCallback(
    async (payload: { waves: number; timeSpent: number; score: number }) => {
      try {
        const user = auth.currentUser;
        if (!user) {
          // ยังไม่ล็อกอิน — แจ้งหน้าเว็บด้วย และเตือนผู้ใช้
          postToWeb({
            type: "SCORE_POSTED",
            payload: { ok: false, error: "NO_AUTH" },
          });
          Alert.alert(
            "ยังไม่ได้เข้าสู่ระบบ",
            "กรุณาเข้าสู่ระบบก่อนบันทึกคะแนน"
          );
          return;
        }

        const db = getDatabase();
        const uid = user.uid;
        const dateStr = toLocalYMD(new Date()); // YYYY-MM-DD
        // โครงสร้าง: user_scores/{uid}/{YYYY-MM-DD}/{autoKey}
        const listRef = ref(db, `user_scores/${uid}/${dateStr}`);
        const sessionRef = push(listRef);

        const data = {
          score: Number(payload.score) || 0,
          waves: Number(payload.waves) || 0,
          timeSpent: Number(payload.timeSpent) || 0, // วินาทีที่เล่น
          ts: serverTimestamp(), // เวลาบนเซิร์ฟเวอร์
          device: Platform.OS,
          game_ver: "1.0.0", // ปรับเวอร์ชันเกมได้ตามจริง
        };

        await set(sessionRef, data);

        // ✅ แจ้งหน้าเว็บว่าโพสต์สำเร็จ
        postToWeb({
          type: "SCORE_POSTED",
          payload: { ok: true, key: sessionRef.key, date: dateStr },
        });
        // แจ้งผู้ใช้ (ถ้าอยากให้เงียบๆ ก็เอา Alert ออก)
        // Alert.alert("บันทึกคะแนน", "สำเร็จ!");
      } catch (e: any) {
        console.log("saveScore error:", e?.message || e);
        postToWeb({
          type: "SCORE_POSTED",
          payload: { ok: false, error: e?.message || "UNKNOWN_ERROR" },
        });
        Alert.alert("บันทึกคะแนน", "ล้มเหลว กรุณาลองใหม่อีกครั้ง");
      }
    },
    []
  );

  // ✅ ขอสิทธิ์กล้องแบบ "เช็คก่อน"
  useEffect(() => {
    const ensureCamera = async () => {
      try {
        const { status, granted, canAskAgain } =
          await Camera.getCameraPermissionsAsync();

        if (granted || status === "granted") return;

        if (!canAskAgain) {
          Alert.alert(
            "ต้องอนุญาตกล้อง",
            "โปรดเปิดสิทธิ์กล้องใน Settings เพื่อเล่นเกมได้",
            [
              { text: "ยกเลิก", style: "cancel" },
              { text: "เปิด Settings", onPress: () => Linking.openSettings() },
            ]
          );
          return;
        }

        const req = await Camera.requestCameraPermissionsAsync();
        if (!req.granted) {
          Alert.alert(
            "ต้องอนุญาตกล้อง",
            "โปรดยินยอมให้แอปใช้กล้องเพื่อเล่นเกมท่าทาง"
          );
        }
      } catch (e) {
        console.log("Camera permission error:", e);
      }
    };
    ensureCamera();
  }, []);

  // ✅ เพิ่ม timeout สำหรับการโหลด
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!gameReady) {
        setLoadingTimeout(true);
        console.log("Loading timeout - game not ready");
      }
    }, 30000); // 30 วินาที

    return () => clearTimeout(timer);
  }, [gameReady, webKey]);

  // ✅ จัดการ back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (gameOver) {
        setGameOver(false);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [gameOver]);

  // helper: ส่ง message ไปหน้าเว็บ
  const postToWeb = useCallback((msg: any) => {
    const js = `
      try {
        if (window.fromRN) {
          window.fromRN(${JSON.stringify(msg)});
        }
      } catch (e) {
        console.error('postToWeb error:', e);
      }
      true;
    `;
    webRef.current?.injectJavaScript(js);
  }, []);

  // รับข้อความจากเว็บ
  const onMessage = useCallback(
    (e: any) => {
      let data: WebMsg | null = null;
      try {
        data = JSON.parse(e.nativeEvent.data);
        console.log("Received message from web:", data);
      } catch (err) {
        console.log("Message parse error:", err);
        return;
      }
      if (!data) return;

      switch (data.type) {
        case "GAME_READY":
          console.log("Game ready received");
          setGameReady(true);
          setLoadingTimeout(false);
          // ส่ง INIT กลับไป (ข้อมูลผู้ใช้/ระดับความยาก ปรับได้)
          setTimeout(() => {
            postToWeb({
              type: "INIT",
              payload: {
                username: auth.currentUser?.displayName || "Guest",
                ig: "ongor_team",
                email: auth.currentUser?.email || "guest@example.com",
                uid: auth.currentUser?.uid || "uid_guest", // ✅ ใช้ uid จริง
                difficulty: "normal",
              },
            });
          }, 100);
          break;

        case "GAME_OVER":
          if (data.payload) {
            setGameOverData(data.payload);
            setGameOver(true);

            // ✅ บันทึกคะแนนเข้า RTDB ให้ DevelopmentStatsCard อ่านได้
            //    โครงสร้างตรงกับที่การ์ดดึง: user_scores/{uid}/{YYYY-MM-DD}/{sessionKey}: { score }
            saveScore(data.payload);
          }
          break;

        case "SCORE_POSTED":
          // ฝั่งเว็บจะไม่ควบคุมการบันทึกแล้ว แต่เผื่อไว้ถ้าหน้าเว็บส่งกลับมา
          if (data.payload?.ok) Alert.alert("บันทึกคะแนน", "สำเร็จ!");
          else
            Alert.alert("บันทึกคะแนน", `ล้มเหลว: ${data.payload?.error || ""}`);
          break;

        default:
          console.log("Unknown message type:", data.type);
          break;
      }
    },
    [postToWeb, saveScore]
  );

  // ✅ ปรับ CSS ให้เหมาะกับ Android
  const injectedCSS = `
    html, body { 
      margin:0!important; 
      padding:0!important; 
      background:#000!important; 
      overflow:hidden!important;
      width:100vw!important;
      height:100vh!important;
    }
    ::-webkit-scrollbar { display:none!important; width:0!important; height:0!important; }
    header, nav, footer, .navbar, .site-header, .site-footer, [role="banner"], [role="navigation"] {
      display:none!important; height:0!important; overflow:hidden!important; visibility:hidden!important;
    }
    * { 
      -webkit-touch-callout:none!important; 
      -webkit-user-select:none!important; 
      user-select:none!important;
      box-sizing:border-box!important;
    }
    video { 
      background:#000!important; 
      width:100%!important;
      height:100%!important;
      object-fit:cover!important;
    }
    canvas {
      width:100%!important;
      height:100%!important;
    }
  `.replace(/\n\s+/g, " ");

  const injectedBeforeLoad = `
    (function(){
      console.log('Injecting CSS and setup...');
      var s=document.createElement('style'); 
      s.type='text/css';
      s.innerHTML = \`${injectedCSS}\`;
      document.head.appendChild(s);
      
      // ✅ เพิ่ม debug logging
      window.addEventListener('error', function(e) {
        console.error('Window error:', e.error);
      });
      
      // ✅ เช็ค WebRTC สำหรับกล้อง
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('getUserMedia not supported');
      }
      
      console.log('Setup complete');
    })();
    true;
  `;

  const handlePlayAgain = () => {
    setGameOver(false);
    setGameOverData(null);
    setGameReady(false);
    setWebLoaded(false);
    setLoadingTimeout(false);
    setWebKey((k) => k + 1); // reload WebView
  };

  const handleGoHome = () => {
    setGameOver(false);
    // navigation.navigate("Home");
  };

  const handleRetry = () => {
    setLoadingTimeout(false);
    setGameReady(false);
    setWebLoaded(false);
    setWebKey((k) => k + 1);
  };

  // ✅ เพิ่ม error handling
  const onError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    Alert.alert(
      "เกิดข้อผิดพลาด",
      "ไม่สามารถโหลดเกมได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต",
      [
        { text: "ลองใหม่", onPress: handleRetry },
        { text: "ยกเลิก", style: "cancel" }
      ]
    );
  };

  const onHttpError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.warn('WebView HTTP error:', nativeEvent);
  };

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <View style={styles.container}>
        <WebView
          key={webKey}
          ref={webRef}
          source={{ uri: GAME_URL }}
          onMessage={onMessage}
          onLoadStart={() => {
            console.log("WebView load start");
            setWebLoaded(false);
          }}
          onLoadEnd={() => {
            console.log("WebView load end");
            setWebLoaded(true);
          }}
          onError={onError}
          onHttpError={onHttpError}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          allowsBackForwardNavigationGestures={false}
          allowsLinkPreview={false}
          setSupportMultipleWindows={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          // ✅ ปรับ user agent สำหรับ Android
          userAgent={`OngOrApp/1.0 (${Platform.OS}; RN-WebView) AppleWebKit/537.36`}
          injectedJavaScriptBeforeContentLoaded={injectedBeforeLoad}
          // ✅ เพิ่ม mixed content สำหรับ Android
          mixedContentMode="always"
          // ✅ เพิ่ม hardware acceleration
          androidHardwareAccelerationDisabled={false}
          // ✅ เพิ่ม layer type
          androidLayerType="hardware"
          style={styles.webview}
          containerStyle={styles.webviewContainer}
        />

        {(!webLoaded || (!gameReady && !loadingTimeout)) && (
          <View style={styles.splash}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        {loadingTimeout && (
          <View style={styles.splash}>
            <View style={styles.timeoutContainer}>
              <ActivityIndicator size="large" color="#fff" style={{marginBottom: 20}} />
              <Text style={styles.timeoutText}>
                การโหลดใช้เวลานานกว่าปกติ
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.retryButtonText}>ลองใหม่</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <GameOverScreen
          visible={gameOver}
          waves={gameOverData?.waves ?? 0}
          timeSpent={gameOverData?.timeSpent ?? 0}
          score={gameOverData?.score ?? 0}
          onPlayAgain={handlePlayAgain}
          onGoHome={handleGoHome}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  container: { flex: 1, backgroundColor: "#000" },
  webviewContainer: { backgroundColor: "#000" },
  webview: { backgroundColor: "transparent" },
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  timeoutContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  timeoutText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});