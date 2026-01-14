#!/bin/bash

# Generate dummy PWA icons for testing

# Create simple colored square icons using ImageMagick if available
# Otherwise, this script will create placeholder SVGs

ICON_DIR="public/icons"
mkdir -p "$ICON_DIR"

# Icon sizes to generate
SIZES=(72 96 128 144 152 192 384 512)

# Color scheme
BG_COLOR="#2563eb"  # Blue-600
TEXT_COLOR="#ffffff"

echo "Generating dummy PWA icons..."

# Check if ImageMagick is available
if command -v convert &> /dev/null; then
    echo "Using ImageMagick to generate PNG icons..."

    for size in "${SIZES[@]}"; do
        convert -size "${size}x${size}" "xc:${BG_COLOR}" \
                -gravity center \
                -fill "${TEXT_COLOR}" \
                -pointsize $((size / 2)) \
                -annotate +0+0 "H" \
                "$ICON_DIR/icon-${size}x${size}.png"

        echo "Created: $ICON_DIR/icon-${size}x${size}.png"
    done
else
    echo "ImageMagick not found. Creating SVG placeholders instead..."

    # Create a single SVG that can be used as a reference
    cat > "$ICON_DIR/icon-placeholder.svg" << EOF
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#2563eb"/>
  <text x="50%" y="50%" font-size="256" fill="white" text-anchor="middle" dominant-baseline="middle" font-family="Arial">H</text>
</svg>
EOF

    echo "Created SVG placeholder at: $ICON_DIR/icon-placeholder.svg"
    echo ""
    echo "⚠️  NOTE: PNG icons not generated. To create proper PNGs:"
    echo "   1. Install ImageMagick: sudo apt-get install imagemagick"
    echo "   2. Run this script again"
    echo ""
    echo "   For now, you can manually convert the SVG or use online tools:"
    echo "   https://www.aconvert.com/image/svg-to-png/"
fi

echo ""
echo "✅ Icon generation complete!"
