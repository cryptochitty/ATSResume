import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.resumeai.app',
  appName: 'ResumeAI',
  webDir: 'dist',
  server: {
    // Change https to http for better localhost compatibility in debug
    androidScheme: 'http',
    hostname: 'localhost' 
  }
};

export default config;
