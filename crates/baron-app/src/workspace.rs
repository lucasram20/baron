use baron_core::models::DashboardSampleData;
use baron_db::BaronDatabase;
use baron_lcu::OwnedSkinEntry;
use baron_riot::{FallbackProvider, AVAILABLE_PATCHES, AVAILABLE_PERIODS, DEFAULT_FALLBACK_ORDER};
use gpui_kit::component::avatar::Avatar;
use gpui_kit::component::button::{Button, ButtonVariants as _};
use gpui_kit::component::input::{Input, InputState};
use gpui_kit::component::scroll::ScrollableElement;
use gpui_kit::component::{Icon, IconName, Sizable as _, TitleBar};
use gpui_kit::*;

pub use crate::helpers::*;
use crate::theme;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActiveRoute {
    Home,
    TierList,
    Leaderboards,
    Spectate,
    SkinVault,
    DataStudio,
    LiveDraft,
    DpmLens,
}

impl ActiveRoute {
    pub fn label(&self) -> &'static str {
        match self {
            Self::Home => "Dashboard",
            Self::TierList => "Tierlist & Builds",
            Self::Leaderboards => "Leaderboards",
            Self::Spectate => "Spectate",
            Self::SkinVault => "Collections",
            Self::DataStudio => "Data Studio",
            Self::LiveDraft => "Champ Select",
            Self::DpmLens => "Post-game",
        }
    }
}

#[allow(dead_code)]
pub struct BaronWorkspace {
    pub route: ActiveRoute,
    pub search_input: Entity<InputState>,
    pub auto_runes: bool,
    pub auto_spells: bool,
    pub auto_items: bool,
    pub lcu_connected: bool,
    pub selected_build_idx: usize,
    pub postgame_tab_idx: usize,
    pub tierlist_mode_idx: usize,
    pub tierlist_role_idx: usize,
    pub off_meta: bool,
    pub collection_filter_idx: usize,
    pub selected_patch_idx: usize,
    pub selected_period_idx: usize,
    pub patch_popover_open: bool,
    pub selected_provider_idx: usize,
    pub provider_dropdown_open: bool,
    pub expanded_match_id: Option<String>,
    pub data: DashboardSampleData,
    pub skins: Vec<OwnedSkinEntry>,
    // ponytail: persisted DB handle ready for live LCU/Riot sync wiring
    #[allow(dead_code)]
    pub db: BaronDatabase,
}

impl BaronWorkspace {
    pub fn new(window: &mut Window, cx: &mut Context<Self>) -> Self {
        let search_input = cx.new(|cx| {
            InputState::new(window, cx).placeholder("Search a player, a champion, a team, a pro...")
        });
        let db = BaronDatabase::open_in_memory().expect("in-memory db");
        let data = baron_core::sample_dashboard_data();
        let skins = baron_lcu::sample_owned_skins();
        let _ = db.upsert_account(&data.account);

        Self {
            route: ActiveRoute::LiveDraft,
            search_input,
            auto_runes: true,
            auto_spells: true,
            auto_items: true,
            lcu_connected: true,
            selected_build_idx: 0,
            postgame_tab_idx: 0,
            tierlist_mode_idx: 0,
            tierlist_role_idx: 0,
            off_meta: false,
            collection_filter_idx: 0,
            selected_patch_idx: 0,
            selected_period_idx: 0,
            patch_popover_open: false,
            selected_provider_idx: 0,
            provider_dropdown_open: false,
            expanded_match_id: None,
            data,
            skins,
            db,
        }
    }

