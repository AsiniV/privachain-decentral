// dpi-bypass/src/obfs5.rs
use snow::{Builder, TransportState};
use rand::Rng;
use std::io;
use tokio::net::TcpStream;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

#[derive(Debug, Clone)]
pub enum PadPolicy {
    Static(usize),
    Dynamic,
    Random { min: usize, max: usize },
}

pub struct Obfs5Stream {
    noise: TransportState,
    padding_policy: PadPolicy,
}

impl Obfs5Stream {
    /// Create client handshake for Obfs5 over TCP
    pub async fn client_handshake(
        mut socket: TcpStream, 
        secret: &[u8; 32]
    ) -> io::Result<Self> {
        // Initialize Noise protocol with NN pattern (no static keys)
        let builder = Builder::new("Noise_NN_25519_AESGCM_SHA256".parse()
            .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Noise pattern error: {}", e)))?);
        
        let mut noise = builder
            .local_private_key(secret)
            .build_initiator()
            .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Noise builder error: {}", e)))?;
        
        // First handshake message with random padding
        let pad_len = rand::thread_rng().gen_range(0..=255);
        let mut input_buf = vec![0u8; pad_len + 2];
        input_buf[0..2].copy_from_slice(&(pad_len as u16).to_be_bytes());
        
        let mut output_buf = vec![0u8; input_buf.len() + 16]; // Extra space for encryption
        let len = noise.write_message(&input_buf, &mut output_buf)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Noise write error: {}", e)))?;
        
        socket.write_all(&output_buf[..len]).await?;
        
        // Read response
        let mut response = vec![0u8; 1024];
        let n = socket.read(&mut response).await?;
        response.truncate(n);
        
        // Process handshake response
        let mut payload = vec![0u8; 1024];
        let _payload_len = noise.read_message(&response, &mut payload)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Noise read error: {}", e)))?;
        
        // Complete handshake to get transport state
        let noise = noise.into_transport_mode()
            .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Transport mode error: {}", e)))?;
        
        Ok(Obfs5Stream { 
            noise, 
            padding_policy: PadPolicy::Dynamic 
        })
    }
    
    /// Server handshake for Obfs5
    pub async fn server_handshake(
        mut socket: TcpStream,
        secret: &[u8; 32]
    ) -> io::Result<Self> {
        let builder = Builder::new("Noise_NN_25519_AESGCM_SHA256".parse()
            .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Noise pattern error: {}", e)))?);
            
        let mut noise = builder
            .local_private_key(secret)
            .build_responder()
            .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Noise builder error: {}", e)))?;
        
        // Read client handshake
        let mut buf = vec![0u8; 1024];
        let n = socket.read(&mut buf).await?;
        buf.truncate(n);
        
        // Process handshake and respond
        let mut payload = vec![0u8; 1024];
        let _payload_len = noise.read_message(&buf, &mut payload)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Noise read error: {}", e)))?;
        
        // Send response with padding
        let pad_len = rand::thread_rng().gen_range(0..=255);
        let mut response_buf = vec![0u8; pad_len + 64]; // Extra space for encryption overhead
        let response_len = noise.write_message(&payload[..pad_len], &mut response_buf)
            .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Noise write error: {}", e)))?;
        
        socket.write_all(&response_buf[..response_len]).await?;
        
        let noise = noise.into_transport_mode()
            .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Transport mode error: {}", e)))?;
        
        Ok(Obfs5Stream {
            noise,
            padding_policy: PadPolicy::Dynamic
        })
    }
    
    /// Encrypt and obfuscate data
    pub fn encrypt(&mut self, plaintext: &[u8]) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let padded_data = self.apply_padding(plaintext);
        let mut ciphertext = vec![0u8; padded_data.len() + 16]; // Space for auth tag
        
        let len = self.noise.write_message(&padded_data, &mut ciphertext)?;
        ciphertext.truncate(len);
        
        Ok(ciphertext)
    }
    
    /// Decrypt and deobfuscate data
    pub fn decrypt(&mut self, ciphertext: &[u8]) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let mut plaintext = vec![0u8; ciphertext.len()];
        let len = self.noise.read_message(ciphertext, &mut plaintext)?;
        plaintext.truncate(len);
        
        Ok(self.remove_padding(&plaintext))
    }
    
    /// Apply padding according to policy
    fn apply_padding(&self, data: &[u8]) -> Vec<u8> {
        let pad_len = match self.padding_policy {
            PadPolicy::Static(len) => len,
            PadPolicy::Dynamic => {
                // Dynamic padding based on data size to mask patterns
                let base_pad = rand::thread_rng().gen_range(16..=64);
                let size_mask = (data.len() + base_pad).next_power_of_two() - data.len();
                size_mask
            },
            PadPolicy::Random { min, max } => {
                rand::thread_rng().gen_range(min..=max)
            }
        };
        
        let padded = data.to_vec();
        let padding: Vec<u8> = (0..pad_len).map(|_| rand::random()).collect();
        
        // Add padding length as first 2 bytes
        let mut result = Vec::new();
        result.extend_from_slice(&(pad_len as u16).to_be_bytes());
        result.extend_from_slice(&padded);
        result.extend_from_slice(&padding);
        
        result
    }
    
    /// Remove padding from decrypted data
    fn remove_padding(&self, data: &[u8]) -> Vec<u8> {
        if data.len() < 2 {
            return data.to_vec();
        }
        
        let pad_len = u16::from_be_bytes([data[0], data[1]]) as usize;
        let content_start = 2;
        let content_end = data.len().saturating_sub(pad_len);
        
        if content_end <= content_start {
            return Vec::new();
        }
        
        data[content_start..content_end].to_vec()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::net::{TcpListener, TcpStream};
    
    #[tokio::test]
    async fn test_obfs5_handshake() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        
        let server_secret = rand::random::<[u8; 32]>();
        let client_secret = rand::random::<[u8; 32]>();
        
        // Spawn server
        let server_task = tokio::spawn(async move {
            let (socket, _) = listener.accept().await.unwrap();
            Obfs5Stream::server_handshake(socket, &server_secret).await.unwrap()
        });
        
        // Connect client
        let client_socket = TcpStream::connect(addr).await.unwrap();
        let mut client = Obfs5Stream::client_handshake(client_socket, &client_secret).await.unwrap();
        
        let mut server = server_task.await.unwrap();
        
        // Test encryption/decryption
        let test_data = b"Hello, Obfs5!";
        let encrypted = client.encrypt(test_data).unwrap();
        let decrypted = server.decrypt(&encrypted).unwrap();
        
        assert_eq!(test_data, &decrypted[..]);
    }
}