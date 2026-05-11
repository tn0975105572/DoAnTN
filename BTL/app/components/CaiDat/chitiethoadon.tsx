import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { orderService, OrderRecord } from '../../../services/orderService';
import {
  getDefaultProfileAvatarUrl,
  normalizeBackendMediaUrl,
} from '../../../utils/mediaUrl';

const PRIMARY_COLOR = '#7f001f';
const FALLBACK_POST_IMAGE =
  'https://images.unsplash.com/photo-1515169067868-5387ec356754?auto=format&fit=crop&w=1400&q=80';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const formatCurrency = (value: number | string | null | undefined) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Thương lượng';
  }

  return currencyFormatter.format(amount);
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'Chưa cập nhật';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Chưa cập nhật';
  }

  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const normalizeParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || '' : value || '';

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconWrap}>
      <Ionicons name={icon} size={18} color={PRIMARY_COLOR} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const PartyCard = ({
  title,
  name,
  email,
  avatar,
  highlight,
}: {
  title: string;
  name: string;
  email: string;
  avatar: string;
  highlight?: string;
}) => (
  <View style={styles.partyCard}>
    <Image source={{ uri: avatar }} style={styles.partyAvatar} />
    <View style={styles.partyTextWrap}>
      <Text style={styles.partyTitle}>{title}</Text>
      <Text style={styles.partyName}>{name}</Text>
      <Text style={styles.partyEmail}>{email}</Text>
      {highlight ? <Text style={styles.partyHighlight}>{highlight}</Text> : null}
    </View>
  </View>
);

