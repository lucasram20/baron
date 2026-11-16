#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod helpers;
mod theme;
mod views;
mod workspace;

use gpui_kit::component::{Theme, ThemeMode, TitleBar};
use gpui_kit::*;

fn main() {
    gpui_kit::application()
        .with_assets(gpui_kit::assets::Assets)
        .run(|cx| {
            gpui_kit::init(cx);
            Theme::change(ThemeMode::Dark, None, cx);

            let mut options = TitleBar::window_options();
            options.window_min_size = Some(size(px(1180.), px(760.)));
            if let Some(ref mut tb) = options.titlebar {
                tb.title = Some("Baron".into());
            }

            gpui_kit::open_window(options, cx, |window, cx| {
                cx.new(|cx| workspace::BaronWorkspace::new(window, cx))
            })
            .expect("Failed to open Baron main window");
        });
}
