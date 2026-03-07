import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    // Logic để quay lại màn hình trước đó
    // Ví dụ: navigation.goBack();
    console.log('Quay lại');
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
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm sản phẩm..."
            value={searchText}
            onChangeText={setSearchText}
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
          <TouchableOpacity key={index} style={styles.recentSearchItem}>
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
