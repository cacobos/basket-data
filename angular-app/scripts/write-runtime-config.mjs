import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const outputPath = resolve(process.cwd(), 'public', 'runtime-config.js');

const fromEnv = {
  firebaseApiKey: process.env.FIREBASE_API_KEY?.trim() || '',
  firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN?.trim() || '',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID?.trim() || '',
  firebaseAppId: process.env.FIREBASE_APP_ID?.trim() || '',
  apiBaseUrl: process.env.API_BASE_URL?.trim().replace(/\/$/, '') || '',
};

const hasAllEnvValues = Object.values(fromEnv).every((value) => value.length > 0);

if (!hasAllEnvValues) {
  if (!existsSync(outputPath)) {
    console.warn('[auth] runtime-config.js no existe y faltan variables FIREBASE_*. Se creara con placeholders.');
    const placeholder = `window.__BASKET_DATA_CONFIG__ = {\n  firebaseApiKey: 'REPLACE_ME_FIREBASE_API_KEY',\n  firebaseAuthDomain: 'REPLACE_ME_FIREBASE_AUTH_DOMAIN',\n  firebaseProjectId: 'REPLACE_ME_FIREBASE_PROJECT_ID',\n  firebaseAppId: 'REPLACE_ME_FIREBASE_APP_ID',\n};\n`;
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, placeholder, 'utf8');
  } else {
    const current = readFileSync(outputPath, 'utf8');
    const unresolved = /REPLACE_ME_FIREBASE_/i.test(current);
    if (unresolved) {
      console.warn('[auth] runtime-config.js mantiene placeholders porque faltan variables FIREBASE_*.');
    } else {
      console.log('[auth] runtime-config.js existente conservado.');
    }
  }
  process.exit(0);
}

const payload = `window.__BASKET_DATA_CONFIG__ = {\n  firebaseApiKey: '${fromEnv.firebaseApiKey}',\n  firebaseAuthDomain: '${fromEnv.firebaseAuthDomain}',\n  firebaseProjectId: '${fromEnv.firebaseProjectId}',\n  firebaseAppId: '${fromEnv.firebaseAppId}',\n  apiBaseUrl: '${fromEnv.apiBaseUrl}',\n};\n`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, payload, 'utf8');
console.log('[auth] runtime-config.js generado desde variables FIREBASE_*.');
