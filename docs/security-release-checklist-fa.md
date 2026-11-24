# چک‌لیست امنیت و انتشار «بشنو بخوان»

- برنامه یک کلاینت Angular/Capacitor است و حساب کاربری یا کلید محرمانهٔ سمت کلاینت ندارد.
- درخواست‌های API از دامنهٔ ثابت HTTPS گنجور ساخته می‌شوند؛ ورودی کاربر نباید به hostname یا مقصد دلخواه شبکه تبدیل شود.
- CSP در سند HTML محدودیت‌های پایه را اعمال می‌کند؛ برای HSTS، X-Content-Type-Options و frame-ancestors باید هدرهای HTTP روی میزبان تنظیم شوند. متاتگ HTML جایگزین این هدرها نیست.
- در ساخت Android، اسکریپت `scripts/harden-android-project.mjs` مقدار `usesCleartextTraffic=false` و Network Security Config را اعمال می‌کند تا ترافیک HTTP ساده مجاز نباشد؛ درخواست‌های API باید HTTPS باشند.
- گردش‌کار `Dependency Security Audit` گزارش کامل وابستگی‌های وب، وابستگی‌های runtime و ابزارهای ساخت Android را به‌صورت artifact ذخیره می‌کند. گزارش فقط شواهد ممیزی است و به‌تنهایی به معنی قابل‌بهره‌برداری بودن آسیب‌پذیری‌ها نیست.
- APK قابل مهندسی معکوس است؛ کلید خصوصی، توکن محرمانه یا اطلاعات حساس را داخل APK قرار ندهید. تاریخچه و علاقه‌مندی‌ها روی دستگاه ذخیره می‌شوند و دادهٔ قابل اعتماد محسوب نمی‌شوند.

## یافته‌های ممیزی وابستگی‌ها — 2026-11-24

این snapshot از GitHub Actions و lockfileهای همان اجرا تهیه شده است؛ شمارش advisoryها به‌تنهایی اثبات exploitability نیست.

- گراف کامل وب: 33 advisory (2 بحرانی، 14 بالا، 17 متوسط).
- گراف runtime وب با `npm audit --omit=dev`: صفر advisory.
- گراف Android build tooling: 8 advisory (2 بحرانی، 3 بالا، 3 متوسط).
- **مانع انتشار APK:** نسخهٔ `@capacitor/android@8.0.0` در بازهٔ آسیب‌پذیر CVE-2026-103922 / GHSA-rvm3-566m-v7fv قرار دارد. این مشکل می‌تواند محتوای remote را از مسیر HTTP proxy داخلی با origin خود برنامه بارگذاری کند؛ بهره‌برداری نیازمند تعامل کاربر با یک لینک در WebView است. نسخه‌های patch شدهٔ اعلام‌شده شامل 8.4.3 و 8.5.1 هستند و npm در این ممیزی 8.6.2 را پیشنهاد کرده است.
- `tar@6.2.1`، وابستگی انتقالی CLI، نیز دو advisory بحرانی دارد؛ npm نسخهٔ اصلاحی را از مسیر `@capacitor/cli@8.6.2` پیشنهاد می‌کند.
- `@capacitor/assets@3.0.5` و `sharp@0.34.3` دارای advisoryهای بالا هستند؛ پیشنهادهای npm به‌ترتیب `@capacitor/assets@4.0.0` و `sharp@0.35.5` است.
- در گراف توسعهٔ وب، `@angular/build@20.3.35` دارای advisory بحرانی و `@angular/cli@20.3.35` دارای advisoryهای بالا است؛ پیشنهاد ممیزی برای هر دو 20.3.43 است. این موارد در گراف runtime وب قرار نگرفتند.
- این گزارش Gradle/Maven، Android SDK، سیستم‌عامل یا نسخهٔ WebView دستگاه را پوشش نمی‌دهد.
- در این ممیزی `npm audit fix` اجرا نشده و هیچ نسخهٔ وابستگی تغییر نکرده است. تا ارتقای Capacitor Android و اجرای مجدد ممیزی، APK نباید برای انتشار بازار آماده تلقی شود.

