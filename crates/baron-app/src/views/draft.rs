//! Screen 1: `✦ Champ Select` — 5v5 Draft Portraits, Win Probability Bar, Team Comp Radar,
//! Visual Rune Medallion Tree, Build Archetypes, Pro Builds, and Item Progression (DPM v1.8.1).

use gpui_kit::component::avatar::Avatar;
use gpui_kit::component::button::{Button, ButtonVariants as _};
use gpui_kit::component::chart::RadarChart;
use gpui_kit::component::switch::Switch;
use gpui_kit::component::tag::Tag;
use gpui_kit::component::Sizable as _;
use gpui_kit::*;

use crate::rune_ui::{draft_vertical_portrait, item_tile, rune_medallion};
use crate::theme;
use crate::workspace::BaronWorkspace;

#[derive(Clone, Debug, PartialEq)]
struct CompRadarPoint {
    axis: String,
    score: f64,
}

pub fn render(
    ws: &BaronWorkspace,
    _: &mut Window,
    cx: &Context<BaronWorkspace>,
) -> impl IntoElement {
    div()
        .flex()
        .flex_col()
        .gap_3()
        .child(render_win_probability_bar())
        .child(render_draft_5v5_strip())
        .child(render_loadout_workbench(ws, cx))
}

fn render_win_probability_bar() -> impl IntoElement {
    let blue_bans = ["Zed", "Blitz", "Yasuo", "Drav", "LB"];
    let red_bans = ["Skar", "Rumb", "Kali", "Sej", "Sylas"];

    div()
        .h(px(46.))
        .px_3()
        .rounded_lg()
        .bg(theme::color(theme::BG_SURFACE))
        .border_1()
        .border_color(theme::color(theme::BORDER_SUBTLE))
        .flex()
        .flex_row()
        .items_center()
        .justify_between()
        .gap_4()
        .child(
            div()
                .flex()
                .flex_row()
                .items_center()
                .gap_1()
                .children(blue_bans.into_iter().map(|b| {
                    div()
                        .w(px(28.))
                        .h(px(28.))
                        .rounded_sm()
                        .bg(theme::color(theme::BG_ELEVATED))
                        .border_1()
                        .border_color(theme::color(theme::BORDER_SUBTLE))
                        .flex()
                        .items_center()
                        .justify_center()
                        .text_xs()
                        .text_color(theme::color(theme::TEXT_FAINT))
                        .child(b)
                })),
        )
        .child(
            div()
                .flex_1()
                .flex()
                .flex_col()
                .gap_1()
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .items_center()
                        .justify_between()
                        .child(
                            div()
                                .text_sm()
                                .font_weight(FontWeight::BOLD)
                                .text_color(theme::color(theme::VICTORY_BLUE))
                                .child("54%"),
                        )
                        .child(
                            div()
                                .text_xs()
                                .font_weight(FontWeight::SEMIBOLD)
                                .text_color(theme::color(theme::TEXT_FAINT))
                                .child("WIN PROBABILITY"),
                        )
                        .child(
                            div()
                                .text_sm()
                                .font_weight(FontWeight::BOLD)
                                .text_color(theme::color(theme::DEFEAT_RED))
                                .child("46%"),
                        ),
                )
                .child(
                    div()
                        .w_full()
                        .h(px(6.))
                        .rounded_full()
                        .bg(theme::color(theme::DEFEAT_RED))
                        .overflow_hidden()
                        .flex()
                        .flex_row()
                        .child(
                            div()
                                .w(relative(0.54))
                                .h_full()
                                .bg(theme::color(theme::VICTORY_BLUE)),
                        ),
                ),
        )
        .child(
            div()
                .flex()
                .flex_row()
                .items_center()
                .gap_1()
                .children(red_bans.into_iter().map(|b| {
                    div()
                        .w(px(28.))
                        .h(px(28.))
                        .rounded_sm()
                        .bg(theme::color(theme::BG_ELEVATED))
                        .border_1()
                        .border_color(theme::color(theme::BORDER_SUBTLE))
                        .flex()
                        .items_center()
                        .justify_center()
                        .text_xs()
                        .text_color(theme::color(theme::TEXT_FAINT))
                        .child(b)
                })),
        )
}

