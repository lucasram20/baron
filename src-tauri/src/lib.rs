//! Baron Desktop Host (`src-tauri`): Tauri v2 IPC commands bridging pure-Rust
//! `baron-core`, `baron-db`, `baron-lcu`, and live `baron-riot` OP.GG MCP endpoints.

use baron_core::models::{ChampionTierEntry, Role};
use baron_db::BaronDatabase;
use baron_lcu::{
    build_lcu_rune_page, fetch_lcu_owned_skins, fetch_lcu_player_context, import_rune_page_to_lcu,
    LcuPlayerContext, LcuRuneImportResult, LcuRunePagePayload, OwnedSkinEntry,
};
use baron_riot::{
    FallbackProvider, AVAILABLE_PATCHES, AVAILABLE_PERIODS, DEFAULT_FALLBACK_ORDER,
    LATEST_DDRAGON_VERSION, LATEST_PATCH,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

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
    pub lcu_status: LcuStatusDto,
    pub lcu_player: Option<LcuPlayerContext>,
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

fn status_from_player(player: Option<&LcuPlayerContext>) -> LcuStatusDto {
    if let Some(ctx) = player {
        let acct = if ctx.tag_line.is_empty() {
            ctx.game_name.clone()
        } else {
            format!("{}#{}", ctx.game_name, ctx.tag_line)
        };
        LcuStatusDto {
            connected: true,
            base_url: ctx.base_url.clone(),
            port: ctx.port,
            message: format!("LCU Connected ({acct} · {})", ctx.opgg_region),
        }
    } else {
        LcuStatusDto {
            connected: false,
            base_url: None,
            port: None,
            message: "LCU Offline (Start League Client to auto-sync)".to_string(),
        }
    }
}

pub fn probe_local_lcu() -> LcuStatusDto {
    let player = fetch_lcu_player_context();
    status_from_player(player.as_ref())
}

pub fn assemble_bootstrap_payload(patch: Option<&str>) -> BaronBootstrapPayload {
    let active_patch = patch.unwrap_or(LATEST_PATCH);
    let lcu_player = fetch_lcu_player_context();
    let lcu_status = status_from_player(lcu_player.as_ref());

    BaronBootstrapPayload {
        app_title: "Baron".to_string(),
        latest_patch: active_patch.to_string(),
        ddragon_version: LATEST_DDRAGON_VERSION.to_string(),
        patches: AVAILABLE_PATCHES.iter().map(|s| (*s).to_string()).collect(),
        periods: AVAILABLE_PERIODS.iter().map(|s| (*s).to_string()).collect(),
        providers: build_providers_meta(active_patch),
        lcu_status,
        lcu_player,
    }
}

#[tauri::command]
async fn get_bootstrap_data(
    state: tauri::State<'_, AppState>,
    patch: Option<String>,
) -> Result<BaronBootstrapPayload, String> {
    let _db = state.db.lock().map_err(|e| e.to_string())?;
    drop(_db);
    tauri::async_runtime::spawn_blocking(move || assemble_bootstrap_payload(patch.as_deref()))
        .await
        .map_err(|e| format!("Bootstrap task failed: {e}"))
}

#[tauri::command]
fn get_provider_endpoints(patch: String) -> Vec<ProviderMeta> {
    build_providers_meta(&patch)
}

#[tauri::command]
async fn get_provider_tier_list(
    provider: String,
    role: Role,
) -> Result<Vec<ChampionTierEntry>, String> {
    if provider != "opgg" {
        return Err("This provider has no verified tier-list integration".to_string());
    }
    tauri::async_runtime::spawn_blocking(move || baron_riot::fetch_opgg_tier_list(role))
        .await
        .map_err(|e| format!("Provider task failed: {e}"))?
}

#[tauri::command]
async fn get_opgg_champion_analysis(champion: String, role: Role) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        baron_riot::fetch_opgg_champion_analysis(&champion, role)
    })
    .await
    .map_err(|e| format!("OP.GG champion build task failed: {e}"))?
}

