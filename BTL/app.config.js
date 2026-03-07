import 'dotenv/config';
import os from 'os';

/**
 * Lấy IPv4 LAN của máy để thiết bị di động gọi API khi chung Wi-Fi.
 */
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const alias of iface || []) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return 'localhost';
}

const ipAddress = getLocalIpAddress();
const port = process.env.PORT || 3000;
const apiUrl = `http://${ipAddress}:${port}`;

console.log('====================================================');
console.log(`[CONFIG] API URL: ${apiUrl}`);
console.log('[CONFIG] Yêu cầu điện thoại + PC chung mạng Wi-Fi');
console.log('====================================================');

export default {
  expo: {
    name: 'OLODO',
    slug: 'OLODO',
    version: '1.0.0',
    orientation: 'portrait',

    icon: './assets/images/logo.png',
    scheme: 'OLODO',
    userInterfaceStyle: 'automatic',

    ios: {
      supportsTablet: true,
    },

    android: {
      permissions: [
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.ACCESS_MEDIA_LOCATION',
        'android.permission.RECORD_AUDIO',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
      ],
      adaptiveIcon: {
        foregroundImage: './assets/images/logo.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.anonymous.OLODO',
      usesCleartextTraffic: true,
      edgeToEdge: true,
    },

    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/logo.png',
    },

    plugins: [
      'expo-router',
      [
        'expo-media-library',
        {
          photosPermission:
            'Cho phép $(PRODUCT_NAME) truy cập ảnh của bạn để tạo hoặc lưu nội dung.',
          savePhotosPermission:
            'Cho phép $(PRODUCT_NAME) lưu ảnh vào thư viện của bạn.',
          isAccessMediaLocationEnabled: true,
        },
      ],
      [
        'expo-image-picker',
        {
          cameraPermission:
            'Cho phép $(PRODUCT_NAME) truy cập camera để chụp ảnh và quay video.',
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Cho phép $(PRODUCT_NAME) truy cập vị trí hiện tại của bạn.',
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/images/logo.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
      'expo-font',
      'expo-barcode-scanner',
    ],

    experiments: {
      typedRoutes: true,
    },

    // --- TẮT OTA UPDATE để tránh lỗi Failed to download remote update ---
    updates: {
      enabled: false,            // Không tải update từ server
      checkAutomatically: 'never',
      fallbackToCacheTimeout: 0,
    },

    runtimeVersion: {
      policy: 'appVersion',
    },

    extra: {
      apiUrl,
      url_uploads: `${apiUrl}/uploads`,
      env: process.env.NODE_ENV || 'development',
      cerebrasApiKey: process.env.CEREBRAS_API_KEY,
      googleCloudVisionApiKey: process.env.GOOGLE_CLOUD_VISION_API_KEY,
    },
  },
};
