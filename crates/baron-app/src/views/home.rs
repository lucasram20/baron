//! Screen 0: `Dashboard` (`Home`) — DPM.LOL 3-Column Discovery Bento (`16.22 Tierlist & Builds`,
//! `EUW / KR / NA` Challenger Leaderboard, LP Trajectory `AreaChart`) + Summoner Match Feed.

use baron_core::models::MatchSummary;
use gpui_kit::component::avatar::Avatar;
use gpui_kit::component::button::{Button, ButtonVariants as _};
use gpui_kit::component::chart::AreaChart;
use gpui_kit::component::tag::Tag;
use gpui_kit::component::Sizable as _;
use gpui_kit::*;

use crate::rune_ui::{
    champ_square_avatar, item_tile, rune_accent_card, rune_segmented_bar, score_ring_medallion,
};
use crate::theme;
use crate::workspace::{format_kda_ratio, ActiveRoute, BaronWorkspace};

#[derive(Clone, Debug, PartialEq)]
pub struct LpChartPoint {
    pub label: String,
    pub value: f64,
}

pub fn render(
    ws: &BaronWorkspace,
    _: &mut Window,
    cx: &Context<BaronWorkspace>,
) -> impl IntoElement {
    div()
        .flex()
        .flex_col()
        .gap_4()
        .child(render_dpm_discovery_bento(ws, cx))
        .child(render_summoner_body(ws, cx))
}

