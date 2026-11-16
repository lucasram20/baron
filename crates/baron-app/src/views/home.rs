use baron_core::models::MatchSummary;
use gpui_kit::component::button::{Button, ButtonVariants as _};
use gpui_kit::component::chart::AreaChart;
use gpui_kit::component::tag::Tag;
use gpui_kit::component::Sizable as _;
use gpui_kit::*;

use crate::theme;
use crate::workspace::{format_kda, format_kda_ratio, ActiveRoute, BaronWorkspace};

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
        .child(render_bento_header(ws))
        .child(render_body(ws, cx))
}

fn render_bento_header(ws: &BaronWorkspace) -> impl IntoElement {
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

    div()
        .flex()
        .flex_row()
        .gap_4()
        .h(px(160.))
        .child(
            div()
                .w(px(320.))
                .p_3()
                .rounded_lg()
                .bg(theme::color(theme::BG_SURFACE))
                .border_1()
                .border_color(theme::color(theme::BORDER_SUBTLE))
                .flex()
                .flex_col()
                .justify_between()
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .justify_between()
                        .items_center()
                        .child(div().text_base().font_bold().child(format!(
                            "{} #{}",
                            ws.data.account.game_name, ws.data.account.tag_line
                        )))
                        .child(Tag::success().small().child("Today: +58 LP")),
                )
                .child(
                    div()
                        .flex()
                        .flex_col()
                        .gap_1()
                        .child(
                            div()
                                .text_sm()
                                .font_semibold()
                                .text_color(theme::color(theme::MVP_GOLD))
                                .child(format!(
                                    "{} {} ({} LP)",
                                    ws.data.ranked.tier, ws.data.ranked.division, ws.data.ranked.lp
                                )),
                        )
                        .child(
                            div()
                                .text_xs()
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child(format!(
                                    "{}W {}L ({:.1}% Win Rate)",
                                    ws.data.ranked.wins,
                                    ws.data.ranked.losses,
                                    ws.data.ranked.win_rate()
                                )),
                        ),
                ),
        )
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
                .child(
                    div()
                        .text_xs()
                        .font_semibold()
                        .text_color(theme::color(theme::TEXT_SECONDARY))
                        .child("LP Progression"),
                )
                .child(
                    div().flex_1().w_full().child(
                        AreaChart::new(points)
                            .x(|d| d.label.clone())
                            .y(|d| d.value)
                            .stroke(theme::color_alpha(theme::VICTORY_BLUE, 1.0))
                            .fill(theme::color_alpha(theme::VICTORY_BLUE, 0.25)),
                    ),
                ),
        )
        .child(
            div()
                .w(px(260.))
                .p_3()
                .rounded_lg()
                .bg(theme::color(theme::BG_SURFACE))
                .border_1()
                .border_color(theme::color(theme::BORDER_SUBTLE))
                .flex()
                .flex_col()
                .justify_between()
                .child(
                    div()
                        .text_xs()
                        .font_semibold()
                        .text_color(theme::color(theme::TEXT_SECONDARY))
                        .child("Recent Form (Last 20)"),
                )
                .child(div().text_lg().font_bold().child("65.0% WR • 3.42:1"))
                .child(
                    div()
                        .text_xs()
                        .text_color(theme::color(theme::TEXT_SECONDARY))
                        .child("Top: Ahri (75%), Sylas (60%)"),
                ),
        )
}

