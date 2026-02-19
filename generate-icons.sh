#!/bin/bash

# Icon Generation Script for TheRealTOC
# This script generates all required icon sizes for iOS and Android
# Requires ImageMagick: brew install imagemagick (macOS) or apt-get install imagemagick (Linux)

set -e

# Colors matching app theme
PRIMARY_COLOR="#e94560"
BACKGROUND_COLOR="#1a1a2e"

# Source icon (should be 1024x1024 minimum)
SOURCE_ICON="./assets/source-icon.png"

# Check if source icon exists
if [ ! -f "$SOURCE_ICON" ]; then
    echo "❌ Source icon not found at $SOURCE_ICON"
    echo "Please create a 1024x1024 icon and save it as assets/source-icon.png"
    exit 1
fi

echo "🎨 Generating icons for TheRealTOC..."

# Create output directories
mkdir -p ./assets/ios
mkdir -p ./assets/android/mipmap-hdpi
mkdir -p ./assets/android/mipmap-mdpi
mkdir -p ./assets/android/mipmap-xhdpi
mkdir -p ./assets/android/mipmap-xxhdpi
mkdir -p ./assets/android/mipmap-xxxhdpi

# ============================================
# iOS Icons
# ============================================
echo "📱 Generating iOS icons..."

# iOS App Icon sizes
ios_sizes=(
    "20x20"
    "29x29"
    "40x40"
    "58x58"
    "60x60"
    "76x76"
    "80x80"
    "87x87"
    "120x120"
    "152x152"
    "167x167"
    "180x180"
    "1024x1024"
)

for size in "${ios_sizes[@]}"; do
    convert "$SOURCE_ICON" -resize "$size" "./assets/ios/icon-$size.png"
    echo "  ✓ icon-$size.png"
done

# iOS App Store icon (1024x1024)
cp "$SOURCE_ICON" "./assets/ios/AppStore-1024x1024.png"
echo "  ✓ AppStore-1024x1024.png"

# ============================================
# Android Icons
# ============================================
echo "🤖 Generating Android icons..."

# Android launcher icon sizes
# mdpi: 48x48
# hdpi: 72x72
# xhdpi: 96x96
# xxhdpi: 144x144
# xxxhdpi: 192x192

convert "$SOURCE_ICON" -resize "48x48" "./assets/android/mipmap-mdpi/ic_launcher.png"
convert "$SOURCE_ICON" -resize "72x72" "./assets/android/mipmap-hdpi/ic_launcher.png"
convert "$SOURCE_ICON" -resize "96x96" "./assets/android/mipmap-xhdpi/ic_launcher.png"
convert "$SOURCE_ICON" -resize "144x144" "./assets/android/mipmap-xxhdpi/ic_launcher.png"
convert "$SOURCE_ICON" -resize "192x192" "./assets/android/mipmap-xxxhdpi/ic_launcher.png"

echo "  ✓ Generated launcher icons"

# Play Store icon (512x512)
convert "$SOURCE_ICON" -resize "512x512" "./assets/android/playstore-icon-512.png"
echo "  ✓ playstore-icon-512.png"

# ============================================
# Expo/General Icons
# ============================================
echo "⚡ Generating Expo icons..."

# Main icon (1024x1024 for Expo)
cp "$SOURCE_ICON" "./assets/icon.png"
echo "  ✓ icon.png (1024x1024)"

# Favicon (32x32 and 16x16)
convert "$SOURCE_ICON" -resize "32x32" "./assets/favicon.png"
echo "  ✓ favicon.png (32x32)"

# ============================================
# Adaptive Icons (Android)
# ============================================
echo "🎭 Generating Android Adaptive Icons..."

# Foreground layer (should be provided separately for best results)
# This creates a basic version - ideally provide a designed foreground
if [ -f "./assets/adaptive-icon-foreground.png" ]; then
    convert "./assets/adaptive-icon-foreground.png" -resize "432x432" "./assets/adaptive-icon.png"
else
    # Create a simple version from source
    convert "$SOURCE_ICON" -resize "432x432" "./assets/adaptive-icon.png"
fi

# Background layer (solid color or image)
if [ -f "./assets/adaptive-icon-background.png" ]; then
    cp "./assets/adaptive-icon-background.png" "./assets/adaptive-icon-bg.png"
else
    # Create solid color background
    convert -size "432x432" "xc:$BACKGROUND_COLOR" "./assets/adaptive-icon-bg.png"
fi

# Monochrome version for themed icons (Android 13+)
if [ -f "./assets/adaptive-icon-monochrome.png" ]; then
    convert "./assets/adaptive-icon-monochrome.png" -resize "432x432" "./assets/adaptive-icon-mono.png"
else
    # Create a simple monochrome version
    convert "$SOURCE_ICON" -resize "432x432" -colorspace Gray "./assets/adaptive-icon-mono.png"
fi

echo "  ✓ adaptive-icon.png (foreground)"
echo "  ✓ adaptive-icon-bg.png (background)"
echo "  ✓ adaptive-icon-mono.png (monochrome)"

# ============================================
# iOS Dark/Tinted Icons (iOS 18+)
# ============================================
echo "🌙 Generating iOS Dark/Tinted icons..."

# Dark mode icon
if [ -f "./assets/ios-icon-dark-source.png" ]; then
    cp "./assets/ios-icon-dark-source.png" "./assets/ios-icon-dark.png"
else
    # Create dark version
    convert "$SOURCE_ICON" -brightness-contrast -20x0 "./assets/ios-icon-dark.png"
fi

# Tinted icon (for iOS 18+ tinted home screen)
if [ -f "./assets/ios-icon-tinted-source.png" ]; then
    cp "./assets/ios-icon-tinted-source.png" "./assets/ios-icon-tinted.png"
else
    # Create tinted version (single color with transparency)
    convert "$SOURCE_ICON" -colorspace Gray -brightness-contrast 0x100 "./assets/ios-icon-tinted.png"
fi

echo "  ✓ ios-icon-dark.png"
echo "  ✓ ios-icon-tinted.png"

# ============================================
# Splash Screen
# ============================================
echo "🌊 Generating splash screen..."

# Create splash screen (should be 2048x2048 for best results)
# This creates a centered icon on the brand background
convert -size "2048x2048" "xc:$BACKGROUND_COLOR" \
    \( "$SOURCE_ICON" -resize "1024x1024" \) \
    -gravity center -composite \
    "./assets/splash.png"

echo "  ✓ splash.png (2048x2048)"

# Also create a smaller version for older devices
convert -size "1242x1242" "xc:$BACKGROUND_COLOR" \
    \( "$SOURCE_ICON" -resize "600x600" \) \
    -gravity center -composite \
    "./assets/splash-icon.png"

echo "  ✓ splash-icon.png (1242x1242)"

# ============================================
# Summary
# ============================================
echo ""
echo "✅ Icon generation complete!"
echo ""
echo "Generated files:"
echo "  📱 iOS: $(find ./assets/ios -name '*.png' | wc -l) icons"
echo "  🤖 Android: $(find ./assets/android -name '*.png' | wc -l) icons"
echo "  ⚡ Expo: icon.png, splash.png, favicon.png"
echo "  🎭 Adaptive: adaptive-icon.png, adaptive-icon-bg.png, adaptive-icon-mono.png"
echo ""
echo "Next steps:"
echo "  1. Review generated icons in assets/ folder"
echo "  2. Replace any auto-generated icons with designed versions if needed"
echo "  3. Run 'expo prebuild' to verify icons work correctly"
echo "  4. Test on actual devices"
