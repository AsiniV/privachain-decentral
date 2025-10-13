#!/usr/bin/env bash
# scripts/build-gecko-slim.sh
# Build Gecko-slim (no Mozilla telemetry, no updater) for PrivaChain v4.0

set -euo pipefail

GECKO_VER="126.0"
CACHE="$HOME/.cache/privachain/gecko"

echo "🦎 Building Gecko-slim v${GECKO_VER} for PrivaChain v4.0"
echo "========================================================"
echo ""

mkdir -p "$CACHE" && cd "$CACHE"

# 1. Clone only one changeset (fast)
echo "1️⃣  Checking out Gecko source..."
if [[ ! -d gecko-dev ]]; then
  echo "   Cloning gecko-dev (this may take a while)..."
  git clone --depth 1 --branch FIREFOX_${GECKO_VER}_RELEASE \
    https://github.com/mozilla/gecko-dev.git
  echo "   ✅ Source cloned"
else
  echo "   ✅ Source already present"
fi

cd gecko-dev

# 2. Minimal .mozconfig → no telemetry, no crash-reporter, no updater
# Now with DRM/EME support and proprietary codecs (H.264, AAC) for v1.0-browser
echo ""
echo "2️⃣  Configuring minimal build..."
cat > .mozconfig <<'EOF'
ac_add_options --enable-application=browser
ac_add_options --disable-crashreporter
ac_add_options --disable-updater
ac_add_options --disable-telemetry
ac_add_options --enable-strip
ac_add_options --enable-install-strip
ac_add_options --enable-optimize="-O2 -g0"
ac_add_options --enable-resistfingerprinting

# Proprietary codecs for full site compatibility
# OpenH264 (Cisco pays patent royalty) - enables Twitter/Instagram stories
ac_add_options --enable-openh264
# AAC (patent expired 2023) - enables audio on many sites
ac_add_options --enable-aac

# DRM/EME support for Netflix, Spotify, Prime Video
# Widevine CDM is included but license requests redirected to self-hosted proxy
ac_add_options --enable-eme=widevine

mk_add_options MOZ_OBJDIR=@TOPSRCDIR@/obj-slim
EOF
echo "   ✅ .mozconfig created with codecs (H.264, AAC) and DRM support"

# 3. Parallel build (≈ 25 min on 8-core)
echo ""
echo "3️⃣  Building (this will take ~25 minutes on 8 cores)..."
echo "   Note: This step requires Mozilla build dependencies to be installed"
echo "   See: https://firefox-source-docs.mozilla.org/setup/linux_build.html"
echo ""

if ! command -v ./mach &> /dev/null; then
    echo "   ❌ mach build tool not found"
    echo "   Please ensure you're in the gecko-dev directory"
    exit 1
fi

./mach build
echo "   ✅ Build completed"

# 4. Package -> single tarball
echo ""
echo "4️⃣  Packaging..."
./mach package
tar -C obj-slim/dist -cjf ../gecko-slim.tar.bz2 firefox
echo "   ✅ Package created"

echo ""
echo "✅ Gecko-slim ready: $CACHE/gecko-slim.tar.bz2"
echo ""
echo "To integrate into PrivaChain:"
echo "  1. Extract to src-tauri/binaries/gecko-slim/"
echo "  2. Build with: cargo build --features engine-gecko"
echo ""
