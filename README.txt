نجوم البازل - مشروع Android جاهز للـCapacitor

المجلد www يحتوي التطبيق الكامل.

ملاحظة الخط:
النسخة الحالية تستخدم Noto Sans Arabic محلياً داخل التطبيق حتى يعمل الخط بدون إنترنت. الصور ما زالت تُحمّل من picsum.photos كما في المشروع الأصلي، وبالتالي تحتاج إنترنت لعرض صور البازل.

لبناء APK على جهاز يحتوي Node.js + Android SDK:
1) npm install
2) npx cap add android
3) npx cap sync android
4) cd android
5) ./gradlew assembleDebug

الـAPK سيكون داخل android/app/build/outputs/apk/debug/app-debug.apk
