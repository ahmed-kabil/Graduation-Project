import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alzohor.hospital',
  appName: 'Al Zohor Hospital',
  webDir: 'dist',
  // Set your backend server URL here for the mobile app to connect to
  server: {
    // For development: use your machine's local IP (e.g., http://192.168.1.x:8080)
    // For production: use your deployed server URL (e.g., https://alzohor-hospital.nabawi.me)
    // url: 'http://192.168.1.100:8080',
    cleartext: true, // Allow HTTP (non-HTTPS) connections for development
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1e293b', // slate-800 to match app theme
      showSpinner: true,
      spinnerColor: '#3b82f6',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f172a', // slate-900
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
