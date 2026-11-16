use serde::{Deserialize, Serialize};

/// Exact JSON payload accepted by LCU `POST /lol-perks/v1/pages`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LcuRunePagePayload {
    pub name: String,
    pub primary_style_id: i32,
    pub sub_style_id: i32,
    pub selected_perk_ids: [i32; 9],
    pub current: bool,
}

/// Builds an auto-injected LCU rune page with prefix "Baron: <ChampionName>".
pub fn build_lcu_rune_page(
    champion_name: &str,
    primary_style_id: i32,
    sub_style_id: i32,
    selected_perk_ids: [i32; 9],
) -> LcuRunePagePayload {
    // ponytail: pure payload builder; LCU HTTP PATCH/POST dispatched by caller
    LcuRunePagePayload {
        name: format!("Baron: {champion_name}"),
        primary_style_id,
        sub_style_id,
        selected_perk_ids,
        current: true,
    }
}

/// Summoner spell selection for LCU `PATCH /lol-champ-select/v1/session/my-selection`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LcuSummonerSpellSelection {
    pub spell1_id: i32,
    pub spell2_id: i32,
}

/// Single item entry inside an LCU item block.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LcuItemSlot {
    pub id: String,
    pub count: u32,
}

/// Named block of items inside an in-game item set.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LcuItemBlock {
    #[serde(rename = "type")]
    pub block_type: String,
    pub items: Vec<LcuItemSlot>,
}

/// Custom item set payload for LCU `PUT /lol-item-sets/v1/item-sets/{summonerId}/sets`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LcuItemSetPayload {
    pub title: String,
    pub associated_champions: Vec<i32>,
    pub associated_maps: Vec<i32>,
    pub blocks: Vec<LcuItemBlock>,
}

/// Builds standard starting and core item sets for Summoner's Rift & Howling Abyss.
pub fn build_lcu_item_set(
    champion_id: i32,
    champion_name: &str,
    starter_ids: &[i32],
    core_ids: &[i32],
) -> LcuItemSetPayload {
    // ponytail: maps 11 (SR) & 12 (ARAM); situational items can append extra blocks
    let starters = starter_ids
        .iter()
        .map(|id| LcuItemSlot {
            id: id.to_string(),
            count: 1,
        })
        .collect();
    let cores = core_ids
        .iter()
        .map(|id| LcuItemSlot {
            id: id.to_string(),
            count: 1,
        })
        .collect();

    LcuItemSetPayload {
        title: format!("Baron: {champion_name}"),
        associated_champions: vec![champion_id],
        associated_maps: vec![11, 12],
        blocks: vec![
            LcuItemBlock {
                block_type: "Starting Items".to_string(),
                items: starters,
            },
            LcuItemBlock {
                block_type: "Core Build".to_string(),
                items: cores,
            },
        ],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_lcu_rune_page() {
        let perks = [8112, 8139, 8138, 8106, 8226, 8210, 5008, 5008, 5001];
        let page = build_lcu_rune_page("Ahri", 8100, 8200, perks);
        assert_eq!(page.name, "Baron: Ahri");
        assert!(page.current);

        let json = serde_json::to_string(&page).unwrap();
        assert!(json.contains("\"primaryStyleId\":8100"));
        assert!(json.contains("\"subStyleId\":8200"));
        assert!(json.contains("\"selectedPerkIds\":[8112"));
    }

    #[test]
    fn test_build_lcu_item_set() {
        let set = build_lcu_item_set(103, "Ahri", &[1056, 2003], &[6653, 3020, 3089]);
        assert_eq!(set.title, "Baron: Ahri");
        assert_eq!(set.associated_champions, vec![103]);
        assert_eq!(set.associated_maps, vec![11, 12]);
        assert_eq!(set.blocks.len(), 2);
        assert_eq!(set.blocks[0].block_type, "Starting Items");
        assert_eq!(set.blocks[1].items[0].id, "6653");

        let json = serde_json::to_string(&set).unwrap();
        assert!(json.contains("\"associatedChampions\":[103]"));
        assert!(json.contains("\"type\":\"Starting Items\""));
    }

    #[test]
    fn test_lcu_summoner_spells() {
        let spells = LcuSummonerSpellSelection {
            spell1_id: 4,
            spell2_id: 14,
        };
        let json = serde_json::to_string(&spells).unwrap();
        assert_eq!(json, "{\"spell1Id\":4,\"spell2Id\":14}");
    }
}
