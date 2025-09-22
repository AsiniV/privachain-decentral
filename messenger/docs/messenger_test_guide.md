# PrivaChain Messenger Test Guide

This guide provides step-by-step instructions for testing the PrivaChain Messenger's post-quantum cryptography features.

## Prerequisites

Before testing, ensure you have the following installed:

- Rust toolchain (1.70 or later)
- Git
- Basic build tools (gcc, make)

Optional for ZK circuits:
- Node.js and npm
- circom
- snarkjs

## Quick Start

1. **Navigate to messenger directory:**
   ```bash
   cd messenger/
   ```

2. **Build the messenger library:**
   ```bash
   ./scripts/build_messenger.sh
   ```

3. **Run all tests:**
   ```bash
   ./scripts/run_all_tests.sh
   ```

## Individual Test Components

### 1. Post-Quantum Handshake Tests

Test the Kyber + Dilithium post-quantum handshake:

```bash
./tests/test_kyber_handshake.sh
```

**Expected Results:**
- 100/100 successful handshakes
- Key generation working
- Signature verification working
- Serialization/deserialization working

### 2. Chunk Padding Tests

Test 256 KiB constant block padding:

```bash
./tests/test_256k_chunk.sh
```

**Expected Results:**
- All messages padded to exactly 256 KiB
- Large files split into multiple 256 KiB chunks
- Perfect reconstruction after padding/unpadding

### 3. Decoy Traffic Tests

Test decoy traffic generation timing:

```bash
./tests/test_decoy_jitter.sh
```

**Expected Results:**
- Decoy traffic generated every 30 seconds ± 5%
- Timing jitter is working (intervals vary)
- Decoy packets are exactly 256 KiB

### 4. File Transfer Tests

Test large file handling:

```bash
./tests/test_2gb_file.sh  # ≤ 8 min on 100 Mbps
```

**Expected Results:**
- Large files (up to 2GB) split into chunks
- Reliable reconstruction
- Performance under 8 minutes on 100 Mbps connection

### 5. DPI Fingerprint Tests

Test Deep Packet Inspection resistance:

```bash
./tests/test_dpi_fingerprint.py
```

**Expected Results:**
- Traffic appears random to DPI analysis
- No detectable patterns
- High entropy in all packets

### 6. Video Call Performance

Test video call integration:

```bash
./tests/test_video_1080p.sh  # FPS drop ≤ 2%
```

**Expected Results:**
- 1080p video with minimal frame rate impact
- SRTP keys derived from Double Ratchet
- FPS drop ≤ 2% compared to baseline

## Unit Tests

Run Rust unit tests for all components:

```bash
cargo test --release
```

This runs comprehensive unit tests for:
- Kyber key encapsulation
- Dilithium signatures
- Double Ratchet protocol
- Chunk padding/unpadding
- Decoy traffic timing
- File transfer chunking
- ZK proof generation (placeholder)

## Performance Benchmarks

### Handshake Performance
- Kyber key generation: < 100ms
- Dilithium signing: < 50ms  
- Full handshake: < 200ms

### Encryption Performance
- Message encryption: < 10ms per 256KB chunk
- Large file processing: < 1 second per MB

### Memory Usage
- Base library: < 10MB RAM
- Per active session: < 1MB RAM
- ZK proof generation: < 100MB RAM

## Troubleshooting

### Build Issues

**Error: "pqc_kyber not found"**
```bash
cargo update
cargo build --release
```

**Error: "linking errors"**
```bash
sudo apt install build-essential
```

### Test Failures

**Kyber handshake failures:**
- Check that dependencies are properly installed
- Verify random number generation is working
- Ensure no network interference

**Timing test failures:**
- System clock issues can affect timing tests
- Run tests on a system with stable timing
- Check for heavy system load during tests

**Chunk padding failures:**
- Verify file system has sufficient space
- Check for memory constraints on large file tests

### ZK Circuit Issues

**Circom compilation errors:**
```bash
npm install -g circom@latest snarkjs@latest
cd circuits/
./build.sh
```

**Powers of Tau download fails:**
- Download manually from Hermez ceremony
- Verify checksum matches expected value

## Development Mode vs Production

### Development Mode
- Uses placeholder ZK proofs for testing
- Simplified trusted setup
- Debug logging enabled
- Faster build times

### Production Mode
- Requires proper trusted setup ceremony
- Full ZK-SNARK verification
- Optimized performance
- Security hardening enabled

## Security Notes

⚠️ **Important Security Considerations:**

1. **Development Keys Only:** The ZK circuit setup in this test environment uses development keys only. For production, conduct a proper trusted setup ceremony.

2. **Key Storage:** Private keys are stored in plain text for testing. Production systems should use secure key storage.

3. **Network Security:** Test environment may not include all network security features present in production.

4. **Audit Required:** Before production use, conduct a comprehensive security audit of all cryptographic implementations.

## Reporting Issues

When reporting test failures, please include:

1. **Environment Information:**
   - Operating system and version
   - Rust version (`rustc --version`)
   - Hardware specifications

2. **Test Output:**
   - Complete test output with error messages
   - Any relevant log files

3. **Reproduction Steps:**
   - Exact commands used
   - Any configuration changes made

4. **Expected vs Actual:**
   - What you expected to happen
   - What actually happened

## Next Steps

After successful testing:

1. **Integration Testing:** Test integration with the main PrivaChain application
2. **Performance Tuning:** Optimize for your specific deployment environment  
3. **Security Review:** Conduct security audit before production deployment
4. **Trusted Setup:** Perform proper ZK-SNARK trusted setup ceremony
5. **Documentation:** Update configuration and deployment documentation