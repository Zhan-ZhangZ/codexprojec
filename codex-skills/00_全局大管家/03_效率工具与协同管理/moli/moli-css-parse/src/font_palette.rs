use style::stylesheets::{CssRule, font_palette_values_rule::FontPaletteValuesRule};
use style_traits::ToCss;

/// Read-only CSSOM fields projected from a native font palette rule.
#[derive(Clone, Copy, Debug)]
pub enum CssFontPaletteValuesProperty {
    Name,
    FontFamily,
    BasePalette,
    OverrideColors,
}

impl CssFontPaletteValuesProperty {
    pub fn read(self, rule: &FontPaletteValuesRule) -> String {
        match self {
            Self::Name => rule.name.0.to_string(),
            // Stylo's one-or-more list serializer requires a non-empty list.
            Self::FontFamily if rule.family_names.is_empty() => String::new(),
            Self::FontFamily => rule.family_names.to_css_string(),
            Self::BasePalette => rule
                .base_palette
                .as_ref()
                .map(ToCss::to_css_string)
                .unwrap_or_default(),
            Self::OverrideColors if rule.override_colors.is_empty() => String::new(),
            Self::OverrideColors => rule.override_colors.to_css_string(),
        }
    }
}

/// Rehydrate a detached rule with the same parser used by live stylesheets.
pub fn parse_font_palette_values_property_with_stylo(
    css_text: &str,
    property: CssFontPaletteValuesProperty,
) -> Option<String> {
    let sheet = style::moli_rule_tree::parse_stylesheet_rule_tree(css_text);
    let guard = sheet.shared_lock.read();
    let contents = sheet.contents.read_with(&guard);
    let rules = contents.rules.read_with(&guard);
    let [CssRule::FontPaletteValues(rule)] = rules.0.as_slice() else {
        return None;
    };
    Some(property.read(rule))
}
