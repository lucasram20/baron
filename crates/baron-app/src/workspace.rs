use baron_core::models::DashboardSampleData;
use baron_db::BaronDatabase;
use baron_lcu::OwnedSkinEntry;
use gpui_kit::component::button::{Button, ButtonVariants as _};
use gpui_kit::component::input::{Input, InputState};
use gpui_kit::component::tag::Tag;
use gpui_kit::component::ScrollableElement;
use gpui_kit::component::Sizable as _;
use gpui_kit::*;

pub use crate::helpers::*;
use crate::theme;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActiveRoute {
    Home,
    LiveDraft,
    DpmLens,
    TierList,
    Leaderboards,
    SkinVault,
}

impl ActiveRoute {
    pub fn label(&self) -> &'static str {
        match self {
            Self::Home => "Home",
            Self::LiveDraft => "Live Draft",
            Self::DpmLens => "DPM Lens",
            Self::TierList => "Tier List",
            Self::Leaderboards => "Leaderboards",
            Self::SkinVault => "Skin Vault",
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
    pub expanded_match_id: Option<String>,
    pub data: DashboardSampleData,
    pub skins: Vec<OwnedSkinEntry>,
    // ponytail: persisted DB handle ready for live LCU/Riot sync wiring
    #[allow(dead_code)]
    pub db: BaronDatabase,
}

impl BaronWorkspace {
    pub fn new(window: &mut Window, cx: &mut Context<Self>) -> Self {
        let search_input =
            cx.new(|cx| InputState::new(window, cx).placeholder("Search Riot ID..."));
        let db = BaronDatabase::open_in_memory().expect("in-memory db");
        let data = baron_core::sample_dashboard_data();
        let skins = baron_lcu::sample_owned_skins();
        let _ = db.upsert_account(&data.account);

        Self {
            route: ActiveRoute::Home,
            search_input,
            auto_runes: true,
            auto_spells: true,
            auto_items: true,
            lcu_connected: true,
            expanded_match_id: None,
            data,
            skins,
            db,
        }
    }

    fn render_top_bar(&self, _cx: &Context<Self>) -> impl IntoElement {
        let lcu_tag = if self.lcu_connected {
            Tag::primary().small().rounded_full().child("● Connected")
        } else {
            Tag::danger().small().rounded_full().child("○ Offline")
        };
        let search_box = div()
            .w(px(260.))
            .child(Input::new(&self.search_input).cleanable(true));
        let brand = div()
            .text_base()
            .font_weight(FontWeight::BOLD)
            .text_color(theme::color(theme::TEXT_PRIMARY))
            .child("Baron");

        div()
            .h(px(48.))
            .w_full()
            .bg(theme::color(theme::BG_SURFACE))
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
                    .gap_3()
                    .child(brand)
                    .child(search_box),
            )
            .child(
                div()
                    .flex()
                    .flex_row()
                    .items_center()
                    .gap_2()
                    .child(Tag::secondary().small().child("KR"))
                    .child(Tag::secondary().small().child("Patch 14.10"))
                    .child(Tag::secondary().small().child("U.GG"))
                    .child(lcu_tag),
            )
    }

    fn render_nav_rail(&self, cx: &Context<Self>) -> impl IntoElement {
        let routes = [
            ActiveRoute::Home,
            ActiveRoute::LiveDraft,
            ActiveRoute::DpmLens,
            ActiveRoute::TierList,
            ActiveRoute::Leaderboards,
            ActiveRoute::SkinVault,
        ];

        div()
            .w(px(140.))
            .h_full()
            .bg(theme::color(theme::BG_SURFACE))
            .border_r_1()
            .border_color(theme::color(theme::BORDER_SUBTLE))
            .p_2()
            .flex()
            .flex_col()
            .gap_1()
            .children(routes.into_iter().map(|r| {
                let label = r.label();
                let btn = if self.route == r {
                    Button::new(label).label(label).small().primary()
                } else {
                    Button::new(label).label(label).small().ghost()
                };
                btn.on_click(cx.listener(move |this, _, _, cx| {
                    this.route = r;
                    cx.notify();
                }))
            }))
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
            ActiveRoute::SkinVault => {
                crate::views::extras::render_skin_vault(self, window, cx).into_any_element()
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
            .child(self.render_top_bar(cx))
            .child(
                div()
                    .flex_1()
                    .min_h_0()
                    .flex()
                    .flex_row()
                    .overflow_hidden()
                    .child(self.render_nav_rail(cx))
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
            (ActiveRoute::Home, "Home"),
            (ActiveRoute::LiveDraft, "Live Draft"),
            (ActiveRoute::DpmLens, "DPM Lens"),
            (ActiveRoute::TierList, "Tier List"),
            (ActiveRoute::Leaderboards, "Leaderboards"),
            (ActiveRoute::SkinVault, "Skin Vault"),
        ] {
            assert_eq!(r.label(), expected);
        }
    }
}