fn render_draft_5v5_strip() -> impl IntoElement {
    let radar_pts = vec![
        CompRadarPoint {
            axis: "EARLY".into(),
            score: 76.0,
        },
        CompRadarPoint {
            axis: "MID".into(),
            score: 84.0,
        },
        CompRadarPoint {
            axis: "LATE".into(),
            score: 88.0,
        },
        CompRadarPoint {
            axis: "DMG".into(),
            score: 79.0,
        },
        CompRadarPoint {
            axis: "OBJ".into(),
            score: 74.0,
        },
        CompRadarPoint {
            axis: "SYNERGY".into(),
            score: 91.0,
        },
    ];

    div()
        .p_3()
        .rounded_lg()
        .bg(theme::color(theme::BG_SURFACE))
        .border_1()
        .border_color(theme::color(theme::BORDER_SUBTLE))
        .flex()
        .flex_row()
        .items_center()
        .justify_between()
        .gap_2()
        .child(
            div()
                .flex()
                .flex_row()
                .gap_2()
                .child(draft_vertical_portrait(
                    "Gnar",
                    "Top",
                    "B",
                    "+1.82",
                    Some(true),
                ))
                .child(draft_vertical_portrait(
                    "Vi",
                    "Jg",
                    "A",
                    "+2.34",
                    Some(true),
                ))
                .child(draft_vertical_portrait("Ahri", "Mid", "S+", "⎯", None))
                .child(draft_vertical_portrait(
                    "Jinx",
                    "Bot",
                    "S",
                    "-0.91",
                    Some(true),
                ))
                .child(draft_vertical_portrait("Nautilus", "Sup", "B", "⎯", None)),
        )
        .child(
            div().w(px(140.)).h(px(140.)).child(
                RadarChart::new(radar_pts)
                    .label(|d| d.axis.clone())
                    .value(|d| d.score)
                    .stroke(theme::color_alpha(theme::DEFEAT_RED, 0.95))
                    .fill(theme::color_alpha(theme::VICTORY_BLUE, 0.28)),
            ),
        )
        .child(
            div()
                .flex()
                .flex_row()
                .gap_2()
                .child(draft_vertical_portrait(
                    "Aatrox",
                    "Top",
                    "B",
                    "-0.64",
                    Some(false),
                ))
                .child(draft_vertical_portrait(
                    "Lee Sin",
                    "Jg",
                    "C",
                    "+1.19",
                    Some(false),
                ))
                .child(draft_vertical_portrait("Orianna", "Mid", "B", "⎯", None))
                .child(draft_vertical_portrait(
                    "Kai'Sa",
                    "Bot",
                    "A",
                    "+2.07",
                    Some(false),
                ))
                .child(draft_vertical_portrait("Rakan", "Sup", "B", "⎯", None)),
        )
}

fn render_loadout_workbench(ws: &BaronWorkspace, cx: &Context<BaronWorkspace>) -> impl IntoElement {
    div()
        .flex()
        .flex_row()
        .gap_3()
        .child(render_builds_and_pros_column(ws, cx))
        .child(render_visual_rune_tree_column(ws, cx))
        .child(render_summoners_and_items_column(ws, cx))
}

