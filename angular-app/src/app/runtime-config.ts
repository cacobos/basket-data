export interface RuntimeConfig {
  firebaseApiKey?: string;
  firebaseAuthDomain?: string;
  firebaseProjectId?: string;
  firebaseAppId?: string;
  apiBaseUrl?: string;
}

declare global {
  interface Window {
    __BASKET_DATA_CONFIG__?: RuntimeConfig;
  }
}

export {};
