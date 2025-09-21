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
        
        // Add random padding
        let padding_len = rand::random::<usize>() % 1024;
        let padding = self.noise_generator.generate(padding_len);
        
        // Store padding length in last 4 bytes for deobfuscation
        let padding_len_bytes = (padding_len as u32).to_be_bytes();
        obfuscated.extend_from_slice(&padding);
        obfuscated.extend_from_slice(&padding_len_bytes);
        
        // XOR with key
        for (i, byte) in obfuscated.iter_mut().enumerate() {
            *byte ^= self.key[i % self.key.len()];
        }
        
        obfuscated
    }
    
    pub fn deobfuscate(&self, data: &[u8]) -> Vec<u8> {
        let mut deobfuscated = data.to_vec();
        
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