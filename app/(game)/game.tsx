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
  AppState,
} from "react-native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

/** ====== Tunables (ปรับได้) ====== */
const CAPTURE_INTERVAL_MS = 150; // ✅ ตามที่ขอ
const PREDICTION_BUFFER = 7; // เก็บผลทำนายล่าสุดกี่ตัว
const STABLE_WINDOW_MS = 600; // ยอมให้เสถียรภายในกี่ ms ล่าสุด
const STABLE_MIN_COUNT = 3; // ต้องมีผลทำนาย class เดียวกันอย่างน้อยกี่ครั้ง
const STABLE_MIN_AVG_CONF = 0.6; // ค่าเฉลี่ยความมั่นใจขั้นต่ำ
const INFLIGHT_TIMEOUT_MS = 2200; // timeout ต่อการเรียก API 1 ครั้ง
const SCORE_COOLDOWN_MS = 2000; // กันกดคะแนนซ้ำ

export default function GameScreen() {
  const [scorePopupParticle, setScorePopupParticle] = useState<any>(null);
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const [clockIndex, setClockIndex] = useState(0);
  const [phase, setPhase] = useState<"wave" | "gameplay" | "gameover">("wave");
  const [timeLeft, setTimeLeft] = useState(5);
  const [score, setScore] = useState(0);
  const [poseStack, setPoseStack] = useState<string[]>([]);
  const [currentPose, setCurrentPose] = useState<string>("");
  const [poseIndex, setPoseIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isSettings, setIsSettings] = useState(false);
  const [nowPose, setNowPose] = useState("");
  const [gestureResult, setGestureResult] = useState("");
  const [status, setStatus] = useState("");
  const [gameplayStartTime, setGameplayStartTime] = useState<number | null>(
    null
  );
  const [showScorePopup, setShowScorePopup] = useState(false);

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCameraMounted, setIsCameraMounted] = useState(true);

  const [scoreSaved, setScoreSaved] = useState(false);
  const [showStartPopup, setShowStartPopup] = useState(false);
  const [waveCountdown, setWaveCountdown] = useState(5);

  /** ====== Refs/Timers/Semaphores ====== */
  const isMountedRef = useRef(true);
  const inFlightRef = useRef<null | {
    startedAt: number;
    abort: AbortController;
  }>(null);
  const lastTickRef = useRef(0);
  const lastCaptureAtRef = useRef(0);
  const lastStablePoseRef = useRef<string>("");
  const lastScoredPoseRef = useRef<{ poseIndex: number; timestamp: number }>({
    poseIndex: -1,
    timestamp: 0,
  });

  const captureLoopCancelRef = useRef<null | (() => void)>(null);
  const clockTimerRef = useRef<any>(null);
  const gameTimerRef = useRef<any>(null);

  const phaseRef = useRef(phase);
  const isPausedRef = useRef(isPaused);
  const isSettingsRef = useRef(isSettings);
  const timeLeftRef = useRef(timeLeft);
  const poseStackRef = useRef(poseStack);
  const poseIndexRef = useRef(poseIndex);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  useEffect(() => {
    isSettingsRef.current = isSettings;
  }, [isSettings]);
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);
  useEffect(() => {
    poseStackRef.current = poseStack;
  }, [poseStack]);
  useEffect(() => {
    poseIndexRef.current = poseIndex;
  }, [poseIndex]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

  const poseImageMap: Record<string, any> = {
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

  /** ====== Prediction Smoother ====== */
  type PredItem = { cls: string; conf: number; t: number };
  const predBufRef = useRef<PredItem[]>([]);

  const pushPrediction = (cls: string, conf: number) => {
    const t = Date.now();
    predBufRef.current.push({ cls, conf, t });
    // ตัดของเก่าออกให้เหลือแต่ในกรอบเวลา + ล่าสุดไม่เกิน PREDICTION_BUFFER
    const cutoff = t - STABLE_WINDOW_MS;
    predBufRef.current = predBufRef.current
      .filter((p) => p.t >= cutoff)
      .slice(-PREDICTION_BUFFER);
  };

  const getStablePose = (): { stable?: string; avgConf?: number } => {
    const buf = predBufRef.current;
    if (buf.length === 0) return {};
    // นับถ่วงน้ำหนักความมั่นใจ
    const byClass: Record<string, { sum: number; cnt: number }> = {};
    for (const p of buf) {
      if (!byClass[p.cls]) byClass[p.cls] = { sum: 0, cnt: 0 };
      byClass[p.cls].sum += p.conf;
      byClass[p.cls].cnt += 1;
    }
    // หา class ที่มี count สูงสุด (tie-break ด้วย avg conf)
    let best = "";
    let bestCnt = -1;
    let bestAvg = 0;
    Object.entries(byClass).forEach(([cls, s]) => {
      const avg = s.sum / s.cnt;
      if (s.cnt > bestCnt || (s.cnt === bestCnt && avg > bestAvg)) {
        best = cls;
        bestCnt = s.cnt;
        bestAvg = avg;
      }
    });
    if (bestCnt >= STABLE_MIN_COUNT && bestAvg >= STABLE_MIN_AVG_CONF) {
      return { stable: best, avgConf: bestAvg };
    }
    return {};
  };

  /** ====== App focus: pause capture when background ====== */
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") {
        // หยุด loop ชั่วคราว
        stopCaptureLoop();
      } else {
        if (
          phaseRef.current === "gameplay" &&
          !isPausedRef.current &&
          !isSettingsRef.current
        ) {
          startCaptureLoop();
        }
      }
    });
    return () => sub.remove();
  }, []);

  /** ====== Permission ====== */
  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission?.granted]);

  /** ====== Wave phase ====== */
  useEffect(() => {
    if (phase !== "wave") return;
    setWaveCountdown(5);
    // เลือกท่าถัดไป
    const available = poseStock.filter((p) => p !== currentPose);
    const nextPose = (available.length ? available : poseStock)[
      Math.floor(
        Math.random() * (available.length ? available.length : poseStock.length)
      )
    ];
    setCurrentPose(nextPose);
    setPoseIndex(0);
    predBufRef.current = [];
    lastStablePoseRef.current = "";

    // countdown 5s
    const id = setInterval(() => {
      setWaveCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const to = setTimeout(() => {
      setPoseStack((prev) => [...prev, nextPose]);
      setPhase("gameplay");
      setTimeLeft(5);
      setGameplayStartTime(Date.now());
    }, 5000);

    return () => {
      clearInterval(id);
      clearTimeout(to);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /** ====== HUD Clock (1500ms) ====== */
  useEffect(() => {
    if (phase !== "gameplay") {
      clearInterval(clockTimerRef.current);
      return;
    }
    setClockIndex(0);
    setShowStartPopup(true);
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
          if (isMountedRef.current) setShowStartPopup(false);
        });
      }, 1000);
    });
    clockTimerRef.current = setInterval(() => {
      if (
        !isPausedRef.current &&
        !isSettingsRef.current &&
        phaseRef.current === "gameplay"
      ) {
        setClockIndex((i) => (i + 1) % 5);
      }
    }, 1500);
    return () => {
      clearInterval(clockTimerRef.current);
    };
  }, [phase]);

  /** ====== Gameplay timer (1500ms) ====== */
  useEffect(() => {
    if (phase !== "gameplay") {
      clearInterval(gameTimerRef.current);
      return;
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
    return () => {
      clearInterval(gameTimerRef.current);
    };
  }, [phase, score]);

  /** ====== Camera Ready ====== */
  const handleCameraReady = useCallback(() => {
    setIsCameraReady(true);
    setIsCameraMounted(true);
  }, []);

  const handleCameraMountError = useCallback(() => {
    setIsCameraMounted(false);
    setIsCameraReady(false);
  }, []);

  /** ====== Safe Fetch with timeout ====== */
  const fetchWithTimeout = async (
    url: string,
    opts: any,
    timeoutMs: number
  ) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(timer);
    }
  };

  /** ====== Capture Loop (throttled) ====== */
  const loopOnce = async () => {
    if (!isMountedRef.current) return;
    if (!cameraRef.current || !isCameraReady || !isCameraMounted) return;
    if (
      phaseRef.current !== "gameplay" ||
      isPausedRef.current ||
      isSettingsRef.current
    )
      return;

    // throttle by CAPTURE_INTERVAL_MS
    const now = Date.now();
    if (now - lastCaptureAtRef.current < CAPTURE_INTERVAL_MS) return;
    if (inFlightRef.current) {
      // watchdog: ถ้าค้างนานเกิน timeout ให้ยกเลิก
      const elapsed = now - inFlightRef.current.startedAt;
      if (elapsed > INFLIGHT_TIMEOUT_MS + 300) {
        try {
          inFlightRef.current.abort.abort();
        } catch {}
        inFlightRef.current = null;
      } else {
        return; // ยังมีงานค้างอยู่
      }
    }

    lastCaptureAtRef.current = now;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
        exif: false,
        flash: "off",
      });

      if (!isMountedRef.current || phaseRef.current !== "gameplay") return;

      const fd: any = new FormData();
      fd.append("file", {
        uri: photo.uri,
        type: "image/jpeg",
        name: "webcam.jpg",
      });

      const abort = new AbortController();
      inFlightRef.current = { startedAt: Date.now(), abort };

      const resp = await fetchWithTimeout(
        "https://api.ongor.fun/predict/",
        {
          method: "POST",
          body: fd,
          signal: abort.signal,
        },
        INFLIGHT_TIMEOUT_MS
      );

      inFlightRef.current = null;

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      if (!isMountedRef.current || phaseRef.current !== "gameplay") return;

      const cls: string = data.pose_class;
      const conf: number =
        typeof data.confidence_score === "number"
          ? data.confidence_score
          : Number(data.confidence_score || 0);

      setGestureResult(`Pose: ${cls} (${conf.toFixed(2)})`);
      setNowPose(cls);
      setStatus("Pose sent");

      // smoothing
      pushPrediction(cls, conf);
      const { stable, avgConf } = getStablePose();
      if (stable && stable !== lastStablePoseRef.current) {
        lastStablePoseRef.current = stable;
      }

      // check score against current target
      if (
        stable &&
        poseIndexRef.current < poseStackRef.current.length &&
        poseStackRef.current[poseIndexRef.current] === stable &&
        !(
          lastScoredPoseRef.current.poseIndex === poseIndexRef.current &&
          Date.now() - lastScoredPoseRef.current.timestamp < SCORE_COOLDOWN_MS
        )
      ) {
        lastScoredPoseRef.current = {
          poseIndex: poseIndexRef.current,
          timestamp: Date.now(),
        };

        // popup + score update
        setScore((prev) => {
          const idx = Math.floor(Math.random() * scorePopupParticles.length);
          setScorePopupParticle(scorePopupParticles[idx]);
          setShowScorePopup(true);
          Animated.timing(popupOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setTimeout(() => {
              Animated.timing(popupOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }).start(() => {
                if (!isMountedRef.current) return;
                setShowScorePopup(false);
                if (phaseRef.current === "gameplay") {
                  if (poseIndexRef.current + 1 >= poseStackRef.current.length) {
                    setPhase("wave");
                  } else {
                    setPoseIndex((p) => p + 1);
                    setTimeLeft(5);
                    setClockIndex(0);
                    predBufRef.current = [];
                    lastStablePoseRef.current = "";
                  }
                }
              });
            }, 800);
          });
          return prev + 10;
        });

        // fire-and-forget save image (ไม่ block loop)
        (async () => {
          try {
            const saveFd: any = new FormData();
            saveFd.append("file", {
              uri: photo.uri,
              type: "image/jpeg",
              name: "correct_pose.jpg",
            });
            saveFd.append("pose_name", stable);
            await fetchWithTimeout(
              "https://api.ongor.fun/save_pose_image/",
              { method: "POST", body: saveFd },
              2000
            );
          } catch {}
        })();
      }
    } catch (e) {
      // เงียบและรีเซ็ต inFlight
      inFlightRef.current = null;
    }
  };

  const startCaptureLoop = () => {
    if (captureLoopCancelRef.current) return; // already running
    let canceled = false;

    const tick = () => {
      if (canceled || !isMountedRef.current) return;
      const now = Date.now();
      // คุมเฟรมด้วย rAF + time budget
      if (now - lastTickRef.current >= 8) {
        //  ~120fps budget
        lastTickRef.current = now;
        loopOnce();
      }
      // ใช้ rAF ให้ลื่นบน UI thread
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    captureLoopCancelRef.current = () => {
      canceled = true;
      captureLoopCancelRef.current = null;
    };
  };

  const stopCaptureLoop = () => {
    if (captureLoopCancelRef.current) captureLoopCancelRef.current();
    captureLoopCancelRef.current = null;
    // ยกเลิกงานค้าง
    if (inFlightRef.current) {
      try {
        inFlightRef.current.abort.abort();
      } catch {}
      inFlightRef.current = null;
    }
  };

  /** ====== Phase → manage loop ====== */
  useEffect(() => {
    if (
      phase === "gameplay" &&
      isCameraReady &&
      isCameraMounted &&
      !isPaused &&
      !isSettings
    ) {
      startCaptureLoop();
    } else {
      stopCaptureLoop();
    }
    return () => {
      /* no-op, cleanup handled elsewhere */
    };
  }, [phase, isCameraReady, isCameraMounted, isPaused, isSettings]);

  /** ====== Leave page cleanup ====== */
  useEffect(() => {
    return () => {
      setIsCameraMounted(false);
      clearInterval(clockTimerRef.current);
      clearInterval(gameTimerRef.current);
      stopCaptureLoop();
    };
  }, []);

  /** ====== Save score ====== */
  const saveUserScore = async (scoreVal: number) => {
    if (scoreSaved) return;
    const user = auth.currentUser;
    if (!user) return;
    try {
      const db = getDatabase();
      const uid = user.uid;
      const today = new Date().toISOString().split("T")[0];
      const scoreListRef = ref(db, `user_scores/${uid}/${today}`);
      const session = {
        score: scoreVal,
        email: user.email || "Unknown",
        timestamp: new Date().toISOString(),
      };
      await push(scoreListRef, session);
      setScoreSaved(true);
      console.log("✅ Score saved", session);
    } catch (e) {}
  };

  /** ====== Reset / Back ====== */
  const resetGame = () => {
    clearInterval(clockTimerRef.current);
    clearInterval(gameTimerRef.current);
    stopCaptureLoop();

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
    setGameplayStartTime(null);
    predBufRef.current = [];
    lastStablePoseRef.current = "";
    lastScoredPoseRef.current = { poseIndex: -1, timestamp: 0 };
  };

  const goBackToHome = () => {
    setIsCameraMounted(false);
    clearInterval(clockTimerRef.current);
    clearInterval(gameTimerRef.current);
    stopCaptureLoop();
    setIsPaused(false);
    setIsSettings(false);
    router.push("/(tabs)/");
  };

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

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="front"
        ref={cameraRef}
        onCameraReady={handleCameraReady}
        onMountError={handleCameraMountError}
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
            bottom: -80,
            left: 0,
            width: screenWidth,
            height: screenHeight,
            justifyContent: "center",
            alignItems: "center",
            opacity: popupOpacity,
            zIndex: 9999,
          }}
        >
          <Image
            source={scorePopupParticle.background}
            style={{
              width: screenWidth,
              height: screenHeight,
              position: "absolute",
            }}
            resizeMode="contain"
          />
          <Image
            source={scorePopupParticle.text}
            style={{ width: screenWidth, height: screenHeight }}
            resizeMode="contain"
          />
        </Animated.View>
      )}

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

      {phase === "wave" && (
        <View style={styles.waveOverlay}>
          <View className="waveHeader" style={styles.waveHeader}>
            <Image
              source={require("../../assets/textWave.png")}
              style={styles.stageLabelImage}
              resizeMode="contain"
            />
            <View style={{ position: "relative" }}>
              {[-5, 5, 0, 0, -4, 4, -4, 4].map((_, i) => (
                <Text
                  key={i}
                  style={[
                    styles.waveStageNumberText,
                    styles.strokeB,
                    {
                      position: "absolute",
                      left: [-5, 5, 0, 0, -4, 4, -4, 4][i],
                      top: [0, 0, -5, 5, -4, -4, 4, 4][i],
                    },
                  ]}
                >
                  {poseStack.length + 1}
                </Text>
              ))}
              <Text style={styles.waveStageNumberText}>
                {poseStack.length + 1}
              </Text>
            </View>
          </View>

          <View style={styles.waveCenterContainer}>
            <View style={styles.brainContainer} />
            <View style={styles.poseContainer}>
              <View style={{ position: "relative" }}>
                {!!currentPose && (
                  <Image
                    source={poseImageMap[currentPose]}
                    style={styles.poseImage}
                    resizeMode="contain"
                  />
                )}

                <Image
                  source={require("../../assets/GesturNumber.png")}
                  style={styles.poseNumberFrame}
                  resizeMode="contain"
                />
                <View style={styles.poseNumberWrapper}>
                  {[-2, 2, 0, 0].map((_, i) => (
                    <Text
                      key={i}
                      style={[
                        styles.poseNumberText,
                        styles.strokeB,
                        {
                          position: "absolute",
                          left: [-2, 2, 0, 0][i],
                          top: [0, 0, -2, 2][i],
                        },
                      ]}
                    >
                      {poseIndex + 1}
                    </Text>
                  ))}
                  <Text style={styles.poseNumberText}>{poseIndex + 1}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.countdownContainer}>
            {[-4, 4, 0, 0, -3, 3, -3, 3].map((_, i) => (
              <Text
                key={i}
                style={[
                  styles.countdownText,
                  styles.stroke,
                  {
                    position: "absolute",
                    left: [-4, 4, 0, 0, -3, 3, -3, 3][i],
                    top: [0, 0, -4, 4, -3, -3, 3, 3][i],
                  },
                ]}
              >
                {waveCountdown}
              </Text>
            ))}
            <Text style={styles.countdownText}>{waveCountdown}</Text>
          </View>
        </View>
      )}

      {phase === "gameplay" && (
        <>
          <View style={{ position: "absolute", top: 50, alignSelf: "center" }}>
            {[
              [-2, 0],
              [2, 0],
              [0, -2],
              [0, 2],
              [-2, -2],
              [2, -2],
              [-2, 2],
              [2, 2],
            ].map((o, i) => (
              <Text
                key={i}
                style={[
                  styles.scoreText,
                  styles.stroke,
                  { position: "absolute", left: o[0], top: o[1] },
                ]}
              >
                {score}
              </Text>
            ))}
            <Text style={styles.scoreText}>{score}</Text>
          </View>

          <View
            style={{ position: "absolute", bottom: 70, alignSelf: "center" }}
          >
            <Image
              source={clockImages[clockIndex]}
              style={{ width: 250, height: 250 }}
              resizeMode="contain"
            />
          </View>
        </>
      )}

      {phase === "gameover" && (
        <View style={styles.gameOverOverlay}>
          <Image
            source={require("../../assets/gameOver/overTitle.png")}
            style={styles.gameOverTitleImage}
            resizeMode="contain"
          />
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
          <TouchableOpacity onPress={resetGame}>
            <Image
              source={require("../../assets/gameOver/tryAgain.png")}
              style={styles.buttonImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={goBackToHome}>
            <Image
              source={require("../../assets/gameOver/backtohome.png")}
              style={styles.buttonImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Image
            source={require("../../assets/gameOver/ongorText.png")}
            style={styles.bottomDecor}
            resizeMode="cover"
          />
        </View>
      )}

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

/** ====== Styles (unchanged mostly) ====== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingText: { color: "white", fontSize: 18 },
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
  buttonText: { color: "white", fontSize: 16, fontFamily: "KanitB" },

  waveOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 50,
  },
  waveHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  waveStageText: {
    fontSize: 60,
    color: "#4A90E2",
    fontFamily: "kanitB",
    textShadowColor: "rgba(0,0,0,0.3)",
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
  brainContainer: { marginRight: 30 },
  brainImage: { width: 120, height: 120 },
  poseContainer: { alignItems: "center" },
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
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  countdownContainer: { alignItems: "center", marginBottom: 50 },
  countdownText: { fontSize: 120, fontFamily: "starBorn", color: "#4A90E2" },

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

  currentPoseContainer: { alignItems: "center" },
  currentPoseImage: { width: 120, height: 120, marginBottom: 10 },
  currentPoseText: {
    color: "#FFD600",
    fontSize: 18,
    fontFamily: "kanitB",
    textAlign: "center",
  },
  progressText: { color: "white", fontSize: 16, marginTop: 5 },

  gameOverTitle: {
    color: "#ff6b6b",
    fontSize: 36,
    marginBottom: 8,
    fontFamily: "kanitB",
  },
  gameOverStats: { color: "white", fontSize: 20, marginBottom: 4 },
  restartButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  restartButtonText: { color: "white", fontSize: 18, fontFamily: "kanitB" },
  bottomInfo: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 8,
    borderRadius: 8,
  },
  gestureText: { color: "white", fontSize: 14 },
  statusText: { color: "white", fontSize: 12, marginTop: 2 },

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
  modalButtonDanger: { borderColor: "#dc2626" },
  modalButtonText: { color: "#2563eb", fontSize: 16, fontFamily: "kanitB" },

  stroke: { color: "white" },
  stageLabelImage: { width: 200, height: 140 },
  waveStageNumberText: {
    fontSize: 100,
    color: "#fff",
    marginTop: 25,
    fontFamily: "MaliB",
  },
  strokeB: { color: "#4A90E2" },
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
    width: 50,
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

  scoreText: { color: "white", fontSize: 114, fontFamily: "MaliB" },

  gameOverContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  gameOverTitleImage: { width: 400, height: 220, marginBottom: 10 },
  scoreFrameImage: { width: "100%", height: "100%", marginTop: -10 },
  scoreTextWrapper: {
    position: "absolute",
    top: "20%",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  scoreTextt: { fontSize: 18, color: "#333", marginBottom: 10 },
  scoreNumber: { fontSize: 40, color: "#fff", top: "120%" },
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
    zIndex: 10,
  },
  scoreContainer: {
    width: "80%",
    height: 200,
    top: -40,
    position: "relative",
    marginVertical: 0,
  },
});
