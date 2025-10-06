# Tauri v2.0 Migration

## Overview

This document explains the migration from Tauri v1.6 to v2.0 to resolve the libsoup2/libsoup3 runtime conflict.

## Problem Statement

The application was experiencing a critical runtime error:

```
libsoup-ERROR **: libsoup3 symbols detected. Using libsoup2 and libsoup3 in the same process is not supported.
error: test failed, to rerun pass -p privachain-tauri --bin privachain-tauri
process didn't exit successfully: ...privachain_tauri-8cdbf31a816b287c (signal: 5, SIGTRAP: trace/breakpoint trap)
```

### Root Cause

- Tauri v1.6 depended on `webkit2gtk` v0.18.2, which uses `libsoup2`
- The system or other dependencies were loading `libsoup3`
- Both libsoup versions cannot coexist in the same process, causing a runtime crash

## Solution

Upgraded to Tauri v2.0, which uses `webkit2gtk` v2.0.1 with `libsoup3` instead of `libsoup2`.

### Changes Made

1. **src-tauri/Cargo.toml**
   - Updated `tauri` from `1.6` to `2.0`
   - Updated `tauri-build` from `1.5` to `2.0`
   - Removed `api-all` feature (no longer needed in v2)

2. **src-tauri/tauri.conf.json**
   - Migrated from Tauri v1 to v2 configuration format
   - Changed `devPath` to `devUrl`
   - Changed `distDir` to `frontendDist`
   - Moved configuration structure from nested `tauri` object to top-level
   - Added v2 schema reference

3. **package.json**
   - Updated `@tauri-apps/cli` from `^1.6.0` to `^2.0.0`

4. **Documentation**
   - Updated system dependency instructions to include `libsoup-3.0-dev`
   - Removed legacy webkit2gtk 4.0 symlink instructions (no longer needed)
   - Updated version references throughout documentation

### Verification

The dependency tree now shows only `soup3`:

```bash
$ cargo tree | grep soup
│   │       ├── soup3 v0.5.0
│   │       │   └── soup3-sys v0.5.0
```

No `soup2` dependencies are present, resolving the conflict.

## Code Compatibility

The Rust code in `src/main.rs` and `src/dpi_fetch.rs` required **no changes**. The Tauri v2 API is backward compatible for the basic usage:

- `#[command]` macro - unchanged
- `tauri::generate_handler!` - unchanged  
- `tauri::generate_context!` - unchanged
- Command invocation from frontend - unchanged

## System Dependencies

### Before (Tauri v1)
```bash
sudo apt-get install libwebkit2gtk-4.1-dev ...
# Required symlinks for webkit2gtk-4.0 compatibility
```

### After (Tauri v2)
```bash
sudo apt-get install libwebkit2gtk-4.1-dev libsoup-3.0-dev ...
# No symlinks needed
```

## Migration Impact

- **Breaking Changes**: Configuration file format only
- **Code Changes**: None required for basic usage
- **Testing**: All existing unit tests pass without modification
- **Build Time**: Similar to v1
- **Bundle Size**: No significant change

## References

- [Tauri v2 Documentation](https://v2.tauri.app/)
- [Tauri v1 to v2 Migration Guide](https://v2.tauri.app/start/migrate/from-tauri-1/)
- [webkit2gtk-rs Repository](https://github.com/tauri-apps/webkit2gtk-rs)
