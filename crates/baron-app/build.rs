fn main() {
    println!("cargo:rerun-if-changed=../../assets/logo/baron.ico");
    #[cfg(windows)]
    {
        let mut res = winresource::WindowsResource::new();
        res.set_icon("../../assets/logo/baron.ico");
        let _ = res.compile();
    }
}
