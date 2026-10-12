#!/bin/bash
# Regenerates public/icons from logo.png (requires ImageMagick).
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p public/icons
tmp="$(mktemp --suffix=.png)"
trap 'rm -f "$tmp"' EXIT

# Make the white background transparent (flood fill from the border), then crop to the artwork.
magick logo.png -bordercolor white -border 1 -alpha set -fuzz 6% \
  -fill none -draw 'color 0,0 floodfill' -shave 1x1 -trim +repage "$tmp"

# Size:padding pairs; the 128px icon keeps 16px of transparent padding per the Chrome guidelines.
for spec in 16:0 32:1 48:2 96:12 128:16; do
  size="${spec%%:*}"
  pad="${spec##*:}"
  magick "$tmp" -resize "$((size - 2 * pad))x$((size - 2 * pad))" \
    -background none -gravity center -extent "${size}x${size}" \
    "public/icons/icon-${size}.png"
done
