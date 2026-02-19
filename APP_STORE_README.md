# TheRealTOC - App Store Preparation

This document contains all the information needed to submit TheRealTOC to the iOS App Store and Google Play Store.

## 📱 App Overview

**Name:** TheRealTOC  
**Tagline:** Your Pool League, Organized  
**Category:** Sports / Social Networking  
**Platform:** React Native (Expo)  

### Key Features
- Live league rankings ("The List")
- Challenge system for matches
- Match tracking and history
- League treasury management
- Activity feed for league updates

---

## 🚀 Quick Start for Submission

### Prerequisites
1. Apple Developer Program membership ($99/year) - **REQUIRED for iOS**
2. Google Play Developer account ($25 one-time) - **REQUIRED for Android**

### Files Created

#### Configuration
- `app.json` - Expo configuration for both platforms
- `eas.json` - EAS Build configuration

#### Documentation
- `PRIVACY_POLICY.md` - GDPR/CCPA compliant privacy policy
- `TERMS_OF_SERVICE.md` - Terms of service
- `app-store-descriptions.md` - Optimized store descriptions
- `SCREENSHOT_GUIDELINES.md` - Screenshot specifications
- `SUBMISSION_CHECKLIST.md` - Complete submission checklist

#### Assets
- `assets/icon.png` - Main app icon (1024x1024)
- `assets/splash.png` - Splash screen (2048x2048)
- `assets/adaptive-icon.png` - Android adaptive icon foreground
- `assets/adaptive-icon-bg.png` - Android adaptive icon background
- `assets/adaptive-icon-mono.png` - Android monochrome icon
- `assets/ios-icon-dark.png` - iOS dark mode icon
- `assets/ios-icon-tinted.png` - iOS tinted icon
- `assets/feature-graphic.png` - Google Play feature graphic (1024x500)
- `assets/favicon.png` - Web favicon

#### Scripts
- `generate-icons.js` - Regenerate all icons from SVG
- `generate-icons.sh` - Bash alternative (requires ImageMagick)

---

## 📋 Submission Steps

### 1. Prepare Accounts

#### Apple App Store
1. Enroll in Apple Developer Program: https://developer.apple.com/programs/
2. Complete tax and banking information in App Store Connect
3. Accept all developer agreements

#### Google Play Store
1. Create Google Play Developer account: https://play.google.com/console
2. Pay $25 registration fee
3. Complete identity verification
4. Set up merchant account (if needed)

### 2. Build Production App

```bash
# Install dependencies
npm install

# Build for iOS
npx eas build --platform ios --profile production

# Build for Android
npx eas build --platform android --profile production
```

### 3. Submit to App Store

1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Create new app with bundle ID: `com.therealtoc.app`
3. Fill in app information using `app-store-descriptions.md`
4. Upload screenshots (see `SCREENSHOT_GUIDELINES.md`)
5. Upload build from EAS
6. Submit for review

### 4. Submit to Google Play

1. Log in to [Google Play Console](https://play.google.com/console)
2. Create new app with package name: `com.therealtoc.app`
3. Complete store listing using `app-store-descriptions.md`
4. Upload screenshots and feature graphic
5. Complete content rating questionnaire
6. Fill out data safety form
7. Upload AAB from EAS
8. Submit for review

---

## 🔧 Configuration Details

### Bundle Identifiers
- **iOS:** `com.therealtoc.app`
- **Android:** `com.therealtoc.app`

### App Versions
- Current version: `1.0.0`
- iOS build number: `1.0.0.1`
- Android version code: `1`

### Supported Devices
- iOS: iPhone and iPad (iOS 15+)
- Android: Phones and tablets (API 24+)

---

## 📝 Store Listing Information

### App Store (iOS)

**Name:** TheRealTOC: Pool League  
**Subtitle:** Track matches & rankings  
**Keywords:** pool,billiards,league,ranking,match,challenge,tournament,score,tracker,competition

### Google Play (Android)

**Name:** TheRealTOC: Pool League Manager  
**Short Description:** Track pool league rankings, challenges, matches & treasury. Free league management.

---

## 🎨 Assets Summary

| Asset | Size | Platform | File |
|-------|------|----------|------|
| App Icon | 1024x1024 | Both | `assets/icon.png` |
| Splash Screen | 2048x2048 | Both | `assets/splash.png` |
| Android Adaptive FG | 432x432 | Android | `assets/adaptive-icon.png` |
| Android Adaptive BG | 432x432 | Android | `assets/adaptive-icon-bg.png` |
| Android Monochrome | 432x432 | Android | `assets/adaptive-icon-mono.png` |
| iOS Dark Icon | 1024x1024 | iOS | `assets/ios-icon-dark.png` |
| iOS Tinted Icon | 1024x1024 | iOS | `assets/ios-icon-tinted.png` |
| Feature Graphic | 1024x500 | Android | `assets/feature-graphic.png` |
| Play Store Icon | 512x512 | Android | `assets/play-store-icon.png` |
| Favicon | 32x32 | Web | `assets/favicon.png` |

---

## 📸 Screenshots Needed

### iOS
- iPhone 6.5" (1290x2796): 1-10 screenshots
- iPhone 5.5" (1242x2208): 1-10 screenshots
- iPad 12.9" (2048x2732): 1-10 screenshots (if supporting iPad)

### Android
- Phone (1080x1920): 4-8 screenshots
- 7" Tablet (1080x1920): Optional
- 10" Tablet (1440x2560): Optional

See `SCREENSHOT_GUIDELINES.md` for detailed specifications.

---

## ⚠️ Important Notes

### Before Submission
1. Test on physical devices (not just simulators)
2. Verify all backend services are production-ready
3. Ensure Supabase project is on paid plan or within free limits
4. Review app for any placeholder content or test data
5. Check that all links in app are functional

### Common Rejection Reasons to Avoid
- Incomplete or placeholder content
- Broken links
- Missing privacy policy
- Inaccurate screenshots
- Excessive permissions
- Poor app performance
- UI/UX issues

### Post-Submission
- Monitor email for review communications
- Be prepared to respond to rejection reasons
- Plan for 24-48 hour review time (iOS) or 1-7 days (Android)

---

## 🔄 Update Strategy

### Over-the-Air (OTA) Updates
Expo supports OTA updates for JavaScript changes:
```bash
npx eas update --branch production --message "Bug fixes"
```

### Store Updates
Required for native code changes:
1. Update version in `app.json`
2. Build new version with EAS
3. Submit to stores
4. Wait for review

---

## 📞 Support Contacts

- **Privacy Policy:** privacy@therealtoc.com
- **Legal:** legal@therealtoc.com
- **Support:** support@therealtoc.com

**Note:** Update these email addresses with actual contact information before submission.

---

## 🎯 Next Steps

1. [ ] Review and customize all documentation
2. [ ] Update contact email addresses
3. [ ] Create actual screenshots from the app
4. [ ] Set up Apple Developer account
5. [ ] Set up Google Play Developer account
6. [ ] Build production apps with EAS
7. [ ] Submit to both stores

---

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Developer Policy](https://play.google.com/about/developer-content-policy/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

---

*Last Updated: February 19, 2026*
