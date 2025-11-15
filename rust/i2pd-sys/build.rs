use cmake::Config;

fn main() {
    // 1. clone i2pd (lightweight, no GUI, no UPnP)
    let dst = Config::new("i2pd")
        .define("WITH_BINARY", "OFF")
        .define("WITH_LIBRARY", "ON")
        .define("WITH_UPNP", "OFF")
        .define("WITH_HARDENING", "ON")
        .build();

    // 2. tell cargo to link static lib
    println!("cargo:rustc-link-search=native={}/lib", dst.display());
    println!("cargo:rustc-link-lib=static=i2pd_client");
    println!("cargo:rustc-link-lib=stdc++");
}