fn render_builds_and_pros_column(
    ws: &BaronWorkspace,
    cx: &Context<BaronWorkspace>,
) -> impl IntoElement {
    let builds = [
        ("Crit", "37,897 games", "49%", theme::ACCENT_PRIMARY),
        (
            "On-Hit & Attack Speed",
            "6,204 games",
            "51%",
            theme::POSITIVE_GREEN,
        ),
        ("Lethality", "1,839 games", "49%", theme::DEFEAT_RED),
    ];
    let pros = [
        ("Gumayusi", "T1 · 5 hours ago", "LT"),
        ("Peyz", "GEN · yesterday", "LT"),
        ("Viper", "HLE · yesterday", "LT"),
        ("Hans Sama", "G2 · 2 days ago", "LT"),
        ("Caliste", "KC · 2 days ago", "HoB"),
        ("Noah", "FNC · 2 days ago", "LT"),
    ];

    div()
        .w(px(260.))
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
                .flex()
                .flex_row()
                .items_center()
                .justify_between()
                .child(Avatar::new().name("Ashe").small().rounded_md())
                .child(div().flex().flex_row().gap_1().children(
                    ["Top", "Jg", "Mid", "Bot", "Sup"].into_iter().map(|r| {
                        let is_bot = r == "Bot";
                        div()
                            .px_2()
                            .py(px(2.))
                            .rounded_sm()
                            .bg(if is_bot {
                                theme::color_alpha(theme::ACCENT_PRIMARY, 0.25)
                            } else {
                                theme::color(theme::BG_ELEVATED)
                            })
                            .border_1()
                            .border_color(if is_bot {
                                theme::color(theme::ACCENT_PRIMARY)
                            } else {
                                theme::color(theme::BORDER_SUBTLE)
                            })
                            .text_xs()
                            .text_color(theme::color(if is_bot {
                                theme::TEXT_PRIMARY
                            } else {
                                theme::TEXT_SECONDARY
                            }))
                            .child(r)
                    }),
                )),
        )
        .child(
            div()
                .text_xs()
                .font_weight(FontWeight::SEMIBOLD)
                .text_color(theme::color(theme::TEXT_FAINT))
                .child("BUILDS"),
        )
        .children(
            builds
                .into_iter()
                .enumerate()
                .map(|(idx, (name, games, wr, col))| {
                    let active = ws.selected_build_idx == idx;
                    div()
                        .id(SharedString::from(format!("build-archetype-{idx}")))
                        .p_2()
                        .rounded_md()
                        .bg(if active {
                            theme::color_alpha(theme::ACCENT_PRIMARY, 0.16)
                        } else {
                            theme::color(theme::BG_ELEVATED)
                        })
                        .border_1()
                        .border_color(if active {
                            theme::color(theme::ACCENT_PRIMARY)
                        } else {
                            theme::color(theme::BORDER_SUBTLE)
                        })
                        .flex()
                        .flex_row()
                        .items_center()
                        .justify_between()
                        .cursor_pointer()
                        .on_click(cx.listener(move |this, _, _, cx| {
                            this.selected_build_idx = idx;
                            cx.notify();
                        }))
                        .child(
                            div()
                                .flex()
                                .flex_col()
                                .child(
                                    div()
                                        .text_xs()
                                        .font_weight(FontWeight::BOLD)
                                        .text_color(theme::color(if active {
                                            theme::ACCENT_SOFT
                                        } else {
                                            theme::TEXT_PRIMARY
                                        }))
                                        .child(name),
                                )
                                .child(
                                    div()
                                        .text_xs()
                                        .text_color(theme::color(theme::TEXT_FAINT))
                                        .child(games),
                                ),
                        )
                        .child(
                            div()
                                .flex()
                                .flex_row()
                                .items_center()
                                .gap_1()
                                .child(item_tile("KS", theme::MVP_GOLD, None))
                                .child(item_tile("PD", theme::CHALLENGER_CYAN, None))
                                .child(
                                    div()
                                        .px_1()
                                        .rounded_sm()
                                        .bg(theme::color_alpha(col, 0.2))
                                        .text_xs()
                                        .font_weight(FontWeight::BOLD)
                                        .text_color(theme::color(col))
                                        .child(wr),
                                ),
                        )
                }),
        )
        .child(
            div()
                .text_xs()
                .font_weight(FontWeight::SEMIBOLD)
                .text_color(theme::color(theme::TEXT_FAINT))
                .child("PRO BUILDS"),
        )
        .children(pros.into_iter().map(|(pro, when, keystone)| {
            div()
                .py_1()
                .border_b_1()
                .border_color(theme::color(theme::BORDER_MUTED))
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
                        .child(Avatar::new().name(pro).xsmall())
                        .child(
                            div()
                                .flex()
                                .flex_col()
                                .child(div().text_xs().font_weight(FontWeight::SEMIBOLD).child(pro))
                                .child(
                                    div()
                                        .text_xs()
                                        .text_color(theme::color(theme::TEXT_FAINT))
                                        .child(when),
                                ),
                        ),
                )
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .items_center()
                        .gap_1()
                        .child(rune_medallion(keystone, theme::MVP_GOLD, true, false))
                        .child(item_tile("KS", theme::MVP_GOLD, None))
                        .child(item_tile("PD", theme::CHALLENGER_CYAN, None))
                        .child(item_tile("IE", theme::ACCENT_PRIMARY, None)),
                )
        }))
}

