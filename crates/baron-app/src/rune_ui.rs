//! Reusable `anomalyco/rune` (`rune-kit`) + `gpui-kit` UI primitives for Baron (DPM v1.8.1 aesthetic).

use gpui_kit::component::avatar::Avatar;
use gpui_kit::component::Sizable as _;
use gpui_kit::*;

use crate::theme;

/// Renders a `rune-kit`-style SegmentedControl (`28px` track in `BG_ELEVATED`, raised active segment).
pub fn rune_segmented_bar(
    labels: &[&'static str],
    active_idx: usize,
    accent_active: bool,
) -> impl IntoElement {
    let items: Vec<(usize, &'static str)> = labels.iter().copied().enumerate().collect();
    div()
        .h(px(28.))
        .p(px(2.))
        .rounded_md()
        .bg(theme::color(theme::BG_ELEVATED))
        .border_1()
        .border_color(theme::color(theme::BORDER_SUBTLE))
        .flex()
        .flex_row()
        .items_center()
        .gap_1()
        .children(items.into_iter().map(move |(i, label)| {
            let is_on = i == active_idx;
            let bg = if is_on {
                if accent_active {
                    theme::color(theme::ACCENT_PRIMARY)
                } else {
                    theme::color(theme::LAYER_02)
                }
            } else {
                theme::color_alpha(theme::BG_ELEVATED, 0.0)
            };
            let fg = if is_on {
                theme::color(theme::TEXT_PRIMARY)
            } else {
                theme::color(theme::TEXT_SECONDARY)
            };
            div()
                .h(px(22.))
                .px_3()
                .rounded_sm()
                .bg(bg)
                .flex()
                .items_center()
                .justify_center()
                .text_xs()
                .font_weight(if is_on {
                    FontWeight::SEMIBOLD
                } else {
                    FontWeight::NORMAL
                })
                .text_color(fg)
                .child(label)
        }))
}

/// Renders a `rune-kit`-style Card with an inset `3px` left accent rule (`mt/mb` rounded rule + body).
pub fn rune_accent_card(accent_hex: u32, body: impl IntoElement) -> impl IntoElement {
    div()
        .w_full()
        .rounded_lg()
        .bg(theme::color(theme::BG_SURFACE))
        .border_1()
        .border_color(theme::color(theme::BORDER_SUBTLE))
        .flex()
        .flex_row()
        .overflow_hidden()
        .child(div().w(px(3.)).bg(theme::color(accent_hex)))
        .child(div().flex_1().p_3().child(body))
}

/// Renders a square rounded Champion Avatar with an optional bottom-right level badge (`17`, `18`).
pub fn champ_square_avatar(name: &str, level: Option<u8>, small: bool) -> impl IntoElement {
    let (_, _, accent) = theme::champion_palette(name);
    let av = if small {
        Avatar::new().name(name.to_string()).small().rounded_md()
    } else {
        Avatar::new().name(name.to_string()).rounded_md()
    };

    div()
        .flex()
        .flex_row()
        .items_center()
        .gap_1()
        .child(
            div()
                .rounded_md()
                .border_1()
                .border_color(theme::color_alpha(accent, 0.55))
                .child(av),
        )
        .children(level.map(|lv| {
            div()
                .px_1()
                .rounded_sm()
                .bg(theme::color(theme::BG_CANVAS))
                .border_1()
                .border_color(theme::color(theme::BORDER_STRONG))
                .text_xs()
                .font_weight(FontWeight::BOLD)
                .text_color(theme::color(theme::TEXT_PRIMARY))
                .child(format!("{lv}"))
        }))
}

/// Renders a vertical Champion Draft Portrait card (`92px x 134px`) matching Screenshot 1 (Champ Select).
pub fn draft_vertical_portrait(
    champ: &str,
    role_short: &str,
    tier: &str,
    delta_label: &str,
    delta_positive: Option<bool>,
) -> impl IntoElement {
    let (bg_top, _, accent) = theme::champion_palette(champ);
    let tier_col = theme::tier_color(tier);
    let delta_col = match delta_positive {
        Some(true) => theme::VICTORY_BLUE,
        Some(false) => theme::DEFEAT_RED,
        None => theme::TEXT_FAINT,
    };

    div()
        .w(px(90.))
        .flex()
        .flex_col()
        .gap_1()
        .child(
            div()
                .w(px(90.))
                .h(px(124.))
                .rounded_md()
                .bg(theme::color(bg_top))
                .border_1()
                .border_color(theme::color_alpha(accent, 0.55))
                .p_2()
                .flex()
                .flex_col()
                .justify_between()
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .justify_between()
                        .items_center()
                        .child(
                            div()
                                .px_1()
                                .rounded_sm()
                                .bg(theme::color_alpha(theme::BG_CANVAS, 0.75))
                                .text_xs()
                                .font_weight(FontWeight::SEMIBOLD)
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child(role_short.to_string()),
                        )
                        .child(Avatar::new().name(champ.to_string()).small()),
                )
                .child(
                    div()
                        .flex()
                        .flex_col()
                        .child(
                            div()
                                .text_xs()
                                .font_weight(FontWeight::SEMIBOLD)
                                .text_color(theme::color(theme::TEXT_PRIMARY))
                                .child(champ.to_string()),
                        )
                        .child(
                            div()
                                .text_base()
                                .font_weight(FontWeight::BOLD)
                                .text_color(theme::color(tier_col))
                                .child(tier.to_string()),
                        )
                        .child(
                            div()
                                .text_xs()
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child("Tier"),
                        ),
                ),
        )
        .child(
            div()
                .h(px(20.))
                .px_1()
                .flex()
                .flex_row()
                .items_center()
                .justify_between()
                .text_xs()
                .child(
                    div()
                        .text_color(theme::color(theme::TEXT_FAINT))
                        .child(role_short.to_string()),
                )
                .child(
                    div()
                        .font_weight(FontWeight::SEMIBOLD)
                        .text_color(theme::color(delta_col))
                        .child(delta_label.to_string()),
                ),
        )
}

/// Renders a vertical Champion Spectate Strip (`68px x 96px`) matching Screenshot 2 (Spectate).
pub fn spectate_champ_strip(
    champ: &str,
    player_name: &str,
    team_tag: Option<&str>,
    role_short: &str,
    is_known_pro: bool,
) -> impl IntoElement {
    let (bg_top, _, accent) = if is_known_pro {
        theme::champion_palette(champ)
    } else {
        (0x161922, 0x0E1017, theme::BORDER_SUBTLE)
    };
    let name_col = if is_known_pro {
        theme::TEXT_PRIMARY
    } else {
        theme::TEXT_FAINT
    };

    div()
        .w(px(68.))
        .flex()
        .flex_col()
        .items_center()
        .gap_1()
        .child(
            div()
                .w(px(68.))
                .h(px(86.))
                .rounded_md()
                .bg(theme::color(bg_top))
                .border_1()
                .border_color(theme::color_alpha(
                    accent,
                    if is_known_pro { 0.6 } else { 0.25 },
                ))
                .p_1()
                .flex()
                .flex_col()
                .justify_between()
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .justify_between()
                        .items_center()
                        .child(
                            div()
                                .px_1()
                                .rounded_sm()
                                .bg(theme::color_alpha(theme::BG_CANVAS, 0.8))
                                .text_xs()
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child(role_short.to_string()),
                        ),
                )
                .child(
                    div()
                        .flex()
                        .justify_center()
                        .child(Avatar::new().name(champ.to_string()).small()),
                )
                .child(div().flex().justify_center().children(team_tag.map(|tag| {
                    div()
                        .px_1()
                        .rounded_sm()
                        .bg(theme::color(theme::BG_CANVAS))
                        .border_1()
                        .border_color(theme::color(theme::MVP_GOLD))
                        .text_xs()
                        .font_weight(FontWeight::BOLD)
                        .text_color(theme::color(theme::MVP_GOLD))
                        .child(tag.to_string())
                }))),
        )
        .child(
            div()
                .text_xs()
                .font_weight(if is_known_pro {
                    FontWeight::SEMIBOLD
                } else {
                    FontWeight::NORMAL
                })
                .text_color(theme::color(name_col))
                .child(player_name.to_string()),
        )
}

