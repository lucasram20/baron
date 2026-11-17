use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MerakiAbilitySpell {
    pub name: String,
    pub icon: String,
    pub cooldown: String,
    pub cost: String,
    pub resource: String,
    pub effects: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MerakiChampionDetail {
    pub id: u32,
    pub key: String,
    pub name: String,
    pub title: String,
    pub full_name: String,
    pub icon: String,
    pub resource: String,
    pub attack_type: String,
    pub adaptive_type: String,
    pub patch_last_changed: String,
    pub release_patch: String,
    pub positions: Vec<String>,
    pub roles: Vec<String>,
    pub lore: String,
    pub stats: Value,
    pub abilities: BTreeMap<String, Vec<MerakiAbilitySpell>>,
    pub endpoint_url: String,
}

fn string_vec(v: Option<&Value>) -> Vec<String> {
    v.and_then(|x| x.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|s| s.as_str().map(str::to_string))
                .collect()
        })
        .unwrap_or_default()
}

/// Format Meraki CDN cooldown/cost modifier blocks cleanly into human-readable summary strings.
fn format_metric_block(v: Option<&Value>) -> String {
    let Some(modifiers) = v
        .and_then(|x| x.get("modifiers"))
        .and_then(|m| m.as_array())
    else {
        return String::new();
    };
    let mut parts = Vec::new();
    for m in modifiers {
        let values = m
            .get("values")
            .and_then(|x| x.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|n| {
                        n.as_f64().map(|f| {
                            if (f - f.round()).abs() < 0.01 {
                                format!("{}", f.round() as i64)
                            } else {
                                format!("{f:.1}")
                            }
                        })
                    })
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();
        if !values.is_empty() {
            let unit = m
                .get("units")
                .and_then(|u| u.as_array())
                .and_then(|a| a.first())
                .and_then(|s| s.as_str())
                .unwrap_or("");
            parts.push(format!("{}{}", values.join("/"), unit));
        }
    }
    parts.join(" ")
}

/// Parse Meraki Analytics CDN champion JSON payload (`.../champions/{Key}.json`).
pub fn parse_meraki_champion_json(
    json: &Value,
    fallback_key: &str,
    endpoint_url: &str,
) -> Result<MerakiChampionDetail, String> {
    let id = json
        .get("id")
        .and_then(|v| v.as_u64())
        .map(|v| v as u32)
        .ok_or_else(|| "Meraki champion payload missing numeric id".to_string())?;
    let key = json
        .get("key")
        .and_then(|v| v.as_str())
        .unwrap_or(fallback_key)
        .to_string();
    let name = json
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or(&key)
        .to_string();

    let mut abilities = BTreeMap::new();
    if let Some(ab_map) = json.get("abilities").and_then(|v| v.as_object()) {
        for slot in ["P", "Q", "W", "E", "R"] {
            if let Some(forms) = ab_map.get(slot).and_then(|v| v.as_array()) {
                let parsed_forms = forms
                    .iter()
                    .map(|form| {
                        let effects = form
                            .get("effects")
                            .and_then(|v| v.as_array())
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|e| {
                                        e.get("description")
                                            .and_then(|d| d.as_str())
                                            .map(str::to_string)
                                    })
                                    .collect()
                            })
                            .unwrap_or_default();
                        MerakiAbilitySpell {
                            name: form
                                .get("name")
                                .and_then(|s| s.as_str())
                                .unwrap_or_default()
                                .to_string(),
                            icon: form
                                .get("icon")
                                .and_then(|s| s.as_str())
                                .unwrap_or_default()
                                .to_string(),
                            cooldown: format_metric_block(form.get("cooldown")),
                            cost: format_metric_block(form.get("cost")),
                            resource: form
                                .get("resource")
                                .and_then(|s| s.as_str())
                                .unwrap_or_default()
                                .to_string(),
                            effects,
                        }
                    })
                    .collect::<Vec<_>>();
                abilities.insert(slot.to_string(), parsed_forms);
            }
        }
    }

    Ok(MerakiChampionDetail {
        id,
        key,
        name,
        title: json
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        full_name: json
            .get("fullName")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        icon: json
            .get("icon")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        resource: json
            .get("resource")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        attack_type: json
            .get("attackType")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        adaptive_type: json
            .get("adaptiveType")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        patch_last_changed: json
            .get("patchLastChanged")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        release_patch: json
            .get("releasePatch")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        positions: string_vec(json.get("positions")),
        roles: string_vec(json.get("roles")),
        lore: json
            .get("lore")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string(),
        stats: json.get("stats").cloned().unwrap_or(Value::Null),
        abilities,
        endpoint_url: endpoint_url.to_string(),
    })
}

/// Fetch static & formula-rich champion data from Meraki Analytics CDN (`cdn.merakianalytics.com`).
pub fn fetch_meraki_champion_detail(champion_key: &str) -> Result<MerakiChampionDetail, String> {
    let key = champion_key.trim();
    if key.is_empty() {
        return Err("Champion key cannot be empty".to_string());
    }
    let url = format!(
        "https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/{key}.json"
    );
    let json = crate::providers::http_get_json(&url)?;
    parse_meraki_champion_json(&json, key, &url)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_meraki_champion_kit() {
        let sample = serde_json::json!({
            "id": 54,
            "key": "Malphite",
            "name": "Malphite",
            "title": "Shard of the Monolith",
            "resource": "MANA",
            "attackType": "MELEE",
            "adaptiveType": "MAGIC_DAMAGE",
            "patchLastChanged": "16.18",
            "positions": ["TOP"],
            "roles": ["TANK", "MAGE"],
            "abilities": {
                "Q": [{
                    "name": "Seismic Shard",
                    "icon": "https://cdn.communitydragon.org/latest/champion/Malphite/ability-icon/q",
                    "cooldown": { "modifiers": [{ "values": [8, 8, 8, 8, 8], "units": [""] }] },
                    "cost": { "modifiers": [{ "values": [70, 75, 80, 85, 90], "units": [""] }] },
                    "effects": [{ "description": "Active: Deals magic damage and slows." }]
                }]
            }
        });
        let detail =
            parse_meraki_champion_json(&sample, "Malphite", "https://cdn.merakianalytics.com/test")
                .unwrap();
        assert_eq!(detail.id, 54);
        assert_eq!(detail.key, "Malphite");
        assert_eq!(detail.attack_type, "MELEE");
        assert_eq!(detail.abilities["Q"][0].name, "Seismic Shard");
        assert_eq!(detail.abilities["Q"][0].cost, "70/75/80/85/90");
    }
}
