//! Screens 2, 4, 5 & Extras: `Spectate`, `Tierlist & Builds`, `Collections (Skin Vault)`,
//! `Leaderboards`, and `Data Studio` matching DPM APP v1.8.1.

use baron_riot::FallbackProvider;
use gpui_kit::component::avatar::Avatar;
use gpui_kit::component::button::{Button, ButtonVariants as _};
use gpui_kit::component::switch::Switch;
use gpui_kit::component::tag::Tag;
use gpui_kit::component::Sizable as _;
use gpui_kit::*;

use crate::rune_ui::{
    champ_square_avatar, rune_accent_card, rune_segmented_bar, skin_poster_card,
    spectate_champ_strip,
};
use crate::theme;
use crate::workspace::BaronWorkspace;

struct TierRowSpec {
    rank: u32,
    champ: &'static str,
    role_label: &'static str,
    role_pct: &'static str,
    tier: &'static str,
    wr: &'static str,
    wr_delta: &'static str,
    wr_pos: bool,
    pr: &'static str,
    games: &'static str,
}

type SpectateSlot = (
    &'static str,
    &'static str,
    Option<&'static str>,
    &'static str,
    bool,
);

struct SpectateMatchSpec {
    duration: &'static str,
    region: &'static str,
    rank_label: &'static str,
    lp_label: &'static str,
    is_challenger: bool,
    known_label: &'static str,
    blue: [SpectateSlot; 5],
    red: [SpectateSlot; 5],
}

