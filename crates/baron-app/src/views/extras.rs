use baron_lcu::evaluate_skin_collection;
use baron_riot::FallbackProvider;
use gpui_kit::component::tag::Tag;
use gpui_kit::component::Sizable as _;
use gpui_kit::*;

use crate::theme;
use crate::workspace::BaronWorkspace;

pub fn render_tier_list(
    ws: &BaronWorkspace,
    _: &mut Window,
    _: &Context<BaronWorkspace>,
) -> impl IntoElement {
    div()
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
                .flex_row()
                .justify_between()
                .items_center()
                .child(
                    div()
                        .text_sm()
                        .font_bold()
                        .child("Meta Champion Tier List (Solo/Duo)"),
                )
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .gap_2()
                        .child(Tag::primary().small().child(FallbackProvider::UGg.label()))
                        .child(
                            Tag::secondary()
                                .small()
                                .child(FallbackProvider::OpGg.label()),
                        )
                        .child(
                            Tag::secondary()
                                .small()
                                .child(FallbackProvider::DpmLol.label()),
                        ),
                ),
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
                        .flex()
                        .flex_row()
                        .justify_between()
                        .text_xs()
                        .font_semibold()
                        .text_color(theme::color(theme::TEXT_SECONDARY))
                        .child(div().w(px(40.)).child("Rank"))
                        .child(div().w(px(140.)).child("Champion"))
                        .child(div().w(px(60.)).child("Role"))
                        .child(div().w(px(60.)).child("Tier"))
                        .child(div().w(px(80.)).child("Win Rate"))
                        .child(div().w(px(80.)).child("Pick Rate"))
                        .child(div().w(px(80.)).child("Ban Rate")),
                )
                .children(ws.data.tier_list.iter().map(|t| {
                    let is_top = t.tier == "S+" || t.tier == "S";
                    div()
                        .flex()
                        .flex_row()
                        .justify_between()
                        .items_center()
                        .text_xs()
                        .p_1()
                        .rounded()
                        .child(div().w(px(40.)).font_bold().child(format!("#{}", t.rank)))
                        .child(
                            div()
                                .w(px(140.))
                                .font_semibold()
                                .child(t.champion_name.clone()),
                        )
                        .child(
                            div()
                                .w(px(60.))
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child(t.role.label()),
                        )
                        .child(div().w(px(60.)).child(if is_top {
                            Tag::warning().small().child(t.tier.clone())
                        } else {
                            Tag::secondary().small().child(t.tier.clone())
                        }))
                        .child(
                            div()
                                .w(px(80.))
                                .font_semibold()
                                .child(format!("{:.1}%", t.win_rate)),
                        )
                        .child(
                            div()
                                .w(px(80.))
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child(format!("{:.1}%", t.pick_rate)),
                        )
                        .child(
                            div()
                                .w(px(80.))
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child(format!("{:.1}%", t.ban_rate)),
                        )
                })),
        )
}

pub fn render_leaderboard(
    ws: &BaronWorkspace,
    _: &mut Window,
    _: &Context<BaronWorkspace>,
) -> impl IntoElement {
    div()
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
                .flex_row()
                .justify_between()
                .items_center()
                .child(
                    div()
                        .text_sm()
                        .font_bold()
                        .child("Baron Friends & Rivals Leaderboard"),
                )
                .child(Tag::primary().small().child("Season 2026")),
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
                        .flex()
                        .flex_row()
                        .justify_between()
                        .text_xs()
                        .font_semibold()
                        .text_color(theme::color(theme::TEXT_SECONDARY))
                        .child(div().w(px(40.)).child("Rank"))
                        .child(div().w(px(160.)).child("Summoner"))
                        .child(div().w(px(120.)).child("Tier & LP"))
                        .child(div().w(px(80.)).child("Win Rate"))
                        .child(div().w(px(90.)).child("7d Net LP"))
                        .child(div().w(px(90.)).child("Avg Score")),
                )
                .children(ws.data.leaderboard.iter().map(|m| {
                    div()
                        .flex()
                        .flex_row()
                        .justify_between()
                        .items_center()
                        .text_xs()
                        .p_1()
                        .rounded()
                        .child(div().w(px(40.)).font_bold().child(format!("#{}", m.rank)))
                        .child(
                            div()
                                .w(px(160.))
                                .font_semibold()
                                .child(format!("{} #{}", m.game_name, m.tag_line)),
                        )
                        .child(
                            div()
                                .w(px(120.))
                                .child(format!("{} {} ({} LP)", m.tier, m.division, m.lp)),
                        )
                        .child(
                            div()
                                .w(px(80.))
                                .font_semibold()
                                .child(format!("{:.1}%", m.win_rate)),
                        )
                        .child(
                            div().w(px(90.)).child(
                                Tag::success()
                                    .small()
                                    .child(format!("+{:+d} LP", m.net_lp_7d)),
                            ),
                        )
                        .child(
                            div().w(px(90.)).child(
                                Tag::primary()
                                    .small()
                                    .child(format!("{:.1}", m.avg_baron_score)),
                            ),
                        )
                })),
        )
}

pub fn render_skin_vault(
    ws: &BaronWorkspace,
    _: &mut Window,
    _: &Context<BaronWorkspace>,
) -> impl IntoElement {
    let vault = evaluate_skin_collection(&ws.skins);

    div()
        .flex()
        .flex_col()
        .gap_4()
        .child(
            div()
                .p_4()
                .rounded_lg()
                .bg(theme::color(theme::BG_SURFACE))
                .border_1()
                .border_color(theme::color(theme::BORDER_SUBTLE))
                .flex()
                .flex_col()
                .gap_3()
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .justify_between()
                        .items_center()
                        .child(div().text_base().font_bold().child("Skin Collection Vault"))
                        .child(
                            Tag::warning()
                                .small()
                                .child(format!("{} Total RP Value", vault.total_estimated_rp)),
                        ),
                )
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .gap_3()
                        .text_xs()
                        .child(
                            Tag::primary()
                                .small()
                                .child(format!("Owned: {}", vault.total_owned_skins)),
                        )
                        .child(
                            Tag::warning()
                                .small()
                                .child(format!("Ultimate: {}", vault.ultimate_count)),
                        )
                        .child(
                            Tag::secondary()
                                .small()
                                .child(format!("Mythic: {}", vault.mythic_count)),
                        )
                        .child(
                            Tag::primary()
                                .small()
                                .child(format!("Legendary: {}", vault.legendary_count)),
                        )
                        .child(
                            Tag::secondary()
                                .small()
                                .child(format!("Epic: {}", vault.epic_count)),
                        ),
                ),
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
                        .child("Owned Skin Inventory"),
                )
                .children(ws.skins.iter().filter(|s| s.owned && !s.is_base).map(|s| {
                    div()
                        .flex()
                        .flex_row()
                        .justify_between()
                        .items_center()
                        .text_xs()
                        .p_1()
                        .rounded()
                        .child(
                            div()
                                .w(px(140.))
                                .font_semibold()
                                .child(s.champion_name.clone()),
                        )
                        .child(div().flex_1().child(s.name.clone()))
                        .child(
                            div()
                                .w(px(90.))
                                .child(Tag::warning().small().child(s.rarity.label())),
                        )
                        .child(
                            div()
                                .w(px(80.))
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child(format!("{} RP", s.rarity.estimated_rp())),
                        )
                })),
        )
}
