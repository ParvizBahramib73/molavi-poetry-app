import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const manifestPath = resolve('android/app/src/main/AndroidManifest.xml');
const manifest = readFileSync(manifestPath, 'utf8');
const applicationTag = manifest.match(/<application\b[^>]*>/s)?.[0];

if (!applicationTag) {
  throw new Error('AndroidManifest.xml does not contain an application element.');
}

function setAttribute(tag, name, value) {
  const attribute = 'android:' + name;
  const pattern = new RegExp('\\s' + attribute + '="[^"]*"');
  if (pattern.test(tag)) return tag.replace(pattern, ' ' + attribute + '="' + value + '"');
  return tag.replace(/>$/, ' ' + attribute + '="' + value + '">');
}

let hardenedTag = setAttribute(applicationTag, 'usesCleartextTraffic', 'false');
hardenedTag = setAttribute(hardenedTag, 'networkSecurityConfig', '@xml/network_security_config');
writeFileSync(manifestPath, manifest.replace(applicationTag, hardenedTag), 'utf8');

const networkConfigPath = resolve('android/app/src/main/res/xml/network_security_config.xml');
mkdirSync(dirname(networkConfigPath), { recursive: true });
writeFileSync(networkConfigPath, '<?xml version="1.0" encoding="utf-8"?>\n' +
  '<network-security-config>\n' +
  '    <base-config cleartextTrafficPermitted="false">\n' +
  '        <trust-anchors><certificates src="system" /></trust-anchors>\n' +
  '    </base-config>\n' +
  '</network-security-config>\n', 'utf8');

console.log('Android network security hardened: cleartext traffic is disabled.');
