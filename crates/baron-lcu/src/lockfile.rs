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

/// Returns standard candidate lockfile paths across OS environments.
pub fn candidate_lockfile_paths() -> Vec<PathBuf> {
    // ponytail: static standard locations; future upgrade can query OS process list
    vec![
        PathBuf::from(r"C:\Riot Games\League of Legends\lockfile"),
        PathBuf::from(r"D:\Riot Games\League of Legends\lockfile"),
        PathBuf::from("/Applications/League of Legends.app/Contents/LoL/lockfile"),
    ]
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
}
