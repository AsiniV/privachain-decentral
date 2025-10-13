# Gecko-slim Binaries

This directory contains the minimal Firefox (Gecko) browser binary used as a sidecar for PrivaChain v4.0.

## Structure

```
gecko-slim/
├── firefox          # Main executable (38MB)
└── browser/         # Profile template and resources
```

## Building

The Firefox binary is built from source using the `build-gecko-slim.sh` script:

```bash
./scripts/build-gecko-slim.sh
```

This script will:
1. Clone Firefox source from Mozilla (FIREFOX_126.0_RELEASE)
2. Configure minimal build (no telemetry, no updater, no crash reporter)
3. Build with optimization flags
4. Package into a tarball

## Installation

After building, extract the tarball here:

```bash
cd src-tauri/binaries/gecko-slim/
tar xjf ~/.cache/privachain/gecko/gecko-slim.tar.bz2
```

## Configuration

The Firefox binary is configured with:

- `--disable-telemetry`: No data sent to Mozilla
- `--disable-updater`: No automatic updates
- `--disable-crashreporter`: No crash reports
- `--enable-resistfingerprinting`: Privacy hardening
- `--enable-optimize="-O2 -g0"`: Size optimization
- `--enable-strip`: Strip debug symbols

## Size

The complete Gecko-slim bundle is approximately 38MB, keeping the total PrivaChain bundle under the 53MB CI limit.

## Privacy

This build includes:
- ✅ No Mozilla telemetry code
- ✅ No crash reporter
- ✅ No automatic updater
- ✅ Fingerprint resistance enabled by default
- ✅ Safe mode support (disables extensions)

## Testing

The placeholder `firefox` script is included for development/testing. Replace it with the actual binary for production use.

## License

Firefox is licensed under the Mozilla Public License 2.0.
See: https://www.mozilla.org/en-US/MPL/2.0/