    pub fn active_patch(&self) -> &'static str {
        AVAILABLE_PATCHES
            .get(self.selected_patch_idx)
            .copied()
            .unwrap_or("16.22")
    }

    pub fn active_period(&self) -> &'static str {
        AVAILABLE_PERIODS
            .get(self.selected_period_idx)
            .copied()
            .unwrap_or("7 days")
    }

    pub fn active_provider(&self) -> FallbackProvider {
        DEFAULT_FALLBACK_ORDER
            .get(self.selected_provider_idx)
            .copied()
            .unwrap_or(FallbackProvider::OpGg)
    }

    fn render_top_command_bar(&self, cx: &Context<Self>) -> impl IntoElement {
        let patch_label = format!("Patch {} ▾", self.active_patch());
        let api_label = format!("API: {} ▾", self.active_provider().label());

        div()
            .h(px(44.))
            .w_full()
            .bg(theme::color(theme::BG_SIDEBAR))
            .border_b_1()
            .border_color(theme::color(theme::BORDER_SUBTLE))
            .px_4()
            .flex()
            .flex_row()
            .items_center()
            .justify_between()
            .child(
                div()
                    .flex()
                    .flex_row()
                    .items_center()
                    .gap_1()
                    .child(
                        Button::new("nav-prev")
                            .icon(Icon::new(IconName::ChevronLeft))
                            .ghost()
                            .xsmall()
                            .on_click(cx.listener(|this, _, _, cx| {
                                this.route = ActiveRoute::Home;
                                cx.notify();
                            })),
                    )
                    .child(
                        Button::new("nav-next")
                            .icon(Icon::new(IconName::ChevronRight))
                            .ghost()
                            .xsmall()
                            .on_click(cx.listener(|this, _, _, cx| {
                                this.route = ActiveRoute::DpmLens;
                                cx.notify();
                            })),
                    )
                    .child(
                        Button::new("nav-refresh")
                            .icon(Icon::new(IconName::RefreshCw))
                            .ghost()
                            .xsmall(),
                    ),
            )
            .child(
                div()
                    .w(px(460.))
                    .h(px(30.))
                    .px_2()
                    .rounded_md()
                    .bg(theme::color(theme::BG_SURFACE))
                    .border_1()
                    .border_color(theme::color(theme::BORDER_SUBTLE))
                    .flex()
                    .flex_row()
                    .items_center()
                    .gap_2()
                    .child(
                        div()
                            .flex_1()
                            .child(Input::new(&self.search_input).cleanable(true).xsmall()),
                    )
                    .child(
                        div()
                            .flex()
                            .flex_row()
                            .items_center()
                            .gap_1()
                            .child(
                                div()
                                    .px_1()
                                    .rounded_sm()
                                    .bg(theme::color(theme::BG_ELEVATED))
                                    .border_1()
                                    .border_color(theme::color(theme::BORDER_STRONG))
                                    .text_xs()
                                    .text_color(theme::color(theme::TEXT_SECONDARY))
                                    .child("Ctrl"),
                            )
                            .child(
                                div()
                                    .px_1()
                                    .rounded_sm()
                                    .bg(theme::color(theme::BG_ELEVATED))
                                    .border_1()
                                    .border_color(theme::color(theme::BORDER_STRONG))
                                    .text_xs()
                                    .text_color(theme::color(theme::TEXT_SECONDARY))
                                    .child("K"),
                            ),
                    ),
            )
            .child(
                div()
                    .flex()
                    .flex_row()
                    .items_center()
                    .gap_2()
                    .child(
                        Button::new("top-patch-btn")
                            .label(patch_label)
                            .xsmall()
                            .ghost()
                            .on_click(cx.listener(|this, _, _, cx| {
                                this.patch_popover_open = !this.patch_popover_open;
                                this.provider_dropdown_open = false;
                                cx.notify();
                            })),
                    )
                    .child(
                        Button::new("top-provider-btn")
                            .label(api_label)
                            .xsmall()
                            .primary()
                            .on_click(cx.listener(|this, _, _, cx| {
                                this.provider_dropdown_open = !this.provider_dropdown_open;
                                this.patch_popover_open = false;
                                cx.notify();
                            })),
                    )
                    .child(
                        div()
                            .px_2()
                            .py(px(2.))
                            .rounded_sm()
                            .bg(theme::color_alpha(theme::ACCENT_PRIMARY, 0.18))
                            .border_1()
                            .border_color(theme::color_alpha(theme::ACCENT_PRIMARY, 0.5))
                            .text_xs()
                            .font_weight(FontWeight::BOLD)
                            .text_color(theme::color(theme::ACCENT_SOFT))
                            .child("L  LCU Ready"),
                    )
                    .child(
                        Button::new("top-settings")
                            .icon(Icon::new(IconName::Settings))
                            .ghost()
                            .xsmall()
                            .on_click(cx.listener(|this, _, _, cx| {
                                this.route = ActiveRoute::DataStudio;
                                cx.notify();
                            })),
                    ),
            )
    }

    /// Renders the Patch (`16.22`..`16.10`) & Period (`7 days`, `14 days`, `30 days`) Popover
    /// matching the user's screenshot, plus the API Provider Switcher Dropdown when open.
    pub fn render_popovers_bar(&self, cx: &Context<Self>) -> Option<AnyElement> {
        if !self.patch_popover_open && !self.provider_dropdown_open {
            return None;
        }

        let elem = div()
            .mb_3()
            .flex()
            .flex_row()
            .justify_end()
            .gap_3()
            .children(self.patch_popover_open.then(|| {
                let patch_rows: Vec<&[&'static str]> = AVAILABLE_PATCHES.chunks(3).collect();
                div()
                    .w(px(280.))
                    .p_3()
                    .rounded_lg()
                    .bg(theme::color(theme::BG_SIDEBAR))
                    .border_1()
                    .border_color(theme::color(theme::BORDER_STRONG))
                    .flex()
                    .flex_col()
                    .gap_3()
                    // PERIOD section (7 days | 14 days | 30 days)
                    .child(
                        div()
                            .flex()
                            .flex_col()
                            .gap_2()
                            .child(
                                div()
                                    .text_xs()
                                    .font_weight(FontWeight::BOLD)
                                    .text_color(theme::color(theme::TEXT_FAINT))
                                    .child("PERIOD"),
                            )
                            .child(div().flex().flex_row().gap_2().children(
                                AVAILABLE_PERIODS.iter().copied().enumerate().map(
                                    |(idx, period)| {
                                        let active = self.selected_period_idx == idx;
                                        div()
                                            .id(SharedString::from(format!("period-opt-{idx}")))
                                            .flex_1()
                                            .h(px(32.))
                                            .rounded_md()
                                            .bg(theme::color(if active {
                                                theme::BORDER_STRONG
                                            } else {
                                                theme::BG_ELEVATED
                                            }))
                                            .border_1()
                                            .border_color(theme::color(if active {
                                                theme::ACCENT_SOFT
                                            } else {
                                                theme::BORDER_SUBTLE
                                            }))
                                            .flex()
                                            .items_center()
                                            .justify_center()
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
                                                this.selected_period_idx = idx;
                                                cx.notify();
                                            }))
                                            .child(period)
                                    },
                                ),
                            )),
                    )
                    // PATCH section (3-column grid: 16.22 .. 16.10)
                    .child(
                        div()
                            .flex()
                            .flex_col()
                            .gap_2()
                            .child(
                                div()
                                    .text_xs()
                                    .font_weight(FontWeight::BOLD)
                                    .text_color(theme::color(theme::TEXT_FAINT))
                                    .child("PATCH"),
                            )
                            .children(patch_rows.into_iter().enumerate().map(
                                |(row_idx, chunk)| {
                                    div().flex().flex_row().gap_2().children(
                                        chunk.iter().copied().enumerate().map(
                                            move |(col_idx, p)| {
                                                let idx = row_idx * 3 + col_idx;
                                                let active = self.selected_patch_idx == idx;
                                                div()
                                                    .id(SharedString::from(format!(
                                                        "patch-opt-{idx}"
                                                    )))
                                                    .w(px(80.))
                                                    .h(px(32.))
                                                    .rounded_md()
                                                    .bg(theme::color(if active {
                                                        theme::BORDER_STRONG
                                                    } else {
                                                        theme::BG_ELEVATED
                                                    }))
                                                    .border_1()
                                                    .border_color(theme::color(if active {
                                                        theme::ACCENT_SOFT
                                                    } else {
                                                        theme::BORDER_SUBTLE
                                                    }))
                                                    .flex()
                                                    .items_center()
                                                    .justify_center()
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
                                                        this.selected_patch_idx = idx;
                                                        this.patch_popover_open = false;
                                                        cx.notify();
                                                    }))
                                                    .child(p)
                                            },
                                        ),
                                    )
                                },
                            )),
                    )
            }))
            .children(self.provider_dropdown_open.then(|| {
                div()
                    .w(px(250.))
                    .p_3()
                    .rounded_lg()
                    .bg(theme::color(theme::BG_SIDEBAR))
                    .border_1()
                    .border_color(theme::color(theme::BORDER_STRONG))
                    .flex()
                    .flex_col()
                    .gap_2()
                    .child(
                        div()
                            .text_xs()
                            .font_weight(FontWeight::BOLD)
                            .text_color(theme::color(theme::TEXT_FAINT))
                            .child("API PROVIDER MODE"),
                    )
                    .children(DEFAULT_FALLBACK_ORDER.iter().copied().enumerate().map(
                        |(idx, prov)| {
                            let active = self.selected_provider_idx == idx;
                            let role_tag = match idx {
                                0 => "Primary #1",
                                1 => "Fallback #2",
                                _ => "Fallback",
                            };
                            div()
                                .id(SharedString::from(format!("api-prov-opt-{idx}")))
                                .p_2()
                                .rounded_md()
                                .bg(theme::color(if active {
                                    theme::BORDER_STRONG
                                } else {
                                    theme::BG_ELEVATED
                                }))
                                .border_1()
                                .border_color(theme::color(if active {
                                    theme::ACCENT_PRIMARY
                                } else {
                                    theme::BORDER_SUBTLE
                                }))
                                .flex()
                                .flex_row()
                                .items_center()
                                .justify_between()
                                .text_xs()
                                .cursor_pointer()
                                .on_click(cx.listener(move |this, _, _, cx| {
                                    this.selected_provider_idx = idx;
                                    this.provider_dropdown_open = false;
                                    cx.notify();
                                }))
                                .child(
                                    div()
                                        .font_weight(FontWeight::BOLD)
                                        .text_color(theme::color(if active {
                                            theme::TEXT_PRIMARY
                                        } else {
                                            theme::TEXT_SECONDARY
                                        }))
                                        .child(prov.label()),
                                )
                                .child(
                                    div()
                                        .text_color(theme::color(if active {
                                            theme::ACCENT_SOFT
                                        } else {
                                            theme::TEXT_FAINT
                                        }))
                                        .child(role_tag),
                                )
                        },
                    ))
            }))
            .into_any_element();

        Some(elem)
    }

    fn render_sidebar_item(
        &self,
        route: ActiveRoute,
        icon_glyph: &'static str,
        is_ingame: bool,
        cx: &Context<Self>,
    ) -> impl IntoElement {
        let active = self.route == route;
        let accent_col = if is_ingame {
            theme::MVP_GOLD
        } else {
            theme::ACCENT_PRIMARY
        };
        let bg = if active {
            theme::color_alpha(accent_col, 0.16)
        } else {
            theme::color_alpha(theme::BG_SIDEBAR, 0.0)
        };
        let fg = if active {
            theme::color(theme::TEXT_PRIMARY)
        } else {
            theme::color(theme::TEXT_SECONDARY)
        };

        div()
            .id(SharedString::from(format!("nav-{}", route.label())))
            .w_full()
            .h(px(30.))
            .rounded_md()
            .bg(bg)
            .flex()
            .flex_row()
            .items_center()
            .overflow_hidden()
            .cursor_pointer()
            .on_click(cx.listener(move |this, _, _, cx| {
                this.route = route;
                cx.notify();
            }))
            .child(div().w(px(3.)).h_full().bg(if active {
                theme::color(accent_col)
            } else {
                theme::color_alpha(accent_col, 0.0)
            }))
            .child(
                div()
                    .px_2()
                    .flex()
                    .flex_row()
                    .items_center()
                    .gap_2()
                    .text_xs()
                    .font_weight(if active {
                        FontWeight::BOLD
                    } else {
                        FontWeight::MEDIUM
                    })
                    .text_color(fg)
                    .child(
                        div()
                            .w(px(16.))
                            .text_color(if active { theme::color(accent_col) } else { fg })
                            .child(icon_glyph),
                    )
                    .child(route.label()),
            )
    }

    fn render_left_sidebar(&self, cx: &Context<Self>) -> impl IntoElement {
        div()
            .w(px(204.))
            .h_full()
            .bg(theme::color(theme::BG_SIDEBAR))
            .border_r_1()
            .border_color(theme::color(theme::BORDER_SUBTLE))
            .p_3()
            .flex()
            .flex_col()
            .justify_between()
            .child(
                div()
                    .flex()
                    .flex_col()
                    .gap_4()
                    .child(
                        div()
                            .flex()
                            .flex_row()
                            .items_center()
                            .gap_2()
                            .child(img("logo/baron_logo.png").w(px(32.)).h(px(32.)))
                            .child(
                                div()
                                    .flex()
                                    .flex_col()
                                    .child(
                                        div()
                                            .text_sm()
                                            .font_weight(FontWeight::BOLD)
                                            .text_color(theme::color(theme::TEXT_PRIMARY))
                                            .child("BARON"),
                                    )
                                    .child(
                                        div()
                                            .text_xs()
                                            .text_color(theme::color(theme::TEXT_FAINT))
                                            .child("APP V0.1.0"),
                                    ),
                            ),
                    )
                    .child(
                        div()
                            .flex()
                            .flex_col()
                            .gap_1()
                            .child(
                                div()
                                    .px_2()
                                    .text_xs()
                                    .font_weight(FontWeight::SEMIBOLD)
                                    .text_color(theme::color(theme::TEXT_FAINT))
                                    .child("BARON CORE"),
                            )
                            .child(self.render_sidebar_item(ActiveRoute::Home, "⌂", false, cx))
                            .child(
                                div()
                                    .pl_6()
                                    .py(px(2.))
                                    .flex()
                                    .flex_row()
                                    .items_center()
                                    .gap_2()
                                    .child(Avatar::new().name("Nyx").xsmall().rounded_sm())
                                    .child(
                                        div()
                                            .text_xs()
                                            .font_weight(FontWeight::SEMIBOLD)
                                            .text_color(theme::color(theme::TEXT_PRIMARY))
                                            .child("Nyx #DPM"),
                                    ),
                            )
                            .child(self.render_sidebar_item(ActiveRoute::TierList, "▤", false, cx))
                            .child(self.render_sidebar_item(
                                ActiveRoute::Leaderboards,
                                "♛",
                                false,
                                cx,
                            )),
                    )
                    .child(
                        div()
                            .flex()
                            .flex_col()
                            .gap_1()
                            .child(
                                div()
                                    .px_2()
                                    .text_xs()
                                    .font_weight(FontWeight::SEMIBOLD)
                                    .text_color(theme::color(theme::TEXT_FAINT))
                                    .child("BARON APP"),
                            )
                            .child(self.render_sidebar_item(ActiveRoute::Spectate, "◉", false, cx))
                            .child(self.render_sidebar_item(
                                ActiveRoute::SkinVault,
                                "❖",
                                false,
                                cx,
                            )),
                    )
                    .child(
                        div()
                            .flex()
                            .flex_col()
                            .gap_1()
                            .child(
                                div()
                                    .px_2()
                                    .text_xs()
                                    .font_weight(FontWeight::SEMIBOLD)
                                    .text_color(theme::color(theme::TEXT_FAINT))
                                    .child("BARON INSIGHTS"),
                            )
                            .child(self.render_sidebar_item(
                                ActiveRoute::DataStudio,
                                "⛁",
                                false,
                                cx,
                            )),
                    )
                    .child(
                        div()
                            .flex()
                            .flex_col()
                            .gap_1()
                            .child(
                                div()
                                    .px_2()
                                    .text_xs()
                                    .font_weight(FontWeight::SEMIBOLD)
                                    .text_color(theme::color(theme::TEXT_FAINT))
                                    .child("IN GAME"),
                            )
                            .child(self.render_sidebar_item(ActiveRoute::LiveDraft, "✦", true, cx))
                            .child(self.render_sidebar_item(ActiveRoute::DpmLens, "⚔", true, cx)),
                    ),
            )
            .child(
                div()
                    .p_2()
                    .rounded_lg()
                    .bg(theme::color(theme::BG_SURFACE))
                    .border_1()
                    .border_color(theme::color(theme::BORDER_SUBTLE))
                    .flex()
                    .flex_row()
                    .items_center()
                    .gap_2()
                    .child(
                        div()
                            .flex()
                            .flex_col()
                            .items_center()
                            .gap_1()
                            .child(
                                div()
                                    .px_1()
                                    .rounded_sm()
                                    .bg(theme::color(theme::ACCENT_PRIMARY))
                                    .text_xs()
                                    .font_weight(FontWeight::BOLD)
                                    .text_color(theme::color(theme::TEXT_PRIMARY))
                                    .child("KR"),
                            )
                            .child(
                                Avatar::new()
                                    .name(self.data.account.game_name.clone())
                                    .small()
                                    .rounded_md(),
                            )
                            .child(
                                div()
                                    .text_xs()
                                    .text_color(theme::color(theme::TEXT_FAINT))
                                    .child(format!("{}", self.data.account.summoner_level)),
                            ),
                    )
                    .child(
                        div()
                            .flex()
                            .flex_col()
                            .child(
                                div()
                                    .text_xs()
                                    .font_weight(FontWeight::BOLD)
                                    .text_color(theme::color(theme::TEXT_PRIMARY))
                                    .child(self.data.account.game_name.clone()),
                            )
                            .child(
                                div()
                                    .text_xs()
                                    .text_color(theme::color(theme::TEXT_SECONDARY))
                                    .child(format!("#{}", self.data.account.tag_line)),
                            )
                            .child(
                                div()
                                    .text_xs()
                                    .font_weight(FontWeight::BOLD)
                                    .text_color(theme::color(theme::CHALLENGER_CYAN))
                                    .child("❖ CHALLENGER"),
                            ),
                    ),
            )
    }

    fn render_route(&self, window: &mut Window, cx: &Context<Self>) -> AnyElement {
        match self.route {
            ActiveRoute::Home => crate::views::home::render(self, window, cx).into_any_element(),
            ActiveRoute::LiveDraft => {
                crate::views::draft::render(self, window, cx).into_any_element()
            }
            ActiveRoute::DpmLens => crate::views::lens::render(self, window, cx).into_any_element(),
            ActiveRoute::TierList => {
                crate::views::extras::render_tier_list(self, window, cx).into_any_element()
            }
            ActiveRoute::Leaderboards => {
                crate::views::extras::render_leaderboard(self, window, cx).into_any_element()
            }
            ActiveRoute::Spectate => {
                crate::views::extras::render_spectate(self, window, cx).into_any_element()
            }
            ActiveRoute::SkinVault => {
                crate::views::extras::render_skin_vault(self, window, cx).into_any_element()
            }
            ActiveRoute::DataStudio => {
                crate::views::extras::render_data_studio(self, window, cx).into_any_element()
            }
        }
    }
}