#[tauri::command]
async fn get_opgg_summoner_overview(
    game_name: String,
    tag_line: String,
    region: String,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let profile = baron_riot::fetch_opgg_summoner_profile(&game_name, &tag_line, &region)?;
        let matches = baron_riot::fetch_opgg_summoner_matches(&game_name, &tag_line, &region, 8)?;
        Ok(serde_json::json!({
            "profile": profile,
            "matches": matches,
        }))
    })
    .await
    .map_err(|e| format!("OP.GG summoner task failed: {e}"))?
}

#[tauri::command]
async fn get_opgg_game_detail(
    game_name: String,
    tag_line: String,
    region: String,
    game_id: String,
    created_at: String,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        baron_riot::fetch_opgg_game_detail(&game_name, &tag_line, &region, &game_id, &created_at)
    })
    .await
    .map_err(|e| format!("OP.GG match detail task failed: {e}"))?
}

#[tauri::command]
async fn get_opgg_leaderboard(region: String, champion: String) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        baron_riot::fetch_opgg_champion_leaderboard(&region, &champion)
    })
    .await
    .map_err(|e| format!("OP.GG leaderboard task failed: {e}"))?
}

#[tauri::command]
async fn get_opgg_discounted_skins() -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(baron_riot::fetch_opgg_discounted_skins)
        .await
        .map_err(|e| format!("OP.GG skins task failed: {e}"))?
}

#[tauri::command]
async fn get_opgg_esports_results() -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || baron_riot::fetch_opgg_esports_results(12))
        .await
        .map_err(|e| format!("OP.GG esports task failed: {e}"))?
}

#[tauri::command]
async fn get_opgg_matchup_guide(
    champion: String,
    opponent: String,
    role: Role,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        baron_riot::fetch_opgg_matchup_guide(&champion, &opponent, role)
    })
    .await
    .map_err(|e| format!("OP.GG matchup guide task failed: {e}"))?
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
async fn get_lcu_status() -> Result<LcuStatusDto, String> {
    tauri::async_runtime::spawn_blocking(probe_local_lcu)
        .await
        .map_err(|e| format!("LCU status task failed: {e}"))
}

#[tauri::command]
async fn get_lcu_player_context() -> Result<Option<LcuPlayerContext>, String> {
    tauri::async_runtime::spawn_blocking(fetch_lcu_player_context)
        .await
        .map_err(|e| format!("LCU player task failed: {e}"))
}

#[tauri::command]
async fn import_opgg_runes_to_lcu(
    champion_name: String,
    primary_style_id: i32,
    sub_style_id: i32,
    selected_perk_ids: [i32; 9],
) -> Result<LcuRuneImportResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        import_rune_page_to_lcu(
            &champion_name,
            primary_style_id,
            sub_style_id,
            selected_perk_ids,
        )
    })
    .await
    .map_err(|e| format!("LCU rune import task failed: {e}"))?
}

#[tauri::command]
async fn get_opgg_regions() -> Result<Vec<baron_riot::OpggRegionOption>, String> {
    tauri::async_runtime::spawn_blocking(baron_riot::fetch_opgg_supported_regions)
        .await
        .map_err(|e| format!("OP.GG regions task failed: {e}"))?
}

#[tauri::command]
async fn get_opgg_mode_tier_list(
    mode: String,
    role: Option<Role>,
    tier: Option<String>,
) -> Result<Vec<baron_riot::OpggModeTierEntry>, String> {
    let target_role = role.unwrap_or(Role::Unknown);
    let target_tier = tier.unwrap_or_else(|| "emerald_plus".to_string());
    tauri::async_runtime::spawn_blocking(move || {
        baron_riot::fetch_opgg_mode_tier_list(&mode, target_role, &target_tier)
    })
    .await
    .map_err(|e| format!("OP.GG mode tier list task failed: {e}"))?
}

