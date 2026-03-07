import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import Constants from 'expo-constants';


export default function SearchScreen() {
  const [searchText, setSearchText] = useState('');
  const [recentSearches, setRecentSearches] = useState([
    'nnz',
    'áo thun nam',
    'quần jean',
    'giày thể thao',
  ]);

  const handleClearHistory = () => {
    setRecentSearches([]);
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleSearch = (text: string) => {
    if (text.trim()) {
      // Add to recent searches if not exists
      if (!recentSearches.includes(text)) {
        setRecentSearches([text, ...recentSearches].slice(0, 10));
      }

      router.push({
        pathname: '/components/Home/KqTimKiem',
        params: { query: text },
      });
    }
  }

  const handleCameraSearch = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const base64Img = result.assets[0].base64;
      try {
        const apiKey = Constants.expoConfig?.extra?.googleCloudVisionApiKey; // Key from env
        const apiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

        const response = await axios.post(apiUrl, {
          requests: [
            {
              image: {
                content: base64Img,
              },
              features: [
                {
                  type: 'LABEL_DETECTION',
                  maxResults: 5,
                },
              ],
            },
          ],
        });

        const labels = response.data.responses[0].labelAnnotations;
        if (labels && labels.length > 0) {
          const topLabel = labels[0].description;
          setSearchText(topLabel);
          handleSearch(topLabel);
        } else {
          alert('Could not identify object in the image.');
        }
      } catch (error: any) {
        console.error('Error calling Cloud Vision API:', error);
        if (error.response) {
          console.error('Response data:', error.response.data);
          alert(`API Error: ${error.response.data.error.message}`);
        } else {
          alert('Error processing image. Please try again.');
        }
      }
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="gray" style={styles.searchIcon} />
          <TouchableOpacity onPress={handleCameraSearch} style={styles.cameraIcon}>
            <Ionicons name="camera" size={20} color="gray" />
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm sản phẩm..."
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={() => handleSearch(searchText)}
            autoFocus
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Recent Searches */}
      <View style={styles.recentSearchSection}>
        <View style={styles.recentSearchHeader}>
          <Text style={styles.recentSearchTitle}>Tìm kiếm gần đây</Text>
          <TouchableOpacity onPress={handleClearHistory}>
            <Text style={styles.clearHistoryText}>Xóa lịch sử</Text>
          </TouchableOpacity>
        </View>

        {recentSearches.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.recentSearchItem}
            onPress={() => {
              setSearchText(item);
              handleSearch(item);
            }}
          >
            <Ionicons name="time-outline" size={18} color="gray" style={styles.historyIcon} />
            <Text style={styles.recentSearchText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  backButton: {
    paddingRight: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 5,
  },
  cameraIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  recentSearchSection: {
    padding: 15,
  },
  recentSearchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentSearchTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearHistoryText: {
    color: '#007aff', // Màu xanh dương của iOS
    fontSize: 14,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  historyIcon: {
    marginRight: 10,
  },
  recentSearchText: {
    fontSize: 16,
  },
});