impl Render for BaronWorkspace {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        div()
            .size_full()
            .flex()
            .flex_col()
            .bg(theme::color(theme::BG_CANVAS))
            .text_color(theme::color(theme::TEXT_PRIMARY))
            .child(
                TitleBar::new().child(
                    div()
                        .flex()
                        .flex_row()
                        .items_center()
                        .gap_2()
                        .child(img("logo/baron_logo.png").w(px(16.)).h(px(16.)))
                        .child(
                            div()
                                .text_xs()
                                .font_weight(FontWeight::SEMIBOLD)
                                .text_color(theme::color(theme::TEXT_SECONDARY))
                                .child("Baron"),
                        ),
                ),
            )
            .child(self.render_top_command_bar(cx))
            .child(
                div()
                    .flex_1()
                    .min_h_0()
                    .flex()
                    .flex_row()
                    .overflow_hidden()
                    .child(self.render_left_sidebar(cx))
                    .child(
                        div()
                            .id("baron-main-canvas")
                            .flex_1()
                            .h_full()
                            .overflow_y_scrollbar()
                            .p_4()
                            .children(self.render_popovers_bar(cx))
                            .child(self.render_route(window, cx)),
                    ),
            )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[::core::prelude::v1::test]
    fn test_route_labels() {
        for (r, expected) in [
            (ActiveRoute::Home, "Dashboard"),
            (ActiveRoute::TierList, "Tierlist & Builds"),
            (ActiveRoute::Leaderboards, "Leaderboards"),
            (ActiveRoute::Spectate, "Spectate"),
            (ActiveRoute::SkinVault, "Collections"),
            (ActiveRoute::DataStudio, "Data Studio"),
            (ActiveRoute::LiveDraft, "Champ Select"),
            (ActiveRoute::DpmLens, "Post-game"),
        ] {
            assert_eq!(r.label(), expected);
        }
    }
}
