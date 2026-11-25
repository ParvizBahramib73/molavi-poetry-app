import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const gradlePath = resolve('android/app/build.gradle');
const versionCode = Number(process.env.ANDROID_VERSION_CODE ?? '2');
const versionName = process.env.ANDROID_VERSION_NAME ?? '1.0.1';

// Android accepts version codes up to 2,100,000,000. Keep a safe lower
// bound above the original 1.0.0 (versionCode 1) pilot installation.
if (!Number.isSafeInteger(versionCode) || versionCode < 2 || versionCode > 2_100_000_000) {
  throw new Error('ANDROID_VERSION_CODE must be an integer between 2 and 2100000000.');
}
if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(versionName)) {
  throw new Error('ANDROID_VERSION_NAME must be a semantic version such as 1.0.1.');
}

const source = readFileSync(gradlePath, 'utf8');
const codePattern = /versionCode\s+\d+/;
const namePattern = /versionName\s+['"][^'"]+['"]/;

if (!codePattern.test(source) || !namePattern.test(source)) {
  throw new Error('Could not locate versionCode/versionName in generated android/app/build.gradle.');
}

const updated = source
  .replace(codePattern, 'versionCode ' + versionCode)
  .replace(namePattern, 'versionName "' + versionName + '"');
writeFileSync(gradlePath, updated, 'utf8');
console.log('Configured Android version ' + versionName + ' (versionCode ' + versionCode + ').');
