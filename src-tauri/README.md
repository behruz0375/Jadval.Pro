# JadvalPro — Offline Windows ilovasi (.exe) · Tauri 2

Bu papka veb-ilovani **Windows uchun bitta `.exe` / `.msi` o'rnatuvchi**ga aylantiradi (internetsiz ishlaydi).

## Talablar (kompyuterda bir marta o'rnatiladi)
1. **Rust** — https://rustup.rs (rustup orqali, `stable-msvc`)
2. **Microsoft C++ Build Tools** — Visual Studio Installer → "Desktop development with C++"
3. **WebView2 Runtime** — Windows 10/11 da odatda mavjud (bo'lmasa Microsoft saytidan)

## Ishlab chiqish rejimi (ilovani oynada ko'rish)
```bash
npm install
npm run tauri dev
```

## `.exe` / `.msi` yig'ish
```bash
npm install
npm run tauri build
```
Natija shu yerda paydo bo'ladi:
```
src-tauri/target/release/bundle/
 ├─ nsis/JadvalPro_2026.1.0_x64-setup.exe   ← o'rnatuvchi (.exe)
 └─ msi/JadvalPro_2026.1.0_x64_en-US.msi    ← o'rnatuvchi (.msi)
```

## Ikonka (ixtiyoriy — o'z logongiz bilan almashtirish)
Hozir `icons/` ichida vaqtinchalik indigo "J" logo bor. O'z logongiz (kamida 512×512 PNG) bilan almashtirish:
```bash
npm run tauri icon path/to/logo.png
```

> Eslatma: ilova offline ishlaydi — barcha ma'lumot foydalanuvchi kompyuteridagi IndexedDB'da saqlanadi.
