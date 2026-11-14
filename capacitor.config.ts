import type { CapacitorConfig } from '@capacitor/cli';

// O appId identifica a app nas lojas e não pode mudar depois de publicada. Confirmar antes do lançamento.
const config: CapacitorConfig = {
  appId: 'com.transicao.app',
  appName: 'Transição',
  webDir: 'dist'
};

export default config;
