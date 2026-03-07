import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl as string;

interface ImageData {
  ID: string;
  ID_BaiDang: string;
  LinkAnh: string;
}

interface Category {
  ID_DanhMuc: string;
  ten: string;
}

interface PostType {
  ID_LoaiBaiDang: string;
  ten: string;
}

const ChinhSuaBaiDangScreen: React.FC = () => {
  const { postId, postData: postDataString } = useLocalSearchParams<{
    postId: string;
    postData?: string;
  }>();
  const router = useRouter();

  // Form states
  const [tieuDe, setTieuDe] = useState('');
  const [moTa, setMoTa] = useState('');
  const [gia, setGia] = useState('');
  const [viTri, setViTri] = useState('');
  const [danhMuc, setDanhMuc] = useState('');
  const [loaiBaiDang, setLoaiBaiDang] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<ImageData[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);

  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [postTypes, setPostTypes] = useState<PostType[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);

  // Load post data
  const loadPostData = useCallback(async () => {
    if (!postId) {
      Toast.show({ type: 'error', text1: 'Không tìm thấy ID bài đăng' });
      router.back();
      return;
    }

    try {
      // If postData is passed from params, use it directly
      if (postDataString) {
        const passedPostData = JSON.parse(postDataString);
        setTieuDe(passedPostData.tieu_de || '');
        setMoTa(passedPostData.mo_ta || '');
        setGia(passedPostData.gia || '');
        setViTri(passedPostData.vi_tri || '');
        setDanhMuc(passedPostData.ID_DanhMuc || '');
        setLoaiBaiDang(passedPostData.ID_LoaiBaiDang || '');

        // Convert images array to ImageData format
        // For images passed from params, we need to load real IDs from API
        const imageData = (passedPostData.images || []).map((img: string, index: number) => ({
          ID: `temp_${index}`, // This will be replaced with real ID
          ID_BaiDang: postId || '',
          LinkAnh: img,
        }));

        // Load real image data from API to get proper IDs
        try {
          const token = await AsyncStorage.getItem('userToken');
          if (token) {
            const imageResponse = await fetch(`${API_BASE_URL}/api/baidang_anh/getById/${postId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (imageResponse.ok) {
              const realImageData = await imageResponse.json();

              // Replace temp data with real data
              const realImages = realImageData.map((img: any) => {
                let linkAnh = img.LinkAnh;
                if (!linkAnh.startsWith('http://') && !linkAnh.startsWith('https://')) {
                  const baseUrl = API_BASE_URL.replace('/api', '');
                  linkAnh = `${baseUrl}/uploads/${linkAnh}`;
                }
                return {
                  ID: img.ID,
                  ID_BaiDang: img.ID_BaiDang,
                  LinkAnh: linkAnh,
                };
              });

              setExistingImages(realImages);
            } else {
              setExistingImages(imageData);
            }
          } else {
            setExistingImages(imageData);
          }
        } catch (error) {
          setExistingImages(imageData);
        }
        setIsLoading(false);
        return;
      }

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Toast.show({ type: 'error', text1: 'Vui lòng đăng nhập lại' });
        router.back();
        return;
      }

      // Load post details from API
      const postResponse = await fetch(`${API_BASE_URL}/api/baidang/getById/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!postResponse.ok) {
        throw new Error('Không thể tải thông tin bài đăng');
      }

      const postData = await postResponse.json();

      // Load post images
      const imageResponse = await fetch(`${API_BASE_URL}/api/baidang_anh/getById/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let images: ImageData[] = [];
      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        images = imageData.map((img: any) => {
          let linkAnh = img.LinkAnh;
          if (!linkAnh.startsWith('http://') && !linkAnh.startsWith('https://')) {
            const baseUrl = API_BASE_URL.replace('/api', '');
            linkAnh = `${baseUrl}/uploads/${linkAnh}`;
          }
          const imageObj = {
            ID: img.ID,
            ID_BaiDang: img.ID_BaiDang,
            LinkAnh: linkAnh,
          };
          return imageObj;
        });
      }

      // Set form data
      setTieuDe(postData.tieu_de || '');
      setMoTa(postData.mo_ta || '');
      setGia(postData.gia || '');
      setViTri(postData.vi_tri || '');
      setDanhMuc(postData.ID_DanhMuc || '');
      setLoaiBaiDang(postData.ID_LoaiBaiDang || '');
      setExistingImages(images);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Lỗi tải dữ liệu' });
      router.back();
    } finally {
      setIsLoading(false);
    }
  }, [postId, postDataString, router]);

  // Load categories and post types
  const loadCategoriesAndTypes = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const headers = { Authorization: `Bearer ${token}` };

      const [categoriesRes, typesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/danhmuc/getAll`, { headers }),
        fetch(`${API_BASE_URL}/api/loaibaidang/getAll`, { headers }),
      ]);

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }

      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setPostTypes(typesData);
      }
    } catch (error) {}
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([loadPostData(), loadCategoriesAndTypes()]);
    };
    initializeData();
  }, [loadPostData, loadCategoriesAndTypes]);

  // Image picker
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Cần quyền truy cập', 'Cần quyền truy cập thư viện ảnh để chọn ảnh');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const maxImages = 10 - (existingImages.length + selectedImages.length);
      const newImages = result.assets.slice(0, maxImages).map((asset) => asset.uri);
      setSelectedImages((prev) => {
        const updated = [...prev, ...newImages];
        return updated;
      });

      if (result.assets.length > maxImages) {
        Toast.show({
          type: 'info',
          text1: 'Thông báo',
          text2: `Chỉ có thể thêm tối đa ${maxImages} ảnh nữa`,
        });
      }
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Cần quyền truy cập', 'Cần quyền truy cập camera để chụp ảnh');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const maxImages = 10 - (existingImages.length + selectedImages.length);
      if (maxImages > 0) {
        setSelectedImages((prev) => [...prev, result.assets[0].uri]);
      } else {
        Toast.show({
          type: 'info',
          text1: 'Thông báo',
          text2: 'Đã đạt giới hạn tối đa 10 ảnh',
        });
      }
    }
  };

  const removeImage = (index: number, isExisting: boolean = false) => {
    if (isExisting) {
      const imageToRemove = existingImages[index];

      // Add to delete list if it has a real ID (not temp)
      if (imageToRemove.ID && !imageToRemove.ID.startsWith('temp_')) {
        setImagesToDelete((prev) => {
          const updated = [...prev, imageToRemove.ID];
          return updated;
        });
      } else {
        console.log('Image has temp ID, not adding to delete list');
      }
      setExistingImages((prev) => prev.filter((_, i) => i !== index));
    } else {
      setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Submit form
  const handleSubmit = async () => {
    if (!tieuDe.trim()) {
      Toast.show({ type: 'error', text1: 'Vui lòng nhập tiêu đề' });
      return;
    }

    if (!moTa.trim()) {
      Toast.show({ type: 'error', text1: 'Vui lòng nhập mô tả' });
      return;
    }

    if (!gia.trim()) {
      Toast.show({ type: 'error', text1: 'Vui lòng nhập giá' });
      return;
    }

    if (!danhMuc) {
      Toast.show({ type: 'error', text1: 'Vui lòng chọn danh mục' });
      return;
    }

    if (!loaiBaiDang) {
      Toast.show({ type: 'error', text1: 'Vui lòng chọn loại bài đăng' });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Toast.show({ type: 'error', text1: 'Vui lòng đăng nhập lại' });
        return;
      }

      // Update post data
      const postData = {
        tieu_de: tieuDe.trim(),
        mo_ta: moTa.trim(),
        gia: gia.trim(),
        vi_tri: viTri.trim(),
        ID_DanhMuc: danhMuc,
        ID_LoaiBaiDang: loaiBaiDang,
      };

      const updateResponse = await fetch(`${API_BASE_URL}/api/baidang/update/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(postData),
      });

      if (!updateResponse.ok) {
        throw new Error('Không thể cập nhật bài đăng');
      }

      // Delete images that were marked for deletion
      if (imagesToDelete.length > 0) {
        for (const imageId of imagesToDelete) {
          try {
            const deleteResponse = await fetch(
              `${API_BASE_URL}/api/baidang_anh/delete/${imageId}`,
              {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );

            if (deleteResponse.ok) {
            } else {
              const errorText = await deleteResponse.text();
              Toast.show({
                type: 'error',
                text1: 'Lỗi xóa ảnh',
                text2: 'Không thể xóa ảnh khỏi server',
              });
            }
          } catch (error) {
            Toast.show({
              type: 'error',
              text1: 'Lỗi xóa ảnh',
              text2: 'Không thể kết nối đến server',
            });
          }
        }
      }

      // Handle new images if there are any
      if (selectedImages.length > 0) {
        // Upload each image individually
        for (let i = 0; i < selectedImages.length; i++) {
          const uri = selectedImages[i];
          const filename = `image_${Date.now()}_${i}.jpg`;

          try {
            // Create FormData for single image upload
            const formData = new FormData();
            formData.append('avatar', {
              uri: uri,
              type: 'image/jpeg',
              name: filename,
            } as any);

            // Upload image to server
            const uploadResponse = await fetch(`${API_BASE_URL}/api/upload`, {
              method: 'POST',
              headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            });

            if (uploadResponse.ok) {
              const uploadResult = await uploadResponse.json();

              // Extract filename from the full URL
              // URL format: http://localhost:3000/uploads/avatar-1234567890-123456789.jpg
              const imageUrl = uploadResult.imageUrl;
              const serverFilename = imageUrl.split('/').pop(); // Get filename from URL

              // Save image info to database
              const imageData = {
                ID_BaiDang: postId,
                LinkAnh: serverFilename,
              };

              const saveResponse = await fetch(`${API_BASE_URL}/api/baidang_anh/create`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(imageData),
              });

              if (saveResponse.ok) {
                console.log('Image saved successfully');
              } else {
                const errorText = await saveResponse.text();
              }
            } else {
              const errorText = await uploadResponse.text();
              Toast.show({
                type: 'error',
                text1: 'Lỗi upload ảnh',
                text2: 'Không thể upload ảnh lên server',
              });
            }
          } catch (error) {}
        }
      }

      Toast.show({
        type: 'success',
        text1: 'Thành công',
        text2: 'Đã cập nhật bài đăng',
      });

      router.back();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Không thể cập nhật bài đăng',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7f001f" />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa bài đăng</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>
            {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Form fields */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tiêu đề *</Text>
          <TextInput
            style={styles.input}
            value={tieuDe}
            onChangeText={setTieuDe}
            placeholder="Nhập tiêu đề bài đăng"
            multiline
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Mô tả *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={moTa}
            onChangeText={setMoTa}
            placeholder="Nhập mô tả chi tiết"
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Giá *</Text>
          <TextInput
            style={styles.input}
            value={gia}
            onChangeText={setGia}
            placeholder="Nhập giá sản phẩm"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Vị trí</Text>
          <TextInput
            style={styles.input}
            value={viTri}
            onChangeText={setViTri}
            placeholder="Nhập vị trí"
          />
        </View>

        {/* Category Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Danh mục *</Text>
          <TouchableOpacity style={styles.pickerButton} onPress={() => setShowCategoryModal(true)}>
            <Text style={styles.pickerText}>
              {categories.find((c) => c.ID_DanhMuc === danhMuc)?.ten || 'Chọn danh mục'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Post Type Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Loại bài đăng *</Text>
          <TouchableOpacity style={styles.pickerButton} onPress={() => setShowTypeModal(true)}>
            <Text style={styles.pickerText}>
              {postTypes.find((t) => t.ID_LoaiBaiDang === loaiBaiDang)?.ten || 'Chọn loại bài đăng'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Images Section */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Hình ảnh</Text>

          {/* Existing Images */}
          {existingImages.length > 0 && (
            <View style={styles.imageGrid}>
              {existingImages.map((imageData, index) => (
                <View key={`existing-${imageData.ID}-${index}`} style={styles.imageContainer}>
                  <Image source={{ uri: imageData.LinkAnh }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index, true)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* New Images */}
          {selectedImages.length > 0 && (
            <View style={styles.imageGrid}>
              {selectedImages.map((uri, index) => {
                return (
                  <View key={`new-${index}`} style={styles.imageContainer}>
                    <Image source={{ uri }} style={styles.image} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index, false)}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Add Image Buttons */}
          {existingImages.length + selectedImages.length < 10 && (
            <View style={styles.addImageButtons}>
              <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                <MaterialCommunityIcons name="image-multiple" size={24} color="#7f001f" />
                <Text style={styles.addImageText}>Chọn ảnh</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.addImageButton} onPress={takePhoto}>
                <MaterialCommunityIcons name="camera" size={24} color="#7f001f" />
                <Text style={styles.addImageText}>Chụp ảnh</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Category Modal */}
      {showCategoryModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn danh mục</Text>
            <ScrollView>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.ID_DanhMuc}
                  style={styles.modalItem}
                  onPress={() => {
                    setDanhMuc(category.ID_DanhMuc);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{category.ten}</Text>
                  {danhMuc === category.ID_DanhMuc && (
                    <Ionicons name="checkmark" size={20} color="#7f001f" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.modalCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Type Modal */}
      {showTypeModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn loại bài đăng</Text>
            <ScrollView>
              {postTypes.map((type) => (
                <TouchableOpacity
                  key={type.ID_LoaiBaiDang}
                  style={styles.modalItem}
                  onPress={() => {
                    setLoaiBaiDang(type.ID_LoaiBaiDang);
                    setShowTypeModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{type.ten}</Text>
                  {loaiBaiDang === type.ID_LoaiBaiDang && (
                    <Ionicons name="checkmark" size={20} color="#7f001f" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowTypeModal(false)}
            >
              <Text style={styles.modalCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#7f001f',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  formGroup: {
    marginTop: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 8,
    marginBottom: 8,
  },
  image: {
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
  addImageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7f001f',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
    justifyContent: 'center',
  },
  addImageText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#7f001f',
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 50,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxHeight: '70%',
    minWidth: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
  modalCloseButton: {
    backgroundColor: '#7f001f',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ChinhSuaBaiDangScreen;
