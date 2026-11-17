use std::path::PathBuf;
use thiserror::Error;

/// LCU and Live Client service errors.
#[derive(Debug, Error, PartialEq, Eq)]
pub enum LcuError {
    #[error("invalid lockfile format: {0}")]
    InvalidLockfile(String),
    #[error("invalid live client payload: {0}")]
    InvalidLivePayload(String),
}

/// Parsed League Client lockfile credentials for local 127.0.0.1 LCU connection.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LcuLockfile {
    pub process_name: String,
    pub pid: u32,
    pub port: u16,
    pub auth_token: String,
    pub protocol: String,
}

impl LcuLockfile {
    /// Parses colon-delimited lockfile content: `<process_name>:<pid>:<port>:<token>:<protocol>`.
    pub fn parse(raw: &str) -> Result<Self, LcuError> {
        let parts: Vec<&str> = raw.trim().split(':').collect();
        if parts.len() != 5 {
            return Err(LcuError::InvalidLockfile(format!(
                "expected 5 tokens, got {}",
                parts.len()
            )));
        }
        let pid = parts[1]
            .parse::<u32>()
            .map_err(|e| LcuError::InvalidLockfile(format!("invalid pid: {e}")))?;
        let port = parts[2]
            .parse::<u16>()
            .map_err(|e| LcuError::InvalidLockfile(format!("invalid port: {e}")))?;

        Ok(Self {
            process_name: parts[0].to_string(),
            pid,
            port,
            auth_token: parts[3].to_string(),
            protocol: parts[4].to_string(),
        })
    }

    /// Full local base URL, e.g. "https://127.0.0.1:52184".
    pub fn base_url(&self) -> String {
        format!("{}://127.0.0.1:{}", self.protocol, self.port)
    }

    /// HTTP Basic Auth header value: "Basic <base64(riot:token)>".
    pub fn basic_auth_header(&self) -> String {
        // ponytail: pure std base64 encoder avoiding heavy external base64 crate
        let raw = format!("riot:{}", self.auth_token);
        format!("Basic {}", std_base64_encode(raw.as_bytes()))
    }
}

/// Extracts `product_install_full_path` from Riot Client metadata YAML if present.
fn parse_riot_install_yaml_lockfile(yaml_text: &str) -> Option<PathBuf> {
    for line in yaml_text.lines() {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix("product_install_full_path:") {
            let unquoted = rest.trim().trim_matches('"').trim_matches('\'').trim();
            if !unquoted.is_empty() {
                return Some(PathBuf::from(unquoted).join("lockfile"));
            }
        }
    }
    None
}

/// Returns candidate League of Legends lockfile paths across Windows drives, Riot metadata, and macOS.
pub fn candidate_lockfile_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();
    let meta_yaml = PathBuf::from(
        r"C:\ProgramData\Riot Games\Metadata\league_of_legends.live\league_of_legends.live.product_settings.yaml",
    );
    if let Ok(raw) = std::fs::read_to_string(&meta_yaml) {
        if let Some(p) = parse_riot_install_yaml_lockfile(&raw) {
            paths.push(p);
        }
    }
    paths.push(PathBuf::from(r"C:\Riot Games\League of Legends\lockfile"));
    paths.push(PathBuf::from(r"D:\Riot Games\League of Legends\lockfile"));
    paths.push(PathBuf::from(r"E:\Riot Games\League of Legends\lockfile"));
    paths.push(PathBuf::from(r"F:\Riot Games\League of Legends\lockfile"));
    paths.push(PathBuf::from(
        "/Applications/League of Legends.app/Contents/LoL/lockfile",
    ));
    paths
}

