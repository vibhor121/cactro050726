#!/bin/bash
set -e

echo "Building Next.js app..."
bun run next build

echo "Copying extension configuration..."
cp public/manifest.json out/manifest.json
cp public/content.js out/content.js
cp public/background.js out/background.js
cp public/popup.html out/popup.html
cp public/popup.js out/popup.js
cp public/icon16.png out/icon16.png
cp public/icon48.png out/icon48.png
cp public/icon128.png out/icon128.png

# Rename _next to assets (Chrome doesn't allow underscore-prefixed directories)
if [[ -d out/_next ]]; then
  echo "Renaming _next to assets (Chrome compatibility)..."
  rm -rf out/assets
  mv out/_next out/assets
fi

# Update HTML files to reference /assets/ instead of /_next/
echo "Updating HTML references..."
find out -name "*.html" -type f -exec sed -i 's|/_next/|/assets/|g' {} \;

echo "✓ Extension bundle ready in ./out folder"
echo ""
echo "Next steps:"
echo "  1. Open Chrome and go to chrome://extensions"
echo "  2. Enable 'Developer mode' (top-right toggle)"
echo "  3. Click 'Load unpacked'"
echo "  4. Select the './out' folder"
