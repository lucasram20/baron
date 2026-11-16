use baron_core::models::ParticipantStats;
use gpui_kit::component::chart::{AreaChart, RadarChart};
use gpui_kit::component::tag::Tag;
use gpui_kit::component::Sizable as _;
use gpui_kit::*;

use crate::theme;
use crate::workspace::{format_gold_diff, format_kda, BaronWorkspace};

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

pub fn render(
    ws: &BaronWorkspace,
    _: &mut Window,
    _: &Context<BaronWorkspace>,
) -> impl IntoElement {
    let m = &ws.data.matches[0];
    let p = &m.participants[0];
    let lane_diff =
        baron_core::compute_lane_diff_at_minute(&m.timeline_samples, 14, p.team_id, p.role);

    div()
        .flex()
        .flex_col()
        .gap_4()
        .child(render_h2h_banner(p, lane_diff))
        .child(render_charts(m, p))
        .child(render_scoreboard(m))
}

fn render_h2h_banner(
    p: &ParticipantStats,
    diff: Option<baron_core::models::LaneDiffAt14>,
) -> impl IntoElement {
    let score = baron_core::calculate_baron_score(p);
    let gold_diff = diff.map(|d| d.gold_diff).unwrap_or(0);
    let xp_diff = diff.map(|d| d.xp_diff).unwrap_or(0);
    let cs_diff = diff.map(|d| d.cs_diff).unwrap_or(0);

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
                .flex()
                .flex_row()
                .justify_between()
                .items_center()
                .child(div().text_sm().font_bold().child(format!(
                    "Lane Head-to-Head @14:00 ({} vs Opponent)",
                    p.role.label()
                )))
                .child(
                    Tag::warning()
                        .small()
                        .child(format!("Baron Score: {:.1} MVP", score)),
                ),
        )
        .child(
            div()
                .flex()
                .flex_row()
                .gap_4()
                .child(
                    div()
                        .flex_1()
                        .p_2()
                        .rounded()
                        .bg(theme::color(theme::BG_ELEVATED))
                        .child(
                            div()
                                .text_center()
                                .child(format!("Gold @14: {}", format_gold_diff(gold_diff))),
                        ),
                )
                .child(
                    div()
                        .flex_1()
                        .p_2()
                        .rounded()
                        .bg(theme::color(theme::BG_ELEVATED))
                        .child(div().text_center().child(format!("XP @14: {:+d}", xp_diff))),
                )
                .child(
                    div()
                        .flex_1()
                        .p_2()
                        .rounded()
                        .bg(theme::color(theme::BG_ELEVATED))
                        .child(div().text_center().child(format!("CS @14: {:+d}", cs_diff))),
                ),
        )
}

fn render_charts(m: &baron_core::models::MatchSummary, p: &ParticipantStats) -> impl IntoElement {
    let gold_curve = baron_core::compute_team_gold_curve(&m.timeline_samples, p.team_id);
    let gold_points: Vec<GoldPoint> = gold_curve
        .into_iter()
        .map(|(min, diff)| GoldPoint {
            label: format!("{min}m"),
            value: diff as f64,
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
        .gap_4()
        .h(px(220.))
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
                        .child("Team Gold Advantage (Timeline)"),
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
                .w(px(320.))
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

fn render_scoreboard(m: &baron_core::models::MatchSummary) -> impl IntoElement {
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
                .flex()
                .flex_row()
                .justify_between()
                .text_xs()
                .font_semibold()
                .text_color(theme::color(theme::TEXT_SECONDARY))
                .child(div().w(px(140.)).child("Champion / Player"))
                .child(div().w(px(60.)).child("Role"))
                .child(div().w(px(80.)).child("KDA"))
                .child(div().w(px(70.)).child("DPM"))
                .child(div().w(px(60.)).child("CS/m"))
                .child(div().w(px(80.)).child("Baron Score")),
        )
        .children(m.participants.iter().map(|pt| {
            let s = baron_core::calculate_baron_score(pt);
            let tint = if pt.win {
                theme::VICTORY_BLUE
            } else {
                theme::DEFEAT_ROSE
            };
            div()
                .flex()
                .flex_row()
                .justify_between()
                .items_center()
                .text_xs()
                .p_1()
                .rounded()
                .bg(theme::color_alpha(tint, 0.1))
                .child(
                    div()
                        .w(px(140.))
                        .font_semibold()
                        .child(format!("{} ({})", pt.champion_name, pt.game_name)),
                )
                .child(
                    div()
                        .w(px(60.))
                        .text_color(theme::color(theme::TEXT_SECONDARY))
                        .child(pt.role.label()),
                )
                .child(
                    div()
                        .w(px(80.))
                        .child(format_kda(pt.kills, pt.deaths, pt.assists)),
                )
                .child(div().w(px(70.)).child(format!("{}", pt.dpm as i32)))
                .child(div().w(px(60.)).child(format!("{:.1}", pt.cs_per_min)))
                .child(
                    div()
                        .w(px(80.))
                        .child(Tag::primary().small().child(format!("{s:.1}"))),
                )
        }))
}