/// Renders a single circular Rune Medallion (`active` glows with tree ring, `inactive` dimmed in `BG_ELEVATED`).
pub fn rune_medallion(
    code: &str,
    ring_hex: u32,
    active: bool,
    is_keystone: bool,
) -> impl IntoElement {
    let sz = if is_keystone { px(42.) } else { px(32.) };
    let bg = if active {
        theme::color_alpha(ring_hex, 0.22)
    } else {
        theme::color(theme::BG_ELEVATED)
    };
    let border = if active {
        theme::color(ring_hex)
    } else {
        theme::color(theme::BORDER_MUTED)
    };
    let text_col = if active {
        theme::color(theme::TEXT_PRIMARY)
    } else {
        theme::color(theme::TEXT_FAINT)
    };

    div()
        .w(sz)
        .h(sz)
        .rounded_full()
        .bg(bg)
        .border_2()
        .border_color(border)
        .flex()
        .items_center()
        .justify_center()
        .text_xs()
        .font_weight(if active {
            FontWeight::BOLD
        } else {
            FontWeight::NORMAL
        })
        .text_color(text_col)
        .child(code.to_string())
}

/// Renders a compact square Item Tile (`28x28`) with an optional percentage caption below (Screenshot 1 & 3).
pub fn item_tile(label: &str, accent_hex: u32, pct_below: Option<&str>) -> impl IntoElement {
    div()
        .flex()
        .flex_col()
        .items_center()
        .gap_1()
        .child(
            div()
                .w(px(28.))
                .h(px(28.))
                .rounded_sm()
                .bg(theme::color_alpha(accent_hex, 0.22))
                .border_1()
                .border_color(theme::color_alpha(accent_hex, 0.65))
                .flex()
                .items_center()
                .justify_center()
                .text_xs()
                .font_weight(FontWeight::BOLD)
                .text_color(theme::color(theme::TEXT_PRIMARY))
                .child(label.to_string()),
        )
        .children(pct_below.map(|pct| {
            div()
                .text_xs()
                .text_color(theme::color(theme::TEXT_SECONDARY))
                .child(pct.to_string())
        }))
}

