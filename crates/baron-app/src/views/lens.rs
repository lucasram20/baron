//! Screen 3: `⚔ Post-game` — Match Hero Banner, 5-Metric Strip, Interactive Tabs
//! (`Scoreboard | Loadout | Details | Advanced`), 10-Player Scoreboard with Damage Bars &
//! Circular Score Rings, and `@14m` Timeline Charts (DPM v1.8.1).

use gpui_kit::component::chart::{AreaChart, RadarChart};
use gpui_kit::*;

use crate::rune_ui::{champ_square_avatar, item_tile, rune_medallion, score_ring_medallion};
use crate::theme;
use crate::workspace::{format_gold_diff, BaronWorkspace};

#[derive(Clone, Debug, PartialEq)]
pub struct GoldPoint {
    pub label: String,
    pub value: f64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct RadarAxisPoint {
    pub axis: String,
    pub score: f64,
}

struct ScoreboardRowSpec {
    place: &'static str,
    is_mvp: bool,
    is_ace: bool,
    is_you: bool,
    champ: &'static str,
    level: u8,
    name: &'static str,
    tag: &'static str,
    rank_badge: &'static str,
    k: i32,
    d: i32,
    a: i32,
    kda_kp: &'static str,
    cs_top: &'static str,
    cs_sub: &'static str,
    dmg_label: &'static str,
    dmg_ratio: f32,
    score: f64,
    blue_side: bool,
}

pub fn render(
    ws: &BaronWorkspace,
    _: &mut Window,
    cx: &Context<BaronWorkspace>,
) -> impl IntoElement {
    let m = &ws.data.matches[0];
    let p = &m.participants[0];
    let lane_diff =
        baron_core::compute_lane_diff_at_minute(&m.timeline_samples, 14, p.team_id, p.role);

    div()
        .flex()
        .flex_col()
        .gap_3()
        .child(render_postgame_hero())
        .child(render_postgame_metrics_strip())
        .child(render_postgame_tabs(ws, cx))
        .child(render_full_scoreboard())
        .child(render_timeline_charts(m, p, lane_diff))
}

fn render_postgame_hero() -> impl IntoElement {
    div()
        .p_4()
        .rounded_lg()
        .bg(theme::color(theme::BG_SURFACE))
        .border_1()
        .border_color(theme::color(theme::BORDER_SUBTLE))
        .flex()
        .flex_row()
        .items_center()
        .justify_between()
        .child(
            div()
                .flex()
                .flex_row()
                .items_center()
                .gap_3()
                .child(champ_square_avatar("Ahri", Some(17), false))
                .child(
                    div()
                        .flex()
                        .flex_col()
                        .gap_1()
                        .child(item_tile("FL", theme::MVP_GOLD, None))
                        .child(item_tile("IG", theme::DEFEAT_RED, None)),
                )
                .child(rune_medallion("EL", theme::DEFEAT_RED, true, false))
                .child(
                    div()
                        .flex()
                        .flex_col()
                        .gap_1()
                        .child(
                            div()
                                .flex()
                                .flex_row()
                                .items_center()
                                .gap_2()
                                .child(
                                    div()
                                        .text_base()
                                        .font_weight(FontWeight::BOLD)
                                        .child("Nyx #DPM"),
                                )
                                .child(
                                    div()
                                        .px_2()
                                        .py(px(1.))
                                        .rounded_sm()
                                        .bg(theme::color_alpha(theme::VICTORY_BLUE, 0.22))
                                        .border_1()
                                        .border_color(theme::color(theme::VICTORY_BLUE))
                                        .text_xs()
                                        .font_weight(FontWeight::BOLD)
                                        .text_color(theme::color(theme::CHALLENGER_CYAN))
                                        .child("❖ D4"),
                                ),
                        )
                        .child(
                            div()
                                .text_xs()
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child(
                                    "Ahri   •   Ranked Solo/Duo   •   33:07   •   6 minutes ago",
                                ),
                        ),
                ),
        )
        .child(
            div()
                .flex()
                .flex_row()
                .items_center()
                .gap_4()
                .child(score_ring_medallion(75.0, true))
                .child(
                    div()
                        .flex()
                        .flex_col()
                        .items_end()
                        .child(
                            div()
                                .text_lg()
                                .font_weight(FontWeight::BOLD)
                                .text_color(theme::color(theme::VICTORY_BLUE))
                                .child("Victory"),
                        )
                        .child(
                            div()
                                .text_xs()
                                .font_weight(FontWeight::BOLD)
                                .text_color(theme::color(theme::CHALLENGER_CYAN))
                                .child("+21 LP"),
                        ),
                ),
        )
}

fn render_postgame_metrics_strip() -> impl IntoElement {
    let metrics = [
        ("9 / 4 / 8", "4.25 KDA"),
        ("55%", "Kill participation"),
        ("8.1", "CS / min · 267 total"),
        ("35.1k", "Damage · 27% of team"),
        ("25", "Vision score"),
    ];

    div()
        .rounded_lg()
        .bg(theme::color(theme::BG_SURFACE))
        .border_1()
        .border_color(theme::color(theme::BORDER_SUBTLE))
        .flex()
        .flex_row()
        .children(metrics.into_iter().enumerate().map(|(i, (val, sub))| {
            let mut cell = div()
                .flex_1()
                .p_3()
                .flex()
                .flex_col()
                .gap_1()
                .child(
                    div()
                        .text_base()
                        .font_weight(FontWeight::BOLD)
                        .text_color(theme::color(theme::TEXT_PRIMARY))
                        .child(val),
                )
                .child(
                    div()
                        .text_xs()
                        .text_color(theme::color(theme::TEXT_FAINT))
                        .child(sub),
                );
            if i < 4 {
                cell = cell
                    .border_r_1()
                    .border_color(theme::color(theme::BORDER_SUBTLE));
            }
            cell
        }))
}

fn render_postgame_tabs(ws: &BaronWorkspace, cx: &Context<BaronWorkspace>) -> impl IntoElement {
    let tabs = ["⚔  Scoreboard", "🛡  Loadout", "📊  Details", "📈  Advanced"];

    div()
        .border_b_1()
        .border_color(theme::color(theme::BORDER_SUBTLE))
        .flex()
        .flex_row()
        .gap_6()
        .children(tabs.into_iter().enumerate().map(|(idx, label)| {
            let active = ws.postgame_tab_idx == idx;
            div()
                .id(SharedString::from(format!("postgame-tab-{idx}")))
                .pb_2()
                .border_b_2()
                .border_color(if active {
                    theme::color(theme::VICTORY_BLUE)
                } else {
                    theme::color_alpha(theme::BG_CANVAS, 0.0)
                })
                .text_xs()
                .font_weight(if active {
                    FontWeight::BOLD
                } else {
                    FontWeight::MEDIUM
                })
                .text_color(theme::color(if active {
                    theme::TEXT_PRIMARY
                } else {
                    theme::TEXT_SECONDARY
                }))
                .cursor_pointer()
                .on_click(cx.listener(move |this, _, _, cx| {
                    this.postgame_tab_idx = idx;
                    cx.notify();
                }))
                .child(label)
        }))
}

fn render_full_scoreboard() -> impl IntoElement {
    let blue_rows = [
        ScoreboardRowSpec {
            place: "5th",
            is_mvp: false,
            is_ace: false,
            is_you: false,
            champ: "Aatrox",
            level: 17,
            name: "Kaneki",
            tag: "#EUW",
            rank_badge: "E2",
            k: 5,
            d: 5,
            a: 9,
            kda_kp: "2.80 KDA · 45% KP",
            cs_top: "7.2",
            cs_sub: "239 CS",
            dmg_label: "26.8k dmg",
            dmg_ratio: 0.67,
            score: 66.0,
            blue_side: true,
        },
        ScoreboardRowSpec {
            place: "3rd",
            is_mvp: false,
            is_ace: false,
            is_you: false,
            champ: "Viego",
            level: 16,
            name: "moonlightjg",
            tag: "#EUW",
            rank_badge: "D4",
            k: 5,
            d: 5,
            a: 13,
            kda_kp: "3.60 KDA · 58% KP",
            cs_top: "5.9",
            cs_sub: "194 CS",
            dmg_label: "20.4k dmg",
            dmg_ratio: 0.51,
            score: 76.0,
            blue_side: true,
        },
        ScoreboardRowSpec {
            place: "4th",
            is_mvp: false,
            is_ace: false,
            is_you: true,
            champ: "Ahri",
            level: 17,
            name: "Nyx",
            tag: "#DPM",
            rank_badge: "D4",
            k: 9,
            d: 4,
            a: 8,
            kda_kp: "4.25 KDA · 55% KP",
            cs_top: "8.1",
            cs_sub: "267 CS",
            dmg_label: "35.1k dmg",
            dmg_ratio: 0.88,
            score: 75.0,
            blue_side: true,
        },
        ScoreboardRowSpec {
            place: "MVP",
            is_mvp: true,
            is_ace: false,
            is_you: false,
            champ: "Jinx",
            level: 17,
            name: "Kaisaki",
            tag: "#EUW",
            rank_badge: "E2",
            k: 10,
            d: 4,
            a: 8,
            kda_kp: "4.50 KDA · 58% KP",
            cs_top: "8.8",
            cs_sub: "292 CS",
            dmg_label: "39.8k dmg",
            dmg_ratio: 1.0,
            score: 86.0,
            blue_side: true,
        },
        ScoreboardRowSpec {
            place: "2nd",
            is_mvp: false,
            is_ace: false,
            is_you: false,
            champ: "Nautilus",
            level: 14,
            name: "wardenpls",
            tag: "#EUW",
            rank_badge: "E3",
            k: 2,
            d: 6,
            a: 22,
            kda_kp: "4.00 KDA · 77% KP",
            cs_top: "62",
            cs_sub: "vision",
            dmg_label: "9.8k dmg",
            dmg_ratio: 0.25,
            score: 82.0,
            blue_side: true,
        },
    ];

    let red_rows = [
        ScoreboardRowSpec {
            place: "7th",
            is_mvp: false,
            is_ace: false,
            is_you: false,
            champ: "K'Sante",
            level: 16,
            name: "Zephyr",
            tag: "#EUW",
            rank_badge: "E1",
            k: 5,
            d: 6,
            a: 7,
            kda_kp: "2.00 KDA · 50% KP",
            cs_top: "6.9",
            cs_sub: "227 CS",
            dmg_label: "21.2k dmg",
            dmg_ratio: 0.53,
            score: 44.0,
            blue_side: false,
        },
        ScoreboardRowSpec {
            place: "10th",
            is_mvp: false,
            is_ace: false,
            is_you: false,
            champ: "Lee Sin",
            level: 15,
            name: "insecking",
            tag: "#EUW",
            rank_badge: "E3",
            k: 4,
            d: 7,
            a: 10,
            kda_kp: "2.00 KDA · 58% KP",
            cs_top: "5.0",
            cs_sub: "164 CS",
            dmg_label: "17.6k dmg",
            dmg_ratio: 0.44,
            score: 28.0,
            blue_side: false,
        },
        ScoreboardRowSpec {
            place: "8th",
            is_mvp: false,
            is_ace: false,
            is_you: false,
            champ: "Orianna",
            level: 16,
            name: "Clockwork",
            tag: "#EUW",
            rank_badge: "D4",
            k: 6,
            d: 6,
            a: 8,
            kda_kp: "2.33 KDA · 58% KP",
            cs_top: "7.5",
            cs_sub: "248 CS",
            dmg_label: "31.5k dmg",
            dmg_ratio: 0.79,
            score: 42.0,
            blue_side: false,
        },
        ScoreboardRowSpec {
            place: "ACE",
            is_mvp: false,
            is_ace: true,
            is_you: false,
            champ: "Caitlyn",
            level: 17,
            name: "Piltover",
            tag: "#EUW",
            rank_badge: "E2",
            k: 9,
            d: 5,
            a: 6,
            kda_kp: "3.00 KDA · 63% KP",
            cs_top: "8.2",
            cs_sub: "270 CS",
            dmg_label: "33.9k dmg",
            dmg_ratio: 0.85,
            score: 53.0,
            blue_side: false,
        },
        ScoreboardRowSpec {
            place: "9th",
            is_mvp: false,
            is_ace: false,
            is_you: false,
            champ: "Lulu",
            level: 14,
            name: "pyxlyx",
            tag: "#EUW",
            rank_badge: "D4",
            k: 0,
            d: 7,
            a: 19,
            kda_kp: "2.71 KDA · 79% KP",
            cs_top: "54",
            cs_sub: "vision",
            dmg_label: "6.4k dmg",
            dmg_ratio: 0.16,
            score: 41.0,
            blue_side: false,
        },
    ];

    div()
        .rounded_lg()
        .bg(theme::color(theme::BG_SURFACE))
        .border_1()
        .border_color(theme::color(theme::BORDER_SUBTLE))
        .overflow_hidden()
        .flex()
        .flex_col()
        // Blue Team Header
        .child(render_team_header(
            true,
            "Victory",
            "Blue side",
            "♜ 8   ⛫ 3   👑 1   🐉 2   👾 1",
            "31 / 24 / 60 KDA   •   68.5k gold",
        ))
        .children(blue_rows.into_iter().map(render_scoreboard_row))
        // Red Team Header
        .child(render_team_header(
            false,
            "Defeat",
            "Red side",
            "♜ 5   ⛫ 0   👑 0   🐉 2   👾 0",
            "24 / 31 / 50 KDA   •   63.2k gold",
        ))
        .children(red_rows.into_iter().map(render_scoreboard_row))
}

fn render_team_header(
    blue: bool,
    outcome: &'static str,
    side_label: &'static str,
    objectives: &'static str,
    totals: &'static str,
) -> impl IntoElement {
    let accent = if blue {
        theme::VICTORY_BLUE
    } else {
        theme::DEFEAT_RED
    };

    div()
        .px_4()
        .py_2()
        .bg(theme::color_alpha(accent, 0.12))
        .border_b_1()
        .border_color(theme::color(theme::BORDER_SUBTLE))
        .flex()
        .flex_row()
        .items_center()
        .justify_between()
        .text_xs()
        .child(
            div()
                .flex()
                .flex_row()
                .items_center()
                .gap_2()
                .child(
                    div()
                        .font_weight(FontWeight::BOLD)
                        .text_color(theme::color(accent))
                        .child(outcome),
                )
                .child(
                    div()
                        .text_color(theme::color(theme::TEXT_SECONDARY))
                        .child(side_label),
                ),
        )
        .child(
            div()
                .text_color(theme::color(theme::TEXT_SECONDARY))
                .child(objectives),
        )
        .child(
            div()
                .font_weight(FontWeight::SEMIBOLD)
                .text_color(theme::color(theme::TEXT_PRIMARY))
                .child(totals),
        )
}

fn render_scoreboard_row(r: ScoreboardRowSpec) -> impl IntoElement {
    let row_bg = if r.is_you {
        theme::color_alpha(theme::VICTORY_BLUE, 0.12)
    } else {
        theme::color(theme::BG_SURFACE)
    };
    let bar_col = if r.blue_side {
        theme::VICTORY_BLUE
    } else {
        theme::DEFEAT_RED
    };

    let place_pill = if r.is_mvp {
        div()
            .px_2()
            .py(px(2.))
            .rounded_sm()
            .bg(theme::color_alpha(theme::MVP_GOLD, 0.22))
            .border_1()
            .border_color(theme::color(theme::MVP_GOLD))
            .text_xs()
            .font_weight(FontWeight::BOLD)
            .text_color(theme::color(theme::MVP_GOLD))
            .child("MVP")
    } else if r.is_ace {
        div()
            .px_2()
            .py(px(2.))
            .rounded_sm()
            .bg(theme::color_alpha(theme::ACE_PURPLE, 0.22))
            .border_1()
            .border_color(theme::color(theme::ACE_PURPLE))
            .text_xs()
            .font_weight(FontWeight::BOLD)
            .text_color(theme::color(theme::ACE_PURPLE))
            .child("ACE")
    } else {
        div()
            .text_xs()
            .text_color(theme::color(theme::TEXT_FAINT))
            .child(r.place)
    };

    div()
        .h(px(54.))
        .px_3()
        .bg(row_bg)
        .border_b_1()
        .border_color(theme::color(theme::BORDER_MUTED))
        .flex()
        .flex_row()
        .items_center()
        .justify_between()
        // Placement / MVP / ACE
        .child(div().w(px(48.)).child(place_pill))
        // Champion + Spells + Player Identity
        .child(
            div()
                .w(px(250.))
                .flex()
                .flex_row()
                .items_center()
                .gap_2()
                .child(champ_square_avatar(r.champ, Some(r.level), true))
                .child(
                    div()
                        .flex()
                        .flex_col()
                        .child(
                            div()
                                .flex()
                                .flex_row()
                                .items_center()
                                .gap_1()
                                .child(
                                    div()
                                        .text_xs()
                                        .font_weight(FontWeight::BOLD)
                                        .text_color(theme::color(theme::TEXT_PRIMARY))
                                        .child(r.name),
                                )
                                .child(
                                    div()
                                        .text_xs()
                                        .text_color(theme::color(theme::TEXT_FAINT))
                                        .child(r.tag),
                                )
                                .children(r.is_you.then(|| {
                                    div()
                                        .px_1()
                                        .rounded_sm()
                                        .bg(theme::color_alpha(theme::ACCENT_PRIMARY, 0.3))
                                        .text_xs()
                                        .font_weight(FontWeight::BOLD)
                                        .text_color(theme::color(theme::ACCENT_SOFT))
                                        .child("YOU")
                                })),
                        )
                        .child(
                            div()
                                .text_xs()
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child(format!("{} · {}", r.rank_badge, r.champ)),
                        ),
                ),
        )
        // 6 Items strip
        .child(
            div()
                .w(px(196.))
                .flex()
                .flex_row()
                .items_center()
                .gap_1()
                .child(item_tile("I1", theme::ACCENT_PRIMARY, None))
                .child(item_tile("I2", theme::CHALLENGER_CYAN, None))
                .child(item_tile("I3", theme::MVP_GOLD, None))
                .child(item_tile("I4", theme::ACE_PURPLE, None))
                .child(item_tile("I5", theme::DEFEAT_RED, None))
                .child(item_tile("W", theme::POSITIVE_GREEN, None)),
        )
        // KDA + KP%
        .child(
            div()
                .w(px(130.))
                .flex()
                .flex_col()
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .items_center()
                        .gap_1()
                        .text_xs()
                        .font_weight(FontWeight::BOLD)
                        .child(format!("{} /", r.k))
                        .child(
                            div()
                                .text_color(theme::color(theme::DEFEAT_RED))
                                .child(format!("{}", r.d)),
                        )
                        .child(format!("/ {}", r.a)),
                )
                .child(
                    div()
                        .text_xs()
                        .text_color(theme::color(theme::TEXT_FAINT))
                        .child(r.kda_kp),
                ),
        )
        // CS / Vision
        .child(
            div()
                .w(px(74.))
                .flex()
                .flex_col()
                .child(
                    div()
                        .text_xs()
                        .font_weight(FontWeight::BOLD)
                        .child(r.cs_top),
                )
                .child(
                    div()
                        .text_xs()
                        .text_color(theme::color(theme::TEXT_FAINT))
                        .child(r.cs_sub),
                ),
        )
        // Damage + horizontal progress bar
        .child(
            div()
                .w(px(150.))
                .flex()
                .flex_col()
                .gap_1()
                .child(
                    div()
                        .text_xs()
                        .font_weight(FontWeight::BOLD)
                        .child(r.dmg_label),
                )
                .child(
                    div()
                        .w_full()
                        .h(px(5.))
                        .rounded_full()
                        .bg(theme::color(theme::BG_ELEVATED))
                        .overflow_hidden()
                        .child(
                            div()
                                .w(relative(r.dmg_ratio))
                                .h_full()
                                .bg(theme::color(bar_col)),
                        ),
                ),
        )
        // Circular Score Ring Medallion
        .child(score_ring_medallion(r.score, false))
}

