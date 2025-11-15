use std::ffi::{c_char, CString};
use std::ptr::null;

#[repr(C)]
pub struct I2PD_Config {
    pub data_dir: *const c_char,
    pub sam_port: u16,
    pub ipv4: bool,
    pub ipv6: bool,
}

extern "C" {
    fn i2pd_start(cfg: *const I2PD_Config) -> i32;
    fn i2pd_stop();
}

pub fn start(data_dir: &str, sam_port: u16) -> Result<(), i32> {
    let dir = CString::new(data_dir).unwrap();
    let cfg = I2PD_Config {
        data_dir: dir.as_ptr(),
        sam_port,
        ipv4: true,
        ipv6: false,
    };
    let rc = unsafe { i2pd_start(&cfg) };
    if rc == 0 { Ok(()) } else { Err(rc) }
}

pub fn stop() {
    unsafe { i2pd_stop() }
}
