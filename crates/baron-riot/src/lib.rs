//! Baron Riot: Data Dragon / CommunityDragon CDN assets, Riot Web API (Match-V5), and Multi-Provider Fallback parsers.

pub mod assets;
pub mod fallback;
pub mod opgg_modes;
mod providers;
pub mod web_api;

pub use assets::*;
pub use fallback::*;
pub use opgg_modes::*;
pub use providers::lolalytics::{
    fetch_lolalytics_champion_build, fetch_lolalytics_tier_list, lolalytics_champ_slug,
    LolalyticsBuildResponse, LolalyticsCounterEntry, LolalyticsItemBuild, LolalyticsRuneSet,
    LolalyticsSynergyEntry,
};
pub use providers::meraki::{
    fetch_meraki_champion_detail, MerakiAbilitySpell, MerakiChampionDetail,
};
pub use providers::ugg::{
    fetch_ugg_champion_overview, fetch_ugg_champion_overview_with_catalog, fetch_ugg_latest_patch,
    fetch_ugg_tier_list, UggBuildResponse, UggCounterEntry, UggOptionStat,
};
pub use web_api::*;