/// Maps a Riot LCU region/platform code (e.g., `NA1`, `EUW1`, `SG2`, `PH2`) to OP.GG MCP region code.
pub fn map_riot_region_to_opgg(region: &str) -> &'static str {
    match region.trim().to_ascii_uppercase().as_str() {
        "KR" => "KR",
        "NA" | "NA1" => "NA",
        "EUW" | "EUW1" => "EUW",
        "EUNE" | "EUN1" => "EUNE",
        "JP" | "JP1" => "JP",
        "OCE" | "OC1" => "OCE",
        "BR" | "BR1" => "BR",
        "LAN" | "LA1" => "LAN",
        "LAS" | "LA2" => "LAS",
        "TR" | "TR1" => "TR",
        "RU" => "RU",
        "TW" | "TW2" => "TW",
        "VN" | "VN2" => "VN",
        "ME" | "ME1" => "ME",
        "SEA" | "SG" | "SG2" | "PH" | "PH2" | "TH" | "TH2" | "ID" | "MY" => "SEA",
        _ => "KR",
    }
}

/// Minimal standard base64 encoder in pure Rust std.
pub fn std_base64_encode(input: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(input.len().div_ceil(3) * 4);
    for chunk in input.chunks(3) {
        let b0 = chunk[0];
        let b1 = chunk.get(1).copied().unwrap_or(0);
        let b2 = chunk.get(2).copied().unwrap_or(0);
        let triple = ((b0 as u32) << 16) | ((b1 as u32) << 8) | (b2 as u32);
        out.push(TABLE[((triple >> 18) & 0x3F) as usize] as char);
        out.push(TABLE[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            out.push(TABLE[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            out.push('=');
        }
        if chunk.len() > 2 {
            out.push(TABLE[(triple & 0x3F) as usize] as char);
        } else {
            out.push('=');
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lockfile_parse_and_auth() {
        let raw = "LeagueClient:13424:52184:f17b3d9c72e4:https\n";
        let lock = LcuLockfile::parse(raw).expect("valid lockfile parse");
        assert_eq!(lock.process_name, "LeagueClient");
        assert_eq!(lock.pid, 13424);
        assert_eq!(lock.port, 52184);
        assert_eq!(lock.auth_token, "f17b3d9c72e4");
        assert_eq!(lock.protocol, "https");
        assert_eq!(lock.base_url(), "https://127.0.0.1:52184");
        assert_eq!(lock.basic_auth_header(), "Basic cmlvdDpmMTdiM2Q5YzcyZTQ=");
    }

    #[test]
    fn test_lockfile_parse_malformed() {
        assert!(matches!(
            LcuLockfile::parse(""),
            Err(LcuError::InvalidLockfile(_))
        ));
        assert!(matches!(
            LcuLockfile::parse("one:two:three"),
            Err(LcuError::InvalidLockfile(_))
        ));
        assert!(matches!(
            LcuLockfile::parse("A:not_a_pid:52184:token:https"),
            Err(LcuError::InvalidLockfile(_))
        ));
        assert!(matches!(
            LcuLockfile::parse("A:123:not_a_port:token:https"),
            Err(LcuError::InvalidLockfile(_))
        ));
    }

    #[test]
    fn test_std_base64_vectors() {
        assert_eq!(std_base64_encode(b""), "");
        assert_eq!(std_base64_encode(b"f"), "Zg==");
        assert_eq!(std_base64_encode(b"fo"), "Zm8=");
        assert_eq!(std_base64_encode(b"foo"), "Zm9v");
        assert_eq!(std_base64_encode(b"riot:secret"), "cmlvdDpzZWNyZXQ=");
        assert!(!candidate_lockfile_paths().is_empty());
    }

    #[test]
    fn test_region_mapping_and_install_yaml() {
        assert_eq!(map_riot_region_to_opgg("KR"), "KR");
        assert_eq!(map_riot_region_to_opgg("NA1"), "NA");
        assert_eq!(map_riot_region_to_opgg("euw1"), "EUW");
        assert_eq!(map_riot_region_to_opgg("SG2"), "SEA");
        assert_eq!(map_riot_region_to_opgg("PH2"), "SEA");
        assert_eq!(map_riot_region_to_opgg("OC1"), "OCE");
        let parsed = parse_riot_install_yaml_lockfile(
            "product_install_full_path: \"D:/Riot Games/League of Legends\"\n",
        );
        assert_eq!(
            parsed,
            Some(PathBuf::from(r"D:/Riot Games/League of Legends").join("lockfile"))
        );
    }
}
