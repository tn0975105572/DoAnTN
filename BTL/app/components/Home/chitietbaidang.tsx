import React, { useState, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CAROUSEL_HEIGHT = 220;

export default function ProductDetail() {
  const [qty, setQty] = useState(1);
  const [index, setIndex] = useState(0);
  const images = [
    'https://via.placeholder.com/600x400/9DBF6E/ffffff?text=Image+1',
    'https://via.placeholder.com/600x400/7FA04E/ffffff?text=Image+2',
    'https://via.placeholder.com/600x400/6B8A3A/ffffff?text=Image+3',
  ];

  const flatListRef = useRef(null);

  const onNext = () => {
    const next = Math.min(index + 1, images.length - 1);
    flatListRef.current?.scrollToIndex({ index: next });
    setIndex(next);
  };

  const onPrev = () => {
    const prev = Math.max(index - 1, 0);
    flatListRef.current?.scrollToIndex({ index: prev });
    setIndex(prev);
  };

  const renderImage = ({ item }) => (
    <View style={styles.carouselItem}>
      <Image source={{ uri: item }} style={styles.carouselImage} resizeMode="cover" />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color="#356" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lorem Ipsum</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="person-circle" size={28} color="#356" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.blockWrapper}>
          <View style={styles.carouselWrapper}>
            <FlatList
              ref={flatListRef}
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              renderItem={renderImage}
              onMomentumScrollEnd={(ev) => {
                const newIndex = Math.round(ev.nativeEvent.contentOffset.x / width);
                setIndex(newIndex);
              }}
            />

            <TouchableOpacity style={[styles.arrow, styles.arrowLeft]} onPress={onPrev}>
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.arrow, styles.arrowRight]} onPress={onNext}>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </TouchableOpacity>

            <View style={styles.dots}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, index === i && styles.dotActive]} />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Lorem Ipsum</Text>
            <Text style={styles.subtitle}>Dolor Sit Amet</Text>

            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description} numberOfLines={6}>
              This is a placeholder description for the product. You can replace this text with the
              actual product description. It supports multiple lines and will wrap automatically.
            </Text>

            <View style={styles.qtyRow}>
              <Text className="TUAN" style={styles.totalText}>
                Total:
              </Text>
              <View style={styles.qtyBox}>
                <TouchableOpacity
                  onPress={() => setQty((s) => Math.max(1, s - 1))}
                  style={styles.qtyButton}
                >
                  <Text style={styles.qtySymbol}>-</Text>
                </TouchableOpacity>
                <View style={styles.qtyValueBox}>
                  <Text style={styles.qtyValue}>{qty}</Text>
                </View>
                <TouchableOpacity onPress={() => setQty((s) => s + 1)} style={styles.qtyButton}>
                  <Text style={styles.qtySymbol}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footerRow}>
              <View>
                <Text style={styles.priceLabel}>${(25 * qty).toFixed(2)}</Text>
              </View>
              <TouchableOpacity style={styles.buyButton}>
                <Text style={styles.buyText}>BUY</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F7E8',
  },
  header: {
    height: 60,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#356',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  blockWrapper: {
    backgroundColor: '#9DBF6E',
    borderRadius: 24,
    padding: 12,
  },
  carouselWrapper: {
    height: CAROUSEL_HEIGHT + 20,
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E6F0D8',
    justifyContent: 'center',
  },
  carouselItem: {
    width: width,
    height: CAROUSEL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselImage: {
    width: width - 40,
    height: CAROUSEL_HEIGHT - 30,
    borderRadius: 14,
    backgroundColor: '#ddd',
  },
  arrow: {
    position: 'absolute',
    top: '40%',
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 8,
    borderRadius: 20,
  },
  arrowLeft: {
    left: 12,
  },
  arrowRight: {
    right: 12,
  },
  dots: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    flexDirection: 'row',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginHorizontal: 4,
  },
  dotActive: {
    width: 10,
    height: 6,
    borderRadius: 4,
    backgroundColor: '#356',
  },
  card: {
    marginTop: 6,
    backgroundColor: '#9DBF6E',
    borderRadius: 18,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    marginBottom: 12,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '600',
    marginBottom: 6,
  },
  description: {
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
    marginBottom: 12,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  totalText: {
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  qtyButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  qtySymbol: {
    fontSize: 18,
    fontWeight: '700',
  },
  qtyValueBox: {
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  qtyValue: {
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceLabel: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  buyButton: {
    backgroundColor: '#111',
    paddingHorizontal: 26,
    paddingVertical: 10,
    borderRadius: 20,
  },
  buyText: {
    color: '#fff',
    fontWeight: '700',
  },
});