const OrderDetailScreen = () => {
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');

  const orderId = useMemo(() => normalizeParam(params.orderId), [params.orderId]);

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const userInfo = await AsyncStorage.getItem('userInfo');
      const parsedUser = userInfo ? JSON.parse(userInfo) : null;
      setCurrentUserId(String(parsedUser?.ID_NguoiDung || '').trim());

      if (!orderId) {
        setOrder(null);
        setError('Không xác định được hóa đơn cần mở.');
        return;
      }

      const response = await orderService.getById(orderId);
      setOrder(response.data || null);
    } catch (loadError: any) {
      setOrder(null);
      setError(loadError?.message || 'Không thể tải chi tiết hóa đơn.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const viewerIsBuyer = String(order?.ID_NguoiMua || '') === String(currentUserId || '');
  const postImage = normalizeBackendMediaUrl(order?.anh_bai_dang) || FALLBACK_POST_IMAGE;
  const buyerAvatar =
    normalizeBackendMediaUrl(order?.anh_nguoi_mua, 'avatars') ||
    getDefaultProfileAvatarUrl(order?.ID_NguoiMua || 'buyer');
  const sellerAvatar =
    normalizeBackendMediaUrl(order?.anh_nguoi_ban, 'avatars') ||
    getDefaultProfileAvatarUrl(order?.ID_NguoiBan || 'seller');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={PRIMARY_COLOR} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết hóa đơn</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Đang tải chi tiết hóa đơn...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={PRIMARY_COLOR} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết hóa đơn</Text>
          <TouchableOpacity onPress={() => void loadOrder()} activeOpacity={0.8}>
            <Ionicons name="refresh-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.stateCard}>
          <Ionicons name="document-text-outline" size={54} color="#d0a4af" />
          <Text style={styles.stateTitle}>Không mở được hóa đơn</Text>
          <Text style={styles.stateSubtitle}>{error || 'Hóa đơn không tồn tại.'}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => void loadOrder()}>
            <Text style={styles.primaryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_COLOR} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết hóa đơn</Text>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: '/components/CaiDat/hoadon',
            })
          }
          activeOpacity={0.8}
        >
          <Ionicons name="receipt-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image source={{ uri: postImage }} style={styles.heroImage} />

        <View style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle-outline" size={14} color={PRIMARY_COLOR} />
              <Text style={styles.statusBadgeText}>Đã hoàn tất</Text>
            </View>
            <Text style={styles.viewerRoleText}>
              {viewerIsBuyer ? 'Bạn là người mua' : 'Bạn là người bán'}
            </Text>
          </View>

          <Text style={styles.invoiceCode}>{order.ma_hoa_don || 'Hóa đơn'}</Text>
          <Text style={styles.postTitle}>{order.tieu_de_bai_dang || 'Bài đăng đã giao dịch'}</Text>
          <Text style={styles.priceText}>{formatCurrency(order.gia_giao_dich)}</Text>
          <Text style={styles.heroDescription}>
            Hóa đơn này được tạo tự động khi cả hai bên cùng xác nhận giao dịch đã hoàn tất.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông tin giao dịch</Text>
          <InfoRow
            icon="calendar-outline"
            label="Hoàn tất lúc"
            value={formatDateTime(order.thoi_gian_hoan_tat || order.thoi_gian_tao)}
          />
          <InfoRow
            icon="time-outline"
            label="Thời gian hẹn gặp"
            value={formatDateTime(order.thoi_gian_hen_gap)}
          />
          <InfoRow
            icon="location-outline"
            label="Địa điểm"
            value={order.dia_chi_hen_gap || order.vi_tri_bai_dang || 'Chưa cập nhật'}
          />
          <InfoRow
            icon="chatbubble-ellipses-outline"
            label="Ghi chú điểm hẹn"
            value={order.ghi_chu_hen_gap || 'Không có ghi chú'}
          />
          <InfoRow
            icon="create-outline"
            label="Ghi chú người mua"
            value={order.ghi_chu_nguoi_mua || 'Không có ghi chú'}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Hai bên giao dịch</Text>
          <PartyCard
            title="Người bán"
            name={order.ten_nguoi_ban || 'Người bán'}
            email={order.email_nguoi_ban || 'Chưa có email'}
            avatar={sellerAvatar}
            highlight={!viewerIsBuyer ? 'Đây là vai trò của bạn trong giao dịch này.' : undefined}
          />
          <PartyCard
            title="Người mua"
            name={order.ten_nguoi_mua || 'Người mua'}
            email={order.email_nguoi_mua || 'Chưa có email'}
            avatar={buyerAvatar}
            highlight={viewerIsBuyer ? 'Đây là vai trò của bạn trong giao dịch này.' : undefined}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Mã tra cứu</Text>
          <InfoRow icon="document-outline" label="ID hóa đơn" value={order.ID_DonHang} />
          <InfoRow icon="swap-horizontal-outline" label="ID giao dịch" value={order.ID_GiaoDich} />
          <InfoRow icon="pricetag-outline" label="ID bài đăng" value={order.ID_BaiDang} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff7f8',
  },
  header: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 24,
  },
  content: {
    paddingBottom: 36,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6b4c55',
  },
  heroImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#efe1e6',
  },
  heroCard: {
    marginHorizontal: 16,
    marginTop: -28,
    padding: 18,
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#f1d7de',
    shadowColor: '#7f001f',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff1f4',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY_COLOR,
  },
  viewerRoleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8e6c73',
  },
  invoiceCode: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: '800',
    color: PRIMARY_COLOR,
  },
  postTitle: {
    marginTop: 10,
    fontSize: 21,
    fontWeight: '700',
    color: '#32171f',
    lineHeight: 28,
  },
  priceText: {
    marginTop: 14,
    fontSize: 30,
    fontWeight: '800',
    color: PRIMARY_COLOR,
  },
  heroDescription: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 22,
    color: '#7d5c64',
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1d7de',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#32171f',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f6e6ea',
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff1f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9a7d85',
    textTransform: 'uppercase',
  },
  infoValue: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 22,
    color: '#32171f',
    fontWeight: '600',
  },
  partyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  partyAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#f0dfe4',
    marginRight: 12,
  },
  partyTextWrap: {
    flex: 1,
  },
  partyTitle: {
    fontSize: 12,
    color: '#9a7d85',
    textTransform: 'uppercase',
  },
  partyName: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: '700',
    color: '#32171f',
  },
  partyEmail: {
    marginTop: 3,
    fontSize: 14,
    color: '#7d5c64',
  },
  partyHighlight: {
    marginTop: 6,
    fontSize: 13,
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  stateCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  stateTitle: {
    marginTop: 18,
    fontSize: 22,
    fontWeight: '700',
    color: '#32171f',
    textAlign: 'center',
  },
  stateSubtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: '#7d5c64',
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 22,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

export default OrderDetailScreen;
