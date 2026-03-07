import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { FontAwesome5, FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';

// === TYPES & INTERFACES ===
interface University {
  code: string | number;
  name: string;
}

interface Province {
  code: number;
  name: string;
  districts?: District[];
}

interface District {
  code: number;
  name: string;
}

interface RegisterResponse {
  token?: string;
  user?: {
    ID_NguoiDung: number;
    ho_ten: string;
    email: string;
    ten_dang_nhap: string;
  };
  message?: string;
}

interface RegisterFormData {
  ten_dang_nhap: string;
  mat_khau: string;
  email: string;
  ho_ten: string;
  truong_hoc: string;
  vi_tri: string;
  que_quan: string;
  anh_dai_dien: string;
  da_xac_thuc: number;
}

// === CONSTANTS ===
const COLORS = {
  primaryRed: '#791228',
  primaryWhite: '#fffcef',
  accentGreen: '#5abf83',
  white: '#ffffff',
  blue: '#007bff',
  gray: '#aaa',
  lightGray: '#cccccc',
  googleRed: '#DB4437',
  facebookBlue: '#3b5998',
  zaloGreen: '#008000',
} as const;

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl as string;
const UPLOAD_API_URL = API_BASE_URL;

// === COMPONENT PROPS ===
interface RegisterScreenProps {
  // Có thể thêm props nếu cần trong tương lai
}

// === SUB-COMPONENT: STEPPER ===
interface StepperProps {
  activeStep: number;
}

const Stepper: React.FC<StepperProps> = ({ activeStep }) => {
  const steps: string[] = ['Tài khoản', 'Thông tin', 'Hoàn tất'];

  return (
    <View style={styles.stepperContainer}>
      {steps.map((label, index) => {
        const stepNum: number = index + 1;
        const isActive: boolean = stepNum === activeStep;
        const isCompleted: boolean = stepNum < activeStep;

        return (
          <React.Fragment key={stepNum}>
            <View style={styles.stepItem}>
              <View
                style={[styles.stepCircle, (isActive || isCompleted) && styles.stepCircleActive]}
              >
                <Text style={styles.stepText}>{stepNum}</Text>
              </View>
              <Text style={styles.stepLabel}>{label}</Text>
            </View>
            {stepNum < steps.length && <View style={styles.stepLine} />}
          </React.Fragment>
        );
      })}
    </View>
  );
};

// === MAIN COMPONENT ===
export default function RegisterScreen({}: RegisterScreenProps): React.JSX.Element {
  // === STATE ===
  const [step, setStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [fontsLoaded] = useFonts({
    Oughter: require('../../../assets/fonts/Oughter.otf'),
  }); // Step 1: Account Information

  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>(''); // Step 2: Location Information

  const [universities, setUniversities] = useState<University[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  const [selectedUniversity, setSelectedUniversity] = useState<string>('');
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [address, setAddress] = useState<string>(''); // Step 3: Avatar

  const [avatar, setAvatar] = useState<string | null>(null); // === EFFECTS ===

  useEffect(() => {
    const loadInitialData = async (): Promise<void> => {
      try {
        // Load universities
        const universitiesData = (await import('../../../universities.json')).default;
        setUniversities(universitiesData as University[]); // Load provinces

        const response = await fetch('https://provinces.open-api.vn/api/p/');
        const provincesData: Province[] = await response.json();
        setProvinces(provincesData);
      } catch (error) {
        console.error('Lỗi tải dữ liệu ban đầu:', error);
        Alert.alert('Lỗi', 'Không thể tải dữ liệu. Vui lòng kiểm tra kết nối mạng.');
      }
    };

    loadInitialData();
  }, []); // === UTILITY FUNCTIONS ===

  const validateStep1 = (): boolean => {
    const requiredFields = [name.trim(), email.trim(), username.trim(), password];
    if (requiredFields.some((field) => !field)) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc.');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu và xác nhận mật khẩu không khớp.');
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Lỗi', 'Email không hợp lệ.');
      return false;
    }

    return true;
  };

  const validateStep2 = (): boolean => {
    const requiredFields = [selectedUniversity, selectedProvince, selectedDistrict, address.trim()];
    if (requiredFields.some((field) => !field)) {
      Alert.alert(
        'Lỗi',
        'Vui lòng chọn trường học, tỉnh/thành, quận/huyện và nhập địa chỉ cụ thể.',
      );
      return false;
    }
    return true;
  }; // === IMAGE PICKER ===

  const pickImage = async (): Promise<void> => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert('Xin lỗi', 'Cần quyền truy cập Camera và Thư viện ảnh để chọn avatar!');
      return;
    }

    Alert.alert(
      'Chọn ảnh đại diện',
      'Bạn muốn chọn ảnh từ đâu?',
      [
        {
          text: 'Chụp ảnh',
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.5,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
              setAvatar(result.assets[0].uri);
            }
          },
        },
        {
          text: 'Chọn từ thư viện',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.5,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
              setAvatar(result.assets[0].uri);
            }
          },
        },
        { text: 'Hủy', style: 'cancel' },
      ],
      { cancelable: true },
    );
  }; // === LOCATION HANDLERS ===

  const handleProvinceChange = async (provinceCode: string): Promise<void> => {
    if (!provinceCode) {
      setSelectedProvince('');
      setDistricts([]);
      setSelectedDistrict('');
      return;
    }

    setSelectedProvince(provinceCode);
    setSelectedDistrict('');

    try {
      const response = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
      const data = await response.json();
      setDistricts(data.districts || []);
    } catch (error) {
      console.error('Lỗi tải danh sách quận/huyện:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách quận/huyện.');
    }
  }; // === NAVIGATION ===

  const handleNextStep = (): void => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;

    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handlePrevStep = (): void => {
    if (step > 1) {
      setStep(step - 1);
    }
  }; // === IMAGE UPLOAD ===

  const uploadImage = async (imageUri: string): Promise<string | null> => {
    if (!imageUri.startsWith('file://')) {
      return imageUri; // Already uploaded image
    }

    const formData = new FormData();
    const filename: string = imageUri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type: string = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('avatar', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    try {
      const response = await fetch(`${UPLOAD_API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'content-type': 'multipart/form-data',
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Không thể tải ảnh lên.');
      }

      console.log('URL ảnh từ server:', data.imageUrl);
      return data.imageUrl;
    } catch (error) {
      console.error('Lỗi upload ảnh:', error);
      Alert.alert('Lỗi', 'Không thể tải ảnh đại diện lên server.');
      return null;
    }
  }; // === AUTO LOGIN AFTER REGISTER ===

  const loginAfterRegister = async (loginEmail: string, loginPassword: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/nguoidung/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail,
          mat_khau: loginPassword,
        }),
      });

      const data: RegisterResponse = await response.json();

      if (response.ok && data.token && data.user) {
        console.log('Tự động đăng nhập thành công:', data);

        await Promise.all([
          AsyncStorage.setItem('userToken', data.token),
          AsyncStorage.setItem('userInfo', JSON.stringify(data.user)),
        ]);

        Alert.alert('Chào mừng!', 'Đăng ký và đăng nhập thành công!');
        router.replace('/(tabs)/caidat');
      } else {
        Alert.alert('Lỗi đăng nhập', data.message || 'Không thể tự động đăng nhập.');
        router.replace('/components/CaiDat/dangnhap');
      }
    } catch (error) {
      console.error('Lỗi khi tự động đăng nhập:', error);
      Alert.alert('Lỗi mạng', 'Không thể tự động đăng nhập. Vui lòng thử lại.');
      router.replace('/components/CaiDat/dangnhap');
    }
  }; // === REGISTER SUBMISSION ===

  const handleRegister = (): void => {
    if (isLoading) return;
    submitData();
  };

  const submitData = async (): Promise<void> => {
    setIsLoading(true);

    try {
      // Upload avatar if needed
      let finalAvatarUrl: string = 'https://i.pravatar.cc/150?img=45';

      if (avatar) {
        const uploadedUrl = await uploadImage(avatar);
        if (uploadedUrl) {
          finalAvatarUrl = uploadedUrl;
        } else {
          return; // Stop if avatar upload failed
        }
      } // Get location names

      const provinceName: string =
        provinces.find((p: Province) => p.code.toString() === selectedProvince)?.name || '';
      const districtName: string =
        districts.find((d: District) => d.name === selectedDistrict)?.name || '';

      const vi_tri_day_du: string = [address, districtName, provinceName]
        .filter(Boolean)
        .join(', '); // Prepare API payload

      const apiPayload: RegisterFormData = {
        ten_dang_nhap: username.trim(),
        mat_khau: password,
        email: email.trim(),
        ho_ten: name.trim(),
        truong_hoc: selectedUniversity,
        vi_tri: vi_tri_day_du,
        que_quan: vi_tri_day_du, // <-- ĐÃ THÊM
        anh_dai_dien: finalAvatarUrl,
        da_xac_thuc: 0,
      }; // Send registration request

      const response = await fetch(`${API_BASE_URL}/api/nguoidung/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiPayload),
      });

      const responseData: RegisterResponse = await response.json();

      if (response.ok) {
        Alert.alert('Thành công', 'Đăng ký tài khoản thành công! Đang tự động đăng nhập...');
        await loginAfterRegister(apiPayload.email, apiPayload.mat_khau);
      } else {
        Alert.alert('Đăng ký thất bại', responseData.message || 'Đã có lỗi xảy ra.');
      }
    } catch (error) {
      console.error('Lỗi khi gọi API đăng ký:', error);
      Alert.alert('Lỗi mạng', 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại.');
    } finally {
      setIsLoading(false);
    }
  }; // === RENDER STEPS ===

  const renderStep1 = (): React.JSX.Element => (
    <View style={styles.inputGroup}>
      <TextInput
        style={styles.inputField}
        placeholder="Họ và tên"
        placeholderTextColor={COLORS.primaryRed}
        value={name}
        onChangeText={(text: string) => setName(text)}
        editable={!isLoading}
      />
      <TextInput
        style={styles.inputField}
        placeholder="Email"
        placeholderTextColor={COLORS.primaryRed}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={email}
        onChangeText={(text: string) => setEmail(text)}
        editable={!isLoading}
      />
      <TextInput
        style={styles.inputField}
        placeholder="Tên đăng nhập"
        placeholderTextColor={COLORS.primaryRed}
        value={username}
        onChangeText={(text: string) => setUsername(text)}
        autoCapitalize="none"
        editable={!isLoading}
      />
      <TextInput
        style={styles.inputField}
        placeholder="Mật khẩu"
        placeholderTextColor={COLORS.primaryRed}
        secureTextEntry
        value={password}
        onChangeText={(text: string) => setPassword(text)}
        editable={!isLoading}
      />
      <TextInput
        style={styles.inputField}
        placeholder="Xác nhận mật khẩu"
        placeholderTextColor={COLORS.primaryRed}
        secureTextEntry
        value={confirmPassword}
        onChangeText={(text: string) => setConfirmPassword(text)}
        editable={!isLoading}
      />
    </View>
  );

  const renderStep2 = (): React.JSX.Element => (
    <View style={styles.inputGroup}>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedUniversity}
          onValueChange={(itemValue: string) => setSelectedUniversity(itemValue)}
          style={styles.picker}
          dropdownIconColor={COLORS.primaryRed}
          enabled={!isLoading}
        >
          <Picker.Item label="-- Chọn trường học --" value="" color={COLORS.gray} />
          {universities.map((uni: University) => (
            <Picker.Item key={String(uni.code)} label={String(uni.name)} value={String(uni.name)} />
          ))}
        </Picker>
      </View>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedProvince}
          onValueChange={(itemValue: string) => handleProvinceChange(itemValue)}
          style={styles.picker}
          dropdownIconColor={COLORS.primaryRed}
          enabled={!isLoading}
        >
          <Picker.Item label="-- Chọn Tỉnh/Thành phố --" value="" color={COLORS.gray} />
          {provinces.map((prov: Province) => (
            <Picker.Item key={prov.code} label={prov.name} value={String(prov.code)} />
          ))}
        </Picker>
      </View>
      {districts.length > 0 && (
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedDistrict}
            onValueChange={(itemValue: string) => setSelectedDistrict(itemValue)}
            style={styles.picker}
            dropdownIconColor={COLORS.primaryRed}
            enabled={!isLoading}
          >
            <Picker.Item label="-- Chọn Quận/Huyện --" value="" color={COLORS.gray} />
            {districts.map((dist: District) => (
              <Picker.Item key={dist.code} label={dist.name} value={String(dist.name)} />
            ))}
          </Picker>
        </View>
      )}
      <TextInput
        style={styles.inputField}
        placeholder="Địa chỉ cụ thể (số nhà, đường…)"
        placeholderTextColor={COLORS.primaryRed}
        value={address}
        onChangeText={(text: string) => setAddress(text)}
        editable={!isLoading}
      />
    </View>
  );

  const renderStep3 = (): React.JSX.Element => (
    <View style={styles.avatarContainer}>
      <Text style={styles.avatarLabel}>Chọn ảnh đại diện của bạn</Text>
      <TouchableOpacity
        style={styles.avatarPicker}
        onPress={pickImage}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatarImage} />
        ) : (
          <FontAwesome name="user-plus" size={40} color={COLORS.primaryRed} />
        )}
      </TouchableOpacity>
    </View>
  ); // === RENDER ===

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.logo}>OLODO</Text>
        <Stepper activeStep={step} />
        <View style={styles.formContainer}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          <View style={styles.navigationButtons}>
            {step > 1 && (
              <TouchableOpacity
                style={[styles.navButton, styles.backButton]}
                onPress={handlePrevStep}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.navButtonText}>Quay lại</Text>
              </TouchableOpacity>
            )}
            {step < 3 ? (
              <TouchableOpacity
                style={[styles.navButton, styles.nextButton, step === 1 && { flex: 1 }]}
                onPress={handleNextStep}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.navButtonText}>Tiếp tục</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.navButton,
                  styles.registerButton,
                  isLoading && styles.registerButtonDisabled,
                ]}
                onPress={handleRegister}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.registerButtonText}>
                  {isLoading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG KÝ'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.linksContainer}>
          <TouchableOpacity onPress={() => router.back()} disabled={isLoading} activeOpacity={0.7}>
            <Text style={styles.linkText}>Đã có tài khoản? Đăng nhập ngay!</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.socialLoginContainer}>
          <Text style={styles.orText}>Hoặc đăng ký với</Text>
          <View style={styles.socialIcons}>
            <TouchableOpacity style={styles.socialButton} disabled={isLoading} activeOpacity={0.7}>
              <FontAwesome name="google" size={24} color={COLORS.googleRed} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} disabled={isLoading} activeOpacity={0.7}>
              <FontAwesome5 name="facebook" size={24} color={COLORS.facebookBlue} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} disabled={isLoading} activeOpacity={0.7}>
              <FontAwesome name="phone" size={24} color={COLORS.zaloGreen} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// === STYLES ===
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryRed,
  },
  loadingText: {
    color: COLORS.primaryWhite,
    fontSize: 16,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryRed,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 50,
  },
  logo: {
    fontSize: 130,
    color: COLORS.primaryWhite,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Oughter',
    lineHeight: 115,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '90%',
    marginBottom: 30,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 100,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primaryWhite,
    borderWidth: 2,
    borderColor: COLORS.primaryWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: COLORS.accentGreen,
    borderColor: COLORS.primaryWhite,
  },
  stepText: {
    color: COLORS.primaryRed,
    fontWeight: 'bold',
  },
  stepLabel: {
    color: COLORS.primaryWhite,
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.primaryWhite,
    top: 14,
    marginHorizontal: -10,
  },
  formContainer: {
    width: '100%',
    gap: 15,
  },
  inputGroup: {
    gap: 15,
  },
  inputField: {
    width: '100%',
    padding: 15,
    borderWidth: 2,
    borderColor: COLORS.primaryWhite,
    borderRadius: 12,
    backgroundColor: COLORS.primaryWhite,
    color: COLORS.primaryRed,
    fontSize: 16,
  },
  pickerContainer: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primaryWhite,
    backgroundColor: COLORS.primaryWhite,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    height: 54,
    color: COLORS.primaryRed,
    backgroundColor: 'transparent',
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatarLabel: {
    color: COLORS.primaryWhite,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  avatarPicker: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryWhite,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: COLORS.accentGreen,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
    gap: 10,
  },
  navButton: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    backgroundColor: COLORS.gray,
  },
  nextButton: {
    backgroundColor: COLORS.blue,
  },
  navButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerButton: {
    backgroundColor: COLORS.accentGreen,
    flex: 1,
  },
  registerButtonDisabled: {
    backgroundColor: COLORS.lightGray,
  },
  registerButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  linksContainer: {
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  linkText: {
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.8,
  },
  socialLoginContainer: {
    marginTop: 30,
    marginBottom: 20,
    width: '100%',
  },
  orText: {
    color: COLORS.white,
    fontSize: 14,
    marginBottom: 15,
    opacity: 0.8,
    textAlign: 'center',
  },
  socialIcons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  socialButton: {
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 50,
  },
});
