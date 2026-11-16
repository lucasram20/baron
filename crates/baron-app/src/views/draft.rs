use baron_lcu::build_lcu_rune_page;
use gpui_kit::component::button::{Button, ButtonVariants as _};
use gpui_kit::component::switch::Switch;
use gpui_kit::component::tag::Tag;
use gpui_kit::component::Sizable as _;
use gpui_kit::*;

use crate::theme;
use crate::workspace::BaronWorkspace;

pub fn render(
    ws: &BaronWorkspace,
    _: &mut Window,
    cx: &Context<BaronWorkspace>,
) -> impl IntoElement {
    div()
        .flex()
        .flex_col()
        .gap_4()
        .child(render_header_strip(ws, cx))
        .child(render_draft_columns(ws))
}

fn render_header_strip(ws: &BaronWorkspace, cx: &Context<BaronWorkspace>) -> impl IntoElement {
    div()
        .h(px(52.))
        .p_3()
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
                .child(
                    Tag::primary()
                        .small()
                        .child("Live Champ Select: Pick Phase"),
                )
                .child(
                    div()
                        .text_sm()
                        .font_semibold()
                        .child(format!("Target: {}", ws.data.draft.champion_name)),
                ),
        )
        .child(
            div()
                .flex()
                .flex_row()
                .items_center()
                .gap_4()
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .items_center()
                        .gap_1()
                        .child(
                            div()
                                .text_xs()
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child("Auto-Runes"),
                        )
                        .child(
                            Switch::new("auto-runes")
                                .checked(ws.auto_runes)
                                .small()
                                .on_change(cx.listener(|this, c, _, cx| {
                                    this.auto_runes = *c;
                                    cx.notify();
                                })),
                        ),
                )
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .items_center()
                        .gap_1()
                        .child(
                            div()
                                .text_xs()
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child("Auto-Spells"),
                        )
                        .child(
                            Switch::new("auto-spells")
                                .checked(ws.auto_spells)
                                .small()
                                .on_change(cx.listener(|this, c, _, cx| {
                                    this.auto_spells = *c;
                                    cx.notify();
                                })),
                        ),
                )
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .items_center()
                        .gap_1()
                        .child(
                            div()
                                .text_xs()
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child("Auto-Items"),
                        )
                        .child(
                            Switch::new("auto-items")
                                .checked(ws.auto_items)
                                .small()
                                .on_change(cx.listener(|this, c, _, cx| {
                                    this.auto_items = *c;
                                    cx.notify();
                                })),
                        ),
                )
                .child(
                    Button::new("apply-lcu")
                        .label("Apply to Client")
                        .small()
                        .primary(),
                ),
        )
}

fn render_draft_columns(ws: &BaronWorkspace) -> impl IntoElement {
    let draft = &ws.data.draft;
    let payload = build_lcu_rune_page(
        &draft.champion_name,
        draft.runes.primary_style_id,
        draft.runes.sub_style_id,
        draft.runes.selected_perk_ids,
    );
    let preview = serde_json::to_string_pretty(&payload).unwrap_or_default();

    div()
        .flex()
        .flex_row()
        .gap_4()
        .child(
            div()
                .flex_1()
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
                                .flex()
                                .flex_row()
                                .justify_between()
                                .items_center()
                                .child(div().text_base().font_bold().child(format!(
                                    "{} — {}",
                                    draft.champion_name,
                                    draft.role.label()
                                )))
                                .child(
                                    Tag::warning()
                                        .small()
                                        .child(format!("{:.1}% WR", draft.win_rate)),
                                ),
                        )
                        .child(
                            div()
                                .text_xs()
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child(format!("Pick: {:.1}%", draft.pick_rate)),
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
                        .gap_1()
                        .child(
                            div()
                                .text_xs()
                                .font_semibold()
                                .text_color(theme::color(theme::MVP_GOLD))
                                .child(format!(
                                    "Matchup Shift: vs {}",
                                    draft.vs_champion.as_deref().unwrap_or("Enemy")
                                )),
                        )
                        .child(
                            div()
                                .text_xs()
                                .child(draft.matchup_note.as_deref().unwrap_or("Standard lane.")),
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
                                .child("Rune Configuration"),
                        )
                        .child(div().text_sm().font_bold().child(format!(
                            "{} ({})",
                            draft.runes.primary_tree, draft.runes.keystone
                        )))
                        .child(
                            div()
                                .text_xs()
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child(draft.runes.primary_perks.join(" • ")),
                        )
                        .child(
                            div()
                                .text_sm()
                                .font_bold()
                                .child(format!("Secondary: {}", draft.runes.secondary_tree)),
                        )
                        .child(
                            div()
                                .text_xs()
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child(draft.runes.secondary_perks.join(" • ")),
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
                        .flex_row()
                        .justify_between()
                        .items_center()
                        .child(
                            div()
                                .text_xs()
                                .font_semibold()
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child("Skill Priority"),
                        )
                        .child(
                            div()
                                .text_sm()
                                .font_bold()
                                .text_color(theme::color(theme::ACCENT_PRIMARY))
                                .child(format!(
                                    "{} > {} > {}",
                                    draft.skill_priority[0],
                                    draft.skill_priority[1],
                                    draft.skill_priority[2]
                                )),
                        ),
                ),
        )
        .child(
            div()
                .flex_1()
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
                                .child("Item Build Path"),
                        )
                        .child(
                            div()
                                .text_xs()
                                .child(format!("Starters: {}", draft.starter_items.join(", "))),
                        )
                        .child(div().text_xs().child(format!("Boots: {}", draft.boots)))
                        .child(
                            div()
                                .text_xs()
                                .font_semibold()
                                .child(format!("Core: {}", draft.core_items.join(" -> "))),
                        )
                        .child(
                            div()
                                .text_xs()
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .children(
                                    draft
                                        .situational_items
                                        .iter()
                                        .map(|(it, d)| div().child(format!("• {it}: {d}"))),
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
                                .items_center()
                                .child(
                                    div()
                                        .text_xs()
                                        .font_semibold()
                                        .text_color(theme::color(theme::TEXT_SECONDARY))
                                        .child("LCU Injected Payload"),
                                )
                                .child(Tag::secondary().small().child(payload.name.clone())),
                        )
                        .child(
                            div()
                                .p_2()
                                .rounded()
                                .bg(theme::color(theme::BG_ELEVATED))
                                .overflow_hidden()
                                .child(
                                    div()
                                        .text_xs()
                                        .text_color(theme::color(theme::TEXT_MUTED))
                                        .child(preview),
                                ),
                        ),
                ),
        )
}
