import { auth } from "../../FirebaseConfig";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { getDatabase, push, ref } from "firebase/database";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function GameScreen() {
  const [scorePopupParticle, setScorePopupParticle] = useState(null);
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [clockIndex, setClockIndex] = useState(0);
  const [phase, setPhase] = useState("wave");
  const [timeLeft, setTimeLeft] = useState(5);
  const [score, setScore] = useState(0);
  const [poseStack, setPoseStack] = useState([]);
  const [currentPose, setCurrentPose] = useState("");
  const [poseIndex, setPoseIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isSettings, setIsSettings] = useState(false);
  const [nowPose, setNowPose] = useState("");
  const [gestureResult, setGestureResult] = useState("");
  const [status, setStatus] = useState("");
  const [isProcessingPose, setIsProcessingPose] = useState(false);
  const [gameplayStartTime, setGameplayStartTime] = useState(null);
  const [showScorePopup, setShowScorePopup] = useState(false);

  // Add clock timer ref
  const clockTimerRef = useRef(null);
  const gameTimerRef = useRef(null);
  const captureTimerRef = useRef(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCameraMounted, setIsCameraMounted] = useState(true); // Add this state

  const poseStock = [
    "ArmsSide",
    "ArmsUp",
    "TouchHead",
    "HeartHands",
    "ArmLeftUp",
    "ArmRightUp",
    "ArmLeftSide",
    "ArmRightSide",
    "TouchHeadLeft",
    "TouchHeadRight",
  ];

  // เพิ่ม mapping สำหรับรูปภาพ
  const poseImageMap = {
    ArmsSide: require("../../assets/poses/ArmSide.png"),
    ArmsUp: require("../../assets/poses/ArmsUp.png"),
    TouchHead: require("../../assets/poses/TouchHead.png"),
    HeartHands: require("../../assets/poses/HeartHands.png"),
    ArmLeftUp: require("../../assets/poses/ArmLeftUp.png"),
    ArmRightUp: require("../../assets/poses/ArmRightUp.png"),
    ArmLeftSide: require("../../assets/poses/ArmLeftSide.png"),
    ArmRightSide: require("../../assets/poses/ArmRightSide.png"),
    TouchHeadLeft: require("../../assets/poses/TouchHeadLeft.png"),
    TouchHeadRight: require("../../assets/poses/TouchHeadRight.png"),
  };

  const clockImages = [
    require("../../assets/clock/5.png"),
    require("../../assets/clock/4.png"),
    require("../../assets/clock/3.png"),
    require("../../assets/clock/2.png"),
    require("../../assets/clock/1.png"),
    require("../../assets/clock/0.png"),
  ];

  const scorePopupParticles = [
    {
      background: require("../../assets/scorePopups/bg1.png"),
      text: require("../../assets/scorePopups/text1.png"),
    },
    {
      background: require("../../assets/scorePopups/bg2.png"),
      text: require("../../assets/scorePopups/text2.png"),
    },
    {
      background: require("../../assets/scorePopups/bg3.png"),
      text: require("../../assets/scorePopups/text3.png"),
    },
    {
      background: require("../../assets/scorePopups/bg4.png"),
      text: require("../../assets/scorePopups/text4.png"),
    },
    {
      background: require("../../assets/scorePopups/bg5.png"),
      text: require("../../assets/scorePopups/text5.png"),
    },
  ];

  const lastScoredPoseRef = useRef({ poseIndex: -1, timestamp: 0 });
  const poseStackRef = useRef([]);
  const poseIndexRef = useRef(0);
  const phaseRef = useRef("wave");
  const timeLeftRef = useRef(5);
  const isPausedRef = useRef(false);
  const isSettingsRef = useRef(false);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [showGameplayOverlay, setShowGameplayOverlay] = useState(true);
  const [waveCountdown, setWaveCountdown] = useState(5);
  const [showStartPopup, setShowStartPopup] = useState(false);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
    poseStackRef.current = poseStack;
    poseIndexRef.current = poseIndex;
    phaseRef.current = phase;
    isPausedRef.current = isPaused;
    isSettingsRef.current = isSettings;
  }, [timeLeft, poseStack, poseIndex, phase, isPaused, isSettings]);

  // Fixed clock animation - only runs during gameplay
  useEffect(() => {
    if (phase === "gameplay") {
      // Reset clock index when gameplay starts
      setClockIndex(0);

      setShowStartPopup(true);

      // ทำ Fade In
      Animated.timing(popupOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // หลังแสดงครบ 1 วิ ให้ Fade Out
        setTimeout(() => {
          Animated.timing(popupOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setShowStartPopup(false);
          });
        }, 1000);
      });

      // Clear any existing timer
      if (clockTimerRef.current) {
        clearInterval(clockTimerRef.current);
      }

      // Start clock animation synchronized with game timer
      clockTimerRef.current = setInterval(() => {
        if (
          !isPausedRef.current &&
          !isSettingsRef.current &&
          phaseRef.current === "gameplay"
        ) {
          setClockIndex((prevIndex) => {
            const nextIndex = (prevIndex + 1) % 5;
            return nextIndex;
          });
        }
      }, 1500);
    } else {
      // Clear clock timer when not in gameplay
      if (clockTimerRef.current) {
        clearInterval(clockTimerRef.current);
        clockTimerRef.current = null;
      }
    }

    // Cleanup on unmount or phase change
    return () => {
      if (clockTimerRef.current) {
        clearInterval(clockTimerRef.current);
        clockTimerRef.current = null;
      }
    };
  }, [phase]);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission?.granted]);

  // Wave phase countdown timer
  useEffect(() => {
    let timeoutId;
    if (phase === "wave") {
      setWaveCountdown(5);

      const availablePoses = poseStock.filter((p) => p !== currentPose);
      const newPose =
        availablePoses.length > 0
          ? availablePoses[Math.floor(Math.random() * availablePoses.length)]
          : poseStock[Math.floor(Math.random() * poseStock.length)];
      setCurrentPose(newPose);
      setPoseIndex(0);
      lastScoredPoseRef.current = { poseIndex: -1, timestamp: 0 };

      const countdownInterval = setInterval(() => {
        setWaveCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      timeoutId = setTimeout(() => {
        setPoseStack((prev) => [...prev, newPose]);
        setPhase("gameplay");
        setTimeLeft(5);
        setGameplayStartTime(Date.now());
        clearInterval(countdownInterval);
      }, 5000);

      return () => {
        clearTimeout(timeoutId);
        clearInterval(countdownInterval);
      };
    }
  }, [phase]);

  // Fixed game timer
  useEffect(() => {
    if (phase === "gameplay") {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }

      gameTimerRef.current = setInterval(() => {
        if (
          !isPausedRef.current &&
          !isSettingsRef.current &&
          phaseRef.current === "gameplay"
        ) {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              setPhase("gameover");
              saveUserScore(score);
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1500);
    } else {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
        gameTimerRef.current = null;
      }
    }

    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
        gameTimerRef.current = null;
      }
    };
  }, [phase]);

  // Improved capture timer with better error handling
  useEffect(() => {
    if (phase === "gameplay") {
      if (captureTimerRef.current) {
        clearInterval(captureTimerRef.current);
      }

      captureTimerRef.current = setInterval(() => {
        if (
          phaseRef.current === "gameplay" &&
          !isPausedRef.current &&
          !isSettingsRef.current &&
          timeLeftRef.current > 0 &&
          isCameraMounted && // Check if camera is mounted
          isCameraReady
        ) {
          captureAndSendPose();
        }
      } , 100);
    } else {
      if (captureTimerRef.current) {
        clearInterval(captureTimerRef.current);
        captureTimerRef.current = null;
      }
    }

    return () => {
      if (captureTimerRef.current) {
        clearInterval(captureTimerRef.current);
        captureTimerRef.current = null;
      }
      setIsProcessingPose(false);
    };
  }, [phase, isCameraMounted, isCameraReady]);

  // Improved captureAndSendPose with better error handling and camera state checks
  const captureAndSendPose = useCallback(async () => {
    // Enhanced validation checks
    if (
      isProcessingPose ||
      !cameraRef.current ||
      !isCameraReady ||
      !isCameraMounted ||
      phase !== "gameplay" ||
      isPausedRef.current ||
      isSettingsRef.current
    ) {
      return;
    }

    if (gameplayStartTime && Date.now() - gameplayStartTime < 1000) return;

    try {
      setIsProcessingPose(true);

      // Double-check camera state before taking photo
      if (!cameraRef.current || !isCameraMounted) {
        console.warn("Camera not available for photo capture");
        return;
      }

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
        exif: false,
        flash: "off",
      });

      // Check if component is still mounted after async operation
      if (!isCameraMounted || phase !== "gameplay") {
        console.warn("Component unmounted during photo capture");
        return;
      }

      console.log("Captured photo URI:", photo.uri);

      const formData = new FormData();
      formData.append("file", {
        uri: photo.uri,
        type: "image/jpeg",
        name: "webcam.jpg",
      });

      const response = await fetch("https://api.ongor.fun/predict/", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      // Check if component is still mounted after API call
      if (!isCameraMounted || phase !== "gameplay") {
        console.warn("Component unmounted during API call");
        return;
      }

      setGestureResult(`Pose: ${data.pose_class} (${data.confidence_score})`);
      setNowPose(data.pose_class);
      setStatus("Pose sent");

      if (
        phaseRef.current === "gameplay" &&
        poseIndexRef.current < poseStackRef.current.length &&
        poseStackRef.current[poseIndexRef.current] === data.pose_class &&
        !(
          lastScoredPoseRef.current.poseIndex === poseIndexRef.current &&
          Date.now() - lastScoredPoseRef.current.timestamp < 2000
        )
      ) {
        lastScoredPoseRef.current = {
          poseIndex: poseIndexRef.current,
          timestamp: Date.now(),
        };

        setScore((prev) => {
          const randomIndex = Math.floor(
            Math.random() * scorePopupParticles.length
          );
          setScorePopupParticle(scorePopupParticles[randomIndex]);
          setShowScorePopup(true);

          Animated.timing(popupOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setTimeout(() => {
              Animated.timing(popupOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }).start(() => {
                setShowScorePopup(false);

                if (phaseRef.current === "gameplay") {
                  if (poseIndexRef.current + 1 >= poseStackRef.current.length) {
                    setPhase("wave");
                  } else {
                    setPoseIndex((prevIndex) => prevIndex + 1);
                    setTimeLeft(5);
                    setClockIndex(0);
                  }
                }
              });
            }, 1000);
          });

          return prev + 10;
        });

        // Save pose image
        try {
          const saveFormData = new FormData();
          saveFormData.append("file", {
            uri: photo.uri,
            type: "image/jpeg",
            name: "correct_pose.jpg",
          });
          saveFormData.append("pose_name", data.pose_class);

          await fetch("https://api.ongor.fun/save_pose_image/", {
            method: "POST",
            body: saveFormData,
          });
        } catch (saveError) {
          console.warn("Failed to save pose image:", saveError);
        }
      }
    } catch (err) {
      // console.error("Error in captureAndSendPose:", err);
      // setStatus("Error sending pose");

      // Reset processing state on error
      setIsProcessingPose(false);
    } finally {
      // Always reset processing state
      setIsProcessingPose(false);
    }
  }, [
    isProcessingPose,
    isCameraReady,
    isCameraMounted,
    phase,
    gameplayStartTime,
    scorePopupParticles,
    popupOpacity,
  ]);

  const resetGame = () => {
    // Clear all timers
    if (clockTimerRef.current) {
      clearInterval(clockTimerRef.current);
      clockTimerRef.current = null;
    }
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
    if (captureTimerRef.current) {
      clearInterval(captureTimerRef.current);
      captureTimerRef.current = null;
    }

    // Reset all states
    setPoseStack([]);
    setPhase("wave");
    setScore(0);
    setPoseIndex(0);
    setScoreSaved(false);
    setNowPose("");
    setGestureResult("");
    setTimeLeft(5);
    setWaveCountdown(5);
    setClockIndex(0);
    setCurrentPose("");
    setShowScorePopup(false);
    setShowStartPopup(false);
    setIsProcessingPose(false);
    setGameplayStartTime(null);
    lastScoredPoseRef.current = { poseIndex: -1, timestamp: 0 };
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      setIsCameraMounted(false); // Mark camera as unmounted
      if (clockTimerRef.current) {
        clearInterval(clockTimerRef.current);
      }
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
      if (captureTimerRef.current) {
        clearInterval(captureTimerRef.current);
      }
    };
  }, []);

  // Handle camera ready state
  const handleCameraReady = useCallback(() => {
    setIsCameraReady(true);
    setIsCameraMounted(true);
    console.log("Camera is ready and mounted");
  }, []);

  // Handle camera mount state changes
  const handleCameraMountError = useCallback(() => {
    console.warn("Camera mount error detected");
    setIsCameraMounted(false);
    setIsCameraReady(false);
  }, []);

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>กำลังโหลด...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>ต้องอนุญาตให้เข้าถึงกล้อง</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>อนุญาต</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ฟังก์ชันบันทึกคะแนนรายวัน
  const saveUserScore = async (score) => {
    const user = auth.currentUser;
    if (!user) return;

    const db = getDatabase();
    const uid = user.uid;
    const today = new Date().toISOString().split("T")[0];
    const scoreListRef = ref(db, `user_scores/${uid}/${today}`);

    const session = {
      score: score,
      email: user.email || "Unknown",
      timestamp: new Date().toISOString(),
    };

    await push(scoreListRef, session);
    console.log("✅ Score saved for", today, ":", session);
  };

  const goBackToHome = () => {
    // หยุดทุก timers ก่อนออกจากหน้า
    setIsCameraMounted(false); // Mark camera as unmounted

    if (clockTimerRef.current) {
      clearInterval(clockTimerRef.current);
      clockTimerRef.current = null;
    }
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
    if (captureTimerRef.current) {
      clearInterval(captureTimerRef.current);
      captureTimerRef.current = null;
    }

    setIsProcessingPose(false);
    setIsPaused(false);
    setIsSettings(false);

    router.push("/(tabs)/");
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="front"
        ref={cameraRef}
        onCameraReady={() => setIsCameraReady(true)}
        flash="off"
        enableTorch={false}
        animateShutter={false}
      />

      {showStartPopup && (
        <Animated.View
          style={{
            position: "absolute",
            top: screenHeight / 2 - 100,
            left: screenWidth / 2 - 100,
            width: 200,
            height: 200,
            justifyContent: "center",
            alignItems: "center",
            opacity: popupOpacity,
            zIndex: 9999,
          }}
        >
          <Image
            source={require("../../assets/workText.png")}
            style={{ width: 600, height: 600 }}
            resizeMode="contain"
          />
        </Animated.View>
      )}

      {showScorePopup && scorePopupParticle && (
        <Animated.View
          style={{
            position: "absolute",
            bottom: -80, // ชิดขอบล่าง
            left: 0, // เริ่มจากซ้ายสุด
            width: screenWidth, // เต็มความกว้างหน้าจอ
            height: screenHeight, // เต็มความสูงหน้าจอ
            justifyContent: "center",
            alignItems: "center",
            opacity: popupOpacity,
            zIndex: 9999,
          }}
        >
          {/* พื้นหลัง */}
          <Image
            source={scorePopupParticle.background}
            style={{
              width: screenWidth,
              height: screenHeight,
              position: "absolute",
            }}
            resizeMode="contain"
          />
          {/* ตัวหนังสือ */}
          <Image
            source={scorePopupParticle.text}
            style={{ width: screenWidth, height: screenHeight }}
            resizeMode="contain"
          />
        </Animated.View>
      )}

      {/* AI Pose Display */}
      {/* <View style={styles.aiPoseDisplay}>
        <Text style={styles.aiPoseText}>
          ตอนนี้ AI เห็น: {nowPose || "..."}
        </Text>
      </View> */}

      {/* Top Controls */}
      {/* <View style={styles.topControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setIsPaused(true)}
        >
          <Ionicons name="pause" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.gameInfo}>
          <View style={styles.infoItem}>
            <Ionicons name="time" size={20} color="white" />
            <Text style={styles.infoText}>{timeLeft}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="trophy" size={20} color="white" />
            <Text style={styles.infoText}>Wave {poseStack.length + 1}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="person" size={20} color="white" />
            <Text style={styles.infoText}>
              {poseIndex + 1}/{poseStack.length}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setIsSettings(true)}
        >
          <Ionicons name="settings" size={24} color="white" />
        </TouchableOpacity>
      </View> */}

      {/* Score Display */}
      {/* <View style={styles.scoreDisplay}>
        <Text style={styles.scoreText}>{score}</Text>
        {showScorePopup && <Text style={styles.scorePopupText}>+10</Text>}
      </View> */}
      {(phase === "wave" || phase === "gameplay") && (
        <Image
          source={require("../../assets/Ongor_Normal.png")}
          style={{
            position: "absolute",
            bottom: 20,
            left: -20,
            width: 160,
            height: 160,
            zIndex: 99,
          }}
        />
      )}

      {/* Wave Phase */}
      {phase === "wave" && (
        <View style={styles.waveOverlay}>
          {/* ด่าน */}
          <View style={styles.waveHeader}>
            <Image
              source={require("../../assets/textWave.png")} // เปลี่ยน path ให้ตรงกับรูปคุณ
              style={styles.stageLabelImage}
              resizeMode="contain"
            />
            <View style={{ position: "relative" }}>
              {/* Stroke Layer (รอบๆ ข้อความ) */}
              <Text
                style={[
                  styles.waveStageNumberText,
                  styles.strokeB,
                  { position: "absolute", left: -5, top: 0 },
                ]}
              >
                {poseStack.length + 1}
              </Text>
              <Text
                style={[
                  styles.waveStageNumberText,
                  styles.strokeB,
                  { position: "absolute", left: 5, top: 0 },
                ]}
              >
                {poseStack.length + 1}
              </Text>
              <Text
                style={[
                  styles.waveStageNumberText,
                  styles.strokeB,
                  { position: "absolute", left: 0, top: -5 },
                ]}
              >
                {poseStack.length + 1}
              </Text>
              <Text
                style={[
                  styles.waveStageNumberText,
                  styles.strokeB,
                  { position: "absolute", left: 0, top: 5 },
                ]}
              >
                {poseStack.length + 1}
              </Text>

              {/* Stroke มุมทแยงเพิ่มความหนา */}
              <Text
                style={[
                  styles.waveStageNumberText,
                  styles.strokeB,
                  { position: "absolute", left: -4, top: -4 },
                ]}
              >
                {poseStack.length + 1}
              </Text>
              <Text
                style={[
                  styles.waveStageNumberText,
                  styles.strokeB,
                  { position: "absolute", left: 4, top: -4 },
                ]}
              >
                {poseStack.length + 1}
              </Text>
              <Text
                style={[
                  styles.waveStageNumberText,
                  styles.strokeB,
                  { position: "absolute", left: -4, top: 4 },
                ]}
              >
                {poseStack.length + 1}
              </Text>
              <Text
                style={[
                  styles.waveStageNumberText,
                  styles.strokeB,
                  { position: "absolute", left: 4, top: 4 },
                ]}
              >
                {poseStack.length + 1}
              </Text>

              {/* ตัวหนังสือจริง (สีขาว) */}
              <Text style={styles.waveStageNumberText}>
                {poseStack.length + 1}
              </Text>
            </View>
          </View>

          {/* โซนกลาง - สมองและท่าทาง */}
          <View style={styles.waveCenterContainer}>
            {/* สมอง */}
            <View style={styles.brainContainer}></View>

            {/* ท่าทาง */}
            <View style={styles.poseContainer}>
              <View style={{ position: "relative" }}>
                <Image
                  source={poseImageMap[currentPose]}
                  style={styles.poseImage}
                  resizeMode="contain"
                />

                {/* กรอบหลังเลขท่าทาง */}
                <Image
                  source={require("../../assets/GesturNumber.png")} // เปลี่ยน path ให้ตรงกับรูปกรอบเลขคุณ
                  style={styles.poseNumberFrame}
                  resizeMode="contain"
                />

                {/* เลขท่าทางมี stroke */}
                <View style={styles.poseNumberWrapper}>
                  {/* Stroke รอบตัวเลข */}
                  <Text
                    style={[
                      styles.poseNumberText,
                      styles.strokeB,
                      { position: "absolute", left: -2, top: 0 },
                    ]}
                  >
                    {poseIndex + 1}
                  </Text>
                  <Text
                    style={[
                      styles.poseNumberText,
                      styles.strokeB,
                      { position: "absolute", left: 2, top: 0 },
                    ]}
                  >
                    {poseIndex + 1}
                  </Text>
                  <Text
                    style={[
                      styles.poseNumberText,
                      styles.strokeB,
                      { position: "absolute", left: 0, top: -2 },
                    ]}
                  >
                    {poseIndex + 1}
                  </Text>
                  <Text
                    style={[
                      styles.poseNumberText,
                      styles.strokeB,
                      { position: "absolute", left: 0, top: 2 },
                    ]}
                  >
                    {poseIndex + 1}
                  </Text>
                  {/* ตัวเลขจริง */}
                  <Text style={styles.poseNumberText}>{poseIndex + 1}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ตัวนับถอยหลัง */}
          <View style={styles.countdownContainer}>
            {/* Stroke texts รอบ ๆ */}
            <Text
              style={[
                styles.countdownText,
                styles.stroke,
                { left: -4, top: 0, position: "absolute" },
              ]}
            >
              {waveCountdown}
            </Text>
            <Text
              style={[
                styles.countdownText,
                styles.stroke,
                { left: 4, top: 0, position: "absolute" },
              ]}
            >
              {waveCountdown}
            </Text>
            <Text
              style={[
                styles.countdownText,
                styles.stroke,
                { left: 0, top: -4, position: "absolute" },
              ]}
            >
              {waveCountdown}
            </Text>
            <Text
              style={[
                styles.countdownText,
                styles.stroke,
                { left: 0, top: 4, position: "absolute" },
              ]}
            >
              {waveCountdown}
            </Text>
            {/* เพิ่มมุมทแยงให้ดูหนาขึ้น */}
            <Text
              style={[
                styles.countdownText,
                styles.stroke,
                { left: -3, top: -3, position: "absolute" },
              ]}
            >
              {waveCountdown}
            </Text>
            <Text
              style={[
                styles.countdownText,
                styles.stroke,
                { left: 3, top: -3, position: "absolute" },
              ]}
            >
              {waveCountdown}
            </Text>
            <Text
              style={[
                styles.countdownText,
                styles.stroke,
                { left: -3, top: 3, position: "absolute" },
              ]}
            >
              {waveCountdown}
            </Text>
            <Text
              style={[
                styles.countdownText,
                styles.stroke,
                { left: 3, top: 3, position: "absolute" },
              ]}
            >
              {waveCountdown}
            </Text>

            {/* ข้อความจริง */}
            <Text style={styles.countdownText}>{waveCountdown}</Text>
          </View>
        </View>
      )}

      {/* Gameplay Phase */}
      {phase === "gameplay" && (
        <>
          {/* คะแนนด้านบน */}
          <View style={{ position: "absolute", top: 50, alignSelf: "center" }}>
            <View style={{ position: "relative" }}>
              {/* Stroke Layer (รอบๆ ตัวอักษร) */}
              <Text
                style={[
                  styles.scoreText,
                  styles.stroke,
                  { left: -2, top: 0, position: "absolute" },
                ]}
              >
                {score}
              </Text>
              <Text
                style={[
                  styles.scoreText,
                  styles.stroke,
                  { left: 2, top: 0, position: "absolute" },
                ]}
              >
                {score}
              </Text>
              <Text
                style={[
                  styles.scoreText,
                  styles.stroke,
                  { left: 0, top: -2, position: "absolute" },
                ]}
              >
                {score}
              </Text>
              <Text
                style={[
                  styles.scoreText,
                  styles.stroke,
                  { left: 0, top: 2, position: "absolute" },
                ]}
              >
                {score}
              </Text>

              {/* Stroke มุมทแยง (ทำให้หนาขึ้นอีก) */}
              <Text
                style={[
                  styles.scoreText,
                  styles.stroke,
                  { left: -2, top: -2, position: "absolute" },
                ]}
              >
                {score}
              </Text>
              <Text
                style={[
                  styles.scoreText,
                  styles.stroke,
                  { left: 2, top: -2, position: "absolute" },
                ]}
              >
                {score}
              </Text>
              <Text
                style={[
                  styles.scoreText,
                  styles.stroke,
                  { left: -2, top: 2, position: "absolute" },
                ]}
              >
                {score}
              </Text>
              <Text
                style={[
                  styles.scoreText,
                  styles.stroke,
                  { left: 2, top: 2, position: "absolute" },
                ]}
              >
                {score}
              </Text>

              {/* ตัวหนังสือจริง (สีขาว) */}
              <Text style={styles.scoreText}>{score}</Text>
            </View>
          </View>

          {/* นาฬิกาด้านล่าง */}
          <View
            style={{
              position: "absolute",
              bottom: 70, // ขยับขึ้น-ลง (ค่ามาก = สูงขึ้น, ค่าน้อย = ต่ำลง)
              alignSelf: "center", // ให้อยู่กึ่งกลางแนวนอน
            }}
          >
            <Image
              source={clockImages[clockIndex]}
              style={{ width: 250, height: 250 }}
              resizeMode="contain"
            />
          </View>
        </>
      )}

      {/* Game Over Phase */}
      {phase === "gameover" && (
        <View style={styles.gameOverOverlay}>
          {/* รูปคำว่า หมดเวลา */}
          <Image
            source={require("../../assets/gameOver/overTitle.png")}
            style={styles.gameOverTitleImage}
            resizeMode="contain"
          />

          {/* กรอบคะแนน + ข้อความในกรอบ */}
          <View style={styles.scoreContainer}>
            <Image
              source={require("../../assets/gameOver/score.png")}
              style={styles.scoreFrameImage}
              resizeMode="contain"
            />
            <View style={styles.scoreTextWrapper}>
              <Text style={styles.scoreNumber}>{score}</Text>
            </View>
          </View>

          {/* ปุ่มเล่นใหม่ */}
          <TouchableOpacity onPress={resetGame}>
            <Image
              source={require("../../assets/gameOver/tryAgain.png")}
              style={styles.buttonImage}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* ปุ่มกลับหน้าเมนู */}
          <TouchableOpacity onPress={goBackToHome}>
            <Image
              source={require("../../assets/gameOver/backtohome.png")}
              style={styles.buttonImage}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* รูปล่างสุดติดขอบล่างจอ */}
          <Image
            source={require("../../assets/gameOver/ongorText.png")}
            style={styles.bottomDecor}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Bottom Info */}
      {/* <View style={styles.bottomInfo}>
        <Text style={styles.gestureText}>{gestureResult}</Text>
        <Text style={styles.statusText}>{status}</Text>
      </View> */}

      {/* Pause Modal */}
      <Modal visible={isPaused} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>หยุดเกม</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => router.push("/(tabs)/")}
            >
              <Text style={styles.modalButtonText}>หน้าหลัก</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setIsPaused(false)}
            >
              <Text style={styles.modalButtonText}>เล่นเกมต่อ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                resetGame();
                setIsPaused(false);
              }}
            >
              <Text style={styles.modalButtonText}>เริ่มเกมใหม่</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonDanger]}
              onPress={() => {
                setPhase("gameover");
                setIsPaused(false);
              }}
            >
              <Text style={styles.modalButtonText}>ยอมแพ้</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={isSettings} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>ตั้งค่าเกม</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => router.push("/(tabs)/")}
            >
              <Text style={styles.modalButtonText}>หน้าหลัก</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setIsSettings(false)}
            >
              <Text style={styles.modalButtonText}>ปิด</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingText: {
    color: "white",
    fontSize: 18,
  },
  permissionText: {
    color: "white",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontFamily: "KanitB",
  },

  // สไตล์ใหม่สำหรับ Wave Phase
  waveOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 50,
  },
  waveHeader: {
    flexDirection: "row", // วางแนวนอน
    alignItems: "center",
    justifyContent: "center",
  },
  waveStageText: {
    fontSize: 60,
    color: "#4A90E2",
    fontFamily: "kanitB",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  waveCenterContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 20,
  },
  brainContainer: {
    marginRight: 30,
  },
  brainImage: {
    width: 120,
    height: 120,
  },
  poseContainer: {
    alignItems: "center",
  },
  poseImage: {
    width: 300,
    height: 300,
    position: "relative",
    left: -16,
    top: 10,
  },
  poseNameText: {
    fontSize: 32,
    color: "#FFFFFF",
    fontFamily: "kanitB",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  countdownContainer: {
    alignItems: "center",
    marginBottom: 50,
  },
  countdownText: {
    fontSize: 120,
    fontFamily: "starBorn",
    color: "#4A90E2",
    // ไม่ต้องใส่ textShadow เพราะเราใช้การซ้อนแทน
  },

  // สไตล์เดิมที่เหลือ
  gameplayHUD: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 15,
    margin: 20,
    borderRadius: 12,
  },
  currentPoseContainer: {
    alignItems: "center",
  },
  currentPoseImage: {
    width: 120,
    height: 120,
    marginBottom: 10,
  },
  currentPoseText: {
    color: "#FFD600",
    fontSize: 18,
    fontFamily: "kanitB",
    textAlign: "center",
  },
  progressText: {
    color: "white",
    fontSize: 16,
    marginTop: 5,
  },
  gameOverTitle: {
    color: "#ff6b6b",
    fontSize: 36,
    marginBottom: 8,
    fontFamily: "kanitB",
  },
  gameOverStats: {
    color: "white",
    fontSize: 20,
    marginBottom: 4,
  },
  restartButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  restartButtonText: {
    color: "white",
    fontSize: 18,
    fontFamily: "kanitB",
  },
  bottomInfo: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 8,
    borderRadius: 8,
  },
  gestureText: {
    color: "white",
    fontSize: 14,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "80%",
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 28,
    fontFamily: "kanitB",
    textAlign: "center",
    marginBottom: 20,
  },
  modalButton: {
    borderWidth: 2,
    borderColor: "#2563eb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  modalButtonDanger: {
    borderColor: "#dc2626",
  },
  modalButtonText: {
    color: "#2563eb",
    fontSize: 16,
    fontFamily: "kanitB",
  },
  stroke: {
    color: "white",
  },
  stageLabelImage: {
    width: 200, // ปรับตามขนาดภาพ
    height: 140,
  },
  waveStageNumberText: {
    fontSize: 100,
    color: "#fff", // ปรับสีเลขด่านได้
    marginTop: 25,
    fontFamily: "MaliB",
  },
  strokeB: {
    color: "#4A90E2", // สี stroke (น้ำเงิน)
  },
  poseNumberText: {
    position: "absolute",
    top: 0,
    left: 0,
    fontSize: 24,
    color: "white",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  poseNumberFrame: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 50, // ปรับขนาดกรอบตามต้องการ
    height: 50,
  },

  poseNumberWrapper: {
    position: "absolute",
    top: 5,
    left: 13,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },

  scoreText: {
    color: "white",
    fontSize: 114,
    fontFamily: "MaliB",
  },

  gameOverContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff", // หรือพื้นหลังอื่นๆ
  },

  gameOverTitleImage: {
    width: 400,
    height: 220, // ลดขนาดลง
    marginBottom: 10, // เว้นระยะพอดี
  },

  scoreFrameImage: {
    width: "100%",
    height: "100%",
    marginTop: -10,
  },

  scoreTextWrapper: {
    position: "absolute",
    top: "20%", // ปรับตำแหน่งให้ "คะแนน" ขึ้นสูงขึ้น
    left: 0,
    right: 0,
    alignItems: "center",
  },

  scoreTextt: {
    fontSize: 18,
    color: "#333",
    marginBottom: 10,
  },

  scoreNumber: {
    fontSize: 40,
    color: "#fff",
    top: "120%",
  },

  buttonImage: {
    width: 250,
    height: 70,
    marginVertical: 10,
    zIndex: 999999,
    top: -50,
  },

  bottomDecor: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: "120",
    zIndex: 99999,
  },
  gameOverOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10, // ทับกล้องแน่นอน
  },
  scoreContainer: {
    width: "80%",
    height: 200,
    top: -40,
    position: "relative",
    marginVertical: 0, // ไม่ต้องเว้นเยอะ
  },
});
