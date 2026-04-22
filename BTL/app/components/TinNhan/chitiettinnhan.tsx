import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
  Alert,
  Dimensions,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { io } from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { chatService } from '../../../services/chatService';
import { dealService } from '../../../services/dealService';
import { normalizeBackendMediaUrl } from '../../../utils/mediaUrl';

// Import các bộ icon
import Ionicons from 'react-native-vector-icons/Ionicons';

// --- ĐỊNH NGHĨA DỮ LIỆU ---

const PRIMARY_COLOR = '#7f001f'; // Màu chính của app
const POST_SHARE_META_PREFIX = '__OLODO_POST_META__';
const DEAL_ROOM_STORAGE_PREFIX = 'olodo_deal_room';
const POST_SHARE_TITLE_PREFIX = '📱 Bài đăng:';
const POST_SHARE_DETAIL_PREFIX = '🔗 Xem chi tiết bài đăng này';
const POST_SHARE_ID_PREFIX = '🆔 Post ID:';
const POST_SHARE_IMAGE_PREFIX = '🖼️ Post Image:';

const FINAL_POST_STATUSES = ['da_ban', 'da_trao_doi', 'da_tang'];
const ACTIVE_ACCEPTED_STATUSES = [
  'nguoi_ban_da_chap_nhan',
  'cho_hen_gap',
  'cho_xac_nhan_hoan_tat',
];
const OPEN_DEAL_STATUSES = [
  'cho_nguoi_ban_xac_nhan',
  'nguoi_ban_da_chap_nhan',
  'cho_hen_gap',
  'cho_xac_nhan_hoan_tat',
];
const EMPTY_DEAL_CONTEXT = {
  post: null,
  transactions: [],
  currentTransaction: null,
  activeAcceptedOther: null,
  role: 'viewer',
  buyerId: null,
  sellerId: null,
};
const DEFAULT_MEETING_DRAFT = {
  address: '',
  time: null as Date | null,
  note: '',
  lat: null as number | null,
  lng: null as number | null,
};
const DEAL_STATUS_META: Record<string, { label: string; headline: string; description: string }> = {
  idle: {
    label: 'Sẵn sàng mở giao dịch',
    headline: 'Bật chốt đơn ngay trong đoạn chat này',
    description:
      'Gửi kèm bài viết và mở yêu cầu mua để cả web lẫn điện thoại cùng theo dõi một luồng giao dịch.',
  },
  cho_nguoi_ban_xac_nhan: {
    label: 'Chờ người bán xác nhận',
    headline: 'Yêu cầu mua đang chờ duyệt',
    description:
      'Người bán chỉ cần xác nhận một lần để bài đăng chuyển sang giữ chỗ cho đúng người mua.',
  },
  nguoi_ban_da_chap_nhan: {
    label: 'Đã chấp nhận',
    headline: 'Hai bên đã bắt đầu giao dịch',
    description:
      'Bài đăng đang được giữ cho người mua hiện tại. Có thể chốt điểm hẹn hoặc chuẩn bị xác nhận hoàn tất.',
  },
  cho_hen_gap: {
    label: 'Đang chốt điểm hẹn',
    headline: 'Điểm hẹn đang được cập nhật',
    description: 'Bổ sung nơi gặp và thời gian để cả web lẫn điện thoại thấy cùng một lịch hẹn.',
  },
  cho_xac_nhan_hoan_tat: {
    label: 'Chờ xác nhận hoàn tất',
    headline: 'Hai bên đang ở bước xác nhận cuối',
    description: 'Người mua và người bán đều cần xác nhận để bài đăng mới chuyển hẳn sang đã bán.',
  },
  hoan_tat: {
    label: 'Hoàn tất',
    headline: 'Giao dịch đã thành công',
    description: 'Bài đăng đã được chốt xong và lịch sử giao dịch vẫn được lưu trong đoạn chat này.',
  },
  nguoi_mua_da_huy: {
    label: 'Người mua đã hủy',
    headline: 'Yêu cầu mua đã được đóng',
    description: 'Bài đăng quay lại trạng thái mở bán và có thể tạo yêu cầu mới nếu người bán vẫn còn hàng.',
  },
  nguoi_ban_da_tu_choi: {
    label: 'Người bán từ chối',
    headline: 'Giao dịch này chưa được chốt',
    description: 'Đoạn chat vẫn còn, nhưng người bán chưa đồng ý giữ bài đăng cho yêu cầu này.',
  },
  he_thong_da_huy: {
    label: 'Hệ thống đã đóng',
    headline: 'Giao dịch này đã bị khóa',
    description:
      'Bài đăng đã được giữ cho người khác hoặc đã hoàn tất nên yêu cầu hiện tại không thể tiếp tục.',
  },
  het_han: {
    label: 'Đã hết hạn',
    headline: 'Yêu cầu mua đã quá hạn',
    description: 'Nếu bài đăng vẫn còn mở bán, người mua có thể tạo lại một yêu cầu giao dịch mới.',
  },
};
const POST_STATUS_META: Record<string, { label: string }> = {
  dang_ban: { label: 'Đang mở bán' },
  dang_giu_cho: { label: 'Đang giữ chỗ' },
  dang_giao_dich: { label: 'Đang giao dịch' },
  da_ban: { label: 'Đã bán' },
  da_trao_doi: { label: 'Đã trao đổi' },
  da_tang: { label: 'Đã tặng' },
};
const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const normalizeShareValue = (value: any) => {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : '';
};

const buildPostSharePayloadText = (postData: any) => {
  const postTitle = normalizeShareValue(postData?.postTitle) || 'Bài đăng từ OLODO';
  const meta = {
    postId: normalizeShareValue(postData?.postId) || null,
    postImage: normalizeShareValue(postData?.postImage) || null,
  };

  return `📱 Bài đăng: ${postTitle}\n🔗 Xem chi tiết bài đăng này\n${POST_SHARE_META_PREFIX}${JSON.stringify(meta)}`;
};

const extractPostShareMeta = (rawText: any) => {
  const text = typeof rawText === 'string' ? rawText : '';
  const markerIndex = text.indexOf(POST_SHARE_META_PREFIX);

  if (markerIndex === -1) {
    const lines = text.split('\n');
    const postId =
      lines
        .find((line) => line.startsWith(POST_SHARE_ID_PREFIX))
        ?.replace(POST_SHARE_ID_PREFIX, '')
        .trim() || null;
    const postImage =
      lines
        .find((line) => line.startsWith(POST_SHARE_IMAGE_PREFIX))
        ?.replace(POST_SHARE_IMAGE_PREFIX, '')
        .trim() || null;
    const cleanText = lines
      .filter(
        (line) =>
          !line.startsWith(POST_SHARE_ID_PREFIX) &&
          !line.startsWith(POST_SHARE_IMAGE_PREFIX) &&
          line !== POST_SHARE_META_PREFIX,
      )
      .join('\n')
      .trim();

    return {
      cleanText,
      postId: normalizeShareValue(postId) || null,
      postImage: normalizeShareValue(postImage) || null,
    };
  }

  const cleanText = text.slice(0, markerIndex).trimEnd();
  const rawMeta = text.slice(markerIndex + POST_SHARE_META_PREFIX.length).trim();

  try {
    const parsed = JSON.parse(rawMeta);
    return {
      cleanText,
      postId: normalizeShareValue(parsed?.postId) || null,
      postImage: normalizeShareValue(parsed?.postImage) || null,
    };
  } catch {
    return {
      cleanText: text,
      postId: null,
      postImage: null,
    };
  }
};

const getDealStatusMeta = (status?: string | null) => {
  if (!status) {
    return DEAL_STATUS_META.idle;
  }

  return DEAL_STATUS_META[status] || DEAL_STATUS_META.idle;
};

const getPostStatusLabel = (status?: string | null) =>
  POST_STATUS_META[String(status || '')]?.label || 'Đang cập nhật';

const formatCurrency = (value: any) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Thương lượng';
  }

  return currencyFormatter.format(amount);
};