fn render_visual_rune_tree_column(
    ws: &BaronWorkspace,
    cx: &Context<BaronWorkspace>,
) -> impl IntoElement {
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
        .gap_4()
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
                        .child(div().text_sm().font_weight(FontWeight::BOLD).child("Runes"))
                        .child(
                            Button::new("import-runes-btn")
                                .label("↓ Import")
                                .xsmall()
                                .ghost(),
                        )
                        .child(
                            Tag::secondary()
                                .small()
                                .child(format!("Baron: {}", ws.data.draft.champion_name)),
                        ),
                )
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .items_center()
                        .gap_2()
                        .child(
                            div()
                                .text_xs()
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child("Auto-Import"),
                        )
                        .child(
                            Switch::new("draft-auto-runes")
                                .checked(ws.auto_runes)
                                .small()
                                .on_change(cx.listener(|this, c, _, cx| {
                                    this.auto_runes = *c;
                                    cx.notify();
                                })),
                        ),
                ),
        )
        // Visual Primary + Secondary Rune Medallion Grid (Matches Screenshot 1 center panel)
        .child(
            div()
                .py_4()
                .flex()
                .flex_row()
                .justify_center()
                .gap_10()
                // Primary Tree (Precision)
                .child(
                    div()
                        .flex()
                        .flex_col()
                        .items_center()
                        .gap_4()
                        // Style selector row
                        .child(
                            div()
                                .flex()
                                .flex_row()
                                .gap_2()
                                .child(rune_medallion("PRC", theme::MVP_GOLD, true, false))
                                .child(rune_medallion("DOM", theme::DEFEAT_RED, false, false))
                                .child(rune_medallion("SOR", theme::ACCENT_PRIMARY, false, false))
                                .child(rune_medallion("RES", theme::POSITIVE_GREEN, false, false))
                                .child(rune_medallion("INS", theme::CHALLENGER_CYAN, false, false)),
                        )
                        // Keystone row
                        .child(
                            div()
                                .flex()
                                .flex_row()
                                .items_center()
                                .gap_3()
                                .child(rune_medallion("PTA", theme::MVP_GOLD, false, true))
                                .child(rune_medallion("LT", theme::MVP_GOLD, true, true))
                                .child(rune_medallion("FF", theme::MVP_GOLD, false, true))
                                .child(rune_medallion("CNQ", theme::MVP_GOLD, false, true)),
                        )
                        // Primary Row 1
                        .child(
                            div()
                                .flex()
                                .flex_row()
                                .gap_4()
                                .child(rune_medallion("ABS", theme::MVP_GOLD, false, false))
                                .child(rune_medallion("PoM", theme::MVP_GOLD, true, false))
                                .child(rune_medallion("TRI", theme::MVP_GOLD, false, false)),
                        )
                        // Primary Row 2
                        .child(
                            div()
                                .flex()
                                .flex_row()
                                .gap_4()
                                .child(rune_medallion("ALA", theme::MVP_GOLD, true, false))
                                .child(rune_medallion("HST", theme::MVP_GOLD, false, false))
                                .child(rune_medallion("BLD", theme::MVP_GOLD, false, false)),
                        )
                        // Primary Row 3
                        .child(
                            div()
                                .flex()
                                .flex_row()
                                .gap_4()
                                .child(rune_medallion("CdG", theme::MVP_GOLD, false, false))
                                .child(rune_medallion("CUT", theme::MVP_GOLD, true, false))
                                .child(rune_medallion("LST", theme::MVP_GOLD, false, false)),
                        ),
                )
                // Secondary Tree (Domination + Stat Shards)
                .child(
                    div()
                        .flex()
                        .flex_col()
                        .items_center()
                        .gap_3()
                        // Style selector row
                        .child(
                            div()
                                .flex()
                                .flex_row()
                                .gap_2()
                                .child(rune_medallion("DOM", theme::DEFEAT_RED, true, false))
                                .child(rune_medallion("SOR", theme::ACCENT_PRIMARY, false, false))
                                .child(rune_medallion("RES", theme::POSITIVE_GREEN, false, false))
                                .child(rune_medallion("INS", theme::CHALLENGER_CYAN, false, false)),
                        )
                        // Secondary Row 1
                        .child(
                            div()
                                .flex()
                                .flex_row()
                                .gap_3()
                                .child(rune_medallion("CS", theme::DEFEAT_RED, false, false))
                                .child(rune_medallion("ToB", theme::DEFEAT_RED, true, false))
                                .child(rune_medallion("SI", theme::DEFEAT_RED, false, false)),
                        )
                        // Secondary Row 2
                        .child(
                            div()
                                .flex()
                                .flex_row()
                                .gap_3()
                                .child(rune_medallion("SX", theme::DEFEAT_RED, false, false))
                                .child(rune_medallion("GM", theme::DEFEAT_RED, false, false))
                                .child(rune_medallion("DW", theme::DEFEAT_RED, false, false)),
                        )
                        // Secondary Row 3
                        .child(
                            div()
                                .flex()
                                .flex_row()
                                .gap_3()
                                .child(rune_medallion("TH", theme::DEFEAT_RED, true, false))
                                .child(rune_medallion("RH", theme::DEFEAT_RED, false, false))
                                .child(rune_medallion("UH", theme::DEFEAT_RED, false, false)),
                        )
                        // Stat Shards (3 rows of 3 circular pips)
                        .child(
                            div()
                                .pt_2()
                                .flex()
                                .flex_col()
                                .gap_2()
                                .child(
                                    div()
                                        .flex()
                                        .flex_row()
                                        .gap_3()
                                        .child(rune_medallion(
                                            "♦",
                                            theme::ACCENT_SOFT,
                                            false,
                                            false,
                                        ))
                                        .child(rune_medallion("⚔", theme::MVP_GOLD, true, false))
                                        .child(rune_medallion(
                                            "⧗",
                                            theme::ACCENT_SOFT,
                                            false,
                                            false,
                                        )),
                                )
                                .child(
                                    div()
                                        .flex()
                                        .flex_row()
                                        .gap_3()
                                        .child(rune_medallion("♦", theme::ACE_PURPLE, true, false))
                                        .child(rune_medallion(
                                            "»",
                                            theme::ACCENT_SOFT,
                                            false,
                                            false,
                                        ))
                                        .child(rune_medallion(
                                            "♥",
                                            theme::POSITIVE_GREEN,
                                            false,
                                            false,
                                        )),
                                )
                                .child(
                                    div()
                                        .flex()
                                        .flex_row()
                                        .gap_3()
                                        .child(rune_medallion(
                                            "♥",
                                            theme::POSITIVE_GREEN,
                                            true,
                                            false,
                                        ))
                                        .child(rune_medallion(
                                            "🛡",
                                            theme::ACCENT_SOFT,
                                            false,
                                            false,
                                        ))
                                        .child(rune_medallion(
                                            "✚",
                                            theme::POSITIVE_GREEN,
                                            false,
                                            false,
                                        )),
                                ),
                        ),
                ),
        )
        // Bottom Skill Max Order Strip
        .child(
            div()
                .pt_3()
                .border_t_1()
                .border_color(theme::color(theme::BORDER_SUBTLE))
                .flex()
                .flex_col()
                .gap_2()
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .items_center()
                        .gap_2()
                        .child(
                            div()
                                .text_xs()
                                .font_weight(FontWeight::BOLD)
                                .child("Skill max order"),
                        )
                        .child(
                            div()
                                .text_xs()
                                .text_color(theme::color(theme::TEXT_FAINT))
                                .child("37,897 games"),
                        ),
                )
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .items_center()
                        .gap_2()
                        .child(item_tile("W", theme::CHALLENGER_CYAN, None))
                        .child(div().text_xs().child(">"))
                        .child(item_tile("Q", theme::ACCENT_PRIMARY, None))
                        .child(div().text_xs().child(">"))
                        .child(item_tile("E", theme::ACE_PURPLE, None)),
                ),
        )
}

