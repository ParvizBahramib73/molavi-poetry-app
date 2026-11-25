# چک‌لیست امنیت و انتشار «بشنو بخوان»

- برنامه یک کلاینت Angular/Capacitor است و حساب کاربری یا کلید محرمانهٔ سمت کلاینت ندارد.
- درخواست‌های API از دامنهٔ ثابت HTTPS گنجور ساخته می‌شوند؛ ورودی کاربر نباید به hostname یا مقصد دلخواه شبکه تبدیل شود.
- CSP در سند HTML محدودیت‌های پایه را اعمال می‌کند؛ برای HSTS، X-Content-Type-Options و frame-ancestors باید هدرهای HTTP روی میزبان تنظیم شوند. متاتگ HTML جایگزین این هدرها نیست.
- در ساخت Android، اسکریپت `scripts/harden-android-project.mjs` مقدار `usesCleartextTraffic=false` و Network Security Config را اعمال می‌کند تا ترافیک HTTP ساده مجاز نباشد؛ درخواست‌های API باید HTTPS باشند.
- گردش‌کار `Dependency Security Audit` گزارش کامل وابستگی‌های وب، وابستگی‌های runtime و ابزارهای ساخت Android را به‌صورت artifact ذخیره می‌کند. گزارش فقط شواهد ممیزی است و به‌تنهایی به معنی قابل‌بهره‌برداری بودن آسیب‌پذیری‌ها نیست.
- APK قابل مهندسی معکوس است؛ کلید خصوصی، توکن محرمانه یا اطلاعات حساس را داخل APK قرار ندهید. تاریخچه و علاقه‌مندی‌ها روی دستگاه ذخیره می‌شوند و دادهٔ قابل اعتماد محسوب نمی‌شوند.

## یافته‌های ممیزی وابستگی‌ها — 2026-11-24 (پس از اصلاح)

ممیزی مجدد در GitHub Actions پس از بازتولید lockfile انجام شد. در این snapshot هیچ advisory شناخته‌شده‌ای در گراف وب، runtime یا ابزارهای Android گزارش نشد:

- گراف کامل وب و ابزارهای توسعه: **۰** آسیب‌پذیری گزارش‌شده.
- گراف runtime وب با `npm audit --omit=dev`: **۰**.
- گراف مستقل ابزارهای Android: **۰**.
- برای رفع advisoryهای انتقالی CLI، overrideهای محدود به `@npmcli/package-json`، `cacache`، `@tufjs/models` و `ignore-walk` استفاده شده‌اند: `glob@14.0.6` و `minimatch@11.0.8`. این overrideها عمداً سراسری نیستند تا نسخهٔ `glob` مورد استفادهٔ Karma تغییر نکند.
- این نتیجه به معنی نبود هر نوع آسیب‌پذیری در سیستم‌عامل، Gradle/Maven، Android SDK، WebView دستگاه یا سرویس‌های بیرونی نیست؛ آن لایه‌ها باید جداگانه ارزیابی شوند.
- `npm audit fix --package-lock-only` بدون `--force` اجرا شده است؛ هیچ ارتقای major اجباری انجام نشده است.
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

- Angular framework (`common`، `compiler`، `core`، `forms`، `platform-browser`، `router` و `compiler-cli`): `20.3.35`؛ ابزارهای `@angular/build` و `@angular/cli`: `20.3.43`.
- Capacitor: `core`، `android` و `cli` روی `8.6.2` و افزونهٔ `app` روی نسخهٔ منتشرشدهٔ `8.1.2` پین شده‌اند.
- ابزارهای asset: `@capacitor/assets@4.0.0` و `sharp@0.35.5` پین شده‌اند.
- نسخهٔ انتقالی Android روی `versionName=1.0.1` تنظیم می‌شود و `versionCode` از تعداد commitهای تاریخچهٔ کامل شاخهٔ `main` محاسبه می‌شود؛ checkout انتشار باید `fetch-depth: 0` داشته باشد.
- lockfile باید فقط با `npm install --package-lock-only` و `npm audit fix --package-lock-only` بدون `--force` بازتولید و سپس با `npm ci` اعتبارسنجی شود.

## امضای امن Android Release

- APKهای Debug فقط برای CI هستند و به‌عنوان نسخهٔ قابل به‌روزرسانی منتشر نمی‌شوند؛ APKهای قابل نصب و ارتقا باید با keystore دائمی Release امضا شوند.
- علت تعارض نسخه‌های Debug قبلی و راهنمای مهاجرت یک‌باره در `docs/android-update-signing-fa.md` آمده است.


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