fn render_dpm_discovery_bento(
    ws: &BaronWorkspace,
    cx: &Context<BaronWorkspace>,
) -> impl IntoElement {
    let points: Vec<LpChartPoint> = ws
        .data
        .lp_history
        .iter()
        .enumerate()
        .map(|(i, s)| LpChartPoint {
            label: format!("G{}", i + 1),
            value: s.lp as f64,
        })
        .collect();

    let tier_preview = [
        ("Malphite", "S+", "51.9%", "+0.3%", "7.0%", true),
        ("Wukong", "S+", "52.2%", "+0.2%", "6.7%", true),
        ("Ahri", "S+", "51.5%", "+0.0%", "11.9%", true),
        ("Jinx", "S+", "51.4%", "+0.1%", "10.6%", true),
        ("Thresh", "S+", "51.0%", "-0.6%", "13.7%", false),
    ];

    let lb_preview = [
        (1, "Annie IRL", "#Annie", "4368 LP", "55%"),
        (2, "Kaori", "Kaori#EUW33", "4351 LP", "55%"),
        (3, "Mrozku", "MRO#ZKU", "4332 LP", "57%"),
        (4, "Mentos", "GSMC", "4130 LP", "54%"),
        (5, "Nan0", "RUD", "4050 LP", "54%"),
    ];

    div()
        .flex()
        .flex_row()
        .gap_3()
        // Card 1: Summoner Profile & LP Trajectory AreaChart
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
                .justify_between()
                .gap_2()
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .items_center()
                        .justify_between()
                        .child(
                            div()
                                .flex()
                                .flex_row()
                                .items_center()
                                .gap_2()
                                .child(champ_square_avatar("Ahri", Some(18), true))
                                .child(
                                    div()
                                        .flex()
                                        .flex_col()
                                        .child(div().text_sm().font_weight(FontWeight::BOLD).child(
                                            format!(
                                                "{} #{}",
                                                ws.data.account.game_name, ws.data.account.tag_line
                                            ),
                                        ))
                                        .child(
                                            div()
                                                .text_xs()
                                                .font_weight(FontWeight::BOLD)
                                                .text_color(theme::color(theme::CHALLENGER_CYAN))
                                                .child(format!(
                                                    "❖ {} ({} LP) • {:.1}% WR",
                                                    ws.data.ranked.tier,
                                                    ws.data.ranked.lp,
                                                    ws.data.ranked.win_rate()
                                                )),
                                        ),
                                ),
                        )
                        .child(Tag::success().small().child("Today: +58 LP")),
                )
                .child(
                    div().h(px(140.)).w_full().child(
                        AreaChart::new(points)
                            .x(|d| d.label.clone())
                            .y(|d| d.value)
                            .stroke(theme::color_alpha(theme::ACCENT_PRIMARY, 1.0))
                            .fill(theme::color_alpha(theme::ACCENT_PRIMARY, 0.25)),
                    ),
                ),
        )
        // Card 2: 16.22 Tierlist & Builds Bento Card (Matches DPM.LOL Homepage Center Bento)
        .child(
            div()
                .w(px(330.))
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
                        .items_center()
                        .justify_between()
                        .child(
                            div()
                                .text_xs()
                                .font_weight(FontWeight::BOLD)
                                .child("16.22 Tierlist & Builds  ›"),
                        )
                        .child(
                            Button::new("home-goto-tierlist")
                                .label("View All")
                                .xsmall()
                                .ghost()
                                .on_click(cx.listener(|this, _, _, cx| {
                                    this.route = ActiveRoute::TierList;
                                    cx.notify();
                                })),
                        ),
                )
                .children(
                    tier_preview
                        .into_iter()
                        .map(|(champ, tier, wr, delta, pr, pos)| {
                            div()
                                .py_1()
                                .border_b_1()
                                .border_color(theme::color(theme::BORDER_MUTED))
                                .flex()
                                .flex_row()
                                .items_center()
                                .justify_between()
                                .text_xs()
                                .child(
                                    div()
                                        .w(px(120.))
                                        .flex()
                                        .flex_row()
                                        .items_center()
                                        .gap_2()
                                        .child(Avatar::new().name(champ).xsmall().rounded_sm())
                                        .child(div().font_weight(FontWeight::BOLD).child(champ)),
                                )
                                .child(
                                    div()
                                        .px_1()
                                        .rounded_sm()
                                        .bg(theme::color_alpha(theme::MVP_GOLD, 0.22))
                                        .border_1()
                                        .border_color(theme::color(theme::MVP_GOLD))
                                        .font_weight(FontWeight::BOLD)
                                        .text_color(theme::color(theme::MVP_GOLD))
                                        .child(tier),
                                )
                                .child(
                                    div()
                                        .flex()
                                        .flex_col()
                                        .items_end()
                                        .child(div().font_weight(FontWeight::BOLD).child(wr))
                                        .child(
                                            div()
                                                .text_color(theme::color(if pos {
                                                    theme::POSITIVE_GREEN
                                                } else {
                                                    theme::DEFEAT_RED
                                                }))
                                                .child(delta),
                                        ),
                                )
                                .child(
                                    div()
                                        .font_weight(FontWeight::SEMIBOLD)
                                        .text_color(theme::color(theme::TEXT_SECONDARY))
                                        .child(pr),
                                )
                        }),
                ),
        )
        // Card 3: Regional EUW / KR / NA Leaderboard Bento Card (Matches DPM.LOL Homepage Right Bento)
        .child(
            div()
                .w(px(330.))
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
                        .items_center()
                        .justify_between()
                        .child(rune_segmented_bar(&["EUW", "KR", "NA"], 0, true))
                        .child(
                            Button::new("home-goto-lb")
                                .label("Top 100")
                                .xsmall()
                                .ghost()
                                .on_click(cx.listener(|this, _, _, cx| {
                                    this.route = ActiveRoute::Leaderboards;
                                    cx.notify();
                                })),
                        ),
                )
                .children(lb_preview.into_iter().map(|(rk, name, tag, lp, wr)| {
                    div()
                        .py_1()
                        .border_b_1()
                        .border_color(theme::color(theme::BORDER_MUTED))
                        .flex()
                        .flex_row()
                        .items_center()
                        .justify_between()
                        .text_xs()
                        .child(
                            div()
                                .w(px(145.))
                                .flex()
                                .flex_row()
                                .items_center()
                                .gap_2()
                                .child(
                                    div()
                                        .text_color(theme::color(theme::TEXT_FAINT))
                                        .child(format!("{rk}")),
                                )
                                .child(Avatar::new().name(name).xsmall().rounded_sm())
                                .child(
                                    div()
                                        .flex()
                                        .flex_col()
                                        .child(div().font_weight(FontWeight::BOLD).child(name))
                                        .child(
                                            div()
                                                .text_color(theme::color(theme::TEXT_FAINT))
                                                .child(tag),
                                        ),
                                ),
                        )
                        .child(
                            div()
                                .font_weight(FontWeight::BOLD)
                                .text_color(theme::color(theme::CHALLENGER_CYAN))
                                .child(format!("❖ {lp}")),
                        )
                        .child(
                            div()
                                .px_2()
                                .py(px(1.))
                                .rounded_sm()
                                .bg(theme::color_alpha(theme::CHALLENGER_CYAN, 0.2))
                                .font_weight(FontWeight::BOLD)
                                .text_color(theme::color(theme::CHALLENGER_CYAN))
                                .child(wr),
                        )
                })),
        )
}

