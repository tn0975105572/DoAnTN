import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, Image, Animated, PanResponder, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';

const { width } = Dimensions.get('window');

// Cờ phiên: chỉ hiển thị màn này 1 lần cho tới khi app bị tắt hẳn
let hasShownIntroThisSession = false;

const ShoppingScreen = () => {
  const router = useRouter();
  const translateX = useRef(new Animated.Value(0)).current;
  const [slid, setSlid] = useState(false);

  // Giữ nút ở cuối nếu đã trượt
  useEffect(() => {
    if (slid) {
      translateX.setValue(width - 60);
    }
  }, [slid]);

  useFocusEffect(
    useCallback(() => {
      // Nếu phiên này đã xem, chuyển thẳng sang /home
      if (hasShownIntroThisSession) {
        router.replace('/home');
        return;
      }

      // Lần đầu trong phiên: đánh dấu đã hiển thị
      hasShownIntroThisSession = true;

      // reset slider khi quay lại (nếu có)
      setSlid(false);
      translateX.setValue(0);
    }, []),
  );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10,
      onPanResponderMove: (_, gesture) => {
        if (!slid && gesture.dx > 0) {
          translateX.setValue(gesture.dx);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (!slid && gesture.dx > width * 0.5) {
          Animated.timing(translateX, {
            toValue: width - 60,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setSlid(true);
            router.push('/home');
          });
        } else {
          if (!slid) {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        }
      },
    }),
  ).current;

  return (
    <View className="flex-1 bg-[#fffcef]">
      {/* Header */}
      <View className="flex-[5] bg-[#7f001f] rounded-b-[40px] p-5 justify-center items-center shadow-lg">
        <View className="flex-row mb-8 justify-center">
          <Text
            style={{
              fontFamily: 'Oughter',
              fontSize: 130,
              color: '#fffcef',
              textAlign: 'center',
              lineHeight: 125,
              marginTop: 20, // đẩy chữ cách top 20px
            }}
          >
            OLODO
          </Text>
        </View>

        <View className="flex-row mb-8 justify-center">
          <View className="w-[60px] h-[90px] rounded-lg mx-2 bg-[#92B974] -rotate-6" />
          <View className="w-[60px] h-[90px] rounded-lg mx-2 bg-[#4a90e2] rotate-6" />
        </View>

        <Text className="text-[30px] font-bold text-[#fffcef] mb-5">SHOPPING</Text>
        <Text className="text-[15px] text-[#fffcef] text-center px-6 leading-5">
          Lorem ipsum dolor sit amet, adipiscing elit, sed do eiusmod tempor incididunt ut labore
          magna aliqua erat volutpat.
        </Text>
      </View>

      {/* Slide to Start */}
      <View className="flex-[2] px-5 pt-5">
        <View className="bg-[#7f001f] rounded-full py-3 px-5 mt-5">
          <Text className="text-center text-[#fffcef] font-bold text-[16px] mb-2">
            Shopping to Start ▶▶
          </Text>

          <View className="h-[50px] bg-[#5b0017] rounded-full overflow-hidden justify-center">
            <Animated.View
              {...(!slid ? panResponder.panHandlers : {})}
              style={{
                width: 60,
                height: 50,
                backgroundColor: '#fffcef',
                borderRadius: 25,
                justifyContent: 'center',
                alignItems: 'center',
                transform: [{ translateX }],
              }}
            >
              <Image
                source={{
                  uri: 'https://img.icons8.com/ios-filled/50/000000/shopping-cart.png', // để màu gốc đen
                }}
                style={{ width: 25, height: 25, tintColor: '#7f001f' }}
              />
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default ShoppingScreen;
