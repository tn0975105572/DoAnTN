import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { orderService, OrderRecord } from '../../../services/orderService';
import {
  getDefaultProfileAvatarUrl,
  normalizeBackendMediaUrl,
} from '../../../utils/mediaUrl';

const PRIMARY_COLOR = '#7f001f';
const FALLBACK_POST_IMAGE =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80';

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

const getCounterparty = (order: OrderRecord, currentUserId: string) => {
  const viewerIsBuyer = String(order.ID_NguoiMua || '') === String(currentUserId || '');

  return {
    label: viewerIsBuyer ? 'Người bán' : 'Người mua',
    name: viewerIsBuyer
      ? order.ten_nguoi_ban || 'Người bán'
      : order.ten_nguoi_mua || 'Người mua',
    avatar:
      normalizeBackendMediaUrl(
        viewerIsBuyer ? order.anh_nguoi_ban : order.anh_nguoi_mua,
        'avatars',
      ) ||
      getDefaultProfileAvatarUrl(
        viewerIsBuyer ? order.ID_NguoiBan || 'seller' : order.ID_NguoiMua || 'buyer',
      ),
    roleTag: viewerIsBuyer ? 'Bạn là người mua' : 'Bạn là người bán',
  };
};

const SummaryCard = ({ count, totalAmount }: { count: number; totalAmount: number }) => (
  <View style={styles.summaryCard}>
    <View style={styles.summaryItem}>
      <Text style={styles.summaryValue}>{count}</Text>
      <Text style={styles.summaryLabel}>Tổng hóa đơn</Text>
    </View>
    <View style={styles.summaryDivider} />
    <View style={styles.summaryItem}>
      <Text style={styles.summaryValue}>{formatCurrency(totalAmount)}</Text>
      <Text style={styles.summaryLabel}>Tổng giá trị</Text>
    </View>
  </View>
);

const EmptyState = ({
  title,
  subtitle,
  buttonLabel,
  onPress,
}: {
  title: string;
  subtitle: string;
  buttonLabel?: string;
  onPress?: () => void;
}) => (
  <View style={styles.stateCard}>
    <Ionicons name="receipt-outline" size={54} color="#d0a4af" />
    <Text style={styles.stateTitle}>{title}</Text>
    <Text style={styles.stateSubtitle}>{subtitle}</Text>
    {buttonLabel && onPress ? (
      <TouchableOpacity style={styles.primaryButton} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.primaryButtonText}>{buttonLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const OrderListScreen = () => {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');

  const loadOrders = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError('');

      const userInfo = await AsyncStorage.getItem('userInfo');
      const parsedUser = userInfo ? JSON.parse(userInfo) : null;
      const userId = String(parsedUser?.ID_NguoiDung || '').trim();
      setCurrentUserId(userId);

      if (!userId) {
        setOrders([]);
        setError('Bạn cần đăng nhập để xem các hóa đơn đã phát sinh.');
        return;
      }

      const response = await orderService.getMyOrders();
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch (loadError: any) {
      setOrders([]);
      setError(loadError?.message || 'Không thể tải danh sách hóa đơn.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadOrders(true);
    }, [loadOrders]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadOrders(false);
  }, [loadOrders]);

  const totalAmount = useMemo(
    () =>
      orders.reduce((sum, item) => {
        const amount = Number(item.gia_giao_dich || 0);
        return Number.isFinite(amount) ? sum + amount : sum;
      }, 0),
    [orders],
  );

  const renderOrderItem = ({ item }: { item: OrderRecord }) => {
    const counterpart = getCounterparty(item, currentUserId);
    const postImage = normalizeBackendMediaUrl(item.anh_bai_dang) || FALLBACK_POST_IMAGE;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.88}
        onPress={() =>
          router.push({
            pathname: '/components/CaiDat/chitiethoadon',
            params: { orderId: item.ID_DonHang },
          })
        }
      >
        <Image source={{ uri: postImage }} style={styles.orderImage} />
        <View style={styles.orderBody}>
          <View style={styles.orderTopRow}>
            <View style={styles.orderCodeBadge}>
              <Text style={styles.orderCodeText}>{item.ma_hoa_don || 'Hóa đơn'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#b07a87" />
          </View>

          <Text style={styles.orderTitle} numberOfLines={2}>
            {item.tieu_de_bai_dang || 'Bài đăng đã giao dịch'}
          </Text>

          <Text style={styles.orderPrice}>{formatCurrency(item.gia_giao_dich)}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color="#8e6c73" />
            <Text style={styles.metaText}>{formatDateTime(item.thoi_gian_hoan_tat)}</Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color="#8e6c73" />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.dia_chi_hen_gap || item.vi_tri_bai_dang || 'Chưa có địa điểm'}
            </Text>
          </View>

          <View style={styles.counterpartyRow}>
            <Image source={{ uri: counterpart.avatar }} style={styles.counterpartyAvatar} />
            <View style={styles.counterpartyTextWrap}>
              <Text style={styles.counterpartyLabel}>{counterpart.label}</Text>
              <Text style={styles.counterpartyName} numberOfLines={1}>
                {counterpart.name}
              </Text>
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{counterpart.roleTag}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={PRIMARY_COLOR} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hóa đơn của tôi</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Đang tải hóa đơn...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const shouldShowErrorState = !!error && orders.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_COLOR} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hóa đơn của tôi</Text>
        <TouchableOpacity onPress={onRefresh} activeOpacity={0.8}>
          <Ionicons name="refresh-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {shouldShowErrorState ? (
        <EmptyState
          title="Không mở được hóa đơn"
          subtitle={error}
          buttonLabel={currentUserId ? 'Thử lại' : 'Đăng nhập'}
          onPress={() =>
            currentUserId ? onRefresh() : router.push('/components/CaiDat/dangnhap')
          }
        />
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.ID_DonHang}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[PRIMARY_COLOR]}
              tintColor={PRIMARY_COLOR}
            />
          }
          ListHeaderComponent={<SummaryCard count={orders.length} totalAmount={totalAmount} />}
          ListEmptyComponent={
            <EmptyState
              title="Chưa có hóa đơn"
              subtitle="Khi giao dịch được cả hai bên xác nhận hoàn tất, hóa đơn sẽ xuất hiện ở đây."
            />
          }
        />
      )}
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
  listContent: {
    padding: 16,
    paddingBottom: 36,
    gap: 14,
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
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f1d7de',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: PRIMARY_COLOR,
    textAlign: 'center',
  },
  summaryLabel: {
    marginTop: 6,
    fontSize: 13,
    color: '#8e6c73',
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#f3d8e0',
    marginHorizontal: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1d7de',
  },
  orderImage: {
    width: '100%',
    height: 148,
    backgroundColor: '#efe1e6',
  },
  orderBody: {
    padding: 16,
    gap: 10,
  },
  orderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderCodeBadge: {
    backgroundColor: '#fff1f4',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  orderCodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY_COLOR,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#32171f',
    lineHeight: 24,
  },
  orderPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: PRIMARY_COLOR,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
    color: '#7d5c64',
  },
  counterpartyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f5e4e8',
  },
  counterpartyAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
    backgroundColor: '#f0dfe4',
  },
  counterpartyTextWrap: {
    flex: 1,
  },
  counterpartyLabel: {
    fontSize: 12,
    color: '#9a7d85',
  },
  counterpartyName: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '700',
    color: '#32171f',
  },
  roleBadge: {
    backgroundColor: '#fff4e3',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ad6d00',
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

export default OrderListScreen;