fn render_summoner_body(ws: &BaronWorkspace, cx: &Context<BaronWorkspace>) -> impl IntoElement {
    div()
        .flex()
        .flex_row()
        .gap_4()
        // Left Column: Champion Pool
        .child(
            div()
                .w(px(290.))
                .p_3()
                .rounded_lg()
                .bg(theme::color(theme::BG_SURFACE))
                .border_1()
                .border_color(theme::color(theme::BORDER_SUBTLE))
                .flex()
                .flex_col()
                .gap_3()
                .child(
                    div()
                        .text_xs()
                        .font_weight(FontWeight::BOLD)
                        .text_color(theme::color(theme::TEXT_SECONDARY))
                        .child("SEASON CHAMPION POOL"),
                )
                .children(ws.data.champion_pool.iter().map(|cp| {
                    div()
                        .py_1()
                        .border_b_1()
                        .border_color(theme::color(theme::BORDER_MUTED))
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
                                .child(champ_square_avatar(&cp.champion_name, None, true))
                                .child(
                                    div()
                                        .flex()
                                        .flex_col()
                                        .child(
                                            div()
                                                .font_weight(FontWeight::BOLD)
                                                .child(cp.champion_name.clone()),
                                        )
                                        .child(
                                            div()
                                                .text_color(theme::color(theme::TEXT_FAINT))
                                                .child(format!("{:.1} CS/m", cp.cs_per_min)),
                                        ),
                                ),
                        )
                        .child(
                            div()
                                .flex()
                                .flex_col()
                                .items_end()
                                .child(
                                    div()
                                        .font_weight(FontWeight::BOLD)
                                        .text_color(theme::color(theme::POSITIVE_GREEN))
                                        .child(format!("{:.1}% WR", cp.win_rate)),
                                )
                                .child(
                                    div()
                                        .text_color(theme::color(theme::TEXT_FAINT))
                                        .child(format!("{} games", cp.games)),
                                ),
                        )
                })),
        )
        // Right Column: Match History Rows
        .child(
            div()
                .flex_1()
                .flex()
                .flex_col()
                .gap_2()
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .items_center()
                        .justify_between()
                        .child(
                            div()
                                .text_xs()
                                .font_weight(FontWeight::BOLD)
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child("RECENT MATCHES (SOLO/DUO)"),
                        )
                        .child(rune_segmented_bar(
                            &["All", "Ranked Solo", "Flex", "ARAM"],
                            0,
                            true,
                        )),
                )
                .children(ws.data.matches.iter().map(|m| render_match_row(m, cx))),
        )
}

fn render_match_row(m: &MatchSummary, cx: &Context<BaronWorkspace>) -> impl IntoElement {
    let p = &m.participants[0];
    let score = baron_core::calculate_baron_score(p);
    let accent = if p.win {
        theme::VICTORY_BLUE
    } else {
        theme::DEFEAT_RED
    };

    rune_accent_card(
        accent,
        div()
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
                    .child(champ_square_avatar(&p.champion_name, Some(17), false))
                    .child(
                        div()
                            .w(px(140.))
                            .flex()
                            .flex_col()
                            .child(
                                div()
                                    .text_xs()
                                    .font_weight(FontWeight::BOLD)
                                    .text_color(theme::color(accent))
                                    .child(if p.win { "Victory" } else { "Defeat" }),
                            )
                            .child(
                                div()
                                    .text_xs()
                                    .font_weight(FontWeight::SEMIBOLD)
                                    .child(p.champion_name.clone()),
                            )
                            .child(
                                div()
                                    .text_xs()
                                    .text_color(theme::color(theme::TEXT_FAINT))
                                    .child(format!(
                                        "{}m • {}",
                                        m.game_duration_secs / 60,
                                        m.played_ago_label
                                    )),
                            ),
                    )
                    .child(
                        div()
                            .w(px(120.))
                            .flex()
                            .flex_col()
                            .child(
                                div()
                                    .flex()
                                    .flex_row()
                                    .gap_1()
                                    .text_xs()
                                    .font_weight(FontWeight::BOLD)
                                    .child(format!("{} /", p.kills))
                                    .child(
                                        div()
                                            .text_color(theme::color(theme::DEFEAT_RED))
                                            .child(format!("{}", p.deaths)),
                                    )
                                    .child(format!("/ {}", p.assists)),
                            )
                            .child(
                                div()
                                    .text_xs()
                                    .text_color(theme::color(theme::TEXT_SECONDARY))
                                    .child(format!(
                                        "{} • {:.1} CS/m",
                                        format_kda_ratio(p.kills, p.deaths, p.assists),
                                        p.cs_per_min
                                    )),
                            ),
                    )
                    .child(
                        div()
                            .flex()
                            .flex_row()
                            .gap_1()
                            .child(item_tile("I1", theme::ACCENT_PRIMARY, None))
                            .child(item_tile("I2", theme::CHALLENGER_CYAN, None))
                            .child(item_tile("I3", theme::MVP_GOLD, None))
                            .child(item_tile("I4", theme::ACE_PURPLE, None))
                            .child(item_tile("I5", theme::DEFEAT_RED, None))
                            .child(item_tile("W", theme::POSITIVE_GREEN, None)),
                    ),
            )
            .child(
                div()
                    .flex()
                    .flex_row()
                    .items_center()
                    .gap_3()
                    .child(score_ring_medallion(score, false))
                    .child(
                        Button::new(SharedString::from(format!("open-postgame-{}", m.match_id)))
                            .label("⚔  Post-game")
                            .xsmall()
                            .primary()
                            .on_click(cx.listener(|this, _, _, cx| {
                                this.route = ActiveRoute::DpmLens;
                                cx.notify();
                            })),
                    ),
            ),
    )
}
