import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.desetka.game',
  appName: 'Desetka',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