const formatDealDateTime = (value: any) => {
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

const formatMeetingButtonText = (value: Date | null) => {
  if (!value) {
    return 'Chọn ngày giờ';
  }

  return value.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const parseDateValue = (value: any) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toMySqlDateTime = (value: Date | null) => {
  if (!value) {
    return null;
  }

  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  const hours = `${value.getHours()}`.padStart(2, '0');
  const minutes = `${value.getMinutes()}`.padStart(2, '0');
  const seconds = `${value.getSeconds()}`.padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const buildLocationLabel = async (latitude: number, longitude: number) => {
  try {
    const places = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = places?.[0];
    const address = [
      place?.name,
      place?.street,
      place?.district,
      place?.city,
      place?.region,
      place?.country,
    ]
      .filter(Boolean)
      .join(', ');

    if (address) {
      return address;
    }
  } catch (error) {
    console.error('Reverse geocode failed:', error);
  }

  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
};

const resolveDealContext = ({
  rawPost,
  rawTransactions,
  currentUserId,
  otherUserId,
}: {
  rawPost: any;
  rawTransactions: any[];
  currentUserId: string;
  otherUserId: string;
}) => {
  if (!rawPost) {
    return EMPTY_DEAL_CONTEXT;
  }

  const imageList = Array.isArray(rawPost.DanhSachAnh) ? rawPost.DanhSachAnh : [];
  const post = {
    id: rawPost.ID_BaiDang,
    title: rawPost.tieu_de || 'Bài đăng',
    price: rawPost.gia,
    location: rawPost.vi_tri || 'Chưa có vị trí',
    authorId: rawPost.ID_NguoiDung,
    image: normalizeBackendMediaUrl(imageList[0] || ''),
    status: rawPost.trang_thai || 'dang_ban',
    sellerName: rawPost.TenNguoiDung || 'Người bán',
    sellerAvatar: normalizeBackendMediaUrl(rawPost.anh_dai_dien || '', 'avatars'),
    category: rawPost.TenDanhMuc || 'Bài đăng',
    typeLabel: rawPost.TenLoaiBaiDang || '',
  };

  let role = 'viewer';
  let buyerId: string | null = null;
  const sellerId = String(rawPost.ID_NguoiDung || '');

  if (sellerId && sellerId === String(currentUserId) && sellerId !== String(otherUserId)) {
    role = 'seller';
    buyerId = String(otherUserId);
  } else if (sellerId && sellerId === String(otherUserId)) {
    role = 'buyer';
    buyerId = String(currentUserId);
  }

  const buyerTransactions = buyerId
    ? rawTransactions.filter(
        (transaction) =>
          String(transaction.ID_NguoiBan) === String(sellerId) &&
          String(transaction.ID_NguoiMua) === String(buyerId),
      )
    : [];

  const openTransaction =
    buyerTransactions.find((transaction) => OPEN_DEAL_STATUSES.includes(transaction.trang_thai)) || null;
  const completedTransaction =
    buyerTransactions.find((transaction) => transaction.trang_thai === 'hoan_tat') || null;
  const currentTransaction =
    openTransaction || (FINAL_POST_STATUSES.includes(post.status) ? completedTransaction : null);

  const activeAcceptedOther =
    rawTransactions.find(
      (transaction) =>
        ACTIVE_ACCEPTED_STATUSES.includes(transaction.trang_thai) &&
        (!buyerId || String(transaction.ID_NguoiMua) !== String(buyerId)),
    ) || null;

  return {
    post,
    transactions: rawTransactions,
    currentTransaction,
    activeAcceptedOther,
    role,
    buyerId,
    sellerId,
  };
};

const MeetingPlannerModal = ({
  visible,
  draft,
  setDraft,
  onClose,
  onSave,
  onUseCurrentLocation,
  isSaving,
  isLocating,
}: any) => {
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);

  const handleDateTimeChange = (_event: any, selectedValue?: Date) => {
    if (Platform.OS === 'android') {
      setPickerMode(null);
    }

    if (!selectedValue) {
      return;
    }

    setDraft((prev: typeof DEFAULT_MEETING_DRAFT) => {
      const nextDate = prev.time ? new Date(prev.time) : new Date();

      if (pickerMode === 'date') {
        nextDate.setFullYear(
          selectedValue.getFullYear(),
          selectedValue.getMonth(),
          selectedValue.getDate(),
        );
      } else {
        nextDate.setHours(selectedValue.getHours(), selectedValue.getMinutes(), 0, 0);
      }

      return {
        ...prev,
        time: nextDate,
      };
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.dealModalOverlay}>
        <KeyboardAvoidingView
          style={styles.dealModalKeyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.dealModalCard}>
            <View style={styles.dealModalHeader}>
              <View style={styles.dealModalHandle} />
              <TouchableOpacity style={styles.dealModalCloseButton} onPress={onClose}>
                <Ionicons name="close" size={22} color="#7f001f" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.dealModalTitle}>Chốt điểm hẹn cho giao dịch</Text>
              <Text style={styles.dealModalDescription}>
                Bạn có thể dùng vị trí hiện tại hoặc nhập thủ công địa chỉ để bên web và điện thoại cùng xem một lịch hẹn.
              </Text>

              <TouchableOpacity
                style={[styles.dealSecondaryAction, isLocating && styles.disabledButton]}
                onPress={onUseCurrentLocation}
                disabled={isLocating}
              >
                <Ionicons name="location-outline" size={18} color={PRIMARY_COLOR} />
                <Text style={styles.dealSecondaryActionText}>
                  {isLocating ? 'Đang lấy vị trí...' : 'Dùng vị trí hiện tại'}
                </Text>
              </TouchableOpacity>

              <View style={styles.dealFieldBlock}>
                <Text style={styles.dealFieldLabel}>Địa chỉ điểm hẹn</Text>
                <TextInput
                  style={styles.dealTextInput}
                  value={draft.address}
                  onChangeText={(value) => setDraft((prev: any) => ({ ...prev, address: value }))}
                  placeholder="Ví dụ: Cổng trường lúc 18:00"
                  placeholderTextColor="#9a7b83"
                  multiline
                />
              </View>

              <View style={styles.dealFieldRow}>
                <TouchableOpacity
                  style={styles.dealDateButton}
                  onPress={() => setPickerMode('date')}
                >
                  <Ionicons name="calendar-outline" size={18} color="#7f001f" />
                  <Text style={styles.dealDateButtonText}>
                    {draft.time
                      ? draft.time.toLocaleDateString('vi-VN')
                      : 'Chọn ngày'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dealDateButton}
                  onPress={() => setPickerMode('time')}
                >
                  <Ionicons name="time-outline" size={18} color="#7f001f" />
                  <Text style={styles.dealDateButtonText}>
                    {draft.time
                      ? draft.time.toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Chọn giờ'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dealFieldBlock}>
                <Text style={styles.dealFieldLabel}>Ghi chú thêm</Text>
                <TextInput
                  style={[styles.dealTextInput, styles.dealTextInputTall]}
                  value={draft.note}
                  onChangeText={(value) => setDraft((prev: any) => ({ ...prev, note: value }))}
                  placeholder="Ví dụ: Mình mặc áo đen, đến hơi muộn 5 phút."
                  placeholderTextColor="#9a7b83"
                  multiline
                />
              </View>

              <View style={styles.dealMeetingMetaCard}>
                <Text style={styles.dealMeetingMetaLabel}>Lịch hẹn đang chọn</Text>
                <Text style={styles.dealMeetingMetaValue}>{formatMeetingButtonText(draft.time)}</Text>
                <Text style={styles.dealMeetingMetaHint}>
                  {draft.lat && draft.lng
                    ? `Toạ độ đã ghim: ${draft.lat.toFixed(5)}, ${draft.lng.toFixed(5)}`
                    : 'Bạn có thể để trống toạ độ nếu chỉ muốn nhập địa chỉ thủ công.'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.dealPrimaryAction, isSaving && styles.disabledButton]}
                onPress={onSave}
                disabled={isSaving}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.dealPrimaryActionText}>
                  {isSaving ? 'Đang lưu...' : 'Lưu điểm hẹn'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>

      {pickerMode && (
        <DateTimePicker
          value={draft.time || new Date()}
          mode={pickerMode}
          display="default"
          minimumDate={new Date()}
          onChange={handleDateTimeChange}
        />
      )}
    </Modal>
  );
};

const DealRoomPanel = ({
  loading,
  activePostId,
  dealContext,
  dealNotice,
  actionLoading,
  purchaseNote,
  setPurchaseNote,
  currentUserId,
  onCreateRequest,
  onAccept,
  onReject,
  onCancel,
  onOpenMeeting,
  onRequestComplete,
  onViewPost,
}: any) => {
  if (!activePostId && !loading && !dealContext.post) {
    return null;
  }

  const transaction = dealContext.currentTransaction;
  const role = dealContext.role;
  const currentStatusMeta = getDealStatusMeta(transaction?.trang_thai);
  const completionState = transaction?.completion_confirmation || {
    sellerConfirmed: false,
    buyerConfirmed: false,
    confirmedByUserIds: [],
  };
  const hasCurrentUserConfirmed = completionState.confirmedByUserIds?.includes(String(currentUserId));
  const canConfirmCompletion = Boolean(
    transaction?.dia_chi_hen_gap && transaction?.thoi_gian_hen_gap,
  );
  const showBuyerRequestComposer =
    role === 'buyer' &&
    !transaction &&
    !dealContext.activeAcceptedOther &&
    !FINAL_POST_STATUSES.includes(dealContext.post?.status) &&
    Boolean(activePostId);
  const showSellerApprovalActions =
    role === 'seller' && transaction?.trang_thai === 'cho_nguoi_ban_xac_nhan';
  const showBuyerPendingState =
    role === 'buyer' && transaction?.trang_thai === 'cho_nguoi_ban_xac_nhan';
  const showLiveDealActions =
    Boolean(transaction) && ACTIVE_ACCEPTED_STATUSES.includes(transaction?.trang_thai);
  const showCompleted = transaction?.trang_thai === 'hoan_tat';

  let unavailableMessage = '';
  if (FINAL_POST_STATUSES.includes(dealContext.post?.status) && !showCompleted) {
    unavailableMessage =
      'Bài đăng này đã được xử lý xong nên hệ thống sẽ không hiện nút yêu cầu mua nữa.';
  } else if (role === 'viewer' && dealContext.post) {
    unavailableMessage =
      'Bạn đang chat với người không phải chủ bài đăng này, nên chỉ có thể xem thông tin giao dịch.';
  } else if (dealContext.activeAcceptedOther && !transaction) {
    unavailableMessage =
      'Bài đăng hiện đang được giữ cho người mua khác nên đoạn chat này chưa thể mở yêu cầu mới.';
  }

  return (
    <View style={styles.dealRoomWrapper}>
      <LinearGradient
        colors={showCompleted ? ['#0f766e', '#10b981', '#eafff7'] : ['#7f001f', '#aa123e', '#fff4ea']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.dealRoomCard}
      >
        <View style={styles.dealRoomTopRow}>
          <View style={styles.dealRoomHeadlineWrap}>
            <Text style={styles.dealRoomKicker}>DEAL ROOM</Text>
            <Text style={styles.dealRoomHeadline}>{currentStatusMeta.headline}</Text>
            <Text style={styles.dealRoomDescription}>{currentStatusMeta.description}</Text>
          </View>
          <View style={styles.dealRoomStatusPill}>
            <Text style={styles.dealRoomStatusText}>
              {showCompleted ? 'Thành công' : currentStatusMeta.label}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.dealLoadingBlock}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.dealLoadingText}>Đang tải thông tin giao dịch...</Text>
          </View>
        ) : (
          <>
            {dealContext.post && (
              <TouchableOpacity
                style={styles.dealPostCard}
                onPress={onViewPost}
                activeOpacity={0.92}
              >
                {dealContext.post.image ? (
                  <Image source={{ uri: dealContext.post.image }} style={styles.dealPostImage} />
                ) : (
                  <View style={styles.dealPostPlaceholder}>
                    <Ionicons name="image-outline" size={20} color="#7f001f" />
                  </View>
                )}

                <View style={styles.dealPostContent}>
                  <Text style={styles.dealPostTitle} numberOfLines={2}>
                    {dealContext.post.title}
                  </Text>
                  <Text style={styles.dealPostPrice}>{formatCurrency(dealContext.post.price)}</Text>
                  <Text style={styles.dealPostMeta} numberOfLines={2}>
                    {dealContext.post.location}
                  </Text>
                  <View style={styles.dealChipRow}>
                    <View style={styles.dealChip}>
                      <Text style={styles.dealChipText}>
                        {role === 'seller' ? 'Vai trò: Người bán' : role === 'buyer' ? 'Vai trò: Người mua' : 'Chỉ xem'}
                      </Text>
                    </View>
                    <View style={styles.dealChip}>
                      <Text style={styles.dealChipText}>
                        {getPostStatusLabel(dealContext.post.status)}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {transaction?.ghi_chu_nguoi_mua ? (
              <View style={styles.dealNoteCard}>
                <Text style={styles.dealNoteLabel}>Ghi chú từ người mua</Text>
                <Text style={styles.dealNoteText}>{transaction.ghi_chu_nguoi_mua}</Text>
              </View>
            ) : null}

            {transaction?.dia_chi_hen_gap ? (
              <View style={styles.dealMeetingCard}>
                <View style={styles.dealMeetingHeader}>
                  <Ionicons name="location-outline" size={18} color={PRIMARY_COLOR} />
                  <Text style={styles.dealMeetingTitle}>Điểm hẹn hiện tại</Text>
                </View>
                <Text style={styles.dealMeetingAddress}>{transaction.dia_chi_hen_gap}</Text>
                <Text style={styles.dealMeetingTime}>
                  {formatDealDateTime(transaction.thoi_gian_hen_gap)}
                  {transaction.ghi_chu_hen_gap ? ` · ${transaction.ghi_chu_hen_gap}` : ''}
                </Text>
              </View>
            ) : null}

            {transaction && !showCompleted ? (
              <View style={styles.dealCompletionCard}>
                <Text style={styles.dealCompletionTitle}>Xác nhận hoàn tất</Text>
                <View style={styles.dealCompletionRow}>
                  <View
                    style={[
                      styles.dealCompletionPill,
                      completionState.sellerConfirmed && styles.dealCompletionPillDone,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dealCompletionPillText,
                        completionState.sellerConfirmed && styles.dealCompletionPillTextDone,
                      ]}
                    >
                      Người bán {completionState.sellerConfirmed ? 'đã xác nhận' : 'đang chờ'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.dealCompletionPill,
                      completionState.buyerConfirmed && styles.dealCompletionPillDone,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dealCompletionPillText,
                        completionState.buyerConfirmed && styles.dealCompletionPillTextDone,
                      ]}
                    >
                      Người mua {completionState.buyerConfirmed ? 'đã xác nhận' : 'đang chờ'}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {dealNotice ? (
              <View
                style={[
                  styles.dealNoticeBanner,
                  dealNotice.type === 'error' ? styles.dealNoticeError : styles.dealNoticeSuccess,
                ]}
              >
                <Ionicons
                  name={dealNotice.type === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                  size={18}
                  color={dealNotice.type === 'error' ? '#7f1d1d' : '#065f46'}
                />
                <Text
                  style={[
                    styles.dealNoticeText,
                    dealNotice.type === 'error'
                      ? styles.dealNoticeTextError
                      : styles.dealNoticeTextSuccess,
                  ]}
                >
                  {dealNotice.text}
                </Text>
              </View>
            ) : null}

            {showCompleted ? (
              <View style={styles.dealSuccessCard}>
                <Ionicons name="sparkles-outline" size={34} color="#fff" />
                <Text style={styles.dealSuccessTitle}>Hai bạn đã giao dịch thành công</Text>
                <Text style={styles.dealSuccessText}>
                  Bài đăng đã được chốt xong. Đoạn chat này sẽ giữ lại lịch sử để tiện đối chiếu sau.
                </Text>
              </View>
            ) : showBuyerRequestComposer ? (
              <View style={styles.dealActionPanel}>
                <Text style={styles.dealActionTitle}>Mở yêu cầu mua ngay trong chat</Text>
                <TextInput
                  style={styles.dealComposerInput}
                  value={purchaseNote}
                  onChangeText={setPurchaseNote}
                  placeholder="Ví dụ: Mình chốt luôn tối nay, có thể gặp ở cổng trường lúc 18:00."
                  placeholderTextColor="#c08c95"
                  multiline
                />
                <TouchableOpacity
                  style={[styles.dealPrimaryAction, actionLoading === 'request' && styles.disabledButton]}
                  onPress={onCreateRequest}
                  disabled={actionLoading === 'request'}
                >
                  <Ionicons name="send-outline" size={18} color="#fff" />
                  <Text style={styles.dealPrimaryActionText}>
                    {actionLoading === 'request' ? 'Đang gửi...' : 'Yêu cầu mua'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : showSellerApprovalActions ? (
              <View style={styles.dealActionPanel}>
                <Text style={styles.dealActionTitle}>Người mua đang chờ bạn xác nhận</Text>
                <View style={styles.dealButtonRow}>
                  <TouchableOpacity
                    style={[styles.dealPrimaryAction, actionLoading === 'accept' && styles.disabledButton]}
                    onPress={onAccept}
                    disabled={actionLoading === 'accept'}
                  >
                    <Ionicons name="checkmark-outline" size={18} color="#fff" />
                    <Text style={styles.dealPrimaryActionText}>
                      {actionLoading === 'accept' ? 'Đang xác nhận...' : 'Xác nhận mua'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dealGhostAction, actionLoading === 'reject' && styles.disabledButton]}
                    onPress={onReject}
                    disabled={actionLoading === 'reject'}
                  >
                    <Ionicons name="close-outline" size={18} color={PRIMARY_COLOR} />
                    <Text style={styles.dealGhostActionText}>
                      {actionLoading === 'reject' ? 'Đang từ chối...' : 'Từ chối'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : showBuyerPendingState ? (
              <View style={styles.dealActionPanel}>
                <Text style={styles.dealActionTitle}>Yêu cầu mua đã được gửi</Text>
                <Text style={styles.dealActionHint}>
                  Hệ thống đang chờ người bán xác nhận. Bạn vẫn có thể hủy nếu đổi ý.
                </Text>
                <TouchableOpacity
                  style={[styles.dealDangerAction, actionLoading === 'cancel' && styles.disabledButton]}
                  onPress={onCancel}
                  disabled={actionLoading === 'cancel'}
                >
                  <Ionicons name="trash-outline" size={18} color="#fff" />
                  <Text style={styles.dealDangerActionText}>
                    {actionLoading === 'cancel' ? 'Đang hủy...' : 'Hủy yêu cầu'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : showLiveDealActions ? (
              <View style={styles.dealActionPanel}>
                <Text style={styles.dealActionTitle}>Thao tác nhanh cho giao dịch</Text>
                <Text style={styles.dealActionHint}>
                  Cập nhật điểm hẹn, xác nhận hoàn tất và hủy giao dịch ngay trong đoạn chat này.
                </Text>
                <View style={styles.dealButtonRow}>
                  <TouchableOpacity style={styles.dealGhostAction} onPress={onOpenMeeting}>
                    <Ionicons name="location-outline" size={18} color={PRIMARY_COLOR} />
                    <Text style={styles.dealGhostActionText}>
                      {transaction?.dia_chi_hen_gap ? 'Sửa điểm hẹn' : 'Chốt điểm hẹn'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dealSuccessAction,
                      (!canConfirmCompletion ||
                        hasCurrentUserConfirmed ||
                        actionLoading === 'requestComplete') &&
                        styles.disabledButton,
                    ]}
                    onPress={onRequestComplete}
                    disabled={
                      !canConfirmCompletion ||
                      hasCurrentUserConfirmed ||
                      actionLoading === 'requestComplete'
                    }
                  >
                    <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
                    <Text style={styles.dealSuccessActionText}>
                      {hasCurrentUserConfirmed
                        ? 'Bạn đã xác nhận'
                        : actionLoading === 'requestComplete'
                          ? 'Đang ghi nhận...'
                          : role === 'seller'
                            ? 'Xác nhận giao xong'
                            : 'Xác nhận đã nhận hàng'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.dealDangerAction, actionLoading === 'cancel' && styles.disabledButton]}
                  onPress={onCancel}
                  disabled={actionLoading === 'cancel'}
                >
                  <Ionicons name="close-circle-outline" size={18} color="#fff" />
                  <Text style={styles.dealDangerActionText}>
                    {actionLoading === 'cancel' ? 'Đang hủy...' : 'Hủy giao dịch'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : unavailableMessage ? (
              <View style={styles.dealUnavailableCard}>
                <Ionicons name="information-circle-outline" size={18} color="#7f001f" />
                <Text style={styles.dealUnavailableText}>{unavailableMessage}</Text>
              </View>
            ) : null}
          </>
        )}
      </LinearGradient>
    </View>
  );
};

// --- COMPONENT CON: HEADER ---
const ChatHeader = ({ user, onBack, onAvatarPress }) => (
  <View style={styles.headerContainer}>
    <TouchableOpacity style={styles.headerButton} onPress={onBack}>
      <Ionicons name="arrow-back" size={26} color="#fff" />
    </TouchableOpacity>
    <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.8}>
      <Image source={{ uri: user.avatar }} style={styles.headerAvatar} />
    </TouchableOpacity>
    <View style={styles.headerTextContainer}>
      <Text style={styles.headerName}>{user.name}</Text>
      <Text style={styles.headerStatus}>{user.online ? 'Online' : 'Offline'}</Text>
    </View>
    <View style={styles.headerRightIcons}>
      <TouchableOpacity style={styles.headerButton}>
        <Ionicons name="call" size={22} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.headerButton}>
        <Ionicons name="videocam" size={24} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.headerButton}>
        <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  </View>
);

// --- COMPONENT CON: THÔNG BÁO THU HỒI ---
const RecallNotification = ({ messageId, isMyMessage }) => (
  <View
    style={[
      styles.recallContainer,
      isMyMessage ? styles.myRecallContainer : styles.otherRecallContainer,
    ]}
  >
    <View style={styles.recallBubble}>
      <Ionicons name="return-up-back" size={16} color="#4CAF50" />
      <Text style={styles.recallText}>
        {isMyMessage ? 'Bạn đã thu hồi một tin nhắn' : 'Tin nhắn đã được thu hồi'}
      </Text>
    </View>
  </View>
);

// --- COMPONENT CON: HIỂN THỊ MEDIA ---
const MediaMessage = ({ item, isMyMessage, onPress, onLongPress }) => {
  const { width } = Dimensions.get('window');
  const maxWidth = width * 0.5; // Điều chỉnh về 50% chiều rộng màn hình để ảnh rộng gần bằng nửa khung hình
  const maxHeight = 300; // Tăng từ 200 lên 300 để ảnh cao hơn

  const getMediaType = (uri) => {
    if (!uri) return 'image';
    const extension = uri.split('.').pop().toLowerCase();
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
    return videoExtensions.includes(extension) ? 'video' : 'image';
  };

  const mediaUri =
    item.mediaUri ||
    (item.file_dinh_kem
      ? normalizeBackendMediaUrl(item.file_dinh_kem, 'messages')
      : null);

  const mediaType = getMediaType(mediaUri);

  return (
    <TouchableOpacity
      style={[
        styles.mediaContainer,
        isMyMessage ? styles.myMediaContainer : styles.otherMediaContainer,
      ]}
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      activeOpacity={0.8}
    >
      <View
        style={[styles.mediaBubble, isMyMessage ? styles.myMediaBubble : styles.otherMediaBubble]}
      >
        {mediaType === 'image' ? (
          <Image
            source={{ uri: mediaUri }}
            style={[styles.mediaImage, { maxWidth, maxHeight }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.videoContainer, { maxWidth, maxHeight }]}>
            <Image source={{ uri: mediaUri }} style={styles.videoThumbnail} resizeMode="cover" />
            <View style={styles.playButton}>
              <Ionicons name="play" size={30} color="#fff" />
            </View>
          </View>
        )}
        {item.text && item.text.trim() && (
          <Text
            style={[styles.mediaText, isMyMessage ? styles.myMediaText : styles.otherMediaText]}
          >
            {item.text}
          </Text>
        )}
      </View>
      <Text style={[styles.timestamp, isMyMessage ? styles.myTimestamp : styles.otherTimestamp]}>
        {item.timestamp}
      </Text>
    </TouchableOpacity>
  );
};

// --- COMPONENT CON: TIN NHẮN CHIA SẺ BÀI ĐĂNG ---
const PostShareMessage = ({ item, isMyMessage, onMessagePress, onOpenDealRoom }) => {
  // Extract post info from message text
  const lines = item.text.split('\n');
  const postTitle = lines
    .find((line) => line.includes('📱 Bài đăng:'))
    ?.replace('📱 Bài đăng:', '')
    .trim();

  return (
    <TouchableOpacity
      style={[
        styles.messageItemContainer,
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
      ]}
      onLongPress={() => onMessagePress(item)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.bubbleBase,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          styles.postShareBubble,
        ]}
      >
        {/* Post share card with image */}
        <TouchableOpacity
          style={styles.postShareCard}
          onPress={() => {
            // Navigate to post detail using postId from message
            if (item.postId) {
              router.push({
                pathname: '/components/BaiDang/chitietbaidang',
                params: { postId: item.postId },
              });
            }
          }}
          activeOpacity={0.8}
        >
          {/* Post image */}
          {item.postImage && (
            <Image
              source={{ uri: item.postImage }}
              style={styles.postShareCardImage}
              resizeMode="cover"
            />
          )}

          <View style={styles.postShareCardContent}>
            <View style={styles.postShareCardText}>
              <Text style={[styles.postShareCardTitle, { color: isMyMessage ? '#fff' : '#333' }]}>
                {postTitle || 'Bài đăng từ OLODO'}
              </Text>
              <Text
                style={[styles.postShareCardSubtitle, { color: isMyMessage ? '#f0f0f0' : '#666' }]}
              >
                Ấn để xem chi tiết
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={isMyMessage ? '#fff' : '#999'} />
          </View>
        </TouchableOpacity>

        {item.postId ? (
          <TouchableOpacity
            style={styles.postShareDealButton}
            onPress={() => onOpenDealRoom?.(String(item.postId))}
            activeOpacity={0.9}
          >
            <Ionicons name="flash-outline" size={16} color="#fff" />
            <Text style={styles.postShareDealButtonText}>Chốt đơn hàng</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={[styles.timestamp, isMyMessage ? styles.myTimestamp : styles.otherTimestamp]}>
        {item.timestamp}
      </Text>
    </TouchableOpacity>
  );
};

// --- COMPONENT CON: MỘT TIN NHẮN ---
const MessageItem = ({
  item,
  currentUserId,
  onMessagePress,
  onImagePress,
  recalledMessages,
  onOpenDealRoom,
}) => {
  const isMyMessage = item.senderId === currentUserId || item.senderId === 'me';
  const isRecalled = recalledMessages.has(item.id) || item.da_xoa_gui === 1;

  // Nếu tin nhắn đã bị thu hồi (từ recalledMessages hoặc da_xoa_gui = 1), hiển thị thông báo thu hồi
  if (isRecalled) {
    return <RecallNotification messageId={item.id} isMyMessage={isMyMessage} />;
  }

  // Nếu là tin nhắn vị trí
  if (item.location) {
    return <LocationMessage item={item} isMyMessage={isMyMessage} />;
  }

  // Nếu là tin nhắn media (ảnh/video)
  if (item.mediaUri || item.file_dinh_kem) {
    return (
      <MediaMessage
        item={item}
        isMyMessage={isMyMessage}
        onPress={() => onImagePress(item)}
        onLongPress={() => onMessagePress(item)}
      />
    );
  }

  // Kiểm tra nếu là tin nhắn chia sẻ bài đăng
  if (
    item.isPostShare ||
    (item.text &&
      item.text.includes('📱 Bài đăng:') &&
      item.text.includes('🔗 Xem chi tiết bài đăng này'))
  ) {
    return (
      <PostShareMessage
        item={item}
        isMyMessage={isMyMessage}
        onMessagePress={onMessagePress}
        onOpenDealRoom={onOpenDealRoom}
      />
    );
  }

  // Tin nhắn text thông thường
  const containerStyle = [
    styles.messageItemContainer,
    isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
  ];

  const bubbleStyle = [
    styles.bubbleBase,
    isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
  ];

  const textStyle = isMyMessage ? styles.myMessageText : styles.otherMessageText;
  const timeStyle = isMyMessage ? styles.myTimestamp : styles.otherTimestamp;

  return (
    <TouchableOpacity
      style={containerStyle}
      onLongPress={() => onMessagePress(item)}
      activeOpacity={0.7}
    >
      <View style={bubbleStyle}>
        <Text style={textStyle}>{item.text}</Text>
      </View>
      <Text style={[styles.timestamp, timeStyle]}>{item.timestamp}</Text>
    </TouchableOpacity>
  );
};

// --- COMPONENT CON: HIỂN THỊ NHIỀU ẢNH ---
const ImagePreviewRow = ({ images, onRemoveImage, onRemoveAll }) => {
  if (images.length === 0) return null;

  return (
    <View style={styles.imagePreviewRow}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScrollView}>
        {images.map((uri, index) => (
          <View key={index} style={styles.imagePreviewItem}>
            <Image source={{ uri }} style={styles.imagePreviewThumbnail} />
            <TouchableOpacity style={styles.removeImageButton} onPress={() => onRemoveImage(index)}>
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      {images.length > 1 && (
        <TouchableOpacity style={styles.removeAllButton} onPress={onRemoveAll}>
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      )}
    </View>
  );
};

// --- COMPONENT CON: IMAGE VIEWER ---
const ImageViewer = ({ visible, imageUri, onClose, onDownload, onShare }) => {
  if (!visible || !imageUri) return null;

  console.log('🖼️ ImageViewer rendering with URI:', imageUri);

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.imageViewerOverlay}>
        {/* Header với các nút action - Đặt ở trên cùng */}
        <View style={styles.imageViewerTopBar}>
          <TouchableOpacity style={styles.imageViewerCloseButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Ảnh chính */}
        <View style={styles.imageViewerContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.imageViewerImage}
            resizeMode="contain"
            onError={(error) => {
              console.log('❌ Image load error:', error);
            }}
            onLoad={() => {
              console.log('✅ Image loaded successfully');
            }}
          />
        </View>

        {/* Bottom action bar */}
        <View style={styles.imageViewerBottomBar}>
          <TouchableOpacity style={styles.imageViewerActionButton} onPress={onDownload}>
            <Ionicons name="download-outline" size={24} color="#fff" />
            <Text style={styles.imageViewerActionText}>Tải xuống</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.imageViewerActionButton} onPress={onShare}>
            <Ionicons name="share-outline" size={24} color="#fff" />
            <Text style={styles.imageViewerActionText}>Chia sẻ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// --- COMPONENT CON: FORM CHIA SẺ BÀI ĐĂNG ---
const PostShareForm = ({ postData, onSend, onCancel, inputText, setInputText }) => {
  if (!postData) return null;

  return (
    <View style={styles.postShareFormContainer}>
      {/* Header */}
      <View style={styles.postShareHeader}>
        <Text style={styles.postShareTitle}>Chia sẻ bài đăng</Text>
        <TouchableOpacity style={styles.postShareCloseButton} onPress={onCancel}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Post Preview */}
      <TouchableOpacity
        style={styles.postPreviewContainer}
        onPress={() => {
          // Navigate to post detail
          router.push({
            pathname: '/components/BaiDang/chitietbaidang',
            params: { postId: postData.postId },
          });
          // Close the share form
          onCancel();
        }}
        activeOpacity={0.8}
      >
        <View style={styles.postPreviewContent}>
          {postData.postImage && (
            <Image source={{ uri: postData.postImage }} style={styles.postPreviewImage} />
          )}
          <View style={styles.postPreviewText}>
            <Text style={styles.postPreviewTitle} numberOfLines={2}>
              {postData.postTitle}
            </Text>
            <Text style={styles.postPreviewLabel}>Bài đăng từ OLODO - Ấn để xem chi tiết</Text>
          </View>
          <View style={styles.postPreviewArrow}>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </View>
      </TouchableOpacity>

      {/* Input Section */}
      <View style={styles.postShareInputContainer}>
        <TextInput
          style={styles.postShareTextInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Viết tin nhắn của bạn..."
          placeholderTextColor="#999"
          multiline
          maxLength={500}
        />
        <Text style={styles.postShareCharCount}>{inputText.length}/500</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.postShareActions}>
        <TouchableOpacity style={styles.postShareCancelButton} onPress={onCancel}>
          <Text style={styles.postShareCancelText}>Hủy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.postShareSendButton}
          onPress={onSend}
        >
          <Ionicons name="send" size={20} color="#fff" />
          <Text style={styles.postShareSendText}>Gửi bài viết</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- COMPONENT CON: TIN NHẮN VỊ TRÍ ---
const LocationMessage = ({ item, isMyMessage }) => {
  const handleOpenMap = () => {
    if (item.location) {
      const url = `https://www.google.com/maps?q=${item.location.latitude},${item.location.longitude}`;
      Linking.openURL(url);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.messageItemContainer,
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
      ]}
      onPress={handleOpenMap}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.bubbleBase,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          styles.locationBubble,
        ]}
      >
        <View style={styles.locationIcon}>
          <Ionicons name="location" size={40} color={isMyMessage ? '#fff' : PRIMARY_COLOR} />
        </View>
        <Text style={[styles.locationText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
          📍 Vị trí của tôi
        </Text>
        <Text style={[styles.locationSubtext, isMyMessage ? { color: '#f0f0f0' } : { color: '#666' }]}>
          Nhấn để xem trên bản đồ
        </Text>
      </View>
      <Text style={[styles.timestamp, isMyMessage ? styles.myTimestamp : styles.otherTimestamp]}>
        {item.timestamp}
      </Text>
    </TouchableOpacity>
  );
};

// --- COMPONENT CON: KHUNG NHẬP LIỆU ---
const InputBar = ({ onSend, inputText, setInputText, onImagePress, onLocationPress }) => {
  return (
    <View style={styles.inputContainer}>
      <TouchableOpacity style={styles.inputIconButton} onPress={onImagePress}>
        <Ionicons name="image" size={24} color="#555" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.inputIconButton} onPress={onLocationPress}>
        <Ionicons name="location" size={24} color="#555" />
      </TouchableOpacity>

      <TextInput
        style={styles.textInput}
        value={inputText}
        onChangeText={setInputText}
        placeholder="Write your message"
        placeholderTextColor="#999"
        multiline
      />
      <TouchableOpacity style={styles.inputIconButton} onPress={onSend}>
        <Ionicons name="paper-plane" size={24} color={PRIMARY_COLOR} />
      </TouchableOpacity>
    </View>
  );
};

// --- COMPONENT CHÍNH: MÀN HÌNH CHAT ---
const ChatDetailScreen = () => {
  const params = useLocalSearchParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userToken, setUserToken] = useState<string | null>(null);
  const [otherUser] = useState({
    id: (params.userId as string) || 'unknown',
    name: (params.userName as string) || 'Unknown User',
    avatar:
      normalizeBackendMediaUrl(params.userAvatar as string) || 'https://i.pravatar.cc/150?img=1',
    online: true,
  });
  const [hasExistingConversation] = useState(params.hasExistingConversation === 'true');
  const [isTyping, setIsTyping] = useState(false); // Để hiển thị typing indicator nếu cần
  const [showMessageOptions, setShowMessageOptions] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [recalledMessages] = useState<Set<string>>(new Set());
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState<string>('');
  const [showPostShareForm, setShowPostShareForm] = useState(false);
  const [sharePostData, setSharePostData] = useState<any>(null);
  const [shareFormInput, setShareFormInput] = useState('');
  const [focusedDealPostId, setFocusedDealPostId] = useState<string>('');
  const [dealContext, setDealContext] = useState(EMPTY_DEAL_CONTEXT);
  const [loadingDeal, setLoadingDeal] = useState(false);
  const [dealActionLoading, setDealActionLoading] = useState('');
  const [dealNotice, setDealNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );
  const [purchaseNote, setPurchaseNote] = useState('');
  const [showMeetingPlanner, setShowMeetingPlanner] = useState(false);
  const [meetingDraft, setMeetingDraft] = useState(DEFAULT_MEETING_DRAFT);
  const [meetingLocationLoading, setMeetingLocationLoading] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeDealPostIdRef = useRef<string | null>(focusedDealPostId || null);

  const latestSharedPostMessage = useMemo(
    () => [...messages].reverse().find((item) => item.isPostShare && item.postId) || null,
    [messages],
  );

  const activeDealPostId = focusedDealPostId || null;
  const dealRoomStorageKey = useMemo(
    () =>
      currentUserId && otherUser.id
        ? `${DEAL_ROOM_STORAGE_PREFIX}:${currentUserId}:${otherUser.id}`
        : '',
    [currentUserId, otherUser.id],
  );
  const persistFocusedDealRoom = useCallback(
    async (postId?: string | null) => {
      if (!dealRoomStorageKey) {
        return;
      }

      try {
        if (postId) {
          await AsyncStorage.setItem(dealRoomStorageKey, String(postId));
          return;
        }

        await AsyncStorage.removeItem(dealRoomStorageKey);
      } catch (error) {
        console.error('Persist deal room selection failed:', error);
      }
    },
    [dealRoomStorageKey],
  );

  const loadDealContext = useCallback(
    async (postId: string) => {
      if (!postId || !currentUserId) {
        setDealContext(EMPTY_DEAL_CONTEXT);
        setMeetingDraft(DEFAULT_MEETING_DRAFT);
        return;
      }

      setLoadingDeal(true);

      try {
        const [postResponse, transactionResponse] = await Promise.all([
          dealService.getPostWithDetails(postId),
          dealService.getTransactionsByPost(postId),
        ]);

        const rawPost = postResponse?.data || null;
        const rawTransactions = Array.isArray(transactionResponse?.data)
          ? transactionResponse.data
          : [];
        const nextContext = resolveDealContext({
          rawPost,
          rawTransactions,
          currentUserId,
          otherUserId: otherUser.id,
        });

        setDealContext(nextContext);
        setMeetingDraft({
          address: nextContext.currentTransaction?.dia_chi_hen_gap || '',
          time: parseDateValue(nextContext.currentTransaction?.thoi_gian_hen_gap),
          note: nextContext.currentTransaction?.ghi_chu_hen_gap || '',
          lat: nextContext.currentTransaction?.vi_do_hen_gap
            ? Number(nextContext.currentTransaction.vi_do_hen_gap)
            : null,
          lng: nextContext.currentTransaction?.kinh_do_hen_gap
            ? Number(nextContext.currentTransaction.kinh_do_hen_gap)
            : null,
        });
      } catch (error: any) {
        console.error('Load deal context failed:', error);
        setDealContext(EMPTY_DEAL_CONTEXT);
        setMeetingDraft(DEFAULT_MEETING_DRAFT);
      } finally {
        setLoadingDeal(false);
      }
    },
    [currentUserId, otherUser.id],
  );

  const refreshDealContext = useCallback(async () => {
    if (!activeDealPostId) {
      return;
    }

    await loadDealContext(activeDealPostId);
  }, [activeDealPostId, loadDealContext]);

  const runDealAction = useCallback(
    async (
      actionKey: string,
      executor: () => Promise<any>,
      options: {
        successMessage?: string;
        resetPurchaseNote?: boolean;
        closeMeeting?: boolean;
      } = {},
    ) => {
      setDealActionLoading(actionKey);
      setDealNotice(null);

      try {
        const response = await executor();
        await refreshDealContext();

        if (options.resetPurchaseNote) {
          setPurchaseNote('');
        }

        if (options.closeMeeting) {
          setShowMeetingPlanner(false);
        }

        setDealNotice({
          type: 'success',
          text: response?.message || options.successMessage || 'Đã cập nhật giao dịch.',
        });
      } catch (error: any) {
        console.error('Deal action failed:', error);
        setDealNotice({
          type: 'error',
          text: error?.message || 'Không thể cập nhật giao dịch.',
        });
      } finally {
        setDealActionLoading('');
      }
    },
    [refreshDealContext],
  );

  const handleOpenDealRoom = useCallback(
    (postId: string, options: { broadcast?: boolean } = {}) => {
      if (!postId) {
        return;
      }

      const { broadcast = true } = options;
      setFocusedDealPostId(String(postId));
      void persistFocusedDealRoom(String(postId));
      setDealNotice(null);

      if (broadcast && socketRef.current?.connected) {
        socketRef.current.emit('open_deal_room', {
          chatType: 'private',
          chatId: otherUser.id,
          postId,
        });
      }
    },
    [otherUser.id, persistFocusedDealRoom],
  );

  const handleUseCurrentLocationForMeeting = useCallback(async () => {
    try {
      setMeetingLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Quyền vị trí', 'Vui lòng cấp quyền vị trí để lấy điểm hẹn hiện tại.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const latitude = location.coords.latitude;
      const longitude = location.coords.longitude;
      const address = await buildLocationLabel(latitude, longitude);

      setMeetingDraft((prev) => ({
        ...prev,
        address,
        lat: latitude,
        lng: longitude,
      }));
    } catch (error) {
      console.error('Meeting location failed:', error);
      Alert.alert('Lỗi', 'Không thể lấy vị trí hiện tại. Bạn có thể nhập địa chỉ thủ công.');
    } finally {
      setMeetingLocationLoading(false);
    }
  }, []);

  const handleCreateDealRequest = useCallback(() => {
    if (!activeDealPostId || dealContext.role !== 'buyer') {
      return;
    }

    runDealAction(
      'request',
      () =>
        dealService.createRequest({
          ID_BaiDang: activeDealPostId,
          ghi_chu_nguoi_mua: purchaseNote.trim() || null,
          ID_TinNhanKhoiTao:
            latestSharedPostMessage?.id && !String(latestSharedPostMessage.id).startsWith('temp_')
              ? latestSharedPostMessage.id
              : null,
        }),
      { resetPurchaseNote: true },
    );
  }, [activeDealPostId, dealContext.role, latestSharedPostMessage?.id, purchaseNote, runDealAction]);

  const handleAcceptDeal = useCallback(() => {
    if (!dealContext.currentTransaction?.ID_GiaoDich) {
      return;
    }

    runDealAction('accept', () => dealService.accept(dealContext.currentTransaction.ID_GiaoDich));
  }, [dealContext.currentTransaction, runDealAction]);

  const handleRejectDeal = useCallback(() => {
    if (!dealContext.currentTransaction?.ID_GiaoDich) {
      return;
    }

    runDealAction('reject', () =>
      dealService.reject(dealContext.currentTransaction.ID_GiaoDich, {
        lyDo: 'Người bán chưa sẵn sàng chốt giao dịch này.',
      }),
    );
  }, [dealContext.currentTransaction, runDealAction]);

  const handleCancelDeal = useCallback(() => {
    if (!dealContext.currentTransaction?.ID_GiaoDich) {
      return;
    }

    runDealAction(
      'cancel',
      () =>
        dealService.cancel(dealContext.currentTransaction.ID_GiaoDich, {
          lyDo:
            dealContext.role === 'buyer'
              ? 'Người mua chủ động hủy yêu cầu.'
              : 'Người bán chủ động đóng giao dịch.',
        }),
      { closeMeeting: true },
    );
  }, [dealContext.currentTransaction, dealContext.role, runDealAction]);

  const handleOpenMeetingPlanner = useCallback(() => {
    setShowMeetingPlanner(true);
  }, []);

  const handleSaveMeeting = useCallback(() => {
    if (!dealContext.currentTransaction?.ID_GiaoDich) {
      return;
    }

    if (!meetingDraft.address.trim()) {
      setDealNotice({
        type: 'error',
        text: 'Hãy nhập địa chỉ hoặc dùng vị trí hiện tại trước khi lưu điểm hẹn.',
      });
      return;
    }

    if (!meetingDraft.time) {
      setDealNotice({
        type: 'error',
        text: 'Hãy chọn ngày giờ gặp trước khi lưu điểm hẹn.',
      });
      return;
    }

    runDealAction(
      'meeting',
      () =>
        dealService.updateMeeting(dealContext.currentTransaction.ID_GiaoDich, {
          dia_chi_hen_gap: meetingDraft.address.trim(),
          vi_do_hen_gap: meetingDraft.lat,
          kinh_do_hen_gap: meetingDraft.lng,
          ghi_chu_hen_gap: meetingDraft.note.trim() || null,
          thoi_gian_hen_gap: toMySqlDateTime(meetingDraft.time),
        }),
      { closeMeeting: true },
    );
  }, [dealContext.currentTransaction, meetingDraft, runDealAction]);

  const handleRequestDealCompletion = useCallback(() => {
    if (!dealContext.currentTransaction?.ID_GiaoDich) {
      return;
    }

    runDealAction('requestComplete', () =>
      dealService.requestComplete(dealContext.currentTransaction.ID_GiaoDich, {
        note:
          dealContext.role === 'seller'
            ? 'Người bán xác nhận đã giao dịch xong.'
            : 'Người mua xác nhận đã nhận hàng.',
      }),
    );
  }, [dealContext.currentTransaction, dealContext.role, runDealAction]);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const [userInfoStr, token] = await Promise.all([
          AsyncStorage.getItem('userInfo'),
          AsyncStorage.getItem('userToken'),
        ]);
        if (!token) {
          return;
        }

        if (!userInfoStr) {
          return;
        }

        const user = JSON.parse(userInfoStr);
        if (!user.ID_NguoiDung) {
          return;
        }

        // Validate token trước khi set
        if (token && token.length > 10) {
          setCurrentUserId(user.ID_NguoiDung.toString());
          setUserToken(token);
        } else {
        }

        // Nếu có conversation cũ, load tin nhắn
        if (hasExistingConversation) {
          await loadExistingMessages(user.ID_NguoiDung.toString(), otherUser.id);
        }

        // Kiểm tra nếu có chia sẻ bài đăng
        if (params.sharePost === 'true') {
          setSharePostData({
            postId: params.postId,
            postTitle: params.postTitle,
            postImage: normalizeBackendMediaUrl(params.postImage),
          });
          setShowPostShareForm(true);
        }
      } catch { }
    };
    getCurrentUser();
  }, [
    hasExistingConversation,
    otherUser.id,
    params.sharePost,
    params.postId,
    params.postTitle,
    params.postImage,
  ]);

  // Kết nối Socket.IO khi component mount
  useEffect(() => {
    activeDealPostIdRef.current = activeDealPostId;
  }, [activeDealPostId]);

  useEffect(() => {
    let isMounted = true;

    if (!dealRoomStorageKey) {
      return undefined;
    }

    const restoreDealRoomSelection = async () => {
      try {
        const storedPostId = await AsyncStorage.getItem(dealRoomStorageKey);
        if (!isMounted || !storedPostId) {
          return;
        }

        setFocusedDealPostId((currentValue) =>
          String(currentValue || '') === String(storedPostId) ? currentValue : String(storedPostId),
        );
      } catch (error) {
        console.error('Restore deal room selection failed:', error);
      }
    };

    void restoreDealRoomSelection();

    return () => {
      isMounted = false;
    };
  }, [dealRoomStorageKey]);

  useEffect(() => {
    if (!dealNotice) {
      return undefined;
    }

    const timeoutId = setTimeout(() => setDealNotice(null), 4200);
    return () => clearTimeout(timeoutId);
  }, [dealNotice]);

  useEffect(() => {
    if (!activeDealPostId || !currentUserId) {
      if (!params.sharePost) {
        setDealContext(EMPTY_DEAL_CONTEXT);
      }
      return;
    }

    loadDealContext(String(activeDealPostId));
  }, [activeDealPostId, currentUserId, loadDealContext, params.sharePost]);

  useEffect(() => {
    if (!userToken || !currentUserId) {
      return; // Không kết nối nếu chưa có token hoặc userId
    }

    // Validate token format
    if (typeof userToken !== 'string' || userToken.length < 10) {
      return;
    }

    // Validate JWT token format (basic check)
    const tokenParts = userToken.split('.');
    if (tokenParts.length !== 3) {
      return;
    }

    const apiUrl = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000';
    const socketUrl = apiUrl.replace('/api', ''); // Giả sử socket ở cùng base URL, loại bỏ /api nếu có

    // Test token với server bằng cách gọi API profile hoặc một endpoint đơn giản
    const testTokenValidity = async () => {
      try {
        // Thử gọi một API endpoint đơn giản để test token
        const response = await chatService.getConversations(currentUserId);

        if (!response?.success) {
          return false;
        }
        return true;
      } catch {
        return true;
      }
    };

    // Disconnect existing connection if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Kết nối socket trực tiếp (skip token validation nếu cần)
    const connectSocket = () => {
      socketRef.current = io(socketUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 3, // Giảm số lần retry
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        timeout: 10000,
        auth: {
          token: userToken,
          userId: currentUserId,
          timestamp: Date.now(), // Thêm timestamp để debug
        },
      });

      socketRef.current.on('connect', () => {
        // Emit user_login để đăng ký user với socket server
        socketRef.current.emit('user_login', { userId: currentUserId });
      });

      socketRef.current.on('connect_error', (error) => {
        // Hiển thị thông báo lỗi cho user nếu cần
        if (error.message.includes('Authentication error')) {
          // Có thể redirect về login nếu authentication fail
          // router.replace('/components/CaiDat/dangnhap');
        }
      });

      socketRef.current.on('error', (data) => { });

      socketRef.current.on('disconnect', (reason) => { });

      socketRef.current.on('new_message', (data) => {
        const senderId = String(data?.message?.ID_NguoiGui ?? '');
        const receiverId = String(data?.message?.ID_NguoiNhan ?? '');
        const currentOtherUserId = String(otherUser.id ?? '');
        const currentViewerId = String(currentUserId ?? '');
        const isCurrentPrivateChat =
          data?.type === 'private' &&
          senderId === currentOtherUserId &&
          receiverId === currentViewerId;

        if (isCurrentPrivateChat) {
          // Chỉ hiển thị tin nhắn nếu da_xoa_gui = 0 (chưa bị xóa)
          if (data.message.da_xoa_gui === 0) {
            // Phân biệt tin nhắn ảnh qua file_dinh_kem (theo API docs)
            const isImageMessage = !!(
              data.message.file_dinh_kem && data.message.file_dinh_kem.trim()
            );

            // Extract location from message
            let location: any = null;
            const messageText = data.message.noi_dung || '';
            if (messageText.includes('📍 Vị trí GPS:')) {
              const match = messageText.match(/maps\?q=([-\d.]+),([-\d.]+)/);
              if (match) {
                location = {
                  latitude: parseFloat(match[1]),
                  longitude: parseFloat(match[2]),
                };
              }
            }

            const { cleanText, postId, postImage } = extractPostShareMeta(messageText);

            const newMessage = {
              id: data.message.ID_TinNhan,
              text: cleanText,
              senderId: data.message.ID_NguoiGui,
              timestamp: new Date(data.message.thoi_gian_gui).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
              file_dinh_kem: data.message.file_dinh_kem,
              loai_tin_nhan: isImageMessage ? 'image' : 'text',
              mediaUri: isImageMessage
                ? normalizeBackendMediaUrl(data.message.file_dinh_kem, 'messages')
                : null,
              da_xoa_gui: data.message.da_xoa_gui || 0,
              postId: postId,
              postImage: normalizeBackendMediaUrl(postImage),
              isPostShare:
                cleanText.includes(POST_SHARE_TITLE_PREFIX) &&
                cleanText.includes(POST_SHARE_DETAIL_PREFIX),
              location: location, // Add location data
            };
            setMessages((prevMessages) => [...prevMessages, newMessage]);
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        }
      });

      // Lắng nghe tin nhắn bị thu hồi
      socketRef.current.on('message_recalled', (data) => {
        if (data.chatType === 'private' && String(data.chatId) === String(otherUser.id)) {
          // Cập nhật tin nhắn trong state để đánh dấu da_xoa_gui = 1
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === data.messageId ? { ...msg, da_xoa_gui: 1 } : msg,
            ),
          );
        }
      });

      socketRef.current.on('message_sent', (data) => {
        console.log('✅ Socket message_sent response:', data);
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id.startsWith('temp_') ? { ...msg, id: data.messageId } : msg,
          ),
        );
      });

      // Lắng nghe lỗi từ socket
      socketRef.current.on('deal_transaction_updated', (payload) => {
        if (!payload?.postId || !payload?.sellerId || !payload?.buyerId) {
          return;
        }

        const participantIds = [String(payload.sellerId), String(payload.buyerId)];
        const isRelatedConversation =
          participantIds.includes(String(currentUserId)) &&
          participantIds.includes(String(otherUser.id));

        if (!isRelatedConversation) {
          return;
        }

        const currentPostId = activeDealPostIdRef.current;
        if (!currentPostId) {
          setFocusedDealPostId(String(payload.postId));
          void persistFocusedDealRoom(String(payload.postId));
        }

        if (!currentPostId || String(currentPostId) === String(payload.postId)) {
          loadDealContext(String(payload.postId));
          setDealNotice({
            type: 'success',
            text: 'Trạng thái giao dịch vừa được cập nhật.',
          });
        }
      });

      socketRef.current.on('deal_room_opened', (payload) => {
        if (!payload?.postId || !payload?.senderId || !payload?.receiverId) {
          return;
        }

        const participantIds = [String(payload.senderId), String(payload.receiverId)];
        const isRelatedConversation =
          participantIds.includes(String(currentUserId)) &&
          participantIds.includes(String(otherUser.id));

        if (!isRelatedConversation) {
          return;
        }

        setFocusedDealPostId(String(payload.postId));
        void persistFocusedDealRoom(String(payload.postId));
        setDealNotice({
          type: 'success',
          text: 'Deal room vừa được mở từ tin nhắn bài đăng.',
        });
      });

      socketRef.current.on('send_message_error', (error) => {
        console.error('❌ Socket send_message_error:', error);
      });

      // Lắng nghe typing_start và typing_stop
      socketRef.current.on('typing_start', (data) => {
        if (
          data.chatType === 'private' &&
          String(data.chatId) === String(otherUser.id) &&
          String(data.userId) === String(otherUser.id)
        ) {
          setIsTyping(true);
        }
      });

      socketRef.current.on('typing_stop', (data) => {
        if (
          data.chatType === 'private' &&
          String(data.chatId) === String(otherUser.id) &&
          String(data.userId) === String(otherUser.id)
        ) {
          setIsTyping(false);
        }
      });
    };

    testTokenValidity()
      .then((isValid) => {
        if (!isValid) {
        }
        connectSocket();
      })
      .catch(() => {
        connectSocket();
      });

    return () => {
      // Disconnect socket khi unmount
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [currentUserId, loadDealContext, otherUser.id, persistFocusedDealRoom, userToken]);

  // Join chat khi có currentUserId
  useEffect(() => {
    if (currentUserId && socketRef.current?.connected) {
      socketRef.current.emit('join_chat', {
        userId: currentUserId,
        chatType: 'private',
        chatId: otherUser.id,
      });
    }
  }, [currentUserId, otherUser.id, userToken]);

  // Mark as read khi vào chat hoặc khi có tin nhắn mới (tùy logic)
  useEffect(() => {
    if (currentUserId && socketRef.current?.connected && messages.length > 0) {
      socketRef.current.emit('mark_read', {
        userId: currentUserId,
        chatType: 'private',
        chatId: otherUser.id,
      });
    }
  }, [messages, currentUserId, otherUser.id, userToken]);

  // Xử lý typing khi nhập text
  useEffect(() => {
    const handleTyping = () => {
      if (inputText.trim().length > 0 && socketRef.current?.connected) {
        socketRef.current.emit('typing_start', {
          userId: currentUserId,
          chatType: 'private',
          chatId: otherUser.id,
        });

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
          socketRef.current.emit('typing_stop', {
            userId: currentUserId,
            chatType: 'private',
            chatId: otherUser.id,
          });
        }, 3000);
      }
    };

    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', handleTyping);
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('typing_stop', {
          userId: currentUserId,
          chatType: 'private',
          chatId: otherUser.id,
        });
      }
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [inputText, currentUserId, otherUser.id, userToken]);

  const loadExistingMessages = async (currentUserId: string, otherUserId: string) => {
    try {
      const response = await chatService.getPrivateMessages(currentUserId, otherUserId, 50, 0);
      const rows = Array.isArray(response?.data) ? response.data : [];

      if (response?.success) {
        const formattedMessages = rows.map((msg: any) => {
            // Phân biệt tin nhắn ảnh qua file_dinh_kem (theo API docs)
            const isImageMessage = !!(msg.file_dinh_kem && msg.file_dinh_kem.trim());
            let filename = msg.file_dinh_kem || null;
            let text = msg.noi_dung || '';

            // Xử lý backward compatibility với tin nhắn cũ có format [Ảnh: filename]
            if (!isImageMessage && msg.noi_dung && msg.noi_dung.includes('[Ảnh:')) {
              const match = msg.noi_dung.match(/\[Ảnh: ([^\]]+)\]/);
              if (match) {
                filename = match[1];
                text = msg.noi_dung.replace(/\[Ảnh: [^\]]+\]/, '').trim();
              }
            }

            // Extract location from message
            let location: any = null;
            if (text && text.includes('📍 Vị trí GPS:')) {
              const match = text.match(/maps\?q=([-\d.]+),([-\d.]+)/);
              if (match) {
                location = {
                  latitude: parseFloat(match[1]),
                  longitude: parseFloat(match[2]),
                };
              }
            }

            const { cleanText, postId, postImage } = extractPostShareMeta(text);

            return {
              id: msg.ID_TinNhan,
              text: cleanText,
              senderId: String(msg.ID_NguoiGui) === String(currentUserId) ? 'me' : otherUserId,
              timestamp: new Date(msg.thoi_gian_gui).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
              file_dinh_kem: filename,
              loai_tin_nhan: isImageMessage ? 'image' : 'text',
              mediaUri: isImageMessage ? normalizeBackendMediaUrl(filename, 'messages') : null,
              da_xoa_gui: msg.da_xoa_gui || 0,
              postId: postId,
              postImage: normalizeBackendMediaUrl(postImage),
              isPostShare:
                cleanText.includes(POST_SHARE_TITLE_PREFIX) &&
                cleanText.includes(POST_SHARE_DETAIL_PREFIX),
              location: location, // Add location data
            };
          });

        // Lọc ra những tin nhắn có da_xoa_gui = 0 (chưa bị xóa)
        const visibleMessages = formattedMessages.filter((msg: any) => Number(msg.da_xoa_gui || 0) === 0);
        const sortedMessages = visibleMessages.reverse();

        setMessages(sortedMessages);

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }
    } catch (error) {
      console.error('❌ Load existing messages failed:', error);
      setMessages([]);
    }
  };

  const handleGoBack = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave_chat', {
        chatType: 'private',
        chatId: otherUser.id,
      });
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/tinnhan');
    }
  };

  // Xử lý khi ấn vào tin nhắn (long press - options)
  const handleMessagePress = (message) => {
    setSelectedMessage(message);
    setShowMessageOptions(true);
  };

  // Xử lý khi ấn vào ảnh (quick press - xem ảnh)
  const handleImagePress = (message) => {
    console.log('🖼️ handleImagePress called with:', message);

    // Kiểm tra xem có phải là ảnh không
    const isImageMessage = !!(message.file_dinh_kem || message.mediaUri);

    if (isImageMessage) {
      // Tạo URL đầy đủ cho ảnh
      let imageUri = message.mediaUri;

      // Nếu không có mediaUri nhưng có file_dinh_kem, tạo URL từ server
      if (!imageUri && message.file_dinh_kem) {
        const url_uploads = Constants.expoConfig?.extra?.url_uploads;
        if (url_uploads) {
          imageUri = `${url_uploads}/${message.file_dinh_kem}`;
        }
      }

      console.log('🖼️ Final imageUri:', imageUri);

      if (imageUri) {
        setCurrentImageUri(imageUri);
        setShowImageViewer(true);
      } else {
        console.log('❌ No valid imageUri found');
      }
    } else {
      console.log('❌ Not an image message');
    }
  };

  // Xử lý tải xuống ảnh
  const handleDownloadImage = async () => {
    if (!currentImageUri) return;

    try {
      console.log('📥 Starting download for:', currentImageUri);

      // Tạo tên file
      const timestamp = Date.now();
      const fileName = `chat_image_${timestamp}.jpg`;

      if (Platform.OS === 'web') {
        // Web platform - sử dụng browser download
        const response = await fetch(currentImageUri);
        const blob = await response.blob();

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        Alert.alert('✅ Thành công', 'Ảnh đã được tải xuống vào thư mục Downloads');
      } else {
        // Mobile platforms - hiển thị hướng dẫn
        Alert.alert(
          '📱 Tải xuống ảnh',
          'Để lưu ảnh vào thiết bị:\n\n' +
          '• Chụp màn hình để lưu ảnh\n' +
          '• Hoặc sử dụng nút "Chia sẻ" để lưu vào thư viện ảnh\n' +
          '• Hoặc ấn giữ vào ảnh và chọn "Lưu ảnh"',
          [
            {
              text: 'Chia sẻ để lưu',
              onPress: () => handleShareImage(),
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ],
        );
      }
    } catch (error) {
      console.error('❌ Download error:', error);
      Alert.alert('❌ Lỗi', 'Không thể tải xuống ảnh. Vui lòng thử lại sau.');
    }
  };

  // Xử lý chia sẻ ảnh
  const handleShareImage = async () => {
    if (!currentImageUri) return;

    try {
      console.log('📤 Starting share for:', currentImageUri);

      if (Platform.OS === 'web') {
        // Web platform
        if (navigator.share) {
          // Sử dụng Web Share API
          await navigator.share({
            title: 'Chia sẻ ảnh từ chat',
            text: 'Ảnh từ cuộc trò chuyện',
            url: currentImageUri,
          });
        } else if (navigator.clipboard) {
          // Fallback: copy link vào clipboard
          await navigator.clipboard.writeText(currentImageUri);
          Alert.alert('✅ Thành công', 'Link ảnh đã được sao chép vào clipboard');
        } else {
          // Fallback cuối cùng: hiển thị link để user copy thủ công
          Alert.alert(
            'Chia sẻ ảnh',
            `Link ảnh:\n${currentImageUri}\n\nBạn có thể copy link này để chia sẻ.`,
          );
        }
      } else {
        // Mobile platforms - hiển thị hướng dẫn
        Alert.alert(
          '📱 Chia sẻ ảnh',
          'Để chia sẻ ảnh:\n\n' +
          '• Chụp màn hình và chia sẻ\n' +
          '• Ấn giữ vào ảnh và chọn "Chia sẻ"\n' +
          '• Hoặc copy link ảnh để chia sẻ',
          [
            {
              text: 'Copy link',
              onPress: () => {
                // Copy link vào clipboard nếu có sẵn
                Alert.alert('Link ảnh', currentImageUri);
              },
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ],
        );
      }
    } catch (error) {
      console.error('❌ Share error:', error);
      Alert.alert('❌ Lỗi', 'Không thể chia sẻ ảnh. Vui lòng thử lại sau.');
    }
  };

  // Đóng ImageViewer
  const handleCloseImageViewer = () => {
    console.log('🖼️ Closing ImageViewer');
    setShowImageViewer(false);
    setCurrentImageUri('');
  };

  // Xử lý gửi tin nhắn chia sẻ bài đăng
  const handleSendPostShare = async () => {
    if (!sharePostData) return;

    try {
      // Tạo 2 tin nhắn riêng biệt
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const noteText = shareFormInput.trim();
      const postSharePayloadText = buildPostSharePayloadText(sharePostData);
      const postSharePreviewText = `📱 Bài đăng: ${sharePostData.postTitle}\n🔗 Xem chi tiết bài đăng này`;

      let textMessage: any = null;

      // Tin nhắn 1: Text message (nếu có)
      if (noteText) {
        textMessage = {
          id: 'temp_text_' + Date.now(),
          text: noteText,
          senderId: currentUserId,
          timestamp: timestamp,
        };
        setMessages((prev) => [...prev, textMessage]);
      }

      // Tin nhắn 2: Post share message
      const postShareMessage = {
        id: 'temp_post_' + Date.now(),
        text: postSharePreviewText,
        senderId: currentUserId,
        timestamp: timestamp,
        postId: sharePostData.postId,
        postImage: sharePostData.postImage,
        isPostShare: true, // Flag để nhận diện tin nhắn chia sẻ bài đăng
      };

      setMessages((prev) => [...prev, postShareMessage]);
      setInputText(''); // Clear main input
      setShareFormInput(''); // Clear share form input
      setShowPostShareForm(false);
      setSharePostData(null);

      // Cuộn xuống dưới
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Gửi tin nhắn qua socket hoặc API
      const apiUrl = Constants.expoConfig?.extra?.apiUrl;

      // Gửi tin nhắn text (nếu có)
      if (noteText && apiUrl) {
        const textResponse = await fetch(`${apiUrl}/api/tinnhan/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            ID_NguoiGui: currentUserId,
            ID_NguoiNhan: otherUser.id,
            noi_dung: noteText,
            loai_tin_nhan: 'text',
            file_dinh_kem: null,
            tin_nhan_phu_thuoc: null,
          }),
        });

        if (textResponse && textResponse.ok && textResponse.status !== 0) {
          const textData = await textResponse.json();
          // Cập nhật tin nhắn text với ID thật
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              textMessage && msg.id === textMessage.id
                ? { ...msg, id: textData.data?.ID_TinNhan || msg.id }
                : msg,
            ),
          );
        }
      }

      // Gửi tin nhắn chia sẻ bài đăng
      if (apiUrl) {
        const postResponse = await fetch(`${apiUrl}/api/tinnhan/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            ID_NguoiGui: currentUserId,
            ID_NguoiNhan: otherUser.id,
            noi_dung: postSharePayloadText,
            loai_tin_nhan: 'text',
            file_dinh_kem: null,
            tin_nhan_phu_thuoc: null,
          }),
        });

        if (postResponse && postResponse.ok && postResponse.status !== 0) {
          const postData = await postResponse.json();
          // Cập nhật tin nhắn post share với ID thật
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === postShareMessage.id
                ? { ...msg, id: postData.data?.ID_TinNhan || msg.id }
                : msg,
            ),
          );
        }
      }

    } catch (error) {
      console.error('❌ Error sharing post:', error);
      Alert.alert('❌ Lỗi', 'Không thể chia sẻ bài đăng. Vui lòng thử lại.');
    }
  };

  // Đóng form chia sẻ bài đăng
  const handleCancelPostShare = () => {
    setShowPostShareForm(false);
    setSharePostData(null);
    setShareFormInput('');
  };

  const handleForwardMessage = () => {
    Alert.alert('Chuyển tiếp', 'Chức năng chuyển tiếp sẽ được phát triển sau');
    setShowMessageOptions(false);
  };

  // Xử lý thu hồi tin nhắn (tin nhắn của mình)
  const handleRecallMessage = async () => {
    if (!selectedMessage || !userToken) {
      return;
    }

    Alert.alert('Thu hồi tin nhắn', 'Bạn có chắc chắn muốn thu hồi tin nhắn này?', [
      {
        text: 'Hủy',
        style: 'cancel',
      },
      {
        text: 'Thu hồi',
        style: 'destructive',
        onPress: async () => {
          try {
            // Gọi API xóa tin nhắn (thu hồi)
            const apiUrl = Constants.expoConfig?.extra?.apiUrl;
            if (!apiUrl) {
              Alert.alert('Lỗi', 'API URL không được cấu hình');
              return;
            }

            const response = await fetch(`${apiUrl}/api/tinnhan/delete/${selectedMessage.id}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userToken}`,
              },
              body: JSON.stringify({
                userId: currentUserId,
              }),
            });

            if (response && response.ok && response.status !== 0) {
              // Cập nhật tin nhắn trong state để đánh dấu da_xoa_gui = 1
              setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                  msg.id === selectedMessage.id ? { ...msg, da_xoa_gui: 1 } : msg,
                ),
              );

              // Thông báo qua socket nếu có
              if (socketRef.current?.connected) {
                socketRef.current.emit('message_recalled', {
                  messageId: selectedMessage.id,
                  chatType: 'private',
                  chatId: otherUser.id,
                  userId: currentUserId,
                });
              }

              Alert.alert('Thành công', 'Tin nhắn đã được thu hồi');
            } else {
              Alert.alert('Lỗi', 'Không thể thu hồi tin nhắn');
            }
          } catch {
            Alert.alert('Lỗi', 'Có lỗi xảy ra khi thu hồi tin nhắn');
          }

          setShowMessageOptions(false);
          setSelectedMessage(null);
        },
      },
    ]);
  };

  const handleHideMessage = async () => {
    if (!selectedMessage || !userToken) {
      return;
    }

    Alert.alert('Ẩn tin nhắn', 'Bạn có chắc chắn muốn ẩn tin nhắn này?', [
      {
        text: 'Hủy',
        style: 'cancel',
      },
      {
        text: 'Ẩn',
        style: 'destructive',
        onPress: async () => {
          try {
            const apiUrl = Constants.expoConfig?.extra?.apiUrl;
            if (!apiUrl) {
              Alert.alert('Lỗi', 'API URL không được cấu hình');
              return;
            }

            const response = await fetch(`${apiUrl}/api/tinnhan/hide/${selectedMessage.id}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userToken}`,
              },
              body: JSON.stringify({
                userId: currentUserId,
                hidden: true,
              }),
            });

            if (response && response.ok && response.status !== 0) {
              // Xóa tin nhắn khỏi state
              setMessages((prevMessages) =>
                prevMessages.filter((msg) => msg.id !== selectedMessage.id),
              );

              // Thông báo qua socket nếu có
              if (socketRef.current?.connected) {
                socketRef.current.emit('message_hidden', {
                  messageId: selectedMessage.id,
                  chatType: 'private',
                  chatId: otherUser.id,
                  userId: currentUserId,
                });
              }

              Alert.alert('Thành công', 'Tin nhắn đã được ẩn');
            } else {
              // Fallback: ẩn local nếu API không có
              setMessages((prevMessages) =>
                prevMessages.filter((msg) => msg.id !== selectedMessage.id),
              );
              Alert.alert('Thành công', 'Tin nhắn đã được ẩn');
            }
          } catch {
            // Fallback: ẩn local nếu có lỗi
            setMessages((prevMessages) =>
              prevMessages.filter((msg) => msg.id !== selectedMessage.id),
            );
            Alert.alert('Thành công', 'Tin nhắn đã được ẩn');
          }

          setShowMessageOptions(false);
          setSelectedMessage(null);
        },
      },
    ]);
  };

  // Chọn nhiều ảnh từ thư viện
  const handleSelectImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 9, // Tối đa 9 ảnh
        allowsEditing: false, // Không crop
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = result.assets.map((asset) => asset.uri);
        setSelectedImages((prev) => [...prev, ...newImages].slice(0, 9)); // Giới hạn tối đa 9 ảnh
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  // Xóa ảnh preview theo index
  const removeSelectedImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Xóa tất cả ảnh
  const removeAllImages = () => {
    setSelectedImages([]);
  };

  // Chia sẻ vị trí
  const handleShareLocation = async () => {
    try {
      // Xin quyền truy cập location
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập vị trí',
          'Vui lòng cấp quyền truy cập vị trí để chia sẻ'
        );
        return;
      }

      // Hiển thị loading
      Alert.alert('📍 Đang lấy vị trí...', 'Vui lòng đợi');

      // Lấy vị trí hiện tại
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      // Tạo tin nhắn tạm với vị trí
      const tempMessage = {
        id: 'temp_location_' + Date.now(),
        text: '',
        senderId: currentUserId,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        location: {
          latitude,
          longitude,
        },
      };

      setMessages((prev) => [...prev, tempMessage]);

      // Cuộn xuống
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Gửi vị trí qua socket hoặc API
      const locationText = `📍 Vị trí GPS: https://www.google.com/maps?q=${latitude},${longitude}`;

      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', {
          ID_NguoiGui: currentUserId,
          ID_NguoiNhan: otherUser.id,
          noi_dung: locationText,
          loai_tin_nhan: 'text',
          file_dinh_kem: null,
          tin_nhan_phu_thuoc: null,
        });
      } else {
        // Fallback: gửi qua HTTP API
        const apiUrl = Constants.expoConfig?.extra?.apiUrl;
        if (!apiUrl) return;

        const response = await fetch(`${apiUrl}/api/tinnhan/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            ID_NguoiGui: currentUserId,
            ID_NguoiNhan: otherUser.id,
            noi_dung: locationText,
            loai_tin_nhan: 'text',
            file_dinh_kem: null,
            tin_nhan_phu_thuoc: null,
          }),
        });

        if (response && response.ok) {
          const data = await response.json();
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === tempMessage.id
                ? { ...msg, id: data.data?.ID_TinNhan || tempMessage.id }
                : msg
            )
          );
        }
      }

      Alert.alert('✅ Thành công', 'Đã chia sẻ vị trí của bạn');
    } catch (error) {
      console.error('Error sharing location:', error);
      Alert.alert('Lỗi', 'Không thể lấy vị trí. Vui lòng kiểm tra GPS và thử lại.');
    }
  };

  // Hàm gửi ảnh qua HTTP API (fallback)
  const sendImageViaHTTP = async (messageData: any, tempMessage: any) => {
    try {
      const apiUrl = Constants.expoConfig?.extra?.apiUrl;
      if (!apiUrl) return;

      console.log('🌐 Sending via HTTP API:', messageData);

      const response = await fetch(`${apiUrl}/api/tinnhan/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify(messageData),
      });

      if (response && response.ok && response.status !== 0) {
        const data = await response.json();
        console.log('✅ HTTP API response:', data);

        // Cập nhật tin nhắn tạm với ID thật
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempMessage.id
              ? {
                ...msg,
                id: data.data?.ID_TinNhan || msg.id,
                file_dinh_kem: messageData.file_dinh_kem,
                loai_tin_nhan: messageData.file_dinh_kem ? 'image' : 'text',
              }
              : msg,
          ),
        );
      } else {
        console.error('❌ HTTP API failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ HTTP API error:', error);
    }
  };

  // Gửi nhiều ảnh
  const sendMultipleImages = async (imageUris: string[], caption: string) => {
    if (!currentUserId || imageUris.length === 0) return;

    if (!userToken) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập lại');
      return;
    }

    // Tạo tin nhắn tạm thời cho mỗi ảnh
    const tempMessages = imageUris.map((uri, index) => ({
      id: `temp_${Date.now()}_${index}`,
      text: index === 0 && caption.trim() ? caption.trim() : '', // Chỉ hiển thị caption nếu có
      mediaUri: uri,
      mediaType: 'image',
      senderId: currentUserId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));

    setMessages((prev) => [...prev, ...tempMessages]);

    // Cuộn xuống dưới
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Upload từng ảnh
      const apiUrl = Constants.expoConfig?.extra?.apiUrl;
      if (!apiUrl) {
        throw new Error('API URL không được cấu hình');
      }

      for (let i = 0; i < imageUris.length; i++) {
        const uri = imageUris[i];
        const formData = new FormData();

        const fileExtension = uri.split('.').pop() || 'jpg';
        const fileName = `image_${Date.now()}_${i}.${fileExtension}`;

        // Đảm bảo format FormData đúng cho React Native - sử dụng field 'avatar' như API hiện có
        formData.append('avatar', {
          uri: uri,
          type: `image/${fileExtension}`,
          name: fileName,
        } as any);

        console.log('Uploading file:', fileName, 'URI:', uri);

        // Upload file với timeout - sử dụng API upload hiện có
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const uploadResponse = await fetch(`${apiUrl}/api/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${userToken}`,
          },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('Upload response status:', uploadResponse.status);
        console.log('Upload response ok:', uploadResponse.ok);

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('Upload failed with response:', errorText);
          throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
        }

        const uploadData = await uploadResponse.json();
        console.log('Upload successful:', uploadData);

        // Lấy filename từ response API upload hiện có
        let uploadedFileName = uploadData.imageUrl || uploadData.filename || uploadData.fileName;

        if (!uploadedFileName) {
          console.error('Upload response:', uploadData);
          throw new Error('Upload response missing filename');
        }

        // Nếu là full URL, chỉ lấy filename
        if (uploadedFileName.includes('/')) {
          uploadedFileName = uploadedFileName.split('/').pop();
        }

        console.log('Final filename for database:', uploadedFileName);

        // Gửi tin nhắn - theo format API documentation
        const messageData = {
          ID_NguoiGui: currentUserId,
          ID_NguoiNhan: otherUser.id,
          noi_dung: i === 0 && caption.trim() ? caption.trim() : '', // Chuỗi rỗng, không null
          loai_tin_nhan: 'text', // Mặc định text (theo API docs)
          file_dinh_kem: uploadedFileName, // Filename để phân biệt tin nhắn ảnh
          tin_nhan_phu_thuoc: null, // Thêm field này theo API docs
        };

        // Gửi qua socket hoặc API
        if (socketRef.current?.connected) {
          console.log('📤 Sending via Socket.IO:', messageData);
          socketRef.current.emit('send_message', messageData);

          // Thêm timeout để kiểm tra response
          setTimeout(() => {
            console.log('⏰ Socket timeout - trying HTTP fallback');
            // Fallback HTTP nếu socket không response
            sendImageViaHTTP(messageData, tempMessages[i]);
          }, 5000);
        } else {
          const response = await fetch(`${apiUrl}/api/tinnhan/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${userToken}`,
            },
            body: JSON.stringify(messageData),
          });

          if (response && response.ok && response.status !== 0) {
            const data = await response.json();

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === tempMessages[i].id
                  ? {
                    ...msg,
                    id: data.data?.ID_TinNhan || msg.id,
                    file_dinh_kem: uploadedFileName,
                    loai_tin_nhan: uploadedFileName ? 'image' : 'text',
                  }
                  : msg,
              ),
            );
          }
        }
      }

      // Xóa ảnh đã chọn
      setSelectedImages([]);
    } catch (error) {
      console.error('Error sending images:', error);

      // Xóa tin nhắn tạm nếu có lỗi
      setMessages((prev) => prev.filter((msg) => !tempMessages.some((temp) => temp.id === msg.id)));

      // Hiển thị thông báo lỗi chi tiết hơn
      const errorMessage = error instanceof Error ? error.message : 'Không thể gửi ảnh';
      Alert.alert('Lỗi gửi ảnh', errorMessage, [
        {
          text: 'Thử lại',
          onPress: () => sendMultipleImages(imageUris, caption),
        },
        {
          text: 'Hủy',
          style: 'cancel',
        },
      ]);
    }
  };

  const handleSend = async () => {
    const trimmedText = inputText.trim();
    if ((trimmedText.length === 0 && selectedImages.length === 0) || !currentUserId) {
      return;
    }

    // Nếu có ảnh, gửi ảnh trước
    if (selectedImages.length > 0) {
      await sendMultipleImages(selectedImages, trimmedText);
      setInputText('');
      return;
    }

    // Gửi tin nhắn text thông thường
    // Tạo tin nhắn tạm thời (optimistic update)
    const tempMessage = {
      id: 'temp_' + Date.now(),
      text: trimmedText,
      senderId: currentUserId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([...messages, tempMessage]);
    setInputText('');

    // Cuộn xuống dưới ngay lập tức sau khi thêm tin tạm
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Thử gửi qua socket trước
      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', {
          ID_NguoiGui: currentUserId,
          ID_NguoiNhan: otherUser.id,
          noi_dung: trimmedText,
          loai_tin_nhan: 'text',
          file_dinh_kem: null,
          tin_nhan_phu_thuoc: null,
        });
      } else {
        // Fallback: gửi qua HTTP API nếu socket không kết nối
        const apiUrl = Constants.expoConfig?.extra?.apiUrl;
        if (!apiUrl) {
          console.error('API URL không được cấu hình');
          return;
        }

        const response = await fetch(`${apiUrl}/api/tinnhan/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            ID_NguoiGui: currentUserId,
            ID_NguoiNhan: otherUser.id,
            noi_dung: trimmedText,
            loai_tin_nhan: 'text',
            file_dinh_kem: null,
            tin_nhan_phu_thuoc: null,
          }),
        });

        if (response && response.ok && response.status !== 0) {
          const data = await response.json();
          // Cập nhật tin nhắn tạm với ID thật từ server
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === tempMessage.id
                ? { ...msg, id: data.data?.ID_TinNhan || tempMessage.id }
                : msg,
            ),
          );
        } else {
          // Có thể hiển thị thông báo lỗi cho user
        }
      }
    } catch {
      // Silent error handling
    }
  };

  // Cuộn xuống dưới khi messages thay đổi
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [messages]);

  const handleViewDealPost = useCallback(() => {
    if (!dealContext.post?.id) {
      return;
    }

    router.push({
      pathname: '/components/BaiDang/chitietbaidang',
      params: { postId: dealContext.post.id },
    });
  }, [dealContext.post?.id]);

  const shouldRenderDealRoom = Boolean(activeDealPostId || loadingDeal || dealContext.post);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_COLOR} />
      {/* SafeAreaView màu đỏ cho vùng tai thỏ */}
      <SafeAreaView style={styles.safeAreaTop} />

      {/* Container chính */}
      <View style={styles.screenContainer}>
        {/* 1. Header */}
        <ChatHeader
          user={otherUser}
          onBack={handleGoBack}
          onAvatarPress={() =>
            router.push({
              pathname: '/components/CaNhan/canhan',
              params: { userId: otherUser.id },
            })
          }
        />

        {/* 2. Container trắng bo góc chứa tin nhắn và input */}
        <KeyboardAvoidingView
          style={styles.chatAreaContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* 2.1. Danh sách tin nhắn */}
          <FlatList
            ref={flatListRef}
            data={messages}
            ListHeaderComponent={
              shouldRenderDealRoom ? (
                <DealRoomPanel
                  loading={loadingDeal}
                  activePostId={activeDealPostId}
                  dealContext={dealContext}
                  dealNotice={dealNotice}
                  actionLoading={dealActionLoading}
                  purchaseNote={purchaseNote}
                  setPurchaseNote={setPurchaseNote}
                  currentUserId={currentUserId}
                  onCreateRequest={handleCreateDealRequest}
                  onAccept={handleAcceptDeal}
                  onReject={handleRejectDeal}
                  onCancel={handleCancelDeal}
                  onOpenMeeting={handleOpenMeetingPlanner}
                  onRequestComplete={handleRequestDealCompletion}
                  onViewPost={handleViewDealPost}
                />
              ) : null
            }
            renderItem={({ item }) => (
              <MessageItem
                item={item}
                currentUserId={currentUserId}
                onMessagePress={handleMessagePress}
                onImagePress={handleImagePress}
                recalledMessages={recalledMessages}
                onOpenDealRoom={handleOpenDealRoom}
              />
            )}
            keyExtractor={(item, index) => `${item.id}_${index}`}
            style={styles.messageList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20, paddingTop: 14 }}
          />
          {/* Hiển thị typing indicator nếu người kia đang typing */}
          {isTyping && (
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>{otherUser.name} is typing...</Text>
            </View>
          )}

          {/* Hiển thị preview ảnh ở hàng riêng */}
          <ImagePreviewRow
            images={selectedImages}
            onRemoveImage={removeSelectedImage}
            onRemoveAll={removeAllImages}
          />

          {/* 2.2. Khung nhập liệu */}
          <InputBar
            onSend={handleSend}
            inputText={inputText}
            setInputText={setInputText}
            onImagePress={handleSelectImages}
            onLocationPress={handleShareLocation}
          />
        </KeyboardAvoidingView>

        {/* Modal hiển thị options cho tin nhắn */}
        <Modal
          visible={showMessageOptions}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMessageOptions(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowMessageOptions(false)}
          >
            <View style={styles.optionsContainer}>
              <TouchableOpacity style={styles.optionButton} onPress={handleForwardMessage}>
                <Ionicons name="arrow-forward" size={24} color="#007AFF" />
                <Text style={styles.optionText}>Chuyển tiếp</Text>
              </TouchableOpacity>

              {/* Hiển thị option khác nhau tùy theo tin nhắn của ai */}
              {selectedMessage &&
                (selectedMessage.senderId === currentUserId || selectedMessage.senderId === 'me') ? (
                // Tin nhắn của mình - Thu hồi
                <TouchableOpacity style={styles.optionButton} onPress={handleRecallMessage}>
                  <Ionicons name="return-up-back" size={24} color="#FF9500" />
                  <Text style={[styles.optionText, { color: '#FF9500' }]}>Thu hồi</Text>
                </TouchableOpacity>
              ) : (
                // Tin nhắn của người khác - Ẩn
                <TouchableOpacity style={styles.optionButton} onPress={handleHideMessage}>
                  <Ionicons name="eye-off" size={24} color="#8E8E93" />
                  <Text style={[styles.optionText, { color: '#8E8E93' }]}>Ẩn tin nhắn</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ImageViewer Modal */}
        <ImageViewer
          visible={showImageViewer}
          imageUri={currentImageUri}
          onClose={handleCloseImageViewer}
          onDownload={handleDownloadImage}
          onShare={handleShareImage}
        />

        <MeetingPlannerModal
          visible={showMeetingPlanner}
          draft={meetingDraft}
          setDraft={setMeetingDraft}
          onClose={() => setShowMeetingPlanner(false)}
          onSave={handleSaveMeeting}
          onUseCurrentLocation={handleUseCurrentLocationForMeeting}
          isSaving={dealActionLoading === 'meeting'}
          isLocating={meetingLocationLoading}
        />

        {/* Post Share Form Modal */}
        <Modal
          visible={showPostShareForm}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCancelPostShare}
        >
          <View style={styles.postShareModalOverlay}>
            <PostShareForm
              postData={sharePostData}
              onSend={handleSendPostShare}
              onCancel={handleCancelPostShare}
              inputText={shareFormInput}
              setInputText={setShareFormInput}
            />
          </View>
        </Modal>
      </View>
    </>
  );
};

// --- STYLESHEET ---
const styles = StyleSheet.create({
  safeAreaTop: {
    flex: 0,
    backgroundColor: PRIMARY_COLOR,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: PRIMARY_COLOR, // Nền đỏ cho cả màn hình
  },
  // Header
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: PRIMARY_COLOR, // Nền đỏ
  },
  headerButton: {
    padding: 5,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 10,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  headerStatus: {
    color: '#f0f0f0',
    fontSize: 13,
  },
  headerRightIcons: {
    flexDirection: 'row',
  },
  // Khu vực chat (trắng, bo góc)
  chatAreaContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden', // Cắt bỏ phần con bên ngoài góc bo
  },
  // Danh sách tin nhắn
  dealRoomWrapper: {
    paddingBottom: 16,
  },
  dealRoomCard: {
    borderRadius: 28,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#7f001f',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  dealRoomTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  dealRoomHeadlineWrap: {
    flex: 1,
    paddingRight: 12,
  },
  dealRoomKicker: {
    color: '#ffe5d0',
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '800',
    marginBottom: 6,
  },
  dealRoomHeadline: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 6,
  },
  dealRoomDescription: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 14,
    lineHeight: 20,
  },
  dealRoomStatusPill: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  dealRoomStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  dealLoadingBlock: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealLoadingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  dealPostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 22,
    padding: 12,
    marginBottom: 12,
  },
  dealPostImage: {
    width: 86,
    height: 86,
    borderRadius: 20,
    marginRight: 12,
  },
  dealPostPlaceholder: {
    width: 86,
    height: 86,
    borderRadius: 20,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fde7df',
  },
  dealPostContent: {
    flex: 1,
  },
  dealPostTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#211314',
    marginBottom: 4,
  },
  dealPostPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: PRIMARY_COLOR,
    marginBottom: 4,
  },
  dealPostMeta: {
    fontSize: 13,
    color: '#7b5e63',
    lineHeight: 18,
  },
  dealChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  dealChip: {
    backgroundColor: '#fff2ea',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  dealChipText: {
    color: '#7f001f',
    fontSize: 12,
    fontWeight: '700',
  },
  dealNoteCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
  },
  dealNoteLabel: {
    color: '#8b5f65',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  dealNoteText: {
    color: '#2f1719',
    fontSize: 14,
    lineHeight: 20,
  },
  dealMeetingCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
  },
  dealMeetingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dealMeetingTitle: {
    color: PRIMARY_COLOR,
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 6,
  },
  dealMeetingAddress: {
    color: '#241516',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 6,
  },
  dealMeetingTime: {
    color: '#77595f',
    fontSize: 13,
    lineHeight: 18,
  },
  dealCompletionCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
  },
  dealCompletionTitle: {
    color: '#2b1719',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  dealCompletionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dealCompletionPill: {
    borderRadius: 999,
    backgroundColor: '#fce7e9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  dealCompletionPillDone: {
    backgroundColor: '#dcfce7',
  },
  dealCompletionPillText: {
    color: '#7f001f',
    fontSize: 12,
    fontWeight: '700',
  },
  dealCompletionPillTextDone: {
    color: '#166534',
  },
  dealNoticeBanner: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dealNoticeSuccess: {
    backgroundColor: '#dcfce7',
  },
  dealNoticeError: {
    backgroundColor: '#fee2e2',
  },
  dealNoticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  dealNoticeTextSuccess: {
    color: '#065f46',
  },
  dealNoticeTextError: {
    color: '#7f1d1d',
  },
  dealSuccessCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    marginTop: 4,
  },
  dealSuccessTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  dealSuccessText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  dealActionPanel: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 22,
    padding: 16,
  },
  dealActionTitle: {
    color: '#2d1618',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  dealActionHint: {
    color: '#7d5e64',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  dealComposerInput: {
    minHeight: 110,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#fff4f1',
    color: '#2d1618',
    fontSize: 15,
    textAlignVertical: 'top',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3c0ca',
  },
  dealButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  dealPrimaryAction: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 50,
    marginBottom: 10,
  },
  dealPrimaryActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  dealGhostAction: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff5f1',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#f3c5cf',
    marginBottom: 10,
  },
  dealGhostActionText: {
    color: PRIMARY_COLOR,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  dealDangerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 50,
    alignSelf: 'stretch',
  },
  dealDangerActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  dealSuccessAction: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 50,
    marginBottom: 10,
  },
  dealSuccessActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  dealUnavailableCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dealUnavailableText: {
    flex: 1,
    color: '#64323a',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    marginLeft: 8,
  },
  dealModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 8, 10, 0.54)',
    justifyContent: 'flex-end',
  },
  dealModalKeyboard: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dealModalCard: {
    backgroundColor: '#fff8f4',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '84%',
  },
  dealModalHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  dealModalHandle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#ead4c8',
    marginBottom: 12,
  },
  dealModalCloseButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff0ea',
  },
  dealModalTitle: {
    color: '#221214',
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 8,
  },
  dealModalDescription: {
    color: '#73575c',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  dealSecondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff0ea',
    borderRadius: 18,
    paddingVertical: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f5cfd5',
  },
  dealSecondaryActionText: {
    color: PRIMARY_COLOR,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  dealFieldBlock: {
    marginBottom: 14,
  },
  dealFieldLabel: {
    color: '#6d474e',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  dealTextInput: {
    minHeight: 60,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f3d4d8',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#221214',
    fontSize: 15,
  },
  dealTextInputTall: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  dealFieldRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  dealDateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f3d4d8',
    marginRight: 10,
  },
  dealDateButtonText: {
    color: '#341518',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  dealMeetingMetaCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1d8d8',
  },
  dealMeetingMetaLabel: {
    color: '#8b5f65',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  dealMeetingMetaValue: {
    color: '#241416',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  dealMeetingMetaHint: {
    color: '#7a6165',
    fontSize: 13,
    lineHeight: 18,
  },
  messageList: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 20, // Padding trên cho tin nhắn đầu tiên
  },
  // Tin nhắn
  messageItemContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  bubbleBase: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  myMessageBubble: {
    backgroundColor: PRIMARY_COLOR,
  },
  otherMessageBubble: {
    backgroundColor: '#f1f1f1',
  },
  myMessageText: {
    color: '#fff',
    fontSize: 16,
  },
  otherMessageText: {
    color: '#000',
    fontSize: 16,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    marginHorizontal: 5,
  },
  myTimestamp: {
    alignSelf: 'flex-end',
  },
  otherTimestamp: {
    alignSelf: 'flex-start',
  },
  // Khung nhập liệu
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  inputIconButton: {
    padding: 5,
    marginHorizontal: 5,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120, // Cho phép nhập nhiều dòng
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    marginHorizontal: 5,
  },
  // Typing indicator
  typingIndicator: {
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  typingText: {
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#000',
  },
  // Recall notification styles
  recallContainer: {
    marginVertical: 4,
    alignItems: 'center',
  },
  myRecallContainer: {
    alignSelf: 'flex-end',
  },
  otherRecallContainer: {
    alignSelf: 'flex-start',
  },
  recallBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    maxWidth: '80%',
  },
  recallText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#4CAF50',
    fontStyle: 'italic',
  },
  // Media message styles
  mediaContainer: {
    marginVertical: 4,
    maxWidth: '90%',
  },
  myMediaContainer: {
    alignSelf: 'flex-end',
  },
  otherMediaContainer: {
    alignSelf: 'flex-start',
  },
  mediaBubble: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  myMediaBubble: {
    backgroundColor: PRIMARY_COLOR,
  },
  otherMediaBubble: {
    backgroundColor: '#f1f1f1',
  },
  mediaImage: {
    width: 500,
    height: 600,
    borderRadius: 18,
  },
  videoContainer: {
    position: 'relative',
    borderRadius: 18,
    overflow: 'hidden',
  },
  videoThumbnail: {
    width: '100%',
    height: 300,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -15 }],
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaText: {
    padding: 12,
    fontSize: 16,
  },
  myMediaText: {
    color: '#fff',
  },
  otherMediaText: {
    color: '#000',
  },
  // Disabled button style
  disabledButton: {
    opacity: 0.5,
  },
  // Multiple images preview styles
  imagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  imageScrollView: {
    flex: 1,
  },
  imagePreviewItem: {
    position: 'relative',
    marginRight: 10,
  },
  imagePreviewThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeAllButton: {
    padding: 8,
    marginLeft: 10,
  },
  // ImageViewer styles
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'space-between',
  },
  imageViewerTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    paddingTop: 40,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 10,
  },
  imageViewerCloseButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  imageViewerContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80, // Để tránh bị che bởi top bar
    paddingBottom: 100, // Để tránh bị che bởi bottom bar
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
  },
  imageViewerBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    paddingBottom: 30,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 10,
  },
  imageViewerActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  imageViewerActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Post Share Form Styles
  postShareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  postShareFormContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  postShareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  postShareTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  postShareCloseButton: {
    padding: 5,
  },
  postPreviewContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  postPreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  postPreviewText: {
    flex: 1,
  },
  postPreviewArrow: {
    padding: 5,
  },
  postPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 22,
  },
  postPreviewLabel: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  postShareInputContainer: {
    marginBottom: 20,
  },
  postShareTextInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    maxHeight: 150,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  postShareCharCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  postShareActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postShareCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  postShareCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  postShareSendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    backgroundColor: PRIMARY_COLOR,
  },
  postShareSendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  postShareSendText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  // Post Share Message Styles
  postShareBubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  postShareCard: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  postShareCardImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  postShareCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  postShareIcon: {
    marginRight: 12,
  },
  postShareCardText: {
    flex: 1,
  },
  postShareCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  postShareCardSubtitle: {
    fontSize: 12,
    opacity: 0.8,
  },
  postShareDealButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b10f37',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  postShareDealButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 8,
  },
  // Location Message Styles
  locationBubble: {
    paddingVertical: 15,
    paddingHorizontal: 18,
    minWidth: 200,
    alignItems: 'center',
  },
  locationIcon: {
    marginBottom: 8,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationSubtext: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default ChatDetailScreen;
