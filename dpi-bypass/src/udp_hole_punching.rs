// dpi-bypass/src/udp_hole_punching.rs
use std::net::{SocketAddr};
use std::time::{Duration};
use tokio::net::UdpSocket as TokioUdpSocket;
use tokio::time::{sleep, timeout};
use anyhow::{Result, Context};
use rand::Rng;

/// UDP hole punching for NAT traversal and DPI bypass
pub struct UDPHolePuncher {
    local_socket: Option<TokioUdpSocket>,
    peer_addresses: Vec<SocketAddr>,
    stun_servers: Vec<String>,
}

impl UDPHolePuncher {
    pub fn new() -> Self {
        Self {
            local_socket: None,
            peer_addresses: Vec::new(),
            stun_servers: vec![
                "stun.l.google.com:19302".to_string(),
                "stun1.l.google.com:19302".to_string(),
                "stun2.l.google.com:19302".to_string(),
                "stun.cloudflare.com:3478".to_string(),
            ],
        }
    }
    
    /// Establish UDP connection with hole punching
    pub async fn establish_connection(&mut self, target: &str) -> Result<()> {
        // Bind to random local port
        let local_socket = TokioUdpSocket::bind("0.0.0.0:0").await
            .context("Failed to bind UDP socket")?;
        
        // Discover external IP and port via STUN
        let external_addr = self.discover_external_address(&local_socket).await?;
        println!("Discovered external address: {}", external_addr);
        
        // Parse target address
        let target_addr: SocketAddr = target.parse()
            .context("Invalid target address")?;
        
        // Perform hole punching
        self.punch_hole(&local_socket, target_addr).await?;
        
        self.local_socket = Some(local_socket);
        self.peer_addresses.push(target_addr);
        
        Ok(())
    }
    
    /// Discover external IP address using STUN protocol
    async fn discover_external_address(&self, socket: &TokioUdpSocket) -> Result<SocketAddr> {
        for stun_server in &self.stun_servers {
            if let Ok(external_addr) = self.stun_request(socket, stun_server).await {
                return Ok(external_addr);
            }
        }
        
        Err(anyhow::anyhow!("Failed to discover external address via STUN"))
    }
    
    /// Send STUN binding request
    async fn stun_request(&self, socket: &TokioUdpSocket, stun_server: &str) -> Result<SocketAddr> {
        let server_addr: SocketAddr = stun_server.parse()
            .context("Invalid STUN server address")?;
        
        // Build STUN binding request
        let stun_packet = self.build_stun_binding_request();
        
        // Send request
        socket.send_to(&stun_packet, server_addr).await
            .context("Failed to send STUN request")?;
        
        // Receive response with timeout
        let mut buf = [0u8; 1024];
        let (len, _) = timeout(Duration::from_secs(5), socket.recv_from(&mut buf)).await
            .context("STUN request timeout")?
            .context("Failed to receive STUN response")?;
        
        // Parse STUN response to extract external address
        self.parse_stun_response(&buf[..len])
    }
    
    /// Build STUN binding request packet
    fn build_stun_binding_request(&self) -> Vec<u8> {
        let mut packet = Vec::new();
        
        // STUN header
        packet.extend_from_slice(&[0x00, 0x01]); // Binding Request
        packet.extend_from_slice(&[0x00, 0x00]); // Length (no attributes)
        
        // Magic cookie
        packet.extend_from_slice(&[0x21, 0x12, 0xa4, 0x42]);
        
        // Transaction ID (96 bits random)
        let mut rng = rand::thread_rng();
        for _ in 0..12 {
            packet.push(rng.gen());
        }
        
        packet
    }
    
    /// Parse STUN binding response to extract mapped address
    fn parse_stun_response(&self, data: &[u8]) -> Result<SocketAddr> {
        if data.len() < 20 {
            return Err(anyhow::anyhow!("STUN response too short"));
        }
        
        // Check STUN header
        if data[0] != 0x01 || data[1] != 0x01 {
            return Err(anyhow::anyhow!("Invalid STUN response type"));
        }
        
        let length = u16::from_be_bytes([data[2], data[3]]) as usize;
        let mut offset = 20; // Skip STUN header
        
        // Parse attributes
        while offset + 4 <= data.len() && offset < 20 + length {
            let attr_type = u16::from_be_bytes([data[offset], data[offset + 1]]);
            let attr_length = u16::from_be_bytes([data[offset + 2], data[offset + 3]]) as usize;
            
            if attr_type == 0x0001 && attr_length >= 8 { // MAPPED-ADDRESS
                let family = data[offset + 5];
                let port = u16::from_be_bytes([data[offset + 6], data[offset + 7]]);
                
                if family == 0x01 && attr_length >= 8 { // IPv4
                    let ip = std::net::Ipv4Addr::new(
                        data[offset + 8],
                        data[offset + 9],
                        data[offset + 10],
                        data[offset + 11],
                    );
                    return Ok(SocketAddr::new(ip.into(), port));
                }
            }
            
            offset += 4 + attr_length;
            // Align to 4-byte boundary
            offset = (offset + 3) & !3;
        }
        
        Err(anyhow::anyhow!("No mapped address found in STUN response"))
    }
    
