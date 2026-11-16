//! Obsidian Dark Palette, `anomalyco/rune` (`rune-kit`) semantic tokens, and DPM v1.8.1 colors.

use gpui_kit::{rgba, Rgba};

// Core surfaces (`rune-kit` Palette roles: page, bg_deep, bg_base, layer_01..layer_03)
pub const BG_CANVAS: u32 = 0x090B10;
pub const BG_SIDEBAR: u32 = 0x0B0E14;
pub const BG_SURFACE: u32 = 0x11151F;
pub const BG_ELEVATED: u32 = 0x161B28;
pub const LAYER_02: u32 = 0x1C2233;

// Borders (`border_muted`, `border_base`, `border_strong`)
pub const BORDER_MUTED: u32 = 0x151A26;
pub const BORDER_SUBTLE: u32 = 0x1E2536;
pub const BORDER_STRONG: u32 = 0x2E3852;

// Typography (`text_base`, `text_muted`, `text_faint`)
pub const TEXT_PRIMARY: u32 = 0xF8FAFC;
pub const TEXT_SECONDARY: u32 = 0x94A3B8;
pub const TEXT_FAINT: u32 = 0x64748B;

// Semantic accents & DPM v1.8.1 role colors
pub const ACCENT_PRIMARY: u32 = 0x6366F1;
pub const ACCENT_SOFT: u32 = 0x818CF8;
pub const VICTORY_BLUE: u32 = 0x3B82F6;
pub const DEFEAT_RED: u32 = 0xF43F5E;
pub const POSITIVE_GREEN: u32 = 0x10B981;
pub const MVP_GOLD: u32 = 0xF59E0B;
pub const ACE_PURPLE: u32 = 0xA855F7;
pub const CHALLENGER_CYAN: u32 = 0x38BDF8;
pub const WARNING_ORANGE: u32 = 0xF97316;

// Skin rarity gem colors (Screenshot 5: Collection)
pub const GEM_STANDARD: u32 = 0x94A3B8;
pub const GEM_EPIC: u32 = 0x38BDF8;
pub const GEM_LEGENDARY: u32 = 0xEF4444;
pub const GEM_MYTHIC: u32 = 0xA855F7;
pub const GEM_ULTIMATE: u32 = 0xF59E0B;
pub const GEM_EXALTED: u32 = 0xEC4899;
pub const GEM_TRANSCENDENT: u32 = 0x14B8A6;

/// Converts a 24-bit hex RGB constant into an opaque `gpui_kit::Rgba`.
#[inline]
pub fn color(hex_rgb: u32) -> Rgba {
    rgba((hex_rgb << 8) | 0xFF)
}

/// Converts a 24-bit hex RGB constant and alpha (`0.0..=1.0`) into `gpui_kit::Rgba`.
#[inline]
pub fn color_alpha(hex_rgb: u32, alpha: f32) -> Rgba {
    let a = (alpha.clamp(0.0, 1.0) * 255.0).round() as u32;
    rgba((hex_rgb << 8) | a)
}

/// Returns the DPM v1.8.1 tier color for `S+`, `S`, `A`, `B`, `C`, `D`.
pub fn tier_color(tier: &str) -> u32 {
    match tier {
        "S+" => MVP_GOLD,
        "S" => ACCENT_SOFT,
        "A" => CHALLENGER_CYAN,
        "B" => POSITIVE_GREEN,
        "C" => WARNING_ORANGE,
        _ => TEXT_SECONDARY,
    }
}

/// Returns the circular ring color for a `0..=100` Baron/DPM score.
pub fn score_ring_color(score: f64) -> u32 {
    if score >= 85.0 {
        MVP_GOLD
    } else if score >= 70.0 {
        CHALLENGER_CYAN
    } else if score >= 55.0 {
        ACCENT_SOFT
    } else if score >= 45.0 {
        WARNING_ORANGE
    } else {
        DEFEAT_RED
    }
}

/// Returns `(bg_top_hex, bg_bottom_hex, accent_hex)` for a champion portrait or splash card.
pub fn champion_palette(name: &str) -> (u32, u32, u32) {
    let mut hash: u32 = 2166136261;
    for b in name.bytes() {
        hash = (hash ^ (b as u32)).wrapping_mul(16777619);
    }
    let palettes: &[(u32, u32, u32)] = &[
        (0x1E1B4B, 0x0F172A, 0x818CF8), // Cosmic Indigo (Ahri, Orianna, Syndra)
        (0x3B1D1E, 0x140C14, 0xF43F5E), // Crimson Warlord (Aatrox, Lee Sin, Yone)
        (0x132A2E, 0x0B151E, 0x38BDF8), // Frost / Hextech Cyan (Ashe, Jinx, Ezreal)
        (0x2E1A47, 0x120D24, 0xA855F7), // Void / Spirit Violet (Kai'Sa, Evelynn, Akali)
        (0x142E24, 0x0B1917, 0x10B981), // Shadow Isles Emerald (Thresh, Viego, Nautilus)
        (0x382613, 0x18120B, 0xF59E0B), // Solar Gold (Gnar, Leona, Jarvan IV)
        (0x361830, 0x160C18, 0xEC4899), // Star Guardian Rose (Vi, Sona, Lulu)
    ];
    palettes[(hash as usize) % palettes.len()]
}
