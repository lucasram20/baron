use baron_core::models::DashboardSampleData;
use baron_db::BaronDatabase;
use baron_lcu::OwnedSkinEntry;
use gpui_kit::component::avatar::Avatar;
use gpui_kit::component::button::{Button, ButtonVariants as _};
use gpui_kit::component::input::{Input, InputState};
use gpui_kit::component::scroll::ScrollableElement;
use gpui_kit::component::tag::Tag;
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
            expanded_match_id: None,
            data,
            skins,
            db,
        }
    }

    fn render_top_command_bar(&self, cx: &Context<Self>) -> impl IntoElement {
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
                        Tag::secondary()
                            .small()
                            .child(baron_riot::DEFAULT_FALLBACK_ORDER[0].label()),
                    )
                    .child(
                        Button::new("top-settings")
                            .icon(Icon::new(IconName::Settings))
                            .ghost()
                            .xsmall(),
                    ),
            )
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
                    // Brand Header (Matches DPM APP V1.8.1 top-left header)
                    .child(
                        div()
                            .flex()
                            .flex_row()
                            .items_center()
                            .gap_2()
                            .child(
                                div()
                                    .w(px(28.))
                                    .h(px(28.))
                                    .rounded_md()
                                    .bg(theme::color(theme::ACCENT_PRIMARY))
                                    .flex()
                                    .items_center()
                                    .justify_center()
                                    .text_sm()
                                    .font_weight(FontWeight::BOLD)
                                    .text_color(theme::color(theme::TEXT_PRIMARY))
                                    .child("B"),
                            )
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
                    // BARON CORE group
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
                            // Indented active summoner pill under Dashboard
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
                    // BARON APP group
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
                    // BARON INSIGHTS group
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
                    // IN GAME group
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
            // Bottom Pinned Summoner Profile Card (Matches DPM APP V1.8.1 bottom-left card)
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
                        .items_center()
                        .text_xs()
                        .font_weight(FontWeight::SEMIBOLD)
                        .text_color(theme::color(theme::TEXT_SECONDARY))
                        .child("Baron"),
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
