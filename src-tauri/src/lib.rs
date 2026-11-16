//! Baron Desktop Host (`src-tauri`): Tauri v2 IPC commands bridging pure-Rust
//! `baron-core`, `baron-db`, `baron-lcu`, and `baron-riot` to the Next.js frontend.

use baron_core::models::{CombatRadarMetrics, DashboardSampleData, LaneDiffAt14, Role};
use baron_core::{
    calculate_baron_score, compute_combat_radar, compute_lane_diff_at_minute,
    compute_team_gold_curve, sample_dashboard_data,
};
use baron_db::BaronDatabase;
use baron_lcu::{
    build_lcu_rune_page, candidate_lockfile_paths, evaluate_skin_collection, sample_owned_skins,
    LcuLockfile, LcuRunePagePayload, OwnedSkinEntry, SkinVaultSummary,
};
use baron_riot::{
    FallbackProvider, AVAILABLE_PATCHES, AVAILABLE_PERIODS, DEFAULT_FALLBACK_ORDER,
    LATEST_DDRAGON_VERSION, LATEST_PATCH,
};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

pub struct AppState {
    pub db: Mutex<BaronDatabase>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderMeta {
    pub id: String,
    pub label: String,
    pub role_tag: String,
    pub tier_list_url: String,
    pub sample_build_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LcuStatusDto {
    pub connected: bool,
    pub base_url: Option<String>,
    pub port: Option<u16>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BaronBootstrapPayload {
    pub app_title: String,
    pub latest_patch: String,
    pub ddragon_version: String,
    pub patches: Vec<String>,
    pub periods: Vec<String>,
    pub providers: Vec<ProviderMeta>,
    pub dashboard: DashboardSampleData,
    pub primary_baron_score: f64,
    pub lane_diff_14: Option<LaneDiffAt14>,
    pub gold_curve: Vec<(u32, i32)>,
    pub combat_radar: CombatRadarMetrics,
    pub skins: Vec<OwnedSkinEntry>,
    pub skin_summary: SkinVaultSummary,
    pub lcu_status: LcuStatusDto,
}

fn provider_id(p: FallbackProvider) -> &'static str {
    match p {
        FallbackProvider::OpGg => "opgg",
        FallbackProvider::UGg => "ugg",
        FallbackProvider::DpmLol => "dpmlol",
        FallbackProvider::Lolalytics => "lolalytics",
        FallbackProvider::MetaSrc => "metasrc",
        FallbackProvider::MerakiCdn => "merakicdn",
    }
}

pub fn build_providers_meta(patch: &str) -> Vec<ProviderMeta> {
    DEFAULT_FALLBACK_ORDER
        .iter()
        .copied()
        .enumerate()
        .map(|(idx, prov)| {
            let role_tag = match idx {
                0 => "Primary #1",
                1 => "Fallback #2",
                _ => "Fallback",
            };
            ProviderMeta {
                id: provider_id(prov).to_string(),
                label: prov.label().to_string(),
                role_tag: role_tag.to_string(),
                tier_list_url: prov.tier_list_endpoint_url(patch),
                sample_build_url: prov.build_endpoint_url(patch, "103", Role::Middle),
            }
        })
        .collect()
}

pub fn probe_local_lcu() -> LcuStatusDto {
    for path in candidate_lockfile_paths() {
        if let Ok(raw) = std::fs::read_to_string(&path) {
            if let Ok(lock) = LcuLockfile::parse(&raw) {
                return LcuStatusDto {
                    connected: true,
                    base_url: Some(lock.base_url()),
                    port: Some(lock.port),
                    message: format!("LCU Connected ({})", lock.process_name),
                };
            }
        }
    }
    LcuStatusDto {
        connected: false,
        base_url: None,
        port: None,
        message: "LCU Ready (Waiting for League Client)".to_string(),
    }
}

pub fn assemble_bootstrap_payload(patch: Option<&str>) -> BaronBootstrapPayload {
    let active_patch = patch.unwrap_or(LATEST_PATCH);
    let dashboard = sample_dashboard_data();
    let first_match = &dashboard.matches[0];
    let first_player = &first_match.participants[0];

    let primary_baron_score = calculate_baron_score(first_player);
    let lane_diff_14 = compute_lane_diff_at_minute(
        &first_match.timeline_samples,
        14,
        first_player.team_id,
        first_player.role,
    );
    let gold_curve = compute_team_gold_curve(&first_match.timeline_samples, first_player.team_id);
    let combat_radar = compute_combat_radar(first_player);
    let skins = sample_owned_skins();
    let skin_summary = evaluate_skin_collection(&skins);

    BaronBootstrapPayload {
        app_title: "Baron".to_string(),
        latest_patch: active_patch.to_string(),
        ddragon_version: LATEST_DDRAGON_VERSION.to_string(),
        patches: AVAILABLE_PATCHES.iter().map(|s| (*s).to_string()).collect(),
        periods: AVAILABLE_PERIODS.iter().map(|s| (*s).to_string()).collect(),
        providers: build_providers_meta(active_patch),
        dashboard,
        primary_baron_score,
        lane_diff_14,
        gold_curve,
        combat_radar,
        skins,
        skin_summary,
        lcu_status: probe_local_lcu(),
    }
}

#[tauri::command]
fn get_bootstrap_data(
    state: tauri::State<'_, AppState>,
    patch: Option<String>,
) -> Result<BaronBootstrapPayload, String> {
    let payload = assemble_bootstrap_payload(patch.as_deref());
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let _ = db.upsert_account(&payload.dashboard.account);
    Ok(payload)
}

#[tauri::command]
fn get_provider_endpoints(patch: String) -> Vec<ProviderMeta> {
    build_providers_meta(&patch)
}

#[tauri::command]
fn build_baron_rune_page_payload(
    champion_name: String,
    primary_style_id: i32,
    sub_style_id: i32,
    selected_perk_ids: [i32; 9],
) -> LcuRunePagePayload {
    build_lcu_rune_page(
        &champion_name,
        primary_style_id,
        sub_style_id,
        selected_perk_ids,
    )
}

#[tauri::command]
fn get_lcu_status() -> LcuStatusDto {
    probe_local_lcu()
}

pub fn run() {
    let db = BaronDatabase::open_in_memory().expect("failed to initialize baron.db");

    tauri::Builder::default()
        .manage(AppState { db: Mutex::new(db) })
        .invoke_handler(tauri::generate_handler![
            get_bootstrap_data,
            get_provider_endpoints,
            build_baron_rune_page_payload,
            get_lcu_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Baron Tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bootstrap_payload_uses_latest_patch_and_providers() {
        let payload = assemble_bootstrap_payload(None);
        assert_eq!(payload.app_title, "Baron");
        assert_eq!(payload.latest_patch, "16.22");
        assert_eq!(payload.patches.len(), 13);
        assert_eq!(payload.providers[0].label, "OP.GG");
        assert_eq!(payload.providers[1].label, "U.GG");
        assert!(payload.primary_baron_score > 0.0);
    }

    #[test]
    fn test_baron_rune_page_prefix() {
        let page = build_lcu_rune_page("Ashe", 8000, 8100, [8008; 9]);
        assert_eq!(page.name, "Baron: Ashe");
        assert!(page.current);
    }
}
