# 📱 RV PDF - iOS Liquid Glass Private PDF Suite

> **100% Free, Private, Client-Side PDF Tools for Web & Android.**  
> Built with React, TypeScript, Tailwind CSS, pdf-lib, and Apple iOS Liquid Glass UI.

---

## ✨ Features & Capabilities

RV PDF is a privacy-first, on-device PDF processing suite inspired by PDF Chef. Zero documents are uploaded to any server. Everything executes locally in your browser/device runtime.

### 📑 1. Page Organization
- **Merge PDF**: Combine multiple PDFs into a single file with custom ordering.
- **Split PDF**: Separate PDFs by all pages, custom ranges (e.g. `1-3, 5`), or chunk size.
- **Rotate PDF**: Rotate pages by 90°, 180°, or 270° clockwise.
- **Delete Pages**: Select and discard unwanted pages visually.
- **Extract Pages**: Isolate specific pages into a clean new document.
- **Crop PDF**: Trim margins with visual top/bottom/left/right controls.

### ✍️ 2. Editing & Annotations
- **Watermark PDF**: Apply custom text watermarks with opacity, rotation, and color picker.
- **Page Numbers**: Add customizable page numbering with `{n}` and `{total}` tokens.
- **Header & Footer**: Insert repeating headers and footers across all pages.
- **Flatten PDF**: Lock interactive form fields and annotations into static content.

### 🔄 3. Conversions
- **Image to PDF**: Convert JPG, PNG, and WebP images into high-quality A4 PDFs.
- **PDF to Image**: Render PDF pages into crisp images.
- **Word / DOCX**: Client-side document conversion logic.

### 🔒 4. Security & Privacy
- **Protect PDF**: Encrypt documents with passwords.
- **Unlock PDF**: Remove passwords from protected files.
- **Sanitize PDF**: Strip metadata, author tags, and hidden tracking details.
- **Metadata Editor**: View and modify document titles, authors, and keywords.

### ⚡ 5. Optimize & Business Builders
- **Compress PDF**: Optimize file size for email sharing.
- **Repair PDF**: Re-build malformed or corrupted PDF structures.
- **Invoice Maker**: Professional invoice generator with automatic tax calculations.
- **Receipt Maker**: Payment receipt builder with proof tokens.
- **Quote / Estimate Maker**: Quotation creator for client proposals.

---

## 🎨 iOS Liquid Glass Design
- **Frosted Acrylic Glass**: Translucent blurs (`backdrop-filter: blur(28px) saturate(190%)`), smooth inner highlights, and glassy borders.
- **Ambient Mesh Gradients**: Subtle animated liquid orbs floating in the background.
- **Dark & Light Modes**: Seamless switching with tailored reflection palettes.
- **Apple SF Typography & Haptics**: Bouncy, responsive controls with high contrast.

---

## 📦 Android APK & Installation

### Option 1: Direct Android APK Download
Once pushed to GitHub, GitHub Actions automatically builds the debug APK:
1. Go to the **[Releases](https://github.com/revantram/pdf/releases)** tab in this repository.
2. Download the latest **`RV-PDF.apk`**.
3. Install and run it directly on your Android phone!

### Option 2: Install as PWA (Progressive Web App)
1. Open the web version in Chrome or your mobile browser.
2. Tap the browser menu `⋮` and select **"Add to Home screen"** or tap **"Install App"**.
3. It installs as a standalone, full-screen offline app on your device with zero app-store bloat!

---

## 💻 Local Development

```bash
# Clone the repository
git clone https://github.com/revantram/pdf.git
cd pdf

# Install dependencies using pnpm
pnpm install

# Start development server
pnpm dev

# Build production bundle
pnpm build
```

---

## 📄 License
MIT License. Free to use, modify, and distribute.