/// Screen 4: `Tierlist & Builds` (Matches DPM APP v1.8.1 Screenshot 4).
pub fn render_tier_list(
    ws: &BaronWorkspace,
    _: &mut Window,
    cx: &Context<BaronWorkspace>,
) -> impl IntoElement {
    let rows = [
        TierRowSpec {
            rank: 1,
            champ: "Ahri",
            role_label: "Mid",
            role_pct: "97.8%",
            tier: "S+",
            wr: "52.6%",
            wr_delta: "+0.8%",
            wr_pos: true,
            pr: "11.2%",
            games: "412,884",
        },
        TierRowSpec {
            rank: 2,
            champ: "Lee Sin",
            role_label: "Jg",
            role_pct: "96.1%",
            tier: "S+",
            wr: "50.9%",
            wr_delta: "-0.4%",
            wr_pos: false,
            pr: "17.6%",
            games: "648,310",
        },
        TierRowSpec {
            rank: 3,
            champ: "Jinx",
            role_label: "Bot",
            role_pct: "99.2%",
            tier: "S+",
            wr: "52.1%",
            wr_delta: "+1.2%",
            wr_pos: true,
            pr: "14.8%",
            games: "545,102",
        },
        TierRowSpec {
            rank: 4,
            champ: "Thresh",
            role_label: "Sup",
            role_pct: "98.5%",
            tier: "S+",
            wr: "51.2%",
            wr_delta: "+0.3%",
            wr_pos: true,
            pr: "12.9%",
            games: "475,220",
        },
        TierRowSpec {
            rank: 5,
            champ: "Aatrox",
            role_label: "Top",
            role_pct: "94.3%",
            tier: "S+",
            wr: "50.7%",
            wr_delta: "-0.2%",
            wr_pos: false,
            pr: "10.4%",
            games: "383,071",
        },
        TierRowSpec {
            rank: 6,
            champ: "Kai'Sa",
            role_label: "Bot",
            role_pct: "99.6%",
            tier: "S",
            wr: "50.4%",
            wr_delta: "-1.1%",
            wr_pos: false,
            pr: "19.3%",
            games: "710,944",
        },
        TierRowSpec {
            rank: 7,
            champ: "Syndra",
            role_label: "Mid",
            role_pct: "96.4%",
            tier: "S",
            wr: "51.8%",
            wr_delta: "+0.6%",
            wr_pos: true,
            pr: "6.9%",
            games: "254,180",
        },
        TierRowSpec {
            rank: 8,
            champ: "Viego",
            role_label: "Jg",
            role_pct: "97.7%",
            tier: "S",
            wr: "50.8%",
            wr_delta: "+0.2%",
            wr_pos: true,
            pr: "9.8%",
            games: "360,962",
        },
        TierRowSpec {
            rank: 9,
            champ: "Nautilus",
            role_label: "Sup",
            role_pct: "95.9%",
            tier: "S",
            wr: "50.6%",
            wr_delta: "-0.6%",
            wr_pos: false,
            pr: "11.1%",
            games: "408,870",
        },
        TierRowSpec {
            rank: 10,
            champ: "Jax",
            role_label: "Top",
            role_pct: "81.2%",
            tier: "S",
            wr: "51.4%",
            wr_delta: "+0.9%",
            wr_pos: true,
            pr: "6.2%",
            games: "228,392",
        },
        TierRowSpec {
            rank: 11,
            champ: "Orianna",
            role_label: "Mid",
            role_pct: "99.1%",
            tier: "A",
            wr: "51.6%",
            wr_delta: "+1.4%",
            wr_pos: true,
            pr: "4.8%",
            games: "176,816",
        },
        TierRowSpec {
            rank: 12,
            champ: "Ezreal",
            role_label: "Bot",
            role_pct: "98.8%",
            tier: "A",
            wr: "49.6%",
            wr_delta: "-0.7%",
            wr_pos: false,
            pr: "16.2%",
            games: "596,720",
        },
        TierRowSpec {
            rank: 13,
            champ: "Jarvan IV",
            role_label: "Jg",
            role_pct: "93.4%",
            tier: "A",
            wr: "51.1%",
            wr_delta: "+0.5%",
            wr_pos: true,
            pr: "5.4%",
            games: "198,914",
        },
        TierRowSpec {
            rank: 14,
            champ: "Lulu",
            role_label: "Sup",
            role_pct: "94.7%",
            tier: "A",
            wr: "50.9%",
            wr_delta: "+0.1%",
            wr_pos: true,
            pr: "7.7%",
            games: "283,636",
        },
        TierRowSpec {
            rank: 15,
            champ: "Garen",
            role_label: "Top",
            role_pct: "88.6%",
            tier: "A",
            wr: "52.2%",
            wr_delta: "-0.3%",
            wr_pos: false,
            pr: "4.1%",
            games: "151,024",
        },
    ];

    div()
        .flex()
        .flex_col()
        .gap_3()
        // Header Row
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
                        .gap_4()
                        .child(
                            div()
                                .text_xl()
                                .font_weight(FontWeight::BOLD)
                                .child("▤  Tierlist"),
                        )
                        .child(
                            div()
                                .text_xs()
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child(
                                    "Explore Baron Tierlists and stay ahead of the meta with the latest champion rankings for your role!",
                                ),
                        ),
                )
                .child(rune_segmented_bar(
                    &["Ranked", "Aram", "Arena", "Duo"],
                    ws.tierlist_mode_idx,
                    true,
                )),
        )
        // Filter Toolbar
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
                        .child(rune_segmented_bar(
                            &["*", "Top", "Jg", "Mid", "Bot", "Sup"],
                            ws.tierlist_role_idx,
                            true,
                        ))
                        .child(
                            div()
                                .px_3()
                                .h(px(28.))
                                .rounded_md()
                                .bg(theme::color(theme::BG_SURFACE))
                                .border_1()
                                .border_color(theme::color(theme::BORDER_SUBTLE))
                                .flex()
                                .items_center()
                                .text_xs()
                                .font_weight(FontWeight::BOLD)
                                .text_color(theme::color(theme::POSITIVE_GREEN))
                                .child("❖ EMERALD+  ▾"),
                        )
                        .child(
                            div()
                                .px_3()
                                .h(px(28.))
                                .rounded_md()
                                .bg(theme::color(theme::BG_SURFACE))
                                .border_1()
                                .border_color(theme::color(theme::BORDER_SUBTLE))
                                .flex()
                                .items_center()
                                .text_xs()
                                .text_color(theme::color(theme::TEXT_PRIMARY))
                                .child("🌐 ALL REGIONS  ▾"),
                        )
                        .child(
                            div()
                                .px_3()
                                .h(px(28.))
                                .rounded_md()
                                .bg(theme::color(theme::BG_SURFACE))
                                .border_1()
                                .border_color(theme::color(theme::BORDER_SUBTLE))
                                .flex()
                                .items_center()
                                .text_xs()
                                .text_color(theme::color(theme::TEXT_PRIMARY))
                                .child("16.22  ▾"),
                        )
                        .child(
                            div()
                                .flex()
                                .flex_row()
                                .items_center()
                                .gap_2()
                                .child(
                                    Switch::new("tierlist-off-meta")
                                        .checked(ws.off_meta)
                                        .small()
                                        .on_change(cx.listener(|this, c, _, cx| {
                                            this.off_meta = *c;
                                            cx.notify();
                                        })),
                                )
                                .child(
                                    div()
                                        .text_xs()
                                        .text_color(theme::color(theme::TEXT_SECONDARY))
                                        .child("OFF-META"),
                                ),
                        ),
                )
                .child(
                    div()
                        .flex()
                        .flex_row()
                        .items_center()
                        .gap_1()
                        .child(
                            Tag::primary()
                                .small()
                                .child(FallbackProvider::Lolalytics.label()),
                        )
                        .child(
                            Tag::secondary()
                                .small()
                                .child(FallbackProvider::MetaSrc.label()),
                        ),
                ),
        )
        // Full-width Tierlist Data Table
        .child(
            div()
                .rounded_lg()
                .bg(theme::color(theme::BG_SURFACE))
                .border_1()
                .border_color(theme::color(theme::BORDER_SUBTLE))
                .overflow_hidden()
                .flex()
                .flex_col()
                // Header
                .child(
                    div()
                        .px_4()
                        .py_2()
                        .border_b_1()
                        .border_color(theme::color(theme::BORDER_SUBTLE))
                        .flex()
                        .flex_row()
                        .items_center()
                        .justify_between()
                        .text_xs()
                        .font_weight(FontWeight::SEMIBOLD)
                        .text_color(theme::color(theme::TEXT_FAINT))
                        .child(div().w(px(50.)).child("RANK"))
                        .child(div().w(px(220.)).child("CHAMPION"))
                        .child(div().w(px(90.)).child("LANE"))
                        .child(div().w(px(90.)).child("TIER  ▼"))
                        .child(div().w(px(100.)).child("WINRATE"))
                        .child(div().w(px(100.)).child("PICKRATE"))
                        .child(div().w(px(100.)).child("GAMES")),
                )
                .children(rows.into_iter().map(|r| {
                    let t_col = theme::tier_color(r.tier);
                    let d_col = if r.wr_pos {
                        theme::POSITIVE_GREEN
                    } else {
                        theme::DEFEAT_RED
                    };
                    div()
                        .h(px(46.))
                        .px_4()
                        .border_b_1()
                        .border_color(theme::color(theme::BORDER_MUTED))
                        .flex()
                        .flex_row()
                        .items_center()
                        .justify_between()
                        .child(
                            div()
                                .w(px(50.))
                                .text_xs()
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child(format!("{}", r.rank)),
                        )
                        .child(
                            div()
                                .w(px(220.))
                                .flex()
                                .flex_row()
                                .items_center()
                                .gap_3()
                                .child(champ_square_avatar(r.champ, None, true))
                                .child(
                                    div()
                                        .text_xs()
                                        .font_weight(FontWeight::BOLD)
                                        .text_color(theme::color(theme::TEXT_PRIMARY))
                                        .child(r.champ),
                                ),
                        )
                        .child(
                            div()
                                .w(px(90.))
                                .flex()
                                .flex_col()
                                .child(
                                    div()
                                        .text_xs()
                                        .font_weight(FontWeight::SEMIBOLD)
                                        .child(r.role_label),
                                )
                                .child(
                                    div()
                                        .text_xs()
                                        .text_color(theme::color(theme::TEXT_FAINT))
                                        .child(r.role_pct),
                                ),
                        )
                        .child(
                            div()
                                .w(px(90.))
                                .text_sm()
                                .font_weight(FontWeight::BOLD)
                                .text_color(theme::color(t_col))
                                .child(r.tier),
                        )
                        .child(
                            div()
                                .w(px(100.))
                                .flex()
                                .flex_col()
                                .child(
                                    div()
                                        .text_xs()
                                        .font_weight(FontWeight::BOLD)
                                        .child(r.wr),
                                )
                                .child(
                                    div()
                                        .text_xs()
                                        .text_color(theme::color(d_col))
                                        .child(r.wr_delta),
                                ),
                        )
                        .child(
                            div()
                                .w(px(100.))
                                .text_xs()
                                .font_weight(FontWeight::BOLD)
                                .child(r.pr),
                        )
                        .child(
                            div()
                                .w(px(100.))
                                .text_xs()
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child(r.games),
                        )
                })),
        )
}