/// Renders a circular Score Ring Medallion (`30x30` or `48x48` hero) matching Screenshot 3 (Post-game).
pub fn score_ring_medallion(score: f64, large: bool) -> impl IntoElement {
    let ring_col = theme::score_ring_color(score);
    let dim = if large { px(48.) } else { px(28.) };

    div()
        .w(dim)
        .h(dim)
        .rounded_full()
        .bg(theme::color_alpha(ring_col, 0.12))
        .border_2()
        .border_color(theme::color(ring_col))
        .flex()
        .items_center()
        .justify_center()
        .font_weight(FontWeight::BOLD)
        .text_color(theme::color(theme::TEXT_PRIMARY))
        .child(if large {
            div().text_base().child(format!("{:.0}", score))
        } else {
            div().text_xs().child(format!("{:.0}", score))
        })
}

/// Renders a vertical Skin Collection Poster Card (`164px x 220px`) matching Screenshot 5 (Collection).
pub fn skin_poster_card(
    skin_name: &str,
    champ_name: &str,
    price_label: &str,
    gem_hex: u32,
) -> impl IntoElement {
    let (bg_top, bg_bot, accent) = theme::champion_palette(skin_name);

    div()
        .w(px(164.))
        .h(px(216.))
        .rounded_lg()
        .bg(theme::color(bg_top))
        .border_1()
        .border_color(theme::color_alpha(accent, 0.5))
        .flex()
        .flex_col()
        .justify_between()
        .overflow_hidden()
        .child(
            div()
                .p_2()
                .flex()
                .flex_row()
                .justify_between()
                .items_center()
                .child(
                    div()
                        .px_1()
                        .rounded_sm()
                        .bg(theme::color_alpha(theme::BG_CANVAS, 0.75))
                        .text_xs()
                        .text_color(theme::color(theme::TEXT_SECONDARY))
                        .child(champ_name.to_string()),
                )
                .child(
                    div()
                        .w(px(20.))
                        .h(px(20.))
                        .rounded_full()
                        .bg(theme::color_alpha(theme::BG_CANVAS, 0.85))
                        .border_1()
                        .border_color(theme::color(gem_hex))
                        .flex()
                        .items_center()
                        .justify_center()
                        .text_xs()
                        .text_color(theme::color(gem_hex))
                        .child("◆"),
                ),
        )
        .child(
            div()
                .flex()
                .justify_center()
                .child(Avatar::new().name(champ_name.to_string()).large()),
        )
        .child(
            div()
                .w_full()
                .p_2()
                .bg(theme::color_alpha(bg_bot, 0.92))
                .border_t_1()
                .border_color(theme::color(theme::BORDER_SUBTLE))
                .flex()
                .flex_col()
                .gap_1()
                .child(
                    div()
                        .text_xs()
                        .font_weight(FontWeight::BOLD)
                        .text_color(theme::color(theme::TEXT_PRIMARY))
                        .child(skin_name.to_string()),
                )
                .child(
                    div()
                        .text_xs()
                        .text_color(theme::color(theme::TEXT_SECONDARY))
                        .child(price_label.to_string()),
                ),
        )
}