fn render_summoners_and_items_column(
    ws: &BaronWorkspace,
    cx: &Context<BaronWorkspace>,
) -> impl IntoElement {
    div()
        .w(px(236.))
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
                .flex()
                .flex_row()
                .items_center()
                .justify_between()
                .child(
                    div()
                        .text_xs()
                        .font_weight(FontWeight::BOLD)
                        .child("Summoners"),
                )
                .child(
                    Switch::new("draft-auto-spells")
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
                .gap_2()
                .child(item_tile("FL", theme::MVP_GOLD, None))
                .child(item_tile("HL", theme::POSITIVE_GREEN, None))
                .child(
                    div()
                        .text_xs()
                        .text_color(theme::color(theme::TEXT_FAINT))
                        .child("⇄"),
                ),
        )
        .child(
            div()
                .pt_2()
                .border_t_1()
                .border_color(theme::color(theme::BORDER_SUBTLE))
                .flex()
                .flex_row()
                .items_center()
                .justify_between()
                .child(div().text_xs().font_weight(FontWeight::BOLD).child("Items"))
                .child(
                    Switch::new("draft-auto-items")
                        .checked(ws.auto_items)
                        .small()
                        .on_change(cx.listener(|this, c, _, cx| {
                            this.auto_items = *c;
                            cx.notify();
                        })),
                ),
        )
        .child(
            div()
                .flex()
                .flex_col()
                .gap_1()
                .child(
                    div()
                        .text_xs()
                        .text_color(theme::color(theme::TEXT_FAINT))
                        .child("Starting items"),
                )
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .gap_2()
                        .child(item_tile("DB", theme::DEFEAT_RED, None))
                        .child(item_tile("HP", theme::POSITIVE_GREEN, None)),
                ),
        )
        .child(
            div()
                .flex()
                .flex_col()
                .gap_1()
                .child(
                    div()
                        .text_xs()
                        .text_color(theme::color(theme::TEXT_FAINT))
                        .child("Core build order"),
                )
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .items_center()
                        .gap_1()
                        .child(item_tile("BG", theme::MVP_GOLD, None))
                        .child(div().text_xs().child("›"))
                        .child(item_tile("KS", theme::MVP_GOLD, None))
                        .child(div().text_xs().child("›"))
                        .child(item_tile("PD", theme::CHALLENGER_CYAN, None))
                        .child(div().text_xs().child("›"))
                        .child(item_tile("IE", theme::ACCENT_PRIMARY, None)),
                ),
        )
        .child(
            div()
                .flex()
                .flex_col()
                .gap_1()
                .child(
                    div()
                        .text_xs()
                        .text_color(theme::color(theme::TEXT_FAINT))
                        .child("Completed items"),
                )
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .gap_2()
                        .child(item_tile("KS", theme::MVP_GOLD, Some("71%")))
                        .child(item_tile("PD", theme::CHALLENGER_CYAN, Some("58%")))
                        .child(item_tile("IE", theme::ACCENT_PRIMARY, Some("52%")))
                        .child(item_tile("BT", theme::DEFEAT_RED, Some("34%")))
                        .child(item_tile("LD", theme::ACE_PURPLE, Some("21%"))),
                ),
        )
        .child(
            div()
                .flex()
                .flex_col()
                .gap_1()
                .child(
                    div()
                        .text_xs()
                        .text_color(theme::color(theme::TEXT_FAINT))
                        .child("Situational"),
                )
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .gap_2()
                        .child(item_tile("GA", theme::MVP_GOLD, Some("38%")))
                        .child(item_tile("MR", theme::POSITIVE_GREEN, Some("24%")))
                        .child(item_tile("WE", theme::CHALLENGER_CYAN, Some("22%")))
                        .child(item_tile("SB", theme::DEFEAT_RED, Some("17%")))
                        .child(item_tile("RH", theme::ACE_PURPLE, Some("12%"))),
                ),
        )
}
