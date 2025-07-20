import React from "react";
import {
  SafeAreaView,
  Image,
  StyleSheet,
  FlatList,
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

const COLORS = { primary: "#2946FF", white: "#fff" };

const slides = [
  {
    id: "1",
    image: require("../assets/images/onboarding/1.png"),
    title: "ฝึกฝนและพัฒนาความจำอย่างง่ายดาย",
    subtitle: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  },
  {
    id: "2",
    image: require("../assets/images/onboarding/2.png"),
    title: "สนุกและเพลิดเพลินไปพร้อมกับการพัฒนาความจำ !",
    subtitle: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  },
  {
    id: "3",
    image: require("../assets/images/onboarding/3.png"),
    title: "นำพ้อยท์จากการเล่นเกมไปแลกของรางวัลสุดพิเศษ !",
    subtitle: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  },
];

type SlideProps = {
  item: {
    id: string;
    image: any;
    title: string;
    subtitle: string;
  };
};

const Slide: React.FC<SlideProps> = ({ item }) => {
  return (
    <View style={{ alignItems: "center", paddingHorizontal: 15, width }}>
      <Image
        source={item.image}
        style={{
          height: "70%",
          width: "100%",
          resizeMode: "contain",
          borderWidth: 1,
          borderRadius: 20,
          borderColor: "#C2C2C2",
          backgroundColor: "#ffffff77",
        }}
      />
      <View>
        <Text style={styles.title}>{item.title}</Text>
      </View>
    </View>
  );
};

const OnboardingScreen: React.FC = () => {
  const [currentSlideIndex, setCurrentSlideIndex] = React.useState(0);
  const ref = React.useRef<FlatList<any>>(null);
  const router = useRouter();

  const updateCurrentSlideIndex = (e: any) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / width);
    setCurrentSlideIndex(currentIndex);
  };

  const goToNextSlide = () => {
    const nextSlideIndex = currentSlideIndex + 1;
    if (nextSlideIndex < slides.length) {
      const offset = nextSlideIndex * width;
      ref.current?.scrollToOffset({ offset, animated: true });
      setCurrentSlideIndex(nextSlideIndex);
    }
  };

  const skip = () => {
    const lastSlideIndex = slides.length - 1;
    const offset = lastSlideIndex * width;
    ref.current?.scrollToOffset({ offset, animated: true });
    setCurrentSlideIndex(lastSlideIndex);
  };

  const Footer = () => {
    return (
      <View style={styles.footerContainer}>
        <View style={styles.indicatorContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                currentSlideIndex === index && {
                  backgroundColor: COLORS.white,
                  width: 25,
                },
              ]}
            />
          ))}
        </View>

        <View style={{ marginBottom: 20 }}>
          {currentSlideIndex === slides.length - 1 ? (
            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.btn, styles.transparentBtn]}
                onPress={() => router.push("(auth)/login")}
              >
                <Text style={[styles.btnText, { color: COLORS.white }]}>
                  เข้าสู่ระบบ
                </Text>
              </TouchableOpacity>
              <View style={{ width: 15 }} />
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("(auth)/register")}
                style={styles.btn}
              >
                <Text style={styles.btnText}>สมัครสมาชิก</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.btn, styles.transparentBtn]}
                onPress={skip}
              >
                <Text style={[styles.btnText, { color: COLORS.white }]}>
                  ข้าม
                </Text>
              </TouchableOpacity>
              <View style={{ width: 15 }} />
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={goToNextSlide}
                style={styles.btn}
              >
                <Text style={styles.btnText}>ต่อไป</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={["#78A5FF88", "#2946FFee"]}
      start={{ x: 0, y: 1 }}
      end={{ x: 1.1, y: 0.5 }}
      style={{ flex: 1 }}
    >
      <Image
        source={require("../assets/images/onboarding/4.png")}
        style={{
          top: height / 2 - 300,
          left: 20,
          position: "absolute",
          width: 600,
          height: 600,
          resizeMode: "stretch",
        }}
        blurRadius={15}
      />
      <View
        style={{
          marginBottom: 15,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 70,
        }}
      >
        <Image
          source={require("../assets/Logo/LogoRound.png")}
          style={{
            width: 50,
            height: 50,
            marginRight: 10,
          }}
        />
        <Text
          style={{
            color: "#fff",
            fontFamily: "kanitM",
            fontSize: 38,
            textAlign: "center",
          }}
        >
          อ่องออ
        </Text>
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <FlatList
          ref={ref}
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <Slide item={item} />}
          onMomentumScrollEnd={updateCurrentSlideIndex}
          contentContainerStyle={{
            height: height * 0.75,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.2,
            shadowRadius: 10,
            elevation: 5,
          }}
        />
        <Footer />
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  title: {
    color: COLORS.white,
    fontSize: 26,
    marginTop: 20,
    textAlign: "center",
    fontFamily: "kanitB",
  },
  indicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
  },
  indicator: {
    height: 2.5,
    width: 10,
    backgroundColor: "grey",
    marginHorizontal: 3,
    borderRadius: 2,
  },
  btn: {
    flex: 1,
    height: 50,
    borderRadius: 5,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  transparentBtn: {
    borderColor: COLORS.white,
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  btnText: {
    fontSize: 15,
    fontFamily: "kanitB",
  },
  footerContainer: {
    height: height * 0.16,
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
});

export default OnboardingScreen;
