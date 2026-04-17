import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.resumeai.app',
  appName: 'ResumeAI',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
