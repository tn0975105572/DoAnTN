import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import * as Location from 'expo-location';

interface Category {
  ID_DanhMuc: string;
  ten?: string;
  TenDanhMuc?: string;
}

interface PostType {
  ID_LoaiBaiDang: string;
  ten: string;
}

interface UserInfo {
  ID_NguoiDung: string;
  diem_so?: number;
  [key: string]: any;
}

interface PostData {
  ID_NguoiDung: string;
  ID_LoaiBaiDang: string;
  ID_DanhMuc: string;
  tieu_de: string;
  mo_ta: string;
  gia: number;
  vi_tri: string;
  trang_thai: string;
  thoi_gian_tao: string;
  thoi_gian_cap_nhat: string;
}

const CreatePostScreen: React.FC = () => {
  const baseUrl = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.108:3000';
  const API_BASE_URL = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;

  const [currentStep, setCurrentStep] = useState<number>(1);

  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [postType, setPostType] = useState<string>('');
  const [postTypeId, setPostTypeId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [formattedPrice, setFormattedPrice] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [condition, setCondition] = useState<string>('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const [isPosting, setIsPosting] = useState<boolean>(false);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [postTypes, setPostTypes] = useState<PostType[]>([]);

  const loadInitialData = useCallback(async (): Promise<void> => {
    try {
      setIsLoadingData(true);

      const userJson = await AsyncStorage.getItem('userInfo');
      if (userJson) {
        const userData = JSON.parse(userJson);
        setUserPoints(userData.diem_so || 0);
      }

      const [categoriesRes, postTypesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/danhmuc/getAll`),
        fetch(`${API_BASE_URL}/loaibaidang/getAll`),
      ]);

      if (!categoriesRes.ok || !postTypesRes.ok) {
        throw new Error('Failed to fetch data from API');
      }

      const categoriesData = await categoriesRes.json();
      const postTypesData = await postTypesRes.json();

      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setPostTypes(Array.isArray(postTypesData) ? postTypesData : []);
    } catch (error) {
      console.error('Error loading data:', error);
      setCategories([]);
      setPostTypes([]);
      Alert.alert(
        'Lỗi',
        `Không thể tải dữ liệu: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsLoadingData(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Form validation
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!title.trim()) {
          Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề bài đăng');
          return false;
        }
        if (!postType) {
          Alert.alert('Lỗi', 'Vui lòng chọn loại bài đăng');
          return false;
        }
        if (!category) {
          Alert.alert('Lỗi', 'Vui lòng chọn danh mục');
          return false;
        }
        return true;
      case 2:
        if (!description.trim()) {
          Alert.alert('Lỗi', 'Vui lòng nhập mô tả sản phẩm');
          return false;
        }
        if (!price.trim()) {
          Alert.alert('Lỗi', 'Vui lòng nhập giá sản phẩm');
          return false;
        }
        if (!location.trim()) {
          Alert.alert('Lỗi', 'Vui lòng chọn vị trí');
          return false;
        }
        if (!condition) {
          Alert.alert('Lỗi', 'Vui lòng chọn tình trạng sản phẩm');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = (): void => {
    if (validateStep(currentStep) && currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = (): void => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const pickImage = async (): Promise<void> => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        'Cần quyền truy cập',
        'Vui lòng cấp quyền truy cập thư viện ảnh để có thể chọn hình ảnh.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      aspect: [4, 3],
      allowsEditing: false,
      selectionLimit: 10,
    });

    if (!result.canceled && result.assets) {
      setImages([...images, ...result.assets]);
    }
  };

  const takePhoto = async (): Promise<void> => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền truy cập camera để có thể chụp ảnh.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      aspect: [4, 3],
      allowsEditing: true,
    });

    if (!result.canceled && result.assets) {
      setImages([...images, ...result.assets]);
    }
  };

  const removeImage = (index: number): void => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const formatPrice = (value: string): void => {
    const numericValue = value.replace(/[^0-9]/g, '');

    setPrice(numericValue);

    if (numericValue === '') {
      setFormattedPrice('');
      return;
    }

    const formatted = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    setFormattedPrice(formatted);
  };

  const handleUseCurrentLocation = async (): Promise<void> => {
    try {
      setIsLocating(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập vị trí', 'Vui lòng cấp quyền để tự động lấy vị trí.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = position.coords;

      let displayAddress = '';
      const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo && geo.length > 0) {
        const g = geo[0];
        displayAddress = [g.name, g.street, g.subregion, g.region, g.country]
          .filter(Boolean)
          .join(', ');
      }

      if (!displayAddress) {
        displayAddress = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      }

      setLocation(displayAddress);
      setCoordinates({ latitude, longitude });
      Alert.alert('Thành công', 'Đã lấy vị trí hiện tại của bạn.');
    } catch {
      Alert.alert('Lỗi', 'Không thể lấy vị trí hiện tại. Vui lòng thử lại.');
    } finally {
      setIsLocating(false);
    }
  };

  const convertNumberToVietnameseText = (num: number): string => {
    const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const tens = [
      '',
      '',
      'hai mươi',
      'ba mươi',
      'bốn mươi',
      'năm mươi',
      'sáu mươi',
      'bảy mươi',
      'tám mươi',
      'chín mươi',
    ];
    const hundreds = [
      '',
      'một trăm',
      'hai trăm',
      'ba trăm',
      'bốn trăm',
      'năm trăm',
      'sáu trăm',
      'bảy trăm',
      'tám trăm',
      'chín trăm',
    ];
    const thousands = [
      '',
      'một nghìn',
      'hai nghìn',
      'ba nghìn',
      'bốn nghìn',
      'năm nghìn',
      'sáu nghìn',
      'bảy nghìn',
      'tám nghìn',
      'chín nghìn',
    ];
    const tenThousands = [
      '',
      '',
      'hai mươi',
      'ba mươi',
      'bốn mươi',
      'năm mươi',
      'sáu mươi',
      'bảy mươi',
      'tám mươi',
      'chín mươi',
    ];
    const hundredThousands = [
      '',
      'một trăm',
      'hai trăm',
      'ba trăm',
      'bốn trăm',
      'năm trăm',
      'sáu trăm',
      'bảy trăm',
      'tám trăm',
      'chín trăm',
    ];
    const millions = [
      '',
      'một triệu',
      'hai triệu',
      'ba triệu',
      'bốn triệu',
      'năm triệu',
      'sáu triệu',
      'bảy triệu',
      'tám triệu',
      'chín triệu',
    ];

    if (num === 0) return 'không';

    let result = '';
    const numStr = num.toString().padStart(7, '0');

    // Million
    const million = parseInt(numStr[0]);
    if (million > 0) {
      result += millions[million] + ' ';
    }

    // Hundred thousand
    const hundredThousand = parseInt(numStr[1]);
    const tenThousand = parseInt(numStr[2]);
    const thousand = parseInt(numStr[3]);

    if (hundredThousand > 0 || tenThousand > 0 || thousand > 0) {
      if (hundredThousand > 0) {
        result += hundredThousands[hundredThousand] + ' ';
      }
      if (tenThousand > 1) {
        result += tenThousands[tenThousand] + ' ';
        if (thousand > 0) {
          result += ones[thousand] + ' ';
        }
      } else if (tenThousand === 1) {
        if (thousand > 0) {
          result += 'mười ' + ones[thousand] + ' ';
        } else {
          result += 'mười ';
        }
      } else if (thousand > 0) {
        result += thousands[thousand] + ' ';
      }
      result += 'nghìn ';
    }

    // Hundred
    const hundred = parseInt(numStr[4]);
    if (hundred > 0) {
      result += hundreds[hundred] + ' ';
    }

    // Ten and one
    const ten = parseInt(numStr[5]);
    const one = parseInt(numStr[6]);

    if (ten > 1) {
      result += tens[ten] + ' ';
      if (one > 0) {
        result += ones[one] + ' ';
      }
    } else if (ten === 1) {
      if (one > 0) {
        result += 'mười ' + ones[one] + ' ';
      } else {
        result += 'mười ';
      }
    } else if (one > 0) {
      result += ones[one] + ' ';
    }

    return result.trim() + ' Việt Nam đồng';
  };

  const showImagePicker = (): void => {
    Alert.alert('Chọn hình ảnh', 'Bạn muốn chọn ảnh từ đâu?', [
      { text: 'Thư viện', onPress: pickImage },
      { text: 'Chụp ảnh', onPress: takePhoto },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const createPost = async (): Promise<void> => {
    if (!validateStep(1) || !validateStep(2)) {
      return;
    }

    try {
      setIsPosting(true);

      let userInfo: UserInfo | null = null;
      const user = await AsyncStorage.getItem('userInfo');
      userInfo = user ? JSON.parse(user) : null;

      if (!userInfo?.ID_NguoiDung) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
        return;
      }

      const currentPoints = userInfo.diem_so || 0;
      const requiredPoints = 20;

      if (currentPoints < requiredPoints) {
        Alert.alert(
          'Không đủ điểm',
          `Bạn cần ít nhất ${requiredPoints} điểm để đăng bài.\n\nĐiểm hiện tại: ${currentPoints} điểm\nCần thêm: ${requiredPoints - currentPoints} điểm\n\nHãy tương tác với các bài đăng khác để kiếm thêm điểm!`,
          [{ text: 'OK', style: 'default' }],
        );
        setIsPosting(false);
        return;
      }

      const postData: PostData = {
        ID_NguoiDung: userInfo.ID_NguoiDung,
        ID_LoaiBaiDang: postTypeId,
        ID_DanhMuc: categoryId,
        tieu_de: title,
        mo_ta: description,
        gia: parseFloat(price) || 0,
        vi_tri: coordinates
          ? `${location}|${coordinates.latitude},${coordinates.longitude}`
          : location,
        trang_thai: 'dang_ban',
        thoi_gian_tao: new Date().toISOString(),
        thoi_gian_cap_nhat: new Date().toISOString(),
      };

      const postResponse = await fetch(`${API_BASE_URL}/baidang/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });

      if (!postResponse.ok) {
        const errorText = await postResponse.text();
        throw new Error(`Failed to create post: ${postResponse.status} - ${errorText}`);
      }

      const postResult = await postResponse.json();
      const actualPostId = postResult.ID_BaiDang;
      if (!actualPostId) {
        throw new Error('Không thể lấy ID bài đăng từ response');
      }

      if (images.length > 0) {
        const uploadedImageUrls: string[] = [];
        for (let i = 0; i < images.length; i++) {
          const formData = new FormData();
          formData.append('avatar', {
            uri: images[i].uri,
            type: 'image/jpeg',
            name: `image_${Date.now()}_${i}.jpg`,
          } as any);

          const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            body: formData,
          });

          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            const imageUrl = uploadResult.imageUrl;
            uploadedImageUrls.push(imageUrl);

            const filename = imageUrl.split('/').pop() || `image_${Date.now()}_${i}.jpg`;

            const imageData = {
              ID_BaiDang: actualPostId,
              LinkAnh: filename,
              ID: `img_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
            };

            const imageResponse = await fetch(`${API_BASE_URL}/baidang_anh/create`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(imageData),
            });

            if (imageResponse.ok) {
              await imageResponse.json();
            }
          } else {
            await uploadResponse.text();
          }
        }
      }

      const newPoints = currentPoints - 20;
      setUserPoints(newPoints);

      const updatedUserInfo = { ...userInfo, diem_so: newPoints };
      await AsyncStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));

      try {
        const token = await AsyncStorage.getItem('userToken');
        const userResponse = await fetch(
          `${API_BASE_URL}/nguoidung/getById/${userInfo.ID_NguoiDung}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData && userData.diem_so !== undefined) {
            const serverUpdatedUserInfo = { ...userInfo, diem_so: userData.diem_so };
            await AsyncStorage.setItem('userInfo', JSON.stringify(serverUpdatedUserInfo));
            setUserPoints(userData.diem_so);
          }
        }
      } catch { }

      Alert.alert(
        'Thành công',
        `Bài đăng đã được tạo thành công!\n\nĐã trừ 20 điểm từ tài khoản của bạn.\nĐiểm còn lại: ${newPoints} điểm`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setCurrentStep(1);
              setTitle('');
              setCategory('');
              setCategoryId('');
              setPostType('');
              setPostTypeId('');
              setDescription('');
              setPrice('');
              setFormattedPrice('');
              setLocation('');
              setCoordinates(null);
              setCondition('');
              setImages([]);
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        'Lỗi',
        `Không thể tạo bài đăng: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsPosting(false);
    }
  };

  const StepIndicator: React.FC = () => (
    <View style={styles.stepIndicator}>
      <View style={styles.stepContainer}>
        <View style={[styles.stepCircle, currentStep >= 1 ? styles.stepCircleActive : null]}>
          <Text style={[styles.stepNumber, currentStep >= 1 ? styles.stepNumberActive : null]}>
            1
          </Text>
        </View>
        <Text style={[styles.stepLabel, currentStep >= 1 ? styles.stepLabelActive : null]}>
          Tài khoản
        </Text>
      </View>

      <View style={[styles.stepLine, currentStep >= 2 ? styles.stepLineActive : null]} />

      <View style={styles.stepContainer}>
        <View style={[styles.stepCircle, currentStep >= 2 ? styles.stepCircleActive : null]}>
          <Text style={[styles.stepNumber, currentStep >= 2 ? styles.stepNumberActive : null]}>
            2
          </Text>
        </View>
        <Text style={[styles.stepLabel, currentStep >= 2 ? styles.stepLabelActive : null]}>
          Thông tin
        </Text>
      </View>

      <View style={[styles.stepLine, currentStep >= 3 ? styles.stepLineActive : null]} />

      <View style={styles.stepContainer}>
        <View style={[styles.stepCircle, currentStep >= 3 ? styles.stepCircleActive : null]}>
          <Text style={[styles.stepNumber, currentStep >= 3 ? styles.stepNumberActive : null]}>
            3
          </Text>
        </View>
        <Text style={[styles.stepLabel, currentStep >= 3 ? styles.stepLabelActive : null]}>
          Hoàn tất
        </Text>
      </View>
    </View>
  );

  const LoadingComponent: React.FC = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="small" color="#8B3538" />
      <Text style={styles.loadingText}>Đang tải...</Text>
    </View>
  );

  const ErrorComponent: React.FC<{ message: string }> = ({ message }) => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );

  const RadioButton: React.FC<{
    label: string;
    selected: boolean;
    onPress: () => void;
  }> = ({ label, selected, onPress }) => (
    <TouchableOpacity style={styles.radioContainer} onPress={onPress}>
      <View style={[styles.radioButton, selected ? styles.radioButtonSelected : null]} />
      <Text style={styles.radioText}>{label}</Text>
    </TouchableOpacity>
  );

  const SelectInput: React.FC<{
    value: string;
    placeholder: string;
    onPress: () => void;
    icon: string;
  }> = ({ value, placeholder, onPress, icon }) => (
    <TouchableOpacity style={styles.selectInput} onPress={onPress}>
      <Text style={value ? styles.selectedText : styles.placeholderText}>
        {value || placeholder}
      </Text>
      <Ionicons name={icon as any} size={20} color="#888" />
    </TouchableOpacity>
  );

  const CategoryCombobox: React.FC = () => {
    const [isOpen, setIsOpen] = useState<boolean>(false);

    return (
      <View style={styles.comboboxWrapper}>
        <TouchableOpacity style={styles.comboboxInput} onPress={() => setIsOpen(true)}>
          <Text style={category ? styles.selectedText : styles.placeholderText}>
            {category || 'Chọn danh mục'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#888" />
        </TouchableOpacity>

        <Modal
          visible={isOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsOpen(false)}
        >
          <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Chọn danh mục</Text>
                    <TouchableOpacity onPress={() => setIsOpen(false)}>
                      <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={true}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.ID_DanhMuc}
                        style={[
                          styles.modalItem,
                          category === (cat.ten || cat.TenDanhMuc)
                            ? styles.modalItemSelected
                            : null,
                        ]}
                        onPress={() => {
                          setCategory(cat.ten || cat.TenDanhMuc || '');
                          setCategoryId(cat.ID_DanhMuc);
                          setIsOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.modalItemText,
                            category === (cat.ten || cat.TenDanhMuc)
                              ? styles.modalItemTextSelected
                              : null,
                          ]}
                        >
                          {cat.ten || cat.TenDanhMuc}
                        </Text>
                        {category === (cat.ten || cat.TenDanhMuc) && (
                          <Ionicons name="checkmark" size={20} color="#8B3538" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    );
  };

  const PostTypeCombobox: React.FC = () => {
    const [isOpen, setIsOpen] = useState<boolean>(false);

    return (
      <View style={styles.comboboxWrapper}>
        <TouchableOpacity style={styles.comboboxInput} onPress={() => setIsOpen(true)}>
          <Text style={postType ? styles.selectedText : styles.placeholderText}>
            {postType || 'Chọn loại bài đăng'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#888" />
        </TouchableOpacity>

        <Modal
          visible={isOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsOpen(false)}
        >
          <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Chọn loại bài đăng</Text>
                    <TouchableOpacity onPress={() => setIsOpen(false)}>
                      <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={true}>
                    {postTypes.map((type) => (
                      <TouchableOpacity
                        key={type.ID_LoaiBaiDang}
                        style={[
                          styles.modalItem,
                          postType === type.ten ? styles.modalItemSelected : null,
                        ]}
                        onPress={() => {
                          setPostType(type.ten);
                          setPostTypeId(type.ID_LoaiBaiDang);
                          setIsOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.modalItemText,
                            postType === type.ten ? styles.modalItemTextSelected : null,
                          ]}
                        >
                          {type.ten}
                        </Text>
                        {postType === type.ten && (
                          <Ionicons name="checkmark" size={20} color="#8B3538" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    );
  };

  const ImageUpload: React.FC = () => (
    <View>
      <Text style={styles.label}>Hình ảnh sản phẩm</Text>
      <TouchableOpacity style={styles.uploadBox} onPress={showImagePicker}>
        <MaterialCommunityIcons name="image-plus" size={32} color="#8B3538" />
        <Text style={styles.uploadText}>Thêm hình ảnh</Text>
        <Text style={styles.uploadSubText}>Chọn từ thư viện hoặc chụp ảnh mới</Text>
      </TouchableOpacity>

      {images.length > 0 ? (
        <View style={styles.imageSection}>
          <Text style={styles.imageCountText}>Đã chọn {images.length} hình ảnh (tối đa 10)</Text>
          <ScrollView horizontal style={styles.imagePreview} showsHorizontalScrollIndicator={false}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri: image.uri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <MaterialCommunityIcons name="close-circle" size={24} color="#E53935" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 10 ? (
              <TouchableOpacity style={styles.addMoreButton} onPress={showImagePicker}>
                <MaterialCommunityIcons name="plus" size={24} color="#8B3538" />
                <Text style={styles.addMoreText}>Thêm</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );

  const renderStepContent = (): React.ReactElement | null => {
    switch (currentStep) {
      case 1:
        return (
          <View>
            <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>

            {/* Thông báo về điểm */}
            <View
              style={[
                styles.pointsNotice,
                userPoints < 20 ? styles.pointsNoticeWarning : styles.pointsNoticeSuccess,
              ]}
            >
              <MaterialCommunityIcons
                name={userPoints < 20 ? 'alert-circle' : 'check-circle'}
                size={20}
                color={userPoints < 20 ? '#F44336' : '#4CAF50'}
              />
              <Text
                style={[
                  styles.pointsNoticeText,
                  userPoints < 20 ? styles.pointsNoticeTextWarning : styles.pointsNoticeTextSuccess,
                ]}
              >
                {userPoints < 20
                  ? `Cần ít nhất 20 điểm để đăng bài (hiện tại: ${userPoints} điểm)`
                  : `Đủ điểm để đăng bài (${userPoints} điểm)`}
              </Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Tiêu đề bài đăng"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Loại bài đăng:</Text>
            {isLoadingData ? (
              <LoadingComponent />
            ) : postTypes.length > 0 ? (
              <PostTypeCombobox />
            ) : (
              <ErrorComponent message="Không thể tải danh sách loại bài đăng" />
            )}

            <Text style={styles.label}>Danh mục:</Text>
            {isLoadingData ? (
              <LoadingComponent />
            ) : categories.length > 0 ? (
              <CategoryCombobox />
            ) : (
              <ErrorComponent message="Không thể tải danh sách danh mục" />
            )}
          </View>
        );

      case 2:
        return (
          <View>
            <Text style={styles.sectionTitle}>Chi tiết bài đăng</Text>

            <ImageUpload />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Mô tả chi tiết sản phẩm..."
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
            />

            <TextInput
              style={styles.input}
              placeholder="Giá (VNĐ)"
              value={formattedPrice}
              onChangeText={formatPrice}
              keyboardType="numeric"
            />
            {price && parseInt(price) >= 100 && (
              <View style={styles.priceTextContainer}>
                <Text style={styles.priceText}>
                  {convertNumberToVietnameseText(parseInt(price)).toUpperCase()}
                </Text>
              </View>
            )}

            <Text style={styles.label}>Vị trí:</Text>
            <View style={styles.locationRow}>
              <SelectInput
                value={location}
                placeholder="Nhấn nút để tự động lấy vị trí hiện tại"
                onPress={handleUseCurrentLocation}
                icon="map-marker-outline"
              />
              <TouchableOpacity
                style={styles.locationButton}
                onPress={handleUseCurrentLocation}
                disabled={isLocating}
              >
                {isLocating ? (
                  <ActivityIndicator size="small" color="#8B3538" />
                ) : (
                  <Ionicons name="locate-outline" size={22} color="#8B3538" />
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Tình trạng:</Text>
            <View style={styles.radioGroup}>
              {['Mới', 'Đã sử dụng (tốt)', 'Đã sử dụng (cũ)'].map((cond) => (
                <RadioButton
                  key={cond}
                  label={cond}
                  selected={condition === cond}
                  onPress={() => setCondition(cond)}
                />
              ))}
            </View>
          </View>
        );

      case 3:
        return (
          <View>
            <Text style={styles.sectionTitle}>Xem lại thông tin</Text>
            <View style={styles.reviewContainer}>
              <Text style={styles.reviewLabel}>Tiêu đề:</Text>
              <Text style={styles.reviewValue}>{title}</Text>

              <Text style={styles.reviewLabel}>Loại:</Text>
              <Text style={styles.reviewValue}>{postType}</Text>

              <Text style={styles.reviewLabel}>Danh mục:</Text>
              <Text style={styles.reviewValue}>{category}</Text>

              <Text style={styles.reviewLabel}>Mô tả:</Text>
              <Text style={styles.reviewValue}>{description}</Text>

              <Text style={styles.reviewLabel}>Giá:</Text>
              <Text style={styles.reviewValue}>
                {formattedPrice ? `${formattedPrice} VNĐ` : 'Chưa nhập giá'}
              </Text>
              {price && parseInt(price) >= 100 && (
                <Text style={styles.reviewValue}>
                  ({convertNumberToVietnameseText(parseInt(price)).toUpperCase()})
                </Text>
              )}

              <Text style={styles.reviewLabel}>Vị trí:</Text>
              <Text style={styles.reviewValue}>{location}</Text>

              <Text style={styles.reviewLabel}>Tình trạng:</Text>
              <Text style={styles.reviewValue}>{condition}</Text>

              {images.length > 0 ? (
                <>
                  <Text style={styles.reviewLabel}>Hình ảnh ({images.length}):</Text>
                  <ScrollView
                    horizontal
                    style={styles.imagePreview}
                    showsHorizontalScrollIndicator={false}
                  >
                    {images.map((image, index) => (
                      <View key={index} style={styles.reviewImageContainer}>
                        <Image source={{ uri: image.uri }} style={styles.reviewImage} />
                      </View>
                    ))}
                  </ScrollView>
                </>
              ) : null}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={prevStep} disabled={currentStep === 1}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={currentStep === 1 ? '#ccc' : '#333'}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tạo bài đăng</Text>
          <View style={styles.pointsHeader}>
            <MaterialCommunityIcons name="star" size={20} color="#FFD700" />
            <Text style={styles.pointsText}>{userPoints}</Text>
          </View>
        </View>

        <StepIndicator />

        <Text style={styles.subHeader}>
          {currentStep === 1
            ? 'Bước 1: Thông tin cơ bản'
            : currentStep === 2
              ? 'Bước 2: Chi tiết bài đăng'
              : 'Bước 3: Hoàn tất'}
        </Text>

        {renderStepContent()}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, isPosting ? styles.buttonDisabled : null]}
          onPress={currentStep === 3 ? createPost : nextStep}
          disabled={isPosting}
        >
          {isPosting ? (
            <View style={styles.buttonLoading}>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={[styles.nextButtonText, { marginLeft: 8 }]}>Đang tạo...</Text>
            </View>
          ) : (
            <Text style={styles.nextButtonText}>
              {currentStep === 3 ? 'Đăng bài' : 'Tiếp theo'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
  },
  pointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pointsText: {
    marginLeft: 4,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  subHeader: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 24,
    color: '#1a1a1a',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
    paddingHorizontal: 20,
  },
  stepContainer: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    borderColor: '#8B3538',
    backgroundColor: '#8B3538',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ddd',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#8B3538',
    fontWeight: '600',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#ddd',
    marginHorizontal: 10,
    marginBottom: 20,
  },
  stepLineActive: {
    backgroundColor: '#8B3538',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 16,
    color: '#1a1a1a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    fontSize: 15,
    color: '#1a1a1a',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  label: {
    marginBottom: 12,
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '500',
  },
  radioGroup: {
    marginBottom: 16,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radioButton: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#8B3538',
    marginRight: 12,
  },
  radioButtonSelected: {
    backgroundColor: '#8B3538',
  },
  radioText: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  selectInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  placeholderText: {
    color: '#999',
    fontSize: 15,
    fontWeight: '500',
  },
  selectedText: {
    color: '#1a1a1a',
    fontSize: 15,
    fontWeight: '500',
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  uploadText: {
    color: '#8B3538',
    fontWeight: '600',
    marginTop: 8,
    fontSize: 14,
  },
  uploadSubText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  imageSection: {
    marginBottom: 16,
  },
  imageCountText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  imagePreview: {
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addMoreButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#8B3538',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
  },
  addMoreText: {
    fontSize: 12,
    color: '#8B3538',
    fontWeight: '500',
    marginTop: 4,
  },
  reviewImageContainer: {
    marginRight: 12,
  },
  reviewImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  reviewContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B3538',
    marginTop: 12,
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 15,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  nextButton: {
    backgroundColor: '#8B3538',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#8B3538',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    marginLeft: 8,
    color: '#8B3538',
    fontSize: 14,
  },
  buttonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#E53935',
    fontSize: 14,
    textAlign: 'center',
  },
  priceTextContainer: {
    alignItems: 'flex-end',
    marginTop: 6,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  priceText: {
    fontSize: 13,
    color: '#8B3538',
    fontWeight: 'bold',
    textAlign: 'right',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  locationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#8B3538',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  comboboxWrapper: {
    marginBottom: 16,
    zIndex: 1000,
  },
  comboboxInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 1,
    backgroundColor: '#ffffff',
    minHeight: 56,
  },
  comboboxDropdown: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 1001,
    maxHeight: 250,
  },
  comboboxScrollView: {
    maxHeight: 250,
    flexGrow: 0,
  },
  comboboxItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  comboboxItemSelected: {
    backgroundColor: '#f8f9fa',
  },
  comboboxItemText: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '500',
    flex: 1,
  },
  comboboxItemTextSelected: {
    color: '#8B3538',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '100%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemSelected: {
    backgroundColor: '#f8f9fa',
  },
  modalItemText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
    flex: 1,
  },
  modalItemTextSelected: {
    color: '#8B3538',
    fontWeight: '600',
  },
  pointsNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  pointsNoticeWarning: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  pointsNoticeSuccess: {
    backgroundColor: '#e8f5e8',
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  pointsNoticeText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  pointsNoticeTextWarning: {
    color: '#d32f2f',
  },
  pointsNoticeTextSuccess: {
    color: '#2e7d32',
  },
});

export default CreatePostScreen;