fn render_body(ws: &BaronWorkspace, cx: &Context<BaronWorkspace>) -> impl IntoElement {
    div()
        .flex()
        .flex_row()
        .gap_4()
        .child(
            div()
                .w(px(320.))
                .flex()
                .flex_col()
                .gap_4()
                .child(
                    div()
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
                                .text_xs()
                                .font_semibold()
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child("Session Monitor"),
                        )
                        .child(div().text_sm().child("5 Games Played (4W 1L)"))
                        .child(Tag::success().small().child("3 Win Streak")),
                )
                .child(
                    div()
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
                                .text_xs()
                                .font_semibold()
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child("Champion Pool"),
                        )
                        .children(ws.data.champion_pool.iter().map(|cp| {
                            div()
                                .flex()
                                .flex_row()
                                .justify_between()
                                .text_xs()
                                .child(div().font_semibold().child(cp.champion_name.clone()))
                                .child(
                                    div()
                                        .text_color(theme::color(theme::TEXT_SECONDARY))
                                        .child(format!("{:.1}% WR ({})", cp.win_rate, cp.games)),
                                )
                        })),
                ),
        )
        .child(
            div()
                .flex_1()
                .flex()
                .flex_col()
                .gap_2()
                .child(
                    div()
                        .text_sm()
                        .font_semibold()
                        .text_color(theme::color(theme::TEXT_SECONDARY))
                        .child("Match History"),
                )
                .children(ws.data.matches.iter().map(|m| render_match_row(ws, m, cx))),
        )
}

fn render_match_row(
    ws: &BaronWorkspace,
    m: &MatchSummary,
    cx: &Context<BaronWorkspace>,
) -> impl IntoElement {
    let p = &m.participants[0];
    let score = baron_core::calculate_baron_score(p);
    let is_expanded = ws.expanded_match_id.as_deref() == Some(&m.match_id);
    let border_color = if p.win {
        theme::VICTORY_BLUE
    } else {
        theme::DEFEAT_ROSE
    };
    let match_id = m.match_id.clone();

    let mut row = div()
        .flex()
        .flex_col()
        .rounded_lg()
        .bg(theme::color(theme::BG_SURFACE))
        .border_1()
        .border_color(theme::color(theme::BORDER_SUBTLE))
        .border_l_4()
        .border_color(theme::color(border_color))
        .p_3()
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
                        .gap_3()
                        .child(div().font_bold().child(p.champion_name.clone()))
                        .child(
                            div()
                                .text_xs()
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child(format!("{}m", m.game_duration_secs / 60)),
                        )
                        .child(
                            div()
                                .text_xs()
                                .child(format_kda(p.kills, p.deaths, p.assists)),
                        )
                        .child(
                            div()
                                .text_xs()
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child(format_kda_ratio(p.kills, p.deaths, p.assists)),
                        )
                        .child(div().text_xs().child(format!("{:.1} CS/m", p.cs_per_min))),
                )
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .items_center()
                        .gap_2()
                        .child(if score >= 88.0 && p.win {
                            Tag::warning().small().child(format!("MVP {score:.1}"))
                        } else if score >= 85.0 {
                            Tag::secondary().small().child(format!("ACE {score:.1}"))
                        } else {
                            Tag::primary().small().child(format!("{score:.1}"))
                        })
                        .child(
                            Button::new(m.match_id.clone())
                                .label(if is_expanded { "Hide" } else { "Lens" })
                                .small()
                                .ghost()
                                .on_click(cx.listener(move |this, _, _, cx| {
                                    this.expanded_match_id =
                                        if this.expanded_match_id.as_deref() == Some(&match_id) {
                                            None
                                        } else {
                                            Some(match_id.clone())
                                        };
                                    cx.notify();
                                })),
                        ),
                ),
        );

    if is_expanded {
        row = row.child(
            div()
                .p_2()
                .rounded()
                .bg(theme::color(theme::BG_ELEVATED))
                .flex()
                .flex_row()
                .justify_between()
                .items_center()
                .text_xs()
                .child(div().child(format!(
                    "Gold @14: {:+d}g • DPM: {} ({:.1}% dmg share)",
                    p.gold_diff_14,
                    p.dpm as i32,
                    p.team_damage_share * 100.0
                )))
                .child(
                    Button::new("goto-lens")
                        .label("Open in DPM Lens")
                        .small()
                        .primary()
                        .on_click(cx.listener(|this, _, _, cx| {
                            this.route = ActiveRoute::DpmLens;
                            cx.notify();
                        })),
                ),
        );
    }

    row
}