    /// Perform UDP hole punching to target
    async fn punch_hole(&self, socket: &TokioUdpSocket, target: SocketAddr) -> Result<()> {
        let hole_punch_data = b"HOLE_PUNCH";
        
        // Send multiple packets with increasing intervals
        for attempt in 0..10 {
            socket.send_to(hole_punch_data, target).await
                .context("Failed to send hole punch packet")?;
            
            // Exponential backoff
            let delay = Duration::from_millis(100 * (1 << attempt.min(5)));
            sleep(delay).await;
        }
        
        // Try to receive acknowledgment
        let mut buf = [0u8; 1024];
        match timeout(Duration::from_secs(2), socket.recv_from(&mut buf)).await {
            Ok(Ok((len, addr))) => {
                if addr == target && &buf[..len] == b"HOLE_PUNCH_ACK" {
                    println!("Hole punching successful to {}", target);
                } else {
                    println!("Received unexpected data during hole punching");
                }
            }
            _ => {
                // No response, but hole might still be punched
                println!("No hole punch acknowledgment, but continuing");
            }
        }
        
        Ok(())
    }
    
    /// Send data through established UDP tunnel
    pub async fn send_data(&self, data: &[u8], target: SocketAddr) -> Result<()> {
        match &self.local_socket {
            Some(socket) => {
                socket.send_to(data, target).await
                    .context("Failed to send UDP data")?;
                Ok(())
            }
            None => Err(anyhow::anyhow!("No UDP socket established"))
        }
    }
    
    /// Receive data from UDP tunnel
    pub async fn receive_data(&self) -> Result<(Vec<u8>, SocketAddr)> {
        match &self.local_socket {
            Some(socket) => {
                let mut buf = [0u8; 65507]; // Max UDP payload
                let (len, addr) = socket.recv_from(&mut buf).await
                    .context("Failed to receive UDP data")?;
                
                Ok((buf[..len].to_vec(), addr))
            }
            None => Err(anyhow::anyhow!("No UDP socket established"))
        }
    }
    
    /// Keep UDP tunnel alive with periodic packets
    pub async fn keep_alive(&self) -> Result<()> {
        let keep_alive_data = b"KEEP_ALIVE";
        
        for peer in &self.peer_addresses {
            if let Some(socket) = &self.local_socket {
                socket.send_to(keep_alive_data, peer).await
                    .context("Failed to send keep-alive packet")?;
            }
        }
        
        Ok(())
    }
    
    /// Get local socket address
    pub fn local_addr(&self) -> Option<SocketAddr> {
        self.local_socket.as_ref()
            .and_then(|socket| socket.local_addr().ok())
    }
}

/// UDP packet wrapper for Obfs5 over UDP
pub struct Obfs5UDPPacket {
    pub sequence: u32,
    pub fragment: u16,
    pub total_fragments: u16,
    pub data: Vec<u8>,
}

impl Obfs5UDPPacket {
    pub fn new(sequence: u32, fragment: u16, total_fragments: u16, data: Vec<u8>) -> Self {
        Self {
            sequence,
            fragment,
            total_fragments,
            data,
        }
    }
    
    /// Serialize packet for transmission
    pub fn serialize(&self) -> Vec<u8> {
        let mut packet = Vec::new();
        packet.extend_from_slice(&self.sequence.to_be_bytes());
        packet.extend_from_slice(&self.fragment.to_be_bytes());
        packet.extend_from_slice(&self.total_fragments.to_be_bytes());
        packet.extend_from_slice(&(self.data.len() as u16).to_be_bytes());
        packet.extend_from_slice(&self.data);
        packet
    }
    
    /// Deserialize packet from received data
    pub fn deserialize(data: &[u8]) -> Result<Self> {
        if data.len() < 10 {
            return Err(anyhow::anyhow!("Packet too short"));
        }
        
        let sequence = u32::from_be_bytes([data[0], data[1], data[2], data[3]]);
        let fragment = u16::from_be_bytes([data[4], data[5]]);
        let total_fragments = u16::from_be_bytes([data[6], data[7]]);
        let data_len = u16::from_be_bytes([data[8], data[9]]) as usize;
        
        if data.len() < 10 + data_len {
            return Err(anyhow::anyhow!("Packet data truncated"));
        }
        
        let packet_data = data[10..10 + data_len].to_vec();
        
        Ok(Self::new(sequence, fragment, total_fragments, packet_data))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_stun_packet_building() {
        let puncher = UDPHolePuncher::new();
        let packet = puncher.build_stun_binding_request();
        
        // Verify STUN header
        assert_eq!(packet.len(), 20); // STUN header is 20 bytes
        assert_eq!(&packet[0..2], &[0x00, 0x01]); // Binding Request
        assert_eq!(&packet[4..8], &[0x21, 0x12, 0xa4, 0x42]); // Magic cookie
    }
    
    #[test]
    fn test_obfs5_udp_packet_serialization() {
        let packet = Obfs5UDPPacket::new(123, 1, 3, vec![0x01, 0x02, 0x03]);
        let serialized = packet.serialize();
        let deserialized = Obfs5UDPPacket::deserialize(&serialized).unwrap();
        
        assert_eq!(deserialized.sequence, 123);
        assert_eq!(deserialized.fragment, 1);
        assert_eq!(deserialized.total_fragments, 3);
        assert_eq!(deserialized.data, vec![0x01, 0x02, 0x03]);
    }
}