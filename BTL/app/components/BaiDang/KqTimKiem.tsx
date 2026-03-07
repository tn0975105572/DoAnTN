import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const KqTimKiemScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Kết quả tìm kiếm</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
  },
});

export default KqTimKiemScreen;
