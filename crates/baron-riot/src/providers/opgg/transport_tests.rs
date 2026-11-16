use super::*;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::thread;
use std::time::Duration;

#[test]
fn requests_and_parses_mcp_tier_data() {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let url = format!("http://{}/mcp", listener.local_addr().unwrap());
    let server = thread::spawn(move || {
        for step in 0..3 {
            let (mut stream, _) = listener.accept().unwrap();
            stream
                .set_read_timeout(Some(Duration::from_secs(5)))
                .unwrap();
            let mut request = Vec::new();
            let mut chunk = [0; 4096];
            let body_start;
            loop {
                let count = stream.read(&mut chunk).unwrap();
                assert!(count > 0);
                request.extend_from_slice(&chunk[..count]);
                if let Some(index) = request.windows(4).position(|part| part == b"\r\n\r\n") {
                    body_start = index + 4;
                    break;
                }
            }
            let headers = String::from_utf8_lossy(&request[..body_start]).to_lowercase();
            let length: usize = headers
                .lines()
                .find_map(|line| line.strip_prefix("content-length:").map(str::trim))
                .unwrap()
                .parse()
                .unwrap();
            while request.len() < body_start + length {
                let count = stream.read(&mut chunk).unwrap();
                assert!(count > 0);
                request.extend_from_slice(&chunk[..count]);
            }
            let body: Value =
                serde_json::from_slice(&request[body_start..body_start + length]).unwrap();
            let response = match step {
                0 => {
                    assert_eq!(body["method"], "initialize");
                    r#"{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-06-18","capabilities":{},"serverInfo":{"name":"test","version":"1"}}}"#
                }
                1 => {
                    assert_eq!(body["method"], "notifications/initialized");
                    assert!(headers.contains("mcp-session-id: test-session"));
                    ""
                }
                _ => {
                    assert_eq!(body["method"], "tools/call");
                    assert_eq!(body["params"]["name"], "lol_list_lane_meta_champions");
                    assert_eq!(body["params"]["arguments"]["position"], "mid");
                    assert!(headers.contains("mcp-session-id: test-session"));
                    r#"{"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"class LolListLaneMetaChampions: data\nclass Data: positions\nclass Positions: mid\nclass Mid: champion,play,win_rate,pick_rate,ban_rate,tier,rank\n\nLolListLaneMetaChampions(Data(Positions([Mid(\"Ahri\",264030,0.51,0.11,0.04,1,1)])))"}]}}"#
                }
            };
            let status = if step == 1 { "202 Accepted" } else { "200 OK" };
            write!(stream, "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nMcp-Session-Id: test-session\r\nConnection: close\r\nContent-Length: {}\r\n\r\n{response}", response.len()).unwrap();
        }
    });
    let rows = fetch_tier_list_from(&url, Role::Middle).expect("MCP retrieval should succeed");
    server.join().unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].champion_name, "Ahri");
    assert_eq!(rows[0].role, Role::Middle);
}
