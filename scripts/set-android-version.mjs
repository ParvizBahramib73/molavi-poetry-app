import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const gradlePath = resolve('android/app/build.gradle');
const versionCode = Number(process.env.ANDROID_VERSION_CODE ?? '1');
const versionName = process.env.ANDROID_VERSION_NAME ?? '1.0.0';

if (!Number.isSafeInteger(versionCode) || versionCode < 1) {
  throw new Error('ANDROID_VERSION_CODE must be a positive integer.');
}
if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(versionName)) {
  throw new Error('ANDROID_VERSION_NAME must be a semantic version such as 1.0.0.');
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