fn render_timeline_charts(
    m: &baron_core::models::MatchSummary,
    p: &baron_core::models::ParticipantStats,
    diff: Option<baron_core::models::LaneDiffAt14>,
) -> impl IntoElement {
    let gold_diff = diff.map(|d| d.gold_diff).unwrap_or(0);
    let xp_diff = diff.map(|d| d.xp_diff).unwrap_or(0);
    let cs_diff = diff.map(|d| d.cs_diff).unwrap_or(0);

    let gold_curve = baron_core::compute_team_gold_curve(&m.timeline_samples, p.team_id);
    let gold_points: Vec<GoldPoint> = gold_curve
        .into_iter()
        .map(|(min, d)| GoldPoint {
            label: format!("{min}m"),
            value: d as f64,
        })
        .collect();

    let radar = baron_core::compute_combat_radar(p);
    let radar_metrics = vec![
        RadarAxisPoint {
            axis: "DPM".into(),
            score: radar.dpm_norm,
        },
        RadarAxisPoint {
            axis: "GPM".into(),
            score: radar.gpm_norm,
        },
        RadarAxisPoint {
            axis: "CS/m".into(),
            score: radar.cs_norm,
        },
        RadarAxisPoint {
            axis: "KP%".into(),
            score: radar.kp_norm,
        },
        RadarAxisPoint {
            axis: "Vision".into(),
            score: radar.vision_norm,
        },
        RadarAxisPoint {
            axis: "DMG/Gold".into(),
            score: radar.dmg_per_gold_norm,
        },
    ];

    div()
        .flex()
        .flex_row()
        .gap_3()
        .h(px(210.))
        .child(
            div()
                .flex_1()
                .p_3()
                .rounded_lg()
                .bg(theme::color(theme::BG_SURFACE))
                .border_1()
                .border_color(theme::color(theme::BORDER_SUBTLE))
                .flex()
                .flex_col()
                .gap_2()
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .justify_between()
                        .items_center()
                        .child(
                            div()
                                .text_xs()
                                .font_weight(FontWeight::BOLD)
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child("Team Gold Advantage & @14:00 Lane Differential"),
                        )
                        .child(
                            div()
                                .text_xs()
                                .font_weight(FontWeight::SEMIBOLD)
                                .text_color(theme::color(theme::POSITIVE_GREEN))
                                .child(format!(
                                    "Gold @14: {}  •  XP @14: {:+}  •  CS @14: {:+}",
                                    format_gold_diff(gold_diff),
                                    xp_diff,
                                    cs_diff
                                )),
                        ),
                )
                .child(
                    div().flex_1().w_full().child(
                        AreaChart::new(gold_points)
                            .x(|d| d.label.clone())
                            .y(|d| d.value)
                            .stroke(theme::color_alpha(theme::VICTORY_BLUE, 1.0))
                            .fill(theme::color_alpha(theme::VICTORY_BLUE, 0.25)),
                    ),
                ),
        )
        .child(
            div()
                .w(px(300.))
                .p_3()
                .rounded_lg()
                .bg(theme::color(theme::BG_SURFACE))
                .border_1()
                .border_color(theme::color(theme::BORDER_SUBTLE))
                .flex()
                .flex_col()
                .child(
                    div()
                        .text_xs()
                        .font_weight(FontWeight::BOLD)
                        .text_color(theme::color(theme::TEXT_SECONDARY))
                        .child("6-Axis Combat Profile"),
                )
                .child(
                    div().flex_1().w_full().child(
                        RadarChart::new(radar_metrics)
                            .label(|d| d.axis.clone())
                            .value(|d| d.score)
                            .stroke(theme::color_alpha(theme::ACCENT_PRIMARY, 1.0))
                            .fill(theme::color_alpha(theme::ACCENT_PRIMARY, 0.25)),
                    ),
                ),
        )
}