/// Screen 2: `Spectate` — 8 live pro & high-elo SoloQ games (Matches DPM APP v1.8.1 Screenshot 2).
pub fn render_spectate(
    _: &BaronWorkspace,
    _: &mut Window,
    _: &Context<BaronWorkspace>,
) -> impl IntoElement {
    let matches = [
        SpectateMatchSpec {
            duration: "24:00",
            region: "KR",
            rank_label: "CHALLENGER",
            lp_label: "1,412 LP",
            is_challenger: true,
            known_label: "10 known players",
            blue: [
                ("Riven", "Zeus", Some("T1"), "Top", true),
                ("Lee Sin", "Oner", Some("T1"), "Jg", true),
                ("Ahri", "Faker", Some("T1"), "Mid", true),
                ("Ashe", "Gumayusi", Some("T1"), "Bot", true),
                ("Thresh", "Keria", Some("T1"), "Sup", true),
            ],
            red: [
                ("Jayce", "Kiin", Some("GEN"), "Top", true),
                ("Nidalee", "Peanut", Some("HLE"), "Jg", true),
                ("Lucian", "Chovy", Some("GEN"), "Mid", true),
                ("Kai'Sa", "Peyz", Some("GEN"), "Bot", true),
                ("Lulu", "Lehends", Some("GEN"), "Sup", true),
            ],
        },
        SpectateMatchSpec {
            duration: "31:00",
            region: "KR",
            rank_label: "CHALLENGER",
            lp_label: "1,244 LP",
            is_challenger: true,
            known_label: "10 known players",
            blue: [
                ("Yone", "Doran", Some("HLE"), "Top", true),
                ("Diana", "Peanut", Some("HLE"), "Jg", true),
                ("Qiyana", "Zeka", Some("HLE"), "Mid", true),
                ("Caitlyn", "Viper", Some("HLE"), "Bot", true),
                ("Lulu", "Delight", Some("HLE"), "Sup", true),
            ],
            red: [
                ("Sett", "Kingen", Some("DK"), "Top", true),
                ("Shaco", "Lucid", Some("DK"), "Jg", true),
                ("Ahri", "ShowMaker", Some("DK"), "Mid", true),
                ("Ashe", "Aiming", Some("DK"), "Bot", true),
                ("Braum", "BeryL", Some("DK"), "Sup", true),
            ],
        },
        SpectateMatchSpec {
            duration: "12:00",
            region: "EUW",
            rank_label: "CHALLENGER",
            lp_label: "1,108 LP",
            is_challenger: true,
            known_label: "5 known players",
            blue: [
                ("Garen", "Cabochard", Some("KC"), "Top", true),
                ("Jhin", "Yike", Some("KC"), "Jg", true),
                ("Yone", "Vladi", Some("KC"), "Mid", true),
                ("Ezreal", "Caliste", Some("KC"), "Bot", true),
                ("Leona", "Targamas", Some("KC"), "Sup", true),
            ],
            red: [
                ("Darius", "ThatOneTop", None, "Top", false),
                ("Viego", "jgl diff", None, "Jg", false),
                ("Syndra", "Mid Andy", None, "Mid", false),
                ("Jinx", "adc gap", None, "Bot", false),
                ("Nami", "sup btw", None, "Sup", false),
            ],
        },
        SpectateMatchSpec {
            duration: "7:00",
            region: "NA",
            rank_label: "CHALLENGER",
            lp_label: "980 LP",
            is_challenger: true,
            known_label: "5 known players",
            blue: [
                ("Aatrox", "Impact", Some("TL"), "Top", true),
                ("Graves", "UmTi", Some("TL"), "Jg", true),
                ("Taliyah", "APA", Some("TL"), "Mid", true),
                ("Kai'Sa", "Yeon", Some("TL"), "Bot", true),
                ("Rakan", "CoreJJ", Some("TL"), "Sup", true),
            ],
            red: [
                ("Jax", "toplane gap", None, "Top", false),
                ("Kha'Zix", "isolated", None, "Jg", false),
                ("Yasuo", "0 10 mid", None, "Mid", false),
                ("Ezreal", "league of", None, "Bot", false),
                ("Bard", "chimes", None, "Sup", false),
            ],
        },
        SpectateMatchSpec {
            duration: "38:00",
            region: "EUW",
            rank_label: "GRANDMASTER",
            lp_label: "742 LP",
            is_challenger: false,
            known_label: "5 known players",
            blue: [
                ("Irelia", "BrokenBlade", Some("G2"), "Top", true),
                ("Viego", "SkewMond", Some("G2"), "Jg", true),
                ("Syndra", "Caps", Some("G2"), "Mid", true),
                ("Lucian", "Hans Sama", Some("G2"), "Bot", true),
                ("Thresh", "Labrov", Some("G2"), "Sup", true),
            ],
            red: [
                ("Malphite", "rock solid", None, "Top", false),
                ("Lee Sin", "insec btw", None, "Jg", false),
                ("Ekko", "rewind", None, "Mid", false),
                ("Varus", "arrow diff", None, "Bot", false),
                ("Janna", "shield", None, "Sup", false),
            ],
        },
    ];

    div()
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
                        .flex()
                        .flex_row()
                        .items_center()
                        .gap_3()
                        .child(
                            div()
                                .text_lg()
                                .font_weight(FontWeight::BOLD)
                                .child("Spectate"),
                        )
                        .child(
                            div()
                                .text_xs()
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child("8 live games"),
                        ),
                )
                .child(
                    div()
                        .text_xs()
                        .text_color(theme::color(theme::TEXT_SECONDARY))
                        .child("Watch live soloQ games from pros and popular streamers."),
                ),
        )
        .children(matches.into_iter().map(|m| {
            let accent = if m.is_challenger {
                theme::CHALLENGER_CYAN
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
                    .gap_3()
                    // Left live duration + average LP block
                    .child(
                        div()
                            .w(px(140.))
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
                                            .text_color(theme::color(theme::DEFEAT_RED))
                                            .child(format!("● {}", m.duration)),
                                    )
                                    .child(
                                        div()
                                            .px_1()
                                            .rounded_sm()
                                            .bg(theme::color(theme::BG_ELEVATED))
                                            .text_xs()
                                            .text_color(theme::color(theme::TEXT_SECONDARY))
                                            .child(m.region),
                                    ),
                            )
                            .child(
                                div()
                                    .flex()
                                    .flex_col()
                                    .child(
                                        div()
                                            .text_xs()
                                            .text_color(theme::color(theme::TEXT_FAINT))
                                            .child("AVERAGE"),
                                    )
                                    .child(
                                        div()
                                            .text_xs()
                                            .font_weight(FontWeight::BOLD)
                                            .child(m.rank_label),
                                    )
                                    .child(
                                        div()
                                            .text_xs()
                                            .font_weight(FontWeight::BOLD)
                                            .text_color(theme::color(accent))
                                            .child(m.lp_label),
                                    ),
                            ),
                    )
                    // Center 5v5 Strips
                    .child(
                        div()
                            .flex_1()
                            .flex()
                            .flex_row()
                            .items_center()
                            .justify_center()
                            .gap_3()
                            .child(
                                div()
                                    .flex()
                                    .flex_row()
                                    .gap_1()
                                    .children(m.blue.into_iter().map(|(c, p, t, r, pro)| {
                                        spectate_champ_strip(c, p, t, r, pro)
                                    })),
                            )
                            .child(
                                div()
                                    .text_xs()
                                    .font_weight(FontWeight::BOLD)
                                    .text_color(theme::color(theme::TEXT_FAINT))
                                    .child("VS"),
                            )
                            .child(
                                div()
                                    .flex()
                                    .flex_row()
                                    .gap_1()
                                    .children(m.red.into_iter().map(|(c, p, t, r, pro)| {
                                        spectate_champ_strip(c, p, t, r, pro)
                                    })),
                            ),
                    )
                    // Right Watch CTA
                    .child(
                        div()
                            .w(px(120.))
                            .flex()
                            .flex_col()
                            .items_end()
                            .gap_2()
                            .child(
                                div()
                                    .text_xs()
                                    .text_color(theme::color(theme::TEXT_SECONDARY))
                                    .child(m.known_label),
                            )
                            .child(
                                Button::new(SharedString::from(format!("watch-{}", m.duration)))
                                    .label("👁  Watch")
                                    .small()
                                    .primary(),
                            ),
                    ),
            )
        }))
}

