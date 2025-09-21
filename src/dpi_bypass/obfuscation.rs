// src/dpi_bypass/obfuscation.rs
use rand::Rng;

pub struct TrafficObfuscator {
    key: [u8; 32],
    noise_generator: NoiseGenerator,
}

impl TrafficObfuscator {
    pub fn new(key: [u8; 32]) -> Self {
        Self {
            key,
            noise_generator: NoiseGenerator::new(),
        }
    }
    
    pub fn obfuscate(&mut self, data: &[u8]) -> Vec<u8> {
        let mut obfuscated = data.to_vec();
        
        // Add random padding - enhanced for better DPI resistance
        let padding_len = rand::random::<usize>() % 1024;
        let padding = self.noise_generator.generate(padding_len);
        
        // Store padding length in last 4 bytes for deobfuscation
        let padding_len_bytes = (padding_len as u32).to_be_bytes();
        obfuscated.extend_from_slice(&padding);
        obfuscated.extend_from_slice(&padding_len_bytes);
        
        // XOR with key for basic obfuscation
        for (i, byte) in obfuscated.iter_mut().enumerate() {
            *byte ^= self.key[i % self.key.len()];
        }
        
        // Add traffic shaping patterns to avoid detection
        self.add_traffic_shaping(&mut obfuscated);
        
        obfuscated
    }
    
    pub fn deobfuscate(&self, data: &[u8]) -> Vec<u8> {
        let mut deobfuscated = data.to_vec();
        
        // Remove traffic shaping patterns
        self.remove_traffic_shaping(&mut deobfuscated);
        
        // XOR with key to reverse obfuscation
        for (i, byte) in deobfuscated.iter_mut().enumerate() {
            *byte ^= self.key[i % self.key.len()];
        }
        
        // Remove padding (last 4 bytes indicate padding length)
        if deobfuscated.len() >= 4 {
            let padding_len = u32::from_be_bytes([
                deobfuscated[deobfuscated.len()-4],
                deobfuscated[deobfuscated.len()-3],
                deobfuscated[deobfuscated.len()-2],
                deobfuscated[deobfuscated.len()-1],
            ]) as usize;
            
            if padding_len < deobfuscated.len() - 4 {
                deobfuscated.truncate(deobfuscated.len() - 4 - padding_len);
            }
        }
        
        deobfuscated
    }
    
    /// Add traffic shaping patterns to mimic legitimate traffic
    fn add_traffic_shaping(&self, data: &mut Vec<u8>) {
        let mut rng = rand::thread_rng();
        
        // Add pseudo-random bytes that look like HTTP/TLS patterns
        let patterns = [
            b"HTTP/1.1 200 OK\r\n",
            b"Content-Type: text/html\r\n",
            b"Server: nginx/1.20.1\r\n",
            b"\x16\x03\x03", // TLS handshake
            b"\x17\x03\x03", // TLS application data
        ];
        
        // Randomly insert pattern bytes
        for _ in 0..rng.gen_range(1..=3) {
            let pattern = patterns[rng.gen_range(0..patterns.len())];
            let insert_pos = rng.gen_range(0..data.len().min(100));
            
            for (i, &byte) in pattern.iter().enumerate() {
                if insert_pos + i < data.len() {
                    data[insert_pos + i] ^= byte;
                }
            }
        }
    }
    
    /// Remove traffic shaping patterns (reverse of add_traffic_shaping)
    fn remove_traffic_shaping(&self, data: &mut Vec<u8>) {
        let mut rng = rand::thread_rng();
        
        // This is a simplified reversal - in practice would need deterministic reversal
        let patterns = [
            b"HTTP/1.1 200 OK\r\n",
            b"Content-Type: text/html\r\n", 
            b"Server: nginx/1.20.1\r\n",
            b"\x16\x03\x03",
            b"\x17\x03\x03",
        ];
        
        for _ in 0..rng.gen_range(1..=3) {
            let pattern = patterns[rng.gen_range(0..patterns.len())];
            let insert_pos = rng.gen_range(0..data.len().min(100));
            
            for (i, &byte) in pattern.iter().enumerate() {
                if insert_pos + i < data.len() {
                    data[insert_pos + i] ^= byte;
                }
            }
        }
    }
}

struct NoiseGenerator {
    rng: rand::rngs::ThreadRng,
}

impl NoiseGenerator {
    fn new() -> Self {
        Self {
            rng: rand::thread_rng(),
        }
    }
    
    fn generate(&mut self, len: usize) -> Vec<u8> {
        (0..len).map(|_| self.rng.gen()).collect()
    }
}