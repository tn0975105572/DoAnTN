import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.108:3000';

export const usePoints = () => {
  const [points, setPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadPoints = useCallback(async () => {
    try {
      const userJson = await AsyncStorage.getItem('userInfo');
      if (userJson) {
        const userData = JSON.parse(userJson);
        setPoints(userData.diem_so || 0);
      }
    } catch (error) {
      console.error('Error loading points:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePoints = useCallback((newPoints) => {
    setPoints(newPoints);
    // Cập nhật AsyncStorage
    AsyncStorage.getItem('userInfo').then(userJson => {
      if (userJson) {
        const userData = JSON.parse(userJson);
        const updatedUserData = { ...userData, diem_so: newPoints };
        AsyncStorage.setItem('userInfo', JSON.stringify(updatedUserData));
      }
    });
  }, []);

  const syncPointsFromServer = useCallback(async () => {
    try {
      const userJson = await AsyncStorage.getItem('userInfo');
      if (!userJson) return;

      const userData = JSON.parse(userJson);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/nguoidung/getById/${userData.ID_NguoiDung}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const serverUserData = await response.json();
        if (serverUserData && serverUserData.diem_so !== undefined) {
          setPoints(serverUserData.diem_so);
          
          // Cập nhật AsyncStorage với dữ liệu từ server
          const updatedUserData = { ...userData, diem_so: serverUserData.diem_so };
          await AsyncStorage.setItem('userInfo', JSON.stringify(updatedUserData));
        }
      }
    } catch (error) {
      console.error('Error syncing points from server:', error);
    }
  }, []);

  useEffect(() => {
    loadPoints();
  }, [loadPoints]);

  return {
    points,
    isLoading,
    updatePoints,
    syncPointsFromServer,
    loadPoints
  };
};