/// Screen 5: `Collections` (`Skin Vault` — Matches DPM APP v1.8.1 Screenshot 5).
pub fn render_skin_vault(
    ws: &BaronWorkspace,
    _: &mut Window,
    _: &Context<BaronWorkspace>,
) -> impl IntoElement {
    let tiers = [
        ("Standard", "76/154", theme::GEM_STANDARD),
        ("Rare", "0/0", theme::TEXT_FAINT),
        ("Epic", "107/212", theme::GEM_EPIC),
        ("Legendary", "12/43", theme::GEM_LEGENDARY),
        ("Mythic", "15/60", theme::GEM_MYTHIC),
        ("Ultimate", "1/7", theme::GEM_ULTIMATE),
        ("Exalted", "1/4", theme::GEM_EXALTED),
        ("Transcendent", "0/2", theme::GEM_TRANSCENDENT),
    ];

    let posters_row1 = [
        ("Winterblessed Annie", "Annie", "1,350 RP", theme::GEM_EPIC),
        ("Bandit Sivir", "Sivir", "750 RP", theme::GEM_STANDARD),
        ("Cafe Cuties Jinx", "Jinx", "1,350 RP", theme::GEM_EPIC),
        (
            "Spirit Blossom Evelynn",
            "Evelynn",
            "1,350 RP",
            theme::GEM_EPIC,
        ),
        ("Dawnbringer Janna", "Janna", "Earned", theme::GEM_MYTHIC),
    ];
    let posters_row2 = [
        (
            "Porcelain Miss Fortune",
            "Miss Fortune",
            "1,350 RP",
            theme::GEM_EPIC,
        ),
        (
            "Masque Black Rose Ezreal",
            "Ezreal",
            "1,350 RP",
            theme::GEM_LEGENDARY,
        ),
        ("Primal Ambush Sivir", "Sivir", "1,350 RP", theme::GEM_EPIC),
        ("Spirit Blossom Akali", "Akali", "1,350 RP", theme::GEM_EPIC),
        ("Immortal Journey Sona", "Sona", "1,350 RP", theme::GEM_EPIC),
    ];

    div()
        .flex()
        .flex_col()
        .gap_3()
        .child(
            div()
                .flex()
                .flex_col()
                .gap_1()
                .child(
                    div()
                        .text_xl()
                        .font_weight(FontWeight::BOLD)
                        .child("Collection"),
                )
                .child(
                    div()
                        .text_xs()
                        .text_color(theme::color(theme::TEXT_SECONDARY))
                        .child("Every skin on your account, and the ones still missing."),
                ),
        )
        .child(
            div()
                .flex()
                .flex_row()
                .gap_4()
                // Left Filter Sidebar (210px)
                .child(
                    div()
                        .w(px(210.))
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
                                .child("⛃  Filters"),
                        )
                        .child(rune_segmented_bar(
                            &["All", "Owned", "Missing"],
                            ws.collection_filter_idx,
                            true,
                        ))
                        .child(
                            div()
                                .flex()
                                .flex_col()
                                .gap_1()
                                .child(
                                    div()
                                        .text_xs()
                                        .font_weight(FontWeight::SEMIBOLD)
                                        .text_color(theme::color(theme::TEXT_FAINT))
                                        .child("CHAMPION"),
                                )
                                .child(
                                    div()
                                        .px_2()
                                        .py_1()
                                        .rounded_md()
                                        .bg(theme::color(theme::BG_ELEVATED))
                                        .border_1()
                                        .border_color(theme::color(theme::BORDER_SUBTLE))
                                        .text_xs()
                                        .text_color(theme::color(theme::TEXT_SECONDARY))
                                        .child("Every champion  ▾"),
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
                                        .font_weight(FontWeight::SEMIBOLD)
                                        .text_color(theme::color(theme::TEXT_FAINT))
                                        .child("SET"),
                                )
                                .child(
                                    div()
                                        .px_2()
                                        .py_1()
                                        .rounded_md()
                                        .bg(theme::color(theme::BG_ELEVATED))
                                        .border_1()
                                        .border_color(theme::color(theme::BORDER_SUBTLE))
                                        .text_xs()
                                        .text_color(theme::color(theme::TEXT_SECONDARY))
                                        .child("Every set  ▾"),
                                )
                                .child(
                                    div()
                                        .flex()
                                        .flex_row()
                                        .justify_between()
                                        .text_xs()
                                        .child("🏆 Worlds")
                                        .child(
                                            div()
                                                .text_color(theme::color(theme::TEXT_FAINT))
                                                .child("14/19"),
                                        ),
                                ),
                        )
                        .child(
                            div()
                                .flex()
                                .flex_col()
                                .gap_2()
                                .child(
                                    div()
                                        .text_xs()
                                        .font_weight(FontWeight::SEMIBOLD)
                                        .text_color(theme::color(theme::TEXT_FAINT))
                                        .child("TIER"),
                                )
                                .children(tiers.into_iter().map(|(label, count, col)| {
                                    div()
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
                                                    div().text_color(theme::color(col)).child("◆"),
                                                )
                                                .child(label),
                                        )
                                        .child(
                                            div()
                                                .text_color(theme::color(theme::TEXT_FAINT))
                                                .child(count),
                                        )
                                })),
                        ),
                )
                // Right Main Column
                .child(
                    div()
                        .flex_1()
                        .flex()
                        .flex_col()
                        .gap_3()
                        // Top Progress + RP Card
                        .child(
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
                                .gap_6()
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
                                                .items_baseline()
                                                .gap_1()
                                                .child(
                                                    div()
                                                        .text_xl()
                                                        .font_weight(FontWeight::BOLD)
                                                        .child("212"),
                                                )
                                                .child(
                                                    div()
                                                        .text_sm()
                                                        .text_color(theme::color(theme::TEXT_FAINT))
                                                        .child("/ 482"),
                                                ),
                                        )
                                        .child(
                                            div()
                                                .w_full()
                                                .h(px(6.))
                                                .rounded_full()
                                                .bg(theme::color(theme::BG_ELEVATED))
                                                .overflow_hidden()
                                                .child(
                                                    div()
                                                        .w(relative(0.44))
                                                        .h_full()
                                                        .bg(theme::color(theme::ACCENT_PRIMARY)),
                                                ),
                                        )
                                        .child(
                                            div()
                                                .text_xs()
                                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                                .child("Skins owned · 44% complete"),
                                        ),
                                )
                                .child(
                                    div()
                                        .flex()
                                        .flex_col()
                                        .items_end()
                                        .gap_1()
                                        .child(
                                            div()
                                                .text_xl()
                                                .font_weight(FontWeight::BOLD)
                                                .child("223,015 RP"),
                                        )
                                        .child(
                                            div()
                                                .text_xs()
                                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                                .child("Spent on what you own"),
                                        ),
                                ),
                        )
                        // Group / Sort Toolbar
                        .child(
                            div()
                                .flex()
                                .flex_row()
                                .items_center()
                                .justify_between()
                                .text_xs()
                                .child(
                                    div()
                                        .text_color(theme::color(theme::TEXT_SECONDARY))
                                        .child("482 skins"),
                                )
                                .child(
                                    div()
                                        .flex()
                                        .flex_row()
                                        .gap_2()
                                        .child(
                                            Tag::secondary()
                                                .small()
                                                .child("Group: Acquisition year ▾"),
                                        )
                                        .child(
                                            Tag::secondary()
                                                .small()
                                                .child("Sort: Acquisition date ▾"),
                                        )
                                        .child(Tag::secondary().small().child("Size: Auto ▾")),
                                ),
                        )
                        // Section Header
                        .child(
                            div()
                                .flex()
                                .flex_row()
                                .items_center()
                                .gap_2()
                                .child(
                                    div()
                                        .text_sm()
                                        .font_weight(FontWeight::BOLD)
                                        .child("Acquired in 2026"),
                                )
                                .child(
                                    div()
                                        .text_xs()
                                        .text_color(theme::color(theme::TEXT_FAINT))
                                        .child("18 / 18"),
                                ),
                        )
                        // 5-column Skin Poster Grid Row 1
                        .child(
                            div().flex().flex_row().gap_3().children(
                                posters_row1
                                    .into_iter()
                                    .map(|(s, c, p, g)| skin_poster_card(s, c, p, g)),
                            ),
                        )
                        // 5-column Skin Poster Grid Row 2
                        .child(
                            div().flex().flex_row().gap_3().children(
                                posters_row2
                                    .into_iter()
                                    .map(|(s, c, p, g)| skin_poster_card(s, c, p, g)),
                            ),
                        ),
                ),
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
        .gap_3()
        .child(
            div()
                .flex()
                .flex_row()
                .items_center()
                .justify_between()
                .child(
                    div()
                        .text_xl()
                        .font_weight(FontWeight::BOLD)
                        .child("♛  Leaderboards"),
                )
                .child(rune_segmented_bar(&["EUW", "KR", "NA", "Rivals"], 1, true)),
        )
        .child(
            div()
                .rounded_lg()
                .bg(theme::color(theme::BG_SURFACE))
                .border_1()
                .border_color(theme::color(theme::BORDER_SUBTLE))
                .overflow_hidden()
                .flex()
                .flex_col()
                .child(
                    div()
                        .px_4()
                        .py_2()
                        .border_b_1()
                        .border_color(theme::color(theme::BORDER_SUBTLE))
                        .flex()
                        .flex_row()
                        .justify_between()
                        .text_xs()
                        .font_weight(FontWeight::SEMIBOLD)
                        .text_color(theme::color(theme::TEXT_FAINT))
                        .child(div().w(px(50.)).child("RANK"))
                        .child(div().w(px(220.)).child("PLAYER"))
                        .child(div().w(px(160.)).child("TIER & LP"))
                        .child(div().w(px(90.)).child("WINRATE"))
                        .child(div().w(px(100.)).child("7D NET LP"))
                        .child(div().w(px(100.)).child("AVG SCORE")),
                )
                .children(ws.data.leaderboard.iter().map(|m| {
                    div()
                        .h(px(46.))
                        .px_4()
                        .border_b_1()
                        .border_color(theme::color(theme::BORDER_MUTED))
                        .flex()
                        .flex_row()
                        .items_center()
                        .justify_between()
                        .text_xs()
                        .child(
                            div()
                                .w(px(50.))
                                .font_weight(FontWeight::BOLD)
                                .child(format!("#{}", m.rank)),
                        )
                        .child(
                            div()
                                .w(px(220.))
                                .flex()
                                .flex_row()
                                .items_center()
                                .gap_2()
                                .child(Avatar::new().name(m.game_name.clone()).small())
                                .child(
                                    div()
                                        .font_weight(FontWeight::BOLD)
                                        .child(format!("{} #{}", m.game_name, m.tag_line)),
                                ),
                        )
                        .child(
                            div()
                                .w(px(160.))
                                .font_weight(FontWeight::BOLD)
                                .text_color(theme::color(theme::CHALLENGER_CYAN))
                                .child(format!("❖ {} ({} LP)", m.tier, m.lp)),
                        )
                        .child(
                            div()
                                .w(px(90.))
                                .font_weight(FontWeight::BOLD)
                                .child(format!("{:.1}%", m.win_rate)),
                        )
                        .child(
                            div().w(px(100.)).child(
                                Tag::success()
                                    .small()
                                    .child(format!("{:+} LP", m.net_lp_7d)),
                            ),
                        )
                        .child(
                            div().w(px(100.)).child(
                                Tag::primary()
                                    .small()
                                    .child(format!("{:.1}", m.avg_baron_score)),
                            ),
                        )
                })),
        )
}

pub fn render_data_studio(
    _: &BaronWorkspace,
    _: &mut Window,
    _: &Context<BaronWorkspace>,
) -> impl IntoElement {
    div()
        .flex()
        .flex_col()
        .gap_3()
        .child(
            div()
                .text_xl()
                .font_weight(FontWeight::BOLD)
                .child("⛁  Data Studio & Fallback Providers"),
        )
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
                        .text_sm()
                        .font_weight(FontWeight::BOLD)
                        .child("Multi-Provider Fallback Pipeline (REA MCP Verified)"),
                )
                .children(baron_riot::DEFAULT_FALLBACK_ORDER.iter().enumerate().map(
                    |(idx, prov)| {
                        div()
                            .p_2()
                            .rounded_md()
                            .bg(theme::color(theme::BG_ELEVATED))
                            .border_1()
                            .border_color(theme::color(theme::BORDER_SUBTLE))
                            .flex()
                            .flex_row()
                            .items_center()
                            .justify_between()
                            .text_xs()
                            .child(div().font_weight(FontWeight::BOLD).child(format!(
                                "#{}  {}",
                                idx + 1,
                                prov.label()
                            )))
                            .child(Tag::success().small().child("Active Fallback"))
                    },
                )),
        )
}
