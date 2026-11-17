//! Baron Riot: Data Dragon / CommunityDragon CDN assets, Riot Web API (Match-V5), and Multi-Provider Fallback parsers.

pub mod assets;
pub mod fallback;
pub mod opgg_modes;
mod providers;
pub mod web_api;

pub use assets::*;
pub use fallback::*;
pub use opgg_modes::*;
pub use providers::meraki::{
    fetch_meraki_champion_detail, MerakiAbilitySpell, MerakiChampionDetail,
};
pub use providers::ugg::{fetch_ugg_champion_overview, UggBuildResponse, UggOptionStat};
pub use web_api::*;