## پیش از انتشار
- [ ] اجرای تست‌ها و build تولیدی بدون خطا
- [ ] بررسی گزارش کامل `npm audit --json` و گزارش runtime؛ ثبت مسیر وابستگی، نسخه نصب‌شده، شدت، CVE/شناسه مشاوره و نسخه اصلاحی در صورت وجود
- [ ] بررسی جداگانهٔ گراف Android: `@capacitor/android` داخل برنامهٔ نهایی قرار می‌گیرد، اما CLI، assets، sharp و tar ابزارهای زنجیرهٔ ساخت هستند و معمولاً در APK runtime قرار نمی‌گیرند
- [ ] بررسی مجوزهای Android و حذف مجوزهای غیرضروری
- [ ] بازبینی Manifest تولیدشده و تأیید فعال بودن `usesCleartextTraffic=false` و Network Security Config
- [ ] اطمینان از HTTPS و غیرفعال بودن cleartext traffic
- [ ] ساخت APK/AAB از نوع release، نه debug
- [ ] امضای release با کلید اختصاصی خارج از مخزن؛ نگهداری keystore و رمزها در secret manager امن
- [ ] ثبت SHA-256 و آزمایش نصب/به‌روزرسانی روی دستگاه واقعی
- [ ] بررسی سیاست حریم خصوصی، مجوز پخش صوت و شرایط استفاده از محتوا
- [ ] بررسی نهایی CSP و هدرهای امنیتی روی میزبان واقعی

هیچ تغییر فرانت‌اندی نمی‌تواند جلوی تمام مهندسی معکوس یا کپی محتوای عمومی را بگیرد؛ امضای release، کنترل وابستگی‌ها، حداقل‌سازی مجوزها و عدم قراردادن اسرار در برنامه ضروری‌اند.

## وضعیت نسخهٔ انتشار و وابستگی‌های اصلاح‌شده

- Angular: همهٔ پکیج‌های اصلی و ابزارهای build روی `20.3.43` پین شده‌اند.
- Capacitor: `core`، `android` و `cli` روی `8.6.2` و افزونهٔ `app` روی نسخهٔ منتشرشدهٔ `8.1.2` پین شده‌اند.
- ابزارهای asset: `@capacitor/assets@4.0.0` و `sharp@0.35.5` پین شده‌اند.
- lockfile باید فقط با `npm install --package-lock-only` و `npm audit fix --package-lock-only` بدون `--force` بازتولید و سپس با `npm ci` اعتبارسنجی شود.

## امضای امن Android Release

برای تولید APK/AAB امضاشده، keystore باید توسط مالک برنامه ساخته و در GitHub Repository Settings → Secrets and variables → Actions ثبت شود. هرگز فایل keystore یا رمزهای آن را در مخزن، Issue، Pull Request یا چت قرار ندهید.

چهار secret لازم:

- `ANDROID_KEYSTORE_BASE64`: محتوای Base64 فایل keystore
- `ANDROID_KEYSTORE_PASSWORD`: رمز keystore
- `ANDROID_KEY_ALIAS`: alias کلید
- `ANDROID_KEY_PASSWORD`: رمز کلید

نمونهٔ ساخت keystore روی سیستم امن خود:

```bash
keytool -genkeypair -v -keystore beshno-bekhan-upload.jks -alias beshno-bekhan -keyalg RSA -keysize 4096 -validity 10000
```

در PowerShell برای تولید مقدار Base64:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('beshno-bekhan-upload.jks'))
```

پس از ثبت چهار secret، گردش‌کار `Build Signed Android Release` را از Actions به‌صورت دستی اجرا کنید. خروجی باید شامل APK و AAB امضاشده و SHA-256 هر دو باشد. نسخهٔ Debug برای انتشار در بازار قابل استفاده نیست.

**مهم:** keystore را چند نسخهٔ پشتیبان آفلاین و رمزگذاری‌شده نگه دارید. از دست‌دادن کلید امضای اولیه می‌تواند انتشار به‌روزرسانی‌های بعدی را مختل کند.
