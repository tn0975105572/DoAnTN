import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Tabs
import Home from './app/(tabs)/home';
import BaiDang from './app/(tabs)/baidang';
import TinNhan from './app/(tabs)/tinnhan';
import CaiDat from './app/(tabs)/caidat';

// Components (screens con)
import BinhLuanBaiDang from './components/BaiDang/binhluanbaidang';
import DangKy from './components/CaiDat/dangky';
import DangNhap from './components/CaiDat/dangnhap';
import LSGiaoDich from './components/CaiDat/Lsgiaodich';
import ThongTinCaNhan from './components/CaiDat/thongtincanhan';
import ChiTietBaiDang from './components/Home/chitietbaidang';
import KQTimKiem from './components/Home/KqTimKiem';
import ThongBao from './components/Home/thongbao';
import ChiTietTinNhan from './components/TinNhan/chitiettinnhan';
import TimKiem from './components/Home/timkiem';
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// 🔹 Tabs chính
function Tabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={Home} options={{ title: 'Trang chủ' }} />
      <Tab.Screen name="BaiDang" component={BaiDang} options={{ title: 'Bài đăng' }} />
      <Tab.Screen name="TinNhan" component={TinNhan} options={{ title: 'Tin nhắn' }} />
      <Tab.Screen name="CaiDat" component={CaiDat} options={{ title: 'Cài đặt' }} />
    </Tab.Navigator>
  );
}

// 🔹 Stack chung
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {/* Tabs */}
        <Stack.Screen
          name="Tabs"
          component={Tabs}
          options={{ headerShown: false }} // ẩn header vì tab đã có
        />

        {/* Các màn hình con */}
        <Stack.Screen name="BinhLuanBaiDang" component={BinhLuanBaiDang} />
        <Stack.Screen name="DangKy" component={DangKy} />
        <Stack.Screen name="DangNhap" component={DangNhap} />
        <Stack.Screen name="LSGiaoDich" component={LSGiaoDich} />
        <Stack.Screen name="ThongTinCaNhan" component={ThongTinCaNhan} />
        <Stack.Screen name="ChiTietBaiDang" component={ChiTietBaiDang} />
        <Stack.Screen name="KQTimKiem" component={KQTimKiem} />
        <Stack.Screen name="ThongBao" component={ThongBao} />
        <Stack.Screen name="ChiTietTinNhan" component={ChiTietTinNhan} />
        <Stack.Screen name="TimKiem" component={TimKiem} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
