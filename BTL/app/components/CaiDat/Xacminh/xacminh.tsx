import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NavigationContainer, useIsFocused } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl as string;

export type RootStackParamList = {
  Instruction: undefined;
  FaceCapture: undefined;
  IDCapture: { faceUri: string | null };
  IDConfirm: { faceUri: string | null; idUri: string | null };
};

type InstructionScreenProps = NativeStackScreenProps<RootStackParamList, 'Instruction'>;
type FaceCaptureScreenProps = NativeStackScreenProps<RootStackParamList, 'FaceCapture'>;
type IDCaptureScreenProps = NativeStackScreenProps<RootStackParamList, 'IDCapture'>;
type IDConfirmScreenProps = NativeStackScreenProps<RootStackParamList, 'IDConfirm'>;

const Stack = createNativeStackNavigator<RootStackParamList>();

// ========== API UTILITY ==========
const getAuthToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    return token?.replace(/^["']|["']$/g, ''); // Clean quotes if any
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

const getUserInfo = async () => {
  try {
    const userInfoStr = await AsyncStorage.getItem('userInfo');
    if (!userInfoStr) return null;
    return JSON.parse(userInfoStr);
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
};

const uploadVerificationImages = async (userId: string, faceUri: string, idUri: string) => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Không tìm thấy token xác thực');
  }

  const formData = new FormData();
  formData.append('anh_khuon_mat', {
    uri: faceUri,
    type: 'image/jpeg',
    name: 'face.jpg',
  } as any);
  formData.append('anh_cmnd', {
    uri: idUri,
    type: 'image/jpeg',
    name: 'id.jpg',
  } as any);

  const response = await fetch(`${API_BASE_URL}/api/xacthuc/${userId}`, {
    method: 'POST',
    headers: {
      // Không set Content-Type để browser tự generate boundary
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Upload failed: ${response.status}`);
  }

  return response.json();
};

const updateVerificationStatus = async (userId: string) => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Không tìm thấy token xác thực');
  }

  const response = await fetch(`${API_BASE_URL}/api/nguoidung/update/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ da_xac_thuc: 1 }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Update failed: ${response.status}`);
  }

  return response.json();
};

// ========== STEP INDICATOR ==========
interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps }) => {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);
  return (
    <View style={stepIndicatorStyles.wrapper}>
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <View
            style={[
              stepIndicatorStyles.stepCircle,
              step === currentStep && stepIndicatorStyles.stepCircleActive,
              step < currentStep && stepIndicatorStyles.stepCircleComplete,
            ]}
          >
            <Text
              style={[
                stepIndicatorStyles.stepText,
                step === currentStep && stepIndicatorStyles.stepTextActive,
                step < currentStep && stepIndicatorStyles.stepTextComplete,
              ]}
            >
              {step < currentStep ? '✓' : step}
            </Text>
          </View>
          {index < totalSteps - 1 && (
            <View
              style={[
                stepIndicatorStyles.stepLine,
                step < currentStep && stepIndicatorStyles.stepLineComplete,
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

const stepIndicatorStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
    backgroundColor: 'transparent',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#7f001f',
  },
  stepCircleComplete: {
    backgroundColor: '#8A2BE2',
  },
  stepText: {
    color: '#9E9E9E',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepTextActive: {
    color: '#FFFFFF',
  },
  stepTextComplete: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: -1,
  },
  stepLineComplete: {
    backgroundColor: '#8A2BE2',
  },
});

// ========== INSTRUCTION SCREEN ==========
const StepIcon: React.FC<{ name: string }> = ({ name }) => (
  <View style={instructionStyles.stepIconContainer}>
    <Icon name={name} size={28} color="#000" />
  </View>
);

const InstructionScreen: React.FC<InstructionScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={instructionStyles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#7f001f" />
      <View style={instructionStyles.container}>
        <View style={instructionStyles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={instructionStyles.backButton}
          >
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <StepIndicator currentStep={1} totalSteps={4} />

        <View style={instructionStyles.content}>
          <Text style={instructionStyles.title}>Xác thực CCCD gắn chíp chỉ trong 2 bước</Text>

          <View style={instructionStyles.noteBox}>
            <Text style={instructionStyles.noteTitle}>Lưu ý:</Text>
            <Text style={instructionStyles.noteText}>
              Bạn sẽ cần chuẩn bị CCCD gắn chíp để tiếp tục. Vì lí do bảo mật, CMND/CCCD không gắn
              chíp không còn được hỗ trợ nữa.
            </Text>
            <View style={instructionStyles.cardExamples}>
              <View style={instructionStyles.cardExample}>
                <MaterialIcon
                  name="check-circle"
                  size={20}
                  color="#28A745"
                  style={instructionStyles.exampleIcon}
                />
                <Text style={instructionStyles.exampleText}>CCCD gắn chíp</Text>
              </View>
              <View style={instructionStyles.cardExample}>
                <MaterialIcon
                  name="close-circle"
                  size={20}
                  color="#DC3545"
                  style={instructionStyles.exampleIcon}
                />
                <Text style={instructionStyles.exampleText}>Không có chíp</Text>
              </View>
            </View>
          </View>

          <View style={instructionStyles.stepsContainer}>
            <View style={instructionStyles.stepItem}>
              <StepIcon name="person-outline" />
              <View style={instructionStyles.stepTextContainer}>
                <Text style={instructionStyles.stepTitle}>Bước 1: Chụp ảnh khuôn mặt</Text>
                <Text style={instructionStyles.stepSubtitle}>
                  (Không đeo kính râm, khẩu trang hoặc mũ khi chụp nhé)
                </Text>
              </View>
            </View>
            <View style={instructionStyles.stepItem}>
              <StepIcon name="card-outline" />
              <View style={instructionStyles.stepTextContainer}>
                <Text style={instructionStyles.stepTitle}>Bước 2: Chụp ảnh CCCD</Text>
                <Text style={instructionStyles.stepSubtitle}>
                  (Chụp rõ nét mặt trước và mặt sau)
                </Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={instructionStyles.startButton}
          onPress={() => navigation.navigate('FaceCapture')}
          activeOpacity={0.7}
        >
          <Text style={instructionStyles.startButtonText}>Bắt đầu</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const instructionStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FDFCF7',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#FDFCF7',
  },
  header: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    lineHeight: 34,
    textAlign: 'center',
  },
  noteBox: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  noteTitle: {
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  cardExamples: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  cardExample: {
    alignItems: 'center',
  },
  exampleIcon: {
    marginBottom: 4,
  },
  exampleText: {
    fontSize: 12,
    color: '#555',
  },
  stepsContainer: {
    marginBottom: 20,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#555',
    lineHeight: 18,
  },
  startButton: {
    backgroundColor: '#000',
    borderRadius: 30,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

// ========== FACE CAPTURE SCREEN ==========
const FaceCaptureScreen: React.FC<FaceCaptureScreenProps> = ({ navigation }) => {
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isTakingPicture, setIsTakingPicture] = useState(false);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleCapture = async () => {
    if (isTakingPicture || !cameraRef.current) return;

    try {
      setIsTakingPicture(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      if (photo) {
        navigation.navigate('IDCapture', { faceUri: photo.uri });
      }
    } catch (e) {
      console.error('Failed to take picture:', e);
      Alert.alert('Lỗi', 'Không thể chụp ảnh. Vui lòng thử lại trên thiết bị thật.');
    } finally {
      setIsTakingPicture(false);
    }
  };

  const handleLibraryPick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh để chọn ảnh.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const faceUri = result.assets[0].uri;
        navigation.navigate('IDCapture', { faceUri });
      }
    } catch (error) {
      console.error('Library pick error:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh từ thư viện.');
    }
  };

  if (!isFocused || !permission) {
    return (
      <View style={faceCaptureStyles.container}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={faceCaptureStyles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={faceCaptureStyles.permissionContainer}>
        <Icon name="camera-outline" size={64} color="#999" />
        <Text style={faceCaptureStyles.permissionTitle}>Cần quyền camera</Text>
        <Text style={faceCaptureStyles.permissionText}>
          Chúng tôi cần quyền truy cập camera để chụp ảnh khuôn mặt
        </Text>
        <TouchableOpacity style={faceCaptureStyles.permissionButton} onPress={requestPermission}>
          <Text style={faceCaptureStyles.permissionButtonText}>Cấp quyền</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={faceCaptureStyles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <StepIndicator currentStep={2} totalSteps={4} />

      <View style={faceCaptureStyles.container}>
        <CameraView
          style={faceCaptureStyles.cameraPreview}
          facing="front"
          ref={cameraRef}
          isActive={isFocused}
          photo={true}
        />

        <View style={faceCaptureStyles.overlay}>
          <View style={faceCaptureStyles.faceOutline} />
          <Text style={faceCaptureStyles.promptText}>Đưa khuôn mặt vào trong khung</Text>
          <Text style={faceCaptureStyles.instructionText}>
            Giữ đầu thẳng, ánh sáng tốt, không đeo kính/mũ
          </Text>
        </View>

        <View style={faceCaptureStyles.bottomContainer}>
          <TouchableOpacity
            style={faceCaptureStyles.libraryButton}
            onPress={handleLibraryPick}
            activeOpacity={0.7}
          >
            <Icon name="images-outline" size={30} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity
            style={faceCaptureStyles.shutterButton}
            onPress={handleCapture}
            disabled={isTakingPicture}
          >
            {isTakingPicture ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <View style={faceCaptureStyles.shutterInner} />
            )}
          </TouchableOpacity>

          <View style={faceCaptureStyles.spacer} />
        </View>
      </View>
    </SafeAreaView>
  );
};

const faceCaptureStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraPreview: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 180,
  },
  faceOutline: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 3,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    opacity: 0.8,
  },
  promptText: {
    fontSize: 18,
    color: '#000',
    fontWeight: '600',
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  shutterButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#000',
  },
  libraryButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 25,
  },
  spacer: {
    width: 50,
    height: 50,
  },
});

// ========== ID CAPTURE SCREEN ==========
const IDCaptureScreen: React.FC<IDCaptureScreenProps> = ({ navigation, route }) => {
  const isFocused = useIsFocused();
  const { faceUri } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isTakingPicture, setIsTakingPicture] = useState(false);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleCapture = async () => {
    if (isTakingPicture || !cameraRef.current) return;

    try {
      setIsTakingPicture(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      if (photo) {
        navigation.navigate('IDConfirm', { faceUri, idUri: photo.uri });
      }
    } catch (e) {
      console.error('Failed to take picture:', e);
      Alert.alert('Lỗi', 'Không thể chụp ảnh. Vui lòng thử lại trên thiết bị thật.');
    } finally {
      setIsTakingPicture(false);
    }
  };

  const handleLibraryPick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh để chọn ảnh.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1.586, 1], // Tỷ lệ CCCD
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const idUri = result.assets[0].uri;
        navigation.navigate('IDConfirm', { faceUri, idUri });
      }
    } catch (error) {
      console.error('Library pick error:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh từ thư viện.');
    }
  };

  if (!isFocused || !permission) {
    return (
      <View style={idCaptureStyles.container}>
        <ActivityIndicator size="large" color="#FFF" />
        <Text style={idCaptureStyles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={idCaptureStyles.permissionContainer}>
        <Icon name="camera-outline" size={64} color="#999" />
        <Text style={idCaptureStyles.permissionTitle}>Cần quyền camera</Text>
        <Text style={idCaptureStyles.permissionText}>
          Chúng tôi cần quyền truy cập camera để chụp ảnh CCCD
        </Text>
        <TouchableOpacity style={idCaptureStyles.permissionButton} onPress={requestPermission}>
          <Text style={idCaptureStyles.permissionButtonText}>Cấp quyền</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={idCaptureStyles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1C1C1E" />
      <StepIndicator currentStep={3} totalSteps={4} />

      <View style={idCaptureStyles.container}>
        <CameraView
          style={idCaptureStyles.cameraPreview}
          facing="back"
          ref={cameraRef}
          isActive={isFocused}
          photo={true}
        />

        <View style={idCaptureStyles.overlay}>
          <Text style={idCaptureStyles.promptText}>Vui lòng đặt CCCD vào trong khung</Text>
          <View style={idCaptureStyles.idOutline} />
          <Text style={idCaptureStyles.instructionText}>
            Đặt thẻ phẳng trên mặt bàn, ánh sáng đều, không phản chiếu
          </Text>
        </View>

        <View style={idCaptureStyles.bottomContainer}>
          <TouchableOpacity
            style={idCaptureStyles.libraryButton}
            onPress={handleLibraryPick}
            activeOpacity={0.7}
          >
            <Icon name="images-outline" size={30} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={idCaptureStyles.shutterButton}
            onPress={handleCapture}
            disabled={isTakingPicture}
          >
            {isTakingPicture ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <View style={idCaptureStyles.shutterInner} />
            )}
          </TouchableOpacity>

          <View style={idCaptureStyles.spacer} />
        </View>
      </View>
    </SafeAreaView>
  );
};

const idCaptureStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  loadingText: {
    marginTop: 10,
    color: '#FFF',
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1C1C1E',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 16,
    color: '#CCC',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraPreview: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 180,
  },
  idOutline: {
    width: '85%',
    aspectRatio: 1.586,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFF',
    borderStyle: 'dashed',
    marginTop: 16,
  },
  promptText: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  instructionText: {
    fontSize: 14,
    color: '#CCC',
    marginTop: 12,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: 'rgba(28, 28, 30, 0.9)',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  shutterButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#000',
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#000',
  },
  libraryButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
  },
  spacer: {
    width: 50,
    height: 50,
  },
});

// ========== ID CONFIRM SCREEN ==========
const placeholderBase64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAC9AQMAAADbH/3iAAAABlBMVEXMzMyWlpYFm2dRAAAAAXRSTlMAQObYZgAAABNJREFUeF7twQEBAAAAgiD/r25IQAEAAPBoAUgAAXg8sYkAAAAASUVORK5CYII=';

const IDConfirmScreen: React.FC<IDConfirmScreenProps> = ({ route, navigation }) => {
  const { faceUri, idUri } = route.params;
  const [loading, setLoading] = useState(false);

  const handleRetake = () => {
    navigation.goBack();
  };

  const handleUpload = async () => {
    if (!faceUri || !idUri) {
      Toast.show({ type: 'error', text1: 'Thiếu ảnh', text2: 'Vui lòng chụp đầy đủ cả hai ảnh' });
      return;
    }

    if (loading) return; // Prevent multiple submissions

    try {
      setLoading(true);
      console.log('🚀 Starting verification process...');

      // Get user info and validate
      const userInfo = await getUserInfo();
      if (!userInfo) {
        Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Không tìm thấy thông tin người dùng' });
        return;
      }

      const userId = userInfo.ID_NguoiDung;
      if (!userId) {
        Toast.show({ type: 'error', text1: 'Lỗi', text2: 'ID người dùng không hợp lệ' });
        return;
      }

      console.log('👤 User ID:', userId);

      // Step 1: Upload images
      console.log('📤 Uploading images...');
      await uploadVerificationImages(userId, faceUri, idUri);
      console.log('✅ Images uploaded successfully');

      // Step 2: Update verification status
      console.log('🔄 Updating verification status...');
      await updateVerificationStatus(userId);
      console.log('✅ Status updated successfully');

      // Success
      console.log('🎉 Verification completed!');
      Toast.show({
        type: 'success',
        text1: 'Xác thực thành công!',
        text2: 'Tài khoản của bạn đã được xác minh',
      });

      navigation.popToTop();
    } catch (error: any) {
      console.error('❌ Verification error:', error);

      // Handle specific errors
      if (error.message.includes('token')) {
        Toast.show({
          type: 'error',
          text1: 'Phiên đăng nhập hết hạn',
          text2: 'Vui lòng đăng nhập lại',
        });
        // Optionally navigate to login
        // navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else if (error.message.includes('Upload failed')) {
        Toast.show({
          type: 'error',
          text1: 'Tải ảnh thất bại',
          text2: error.message,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Lỗi kết nối',
          text2: error.message || 'Vui lòng thử lại',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={idConfirmStyles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1C1C1E" />
      <StepIndicator currentStep={4} totalSteps={4} />

      <View style={idConfirmStyles.container}>
        <View style={idConfirmStyles.header}>
          <Text style={idConfirmStyles.headerTitle}>Kiểm tra ảnh</Text>
          <Text style={idConfirmStyles.headerSubtitle}>
            Vui lòng kiểm tra và xác nhận ảnh đã chụp
          </Text>
        </View>

        <View style={idConfirmStyles.content}>
          <View style={idConfirmStyles.imageSection}>
            <Text style={idConfirmStyles.imageLabel}>Ảnh khuôn mặt</Text>
            <Image
              source={{ uri: faceUri || placeholderBase64 }}
              style={idConfirmStyles.previewImage}
              resizeMode="contain"
            />
          </View>

          <View style={idConfirmStyles.divider} />

          <View style={idConfirmStyles.imageSection}>
            <Text style={idConfirmStyles.imageLabel}>Ảnh CCCD</Text>
            <Image
              source={{ uri: idUri || placeholderBase64 }}
              style={idConfirmStyles.previewImage}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={idConfirmStyles.buttonContainer}>
          <TouchableOpacity
            style={idConfirmStyles.retakeButton}
            onPress={handleRetake}
            activeOpacity={0.7}
          >
            <Icon name="camera-outline" size={20} color="#FFF" style={idConfirmStyles.icon} />
            <Text style={idConfirmStyles.retakeButtonText}>Chụp lại</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              idConfirmStyles.confirmButton,
              (!faceUri || !idUri) && idConfirmStyles.confirmButtonDisabled,
            ]}
            onPress={handleUpload}
            disabled={loading || !faceUri || !idUri}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Icon
                  name="checkmark-circle-outline"
                  size={20}
                  color="#FFF"
                  style={idConfirmStyles.icon}
                />
                <Text style={idConfirmStyles.confirmButtonText}>Xác nhận & Gửi</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const idConfirmStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#CCC',
    fontSize: 16,
    marginTop: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  imageSection: {
    marginBottom: 24,
  },
  imageLabel: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#444',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 20,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: '#3A3A3C',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginRight: 12,
    minHeight: 56,
  },
  retakeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#34C759',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginLeft: 12,
    minHeight: 56,
  },
  confirmButtonDisabled: {
    backgroundColor: '#666',
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  icon: {
    marginRight: 4,
  },
});

// ========== MAIN NAVIGATOR ==========
function VerificationFlow() {
  return (
    <Stack.Navigator initialRouteName="Instruction">
      <Stack.Screen
        name="Instruction"
        component={InstructionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FaceCapture"
        component={FaceCaptureScreen}
        options={{
          title: 'Chụp ảnh khuôn mặt',
          headerStyle: {
            backgroundColor: '#FFFFFF',
            shadowOpacity: 0,
            elevation: 0,
          },
          headerTintColor: '#000',
          headerTitleAlign: 'center',
          headerBackTitleVisible: false,
          headerLeft: () => (
            <View style={{ marginLeft: 16 }}>
              <Icon name="arrow-back" size={24} color="#000" />
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="IDCapture"
        component={IDCaptureScreen}
        options={{
          title: 'Chụp ảnh CCCD gắn chíp',
          headerStyle: {
            backgroundColor: '#1C1C1E',
            shadowOpacity: 0,
            elevation: 0,
          },
          headerTintColor: '#FFFFFF',
          headerTitleAlign: 'center',
          headerBackTitleVisible: false,
          headerLeft: () => (
            <View style={{ marginLeft: 16 }}>
              <Icon name="arrow-back" size={24} color="#FFF" />
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="IDConfirm"
        component={IDConfirmScreen}
        options={{
          title: 'Xác nhận ảnh',
          headerStyle: {
            backgroundColor: '#1C1C1E',
            shadowOpacity: 0,
            elevation: 0,
          },
          headerTintColor: '#FFFFFF',
          headerTitleAlign: 'center',
          headerBackTitleVisible: false,
          headerLeft: () => (
            <View style={{ marginLeft: 16 }}>
              <Icon name="arrow-back" size={24} color="#FFF" />
            </View>
          ),
        }}
      />
    </Stack.Navigator>
  );
}

export default VerificationFlow;
