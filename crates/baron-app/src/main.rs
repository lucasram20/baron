#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod helpers;
mod rune_ui;
mod theme;
mod views;
mod workspace;

use std::borrow::Cow;

use gpui_kit::component::{Theme, ThemeMode, TitleBar};
use gpui_kit::*;

struct BaronAssets;

impl AssetSource for BaronAssets {
    fn load(&self, path: &str) -> Result<Option<Cow<'static, [u8]>>> {
        if path == "logo/baron_logo.png" {
            return Ok(Some(Cow::Borrowed(include_bytes!(
                "../../../assets/logo/baron_logo.png"
            ))));
        }
        gpui_kit::assets::Assets.load(path)
    }

    fn list(&self, path: &str) -> Result<Vec<SharedString>> {
        let mut items = gpui_kit::assets::Assets.list(path)?;
        if "logo/baron_logo.png".starts_with(path) {
            items.push("logo/baron_logo.png".into());
        }
        Ok(items)
    }
}

fn main() {
    gpui_kit::application().with_assets(BaronAssets).run(|cx| {
        gpui_kit::init(cx);
        Theme::change(ThemeMode::Dark, None, cx);

        let mut options = TitleBar::window_options();
        options.window_min_size = Some(size(px(1260.), px(800.)));
        if let Some(ref mut tb) = options.titlebar {
            tb.title = Some("Baron".into());
        }

        gpui_kit::open_window(options, cx, |window, cx| {
            cx.new(|cx| workspace::BaronWorkspace::new(window, cx))
        })
        .expect("Failed to open Baron main window");
    });
}
