//! I2P Router Launcher
//! 
//! Provides zero-config embedded I2P router startup.
//! Automatically starts embedded i2pd if external SAM bridge is not available.

#[cfg(feature = "embedded")]
use i2pd_sys::{start, stop};
use std::net::TcpStream;
use std::path::PathBuf;

static mut ROUTER_HANDLE: Option<()> = None; // 0-cost, just flag

pub struct RouterGuard;

/// Ensure I2P router is available (embedded or external)
/// 
/// This function:
/// 1. Checks if external SAM bridge is reachable on port 7656
/// 2. If not, starts embedded i2pd router
/// 3. Waits up to 3 seconds for SAM to become ready
pub fn ensure_router() -> std::io::Result<()> {
    const SAM_PORT: u16 = 7656;
    
    // Fast check – SAM reachable?
    if TcpStream::connect(format!("127.0.0.1:{SAM_PORT}")).is_ok() {
        return Ok(());
    }
    
    #[cfg(feature = "embedded")]
    {
        // Not reachable → spawn embedded
        let data = PathBuf::from(
            dirs::data_local_dir()
                .ok_or_else(|| std::io::Error::new(
                    std::io::ErrorKind::NotFound, 
                    "Cannot determine local data directory"
                ))?
        ).join("privachain/i2p");
        
        std::fs::create_dir_all(&data)?;
        
        unsafe {
            if ROUTER_HANDLE.is_none() {
                start(data.to_str().unwrap(), SAM_PORT).map_err(|e| {
                    std::io::Error::new(std::io::ErrorKind::Other, format!("i2pd_start {}", e))
                })?;
                ROUTER_HANDLE = Some(());
                
                // Wait until SAM answers
                for _ in 0..30 {
                    if TcpStream::connect(format!("127.0.0.1:{SAM_PORT}")).is_ok() {
                        return Ok(());
                    }
                    std::thread::sleep(std::time::Duration::from_millis(100));
                }
                return Err(std::io::Error::new(std::io::ErrorKind::TimedOut, "SAM not ready"));
            }
        }
        Ok(())
    }
    
    #[cfg(not(feature = "embedded"))]
    {
        Err(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "I2P SAM bridge not reachable and embedded router not enabled. \
             Start i2pd externally or rebuild with --features embedded"
        ))
    }
}

impl Drop for RouterGuard {
    fn drop(&mut self) {
        #[cfg(feature = "embedded")]
        unsafe {
            if ROUTER_HANDLE.is_some() {
                stop();
                ROUTER_HANDLE = None;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ensure_router_when_external_available() {
        // This test will succeed if external I2P is running, or skip gracefully
        match ensure_router() {
            Ok(_) => {
                // Either external I2P was running, or embedded started successfully
            },
            Err(e) => {
                // Expected if no I2P and not compiled with embedded feature
                assert!(e.to_string().contains("not reachable") || e.to_string().contains("not enabled"));
            }
        }
    }
}