#[tauri::command]
async fn get_opgg_champion_bundle(
    champion: String,
    mode: Option<String>,
    role: Option<Role>,
    tier: Option<String>,
    region: Option<String>,
) -> Result<Value, String> {
    let target_mode = mode.unwrap_or_else(|| "ranked".to_string());
    let target_role = role.unwrap_or(Role::Unknown);
    let target_tier = tier.unwrap_or_else(|| "emerald_plus".to_string());
    let target_region = region.unwrap_or_else(|| "NA".to_string());
    tauri::async_runtime::spawn_blocking(move || {
        baron_riot::fetch_opgg_champion_bundle(
            &champion,
            &target_mode,
            target_role,
            &target_tier,
            &target_region,
        )
    })
    .await
    .map_err(|e| format!("OP.GG champion bundle task failed: {e}"))?
}

#[tauri::command]
async fn get_ugg_champion_build(
    champion: String,
    patch: Option<String>,
    role: Option<Role>,
) -> Result<baron_riot::UggBuildResponse, String> {
    let target_patch = patch.unwrap_or_else(|| baron_riot::LATEST_PATCH.to_string());
    let target_role = role.unwrap_or(Role::Unknown);
    tauri::async_runtime::spawn_blocking(move || {
        baron_riot::fetch_ugg_champion_build(&champion, &target_patch, target_role)
    })
    .await
    .map_err(|e| format!("U.GG build task failed: {e}"))?
}

#[tauri::command]
async fn get_meraki_champion_kit(
    champion: String,
) -> Result<baron_riot::MerakiChampionDetail, String> {
    tauri::async_runtime::spawn_blocking(move || baron_riot::fetch_meraki_champion_kit(&champion))
        .await
        .map_err(|e| format!("Meraki kit task failed: {e}"))?
}

#[tauri::command]
async fn get_provider_diagnostics(
    patch: Option<String>,
) -> Result<Vec<baron_riot::ProviderDiagnostic>, String> {
    let target_patch = patch.unwrap_or_else(|| baron_riot::LATEST_PATCH.to_string());
    Ok(baron_riot::get_provider_diagnostics(&target_patch))
}

#[tauri::command]
async fn get_lcu_owned_skins() -> Result<Vec<OwnedSkinEntry>, String> {
    tauri::async_runtime::spawn_blocking(fetch_lcu_owned_skins)
        .await
        .map_err(|e| format!("LCU skins task failed: {e}"))?
}

fn show_main_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

pub fn run() {
    let db = BaronDatabase::open_in_memory().expect("failed to initialize baron.db");

    tauri::Builder::default()
        .manage(AppState { db: Mutex::new(db) })
        .setup(|app| {
            let icon = app.default_window_icon().cloned();
            if let (Some(win), Some(ico)) = (app.get_webview_window("main"), icon.as_ref()) {
                let _ = win.set_icon(ico.clone());
            }

            let show_item = MenuItem::with_id(app, "tray_show", "Show Baron", true, None::<&str>)?;
            let hide_item =
                MenuItem::with_id(app, "tray_hide", "Hide to Tray", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(app, "tray_quit", "Quit Baron", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &hide_item, &sep, &quit_item])?;

            let mut tray_builder = TrayIconBuilder::with_id("baron-tray")
                .menu(&menu)
                .tooltip("Baron")
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "tray_show" => show_main_window(app),
                    "tray_hide" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.hide();
                        }
                    }
                    "tray_quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                });

            if let Some(ico) = icon {
                tray_builder = tray_builder.icon(ico);
            }
            tray_builder.build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_bootstrap_data,
            get_provider_endpoints,
            get_provider_tier_list,
            get_opgg_champion_analysis,
            get_opgg_summoner_overview,
            get_opgg_game_detail,
            get_opgg_leaderboard,
            get_opgg_discounted_skins,
            get_opgg_esports_results,
            get_opgg_matchup_guide,
            get_opgg_regions,
            get_opgg_mode_tier_list,
            get_opgg_champion_bundle,
            get_ugg_champion_build,
            get_meraki_champion_kit,
            get_provider_diagnostics,
            build_baron_rune_page_payload,
            get_lcu_status,
            get_lcu_player_context,
            import_opgg_runes_to_lcu,
            get_lcu_owned_skins,
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
    }

    #[test]
    fn test_baron_rune_page_prefix() {
        let page = build_lcu_rune_page("Ashe", 8000, 8100, [8008; 9]);
        assert_eq!(page.name, "Baron: Ashe");
        assert!(page.current);
    }
}
