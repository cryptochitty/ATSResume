import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.resumeai.app',
  appName: 'ResumeAI',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    hostname: 'localhost',
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: process.env.VITE_GOOGLE_CLIENT_ID || '128002101105-19uiapd6ljgp3qi6uilmqdto716o9gae.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
