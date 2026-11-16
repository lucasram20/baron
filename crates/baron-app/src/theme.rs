use gpui_kit::*;

pub const BG_CANVAS: u32 = 0x090B10;
pub const BG_SURFACE: u32 = 0x11151F;
pub const BG_ELEVATED: u32 = 0x171C29;
pub const BORDER_SUBTLE: u32 = 0x1E2536;
pub const TEXT_PRIMARY: u32 = 0xF3F4F6;
pub const TEXT_SECONDARY: u32 = 0x9CA3AF;
pub const TEXT_MUTED: u32 = 0x6B7280;
pub const ACCENT_PRIMARY: u32 = 0x6366F1;
pub const VICTORY_BLUE: u32 = 0x3B82F6;
pub const DEFEAT_ROSE: u32 = 0xF43F5E;
pub const POSITIVE_EMERALD: u32 = 0x10B981;
pub const MVP_GOLD: u32 = 0xF59E0B;
pub const ACE_PURPLE: u32 = 0xA855F7;

/// Converts a 24-bit RGB hex literal to a GPUI `Rgba` color.
pub fn color(hex: u32) -> Rgba {
    rgb(hex)
}

/// Converts a 24-bit RGB hex literal with alpha (0.0..=1.0) to a GPUI `Hsla` color.
pub fn color_alpha(hex: u32, alpha: f32) -> Hsla {
    Hsla::from(rgb(hex)).opacity(alpha)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_theme_colors() {
        let c = color(BG_CANVAS);
        assert!((c.r - 9.0 / 255.0).abs() < 0.01);
        let ca = color_alpha(VICTORY_BLUE, 0.5);
        assert!((ca.a - 0.5).abs() < 0.05);
    }
}
