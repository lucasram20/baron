use baron_core::models::Account;

/// Formats K/D/A as "kills/deaths/assists".
pub fn format_kda(kills: i32, deaths: i32, assists: i32) -> String {
    format!("{kills}/{deaths}/{assists}")
}

/// Formats KDA ratio as "{ratio}:1".
pub fn format_kda_ratio(kills: i32, deaths: i32, assists: i32) -> String {
    format!("{:.2}:1", (kills + assists) as f64 / deaths.max(1) as f64)
}

/// Formats a gold differential with sign: "+1450g" or "-620g".
pub fn format_gold_diff(diff: i32) -> String {
    if diff >= 0 {
        format!("+{diff}g")
    } else {
        format!("{diff}g")
    }
}

/// Tests whether an account matches a search query (by name or tag).
#[allow(dead_code)]
pub fn matches_search_query(account: &Account, query: &str) -> bool {
    let q = query.trim().to_lowercase();
    if q.is_empty() {
        return true;
    }
    let full = format!("{}#{}", account.game_name, account.tag_line).to_lowercase();
    full.contains(&q)
        || account.game_name.to_lowercase().contains(&q)
        || account.tag_line.to_lowercase().contains(&q)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_helpers_kda_and_gold() {
        assert_eq!(format_kda(10, 2, 8), "10/2/8");
        assert_eq!(format_kda_ratio(10, 2, 8), "9.00:1");
        assert_eq!(format_kda_ratio(3, 0, 3), "6.00:1");
        assert_eq!(format_gold_diff(1450), "+1450g");
        assert_eq!(format_gold_diff(-620), "-620g");
        assert_eq!(format_gold_diff(0), "+0g");
    }

    #[test]
    fn test_helpers_search_matching() {
        let acc = Account {
            puuid: "p1".into(),
            summoner_id: Some(1),
            game_name: "Hide on bush".into(),
            tag_line: "KR1".into(),
            platform_route: "kr".into(),
            profile_icon_id: 1,
            summoner_level: 600,
            is_local_account: true,
            updated_at: 0,
        };
        assert!(matches_search_query(&acc, "bush"));
        assert!(matches_search_query(&acc, "kr1"));
        assert!(matches_search_query(&acc, "Hide on bush#KR1"));
        assert!(!matches_search_query(&acc, "faker"));
    }
}
