//! Native Makepad implementations for the small, reusable Tessera controls.
//!
//! This module intentionally contains no route lookup, HTML, Live source from
//! user input, asset path, or host command string. The Gallery owns routes and
//! business effects. These widgets own bounded presentation and emit typed
//! [`AtomicAction`] values only.

use crate::foundation::focus::{FocusRegion, set_tab_navigation_origin};
use crate::foundation::input::{
    button_keyboard_activation, enabled_choice_index, set_button_enabled,
};
use crate::foundation::popup::{PopupPlacement, popup_rect, position_popup, safe_popup_rect};
use crate::foundation::vector::{AlignedVector as DrawVector, DpiStroke};
use crate::makepad_widgets::shader::draw_text::TextOverflow;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

/// Maximum text accepted by a single atomic widget configuration.
pub const MAX_ATOMIC_TEXT_BYTES: usize = 8_192;
/// A toolbar never renders more than this many direct commands.
pub const MAX_TOOLBAR_ITEMS: usize = 12;
/// A FloatButton stack reserves the sixth entry for its host overflow affordance.
pub const MAX_FLOAT_BUTTON_STACK: usize = 5;
/// Watermark painting has a hard tile ceiling to avoid unbounded draw work.
pub const MAX_WATERMARK_TILES: usize = 256;
/// Count badges preserve the precise count in accessibility text but cap pixels at this value.
pub const BADGE_DISPLAY_CAP: u32 = 99;

const ATOMIC_CONTROL_RADIUS: f64 = 8.0;

/// The twelve catalog entries implemented by this module.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq, Hash, Ord, PartialOrd)]
pub enum AtomicComponent {
    #[default]
    Button,
    FloatButton,
    Icon,
    Typography,
    IconButton,
    Toolbar,
    Divider,
    Space,
    Watermark,
    Badge,
    Tag,
    Avatar,
}

impl AtomicComponent {
    pub const ALL: [Self; 12] = [
        Self::Button,
        Self::FloatButton,
        Self::Icon,
        Self::Typography,
        Self::IconButton,
        Self::Toolbar,
        Self::Divider,
        Self::Space,
        Self::Watermark,
        Self::Badge,
        Self::Tag,
        Self::Avatar,
    ];

    #[must_use]
    pub const fn component_id(self) -> ComponentId {
        match self {
            Self::Button => ComponentId::Button,
            Self::FloatButton => ComponentId::FloatButton,
            Self::Icon => ComponentId::Icon,
            Self::Typography => ComponentId::Typography,
            Self::IconButton => ComponentId::IconButton,
            Self::Toolbar => ComponentId::Toolbar,
            Self::Divider => ComponentId::Divider,
            Self::Space => ComponentId::Space,
            Self::Watermark => ComponentId::Watermark,
            Self::Badge => ComponentId::Badge,
            Self::Tag => ComponentId::Tag,
            Self::Avatar => ComponentId::Avatar,
        }
    }

    #[must_use]
    pub const fn widget_name(self) -> &'static str {
        match self {
            Self::Button => "TesseraButton",
            Self::FloatButton => "TesseraFloatButton",
            Self::Icon => "TesseraIcon",
            Self::Typography => "TesseraTypography",
            Self::IconButton => "TesseraIconButton",
            Self::Toolbar => "TesseraToolbar",
            Self::Divider => "TesseraDivider",
            Self::Space => "TesseraSpace",
            Self::Watermark => "TesseraWatermark",
            Self::Badge => "TesseraBadge",
            Self::Tag => "TesseraTag",
            Self::Avatar => "TesseraAvatar",
        }
    }
}

/// Stable, allocation-free discovery surface for the integration owner.
pub struct AtomicSurfaceCatalog;

impl AtomicSurfaceCatalog {
    pub const COMPONENTS: [AtomicComponent; 12] = AtomicComponent::ALL;

    #[must_use]
    pub const fn contains(id: ComponentId) -> bool {
        matches!(
            id,
            ComponentId::Button
                | ComponentId::FloatButton
                | ComponentId::Icon
                | ComponentId::Typography
                | ComponentId::IconButton
                | ComponentId::Toolbar
                | ComponentId::Divider
                | ComponentId::Space
                | ComponentId::Watermark
                | ComponentId::Badge
                | ComponentId::Tag
                | ComponentId::Avatar
        )
    }

    #[must_use]
    pub const fn component(id: ComponentId) -> Option<AtomicComponent> {
        match id {
            ComponentId::Button => Some(AtomicComponent::Button),
            ComponentId::FloatButton => Some(AtomicComponent::FloatButton),
            ComponentId::Icon => Some(AtomicComponent::Icon),
            ComponentId::Typography => Some(AtomicComponent::Typography),
            ComponentId::IconButton => Some(AtomicComponent::IconButton),
            ComponentId::Toolbar => Some(AtomicComponent::Toolbar),
            ComponentId::Divider => Some(AtomicComponent::Divider),
            ComponentId::Space => Some(AtomicComponent::Space),
            ComponentId::Watermark => Some(AtomicComponent::Watermark),
            ComponentId::Badge => Some(AtomicComponent::Badge),
            ComponentId::Tag => Some(AtomicComponent::Tag),
            ComponentId::Avatar => Some(AtomicComponent::Avatar),
            _ => None,
        }
    }
}

/// A trusted, bounded command identifier assigned by the embedding host.
pub type AtomicCommandId = u32;

/// Errors returned before a configuration is accepted by a widget.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AtomicConfigError {
    EmptyAccessibleLabel,
    DuplicateToolbarCommand(AtomicCommandId),
    TooManyToolbarItems { maximum: usize, actual: usize },
    InvalidWatermark,
}

/// All interaction output from this module is typed and local to a widget.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub enum AtomicAction {
    #[default]
    None,
    Pressed {
        component: AtomicComponent,
        command: AtomicCommandId,
    },
    Activated {
        component: AtomicComponent,
        command: AtomicCommandId,
    },
    Released {
        component: AtomicComponent,
        command: AtomicCommandId,
    },
    CopyRequested {
        command: AtomicCommandId,
    },
    ToolbarMoved {
        active_index: usize,
    },
    ToolbarOverflowOpened,
    ToolbarOverflowClosed,
    TagRemoved {
        command: AtomicCommandId,
    },
}

/// Runtime pointer and keyboard state shared by command-like widgets.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct AtomicInteraction {
    pub hovered: bool,
    pub pressed: bool,
    /// Focus ownership only; the host decides whether to paint a keyboard ring.
    pub focused: bool,
}

impl AtomicInteraction {
    #[must_use]
    pub const fn is_active(self) -> bool {
        self.hovered || self.pressed || self.focused
    }

    pub fn clear_pointer(&mut self) {
        self.hovered = false;
        self.pressed = false;
    }
}

/// Compact rgba color independent of the renderer's private shader types.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct AtomicColor {
    pub red: f32,
    pub green: f32,
    pub blue: f32,
    pub alpha: f32,
}

impl AtomicColor {
    pub const TRANSPARENT: Self = Self::new(0.0, 0.0, 0.0, 0.0);

    #[must_use]
    pub const fn new(red: f32, green: f32, blue: f32, alpha: f32) -> Self {
        Self {
            red,
            green,
            blue,
            alpha,
        }
    }

    #[must_use]
    pub fn to_vec4(self) -> Vec4f {
        vec4(self.red, self.green, self.blue, self.alpha)
    }

    #[must_use]
    pub const fn with_alpha(self, alpha: f32) -> Self {
        Self { alpha, ..self }
    }

    fn from_token(token: &'static str) -> Self {
        let rgba = crate::foundation::theme::rgba(token);
        let channel = |shift: u32| ((rgba >> shift) & 255_u32) as f32 / 255.0;
        Self::new(channel(24), channel(16), channel(8), channel(0))
    }

    fn over(self, background: Self) -> Self {
        let channel = |front, back| front * self.alpha + back * (1.0 - self.alpha);
        Self::new(
            channel(self.red, background.red),
            channel(self.green, background.green),
            channel(self.blue, background.blue),
            1.0,
        )
    }
}

/// Semantic palette supplied by the host whenever Light or Dark changes.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct AtomicPalette {
    pub surface: AtomicColor,
    pub surface_hover: AtomicColor,
    pub surface_active: AtomicColor,
    pub surface_disabled: AtomicColor,
    pub text: AtomicColor,
    pub text_muted: AtomicColor,
    pub text_disabled: AtomicColor,
    pub inverse_text: AtomicColor,
    pub border: AtomicColor,
    pub focus: AtomicColor,
    pub accent: AtomicColor,
    pub primary: AtomicColor,
    pub primary_hover: AtomicColor,
    pub primary_text: AtomicColor,
    pub success: AtomicColor,
    pub warning: AtomicColor,
    pub danger: AtomicColor,
    pub watermark: AtomicColor,
}

impl AtomicPalette {
    #[must_use]
    pub fn light() -> Self {
        Self::from_tokens(&crate::foundation::theme::LIGHT)
    }

    #[must_use]
    pub fn dark() -> Self {
        Self::from_tokens(&crate::foundation::theme::DARK)
    }

    /// Project once on theme changes; paint never reparses tokens.
    pub fn from_tokens(p: &crate::foundation::theme::ThemeTokens) -> Self {
        let surface = AtomicColor::from_token(p.surface);
        Self {
            surface,
            surface_hover: AtomicColor::from_token(p.surface_hover).over(surface),
            surface_active: AtomicColor::from_token(p.surface_active).over(surface),
            surface_disabled: AtomicColor::from_token(p.surface_muted),
            text: AtomicColor::from_token(p.text),
            text_muted: AtomicColor::from_token(p.text_secondary),
            text_disabled: AtomicColor::from_token(p.text_disabled),
            inverse_text: AtomicColor::from_token(p.on_inverse),
            border: AtomicColor::from_token(p.border),
            focus: AtomicColor::from_token(p.focus_ring),
            accent: AtomicColor::from_token(p.accent),
            primary: AtomicColor::from_token(p.primary_button_bg),
            primary_hover: AtomicColor::from_token(p.primary_button_bg_hover),
            primary_text: AtomicColor::from_token(p.primary_button_fg),
            success: AtomicColor::from_token(p.success),
            warning: AtomicColor::from_token(p.warning),
            danger: AtomicColor::from_token(p.danger),
            watermark: AtomicColor::from_token(p.watermark),
        }
    }
}

impl Default for AtomicPalette {
    fn default() -> Self {
        Self::light()
    }
}

/// Bounds UTF-8 input without splitting a scalar. The ellipsis is ASCII so
/// the exact resulting byte cap remains stable across font fallbacks.
#[must_use]
pub fn bounded_text(value: &str, maximum: usize) -> String {
    let maximum = maximum.min(MAX_ATOMIC_TEXT_BYTES);
    if value.len() <= maximum {
        return value.to_owned();
    }
    if maximum == 0 {
        return String::new();
    }
    if maximum <= 3 {
        let mut end = maximum;
        while end > 0 && !value.is_char_boundary(end) {
            end -= 1;
        }
        return value[..end].to_owned();
    }
    let mut end = maximum - 3;
    while end > 0 && !value.is_char_boundary(end) {
        end -= 1;
    }
    format!("{}...", &value[..end])
}

fn activation_key(key: KeyCode) -> bool {
    matches!(
        key,
        KeyCode::ReturnKey | KeyCode::NumpadEnter | KeyCode::Space
    )
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum CommandSignal {
    Pressed,
    Activated,
    Released,
}

fn command_signal(
    cx: &mut Cx,
    event: &Event,
    area: Area,
    enabled: bool,
    interaction: &mut AtomicInteraction,
) -> Option<CommandSignal> {
    let previous = *interaction;
    let signal = match event.hits(cx, area) {
        Hit::KeyFocus(_) => {
            interaction.focused = true;
            None
        }
        Hit::KeyFocusLost(_) => {
            interaction.focused = false;
            interaction.pressed = false;
            None
        }
        Hit::FingerHoverIn(_) => {
            interaction.hovered = true;
            if enabled {
                cx.set_cursor(MouseCursor::Hand);
            } else {
                cx.set_cursor(MouseCursor::NotAllowed);
            }
            None
        }
        Hit::FingerHoverOut(_) => {
            interaction.hovered = false;
            interaction.pressed = false;
            None
        }
        Hit::FingerDown(fe) if enabled && fe.is_primary_hit() => {
            interaction.pressed = true;
            interaction.focused = true;
            cx.set_key_focus(area);
            Some(CommandSignal::Pressed)
        }
        Hit::FingerUp(fe) if enabled && fe.is_primary_hit() => {
            let activate = fe.is_over;
            interaction.pressed = false;
            if activate {
                Some(CommandSignal::Activated)
            } else {
                Some(CommandSignal::Released)
            }
        }
        Hit::KeyDown(key) if enabled && !key.is_repeat && activation_key(key.key_code) => {
            Some(CommandSignal::Activated)
        }
        _ => None,
    };
    // Focus and hover change paint without emitting a host command.
    if *interaction != previous {
        area.redraw(cx);
    }
    signal
}

fn emit_command(
    cx: &mut Cx,
    uid: WidgetUid,
    component: AtomicComponent,
    command: AtomicCommandId,
    signal: CommandSignal,
) {
    let action = match signal {
        CommandSignal::Pressed => AtomicAction::Pressed { component, command },
        CommandSignal::Activated => AtomicAction::Activated { component, command },
        CommandSignal::Released => AtomicAction::Released { component, command },
    };
    cx.widget_action(uid, action);
}

fn inset_rect(rect: Rect, inset: f64) -> Rect {
    let horizontal = (rect.size.x - inset * 2.0).max(0.0);
    let vertical = (rect.size.y - inset * 2.0).max(0.0);
    Rect {
        pos: dvec2(rect.pos.x + inset, rect.pos.y + inset),
        size: dvec2(horizontal, vertical),
    }
}

fn draw_text_line(
    draw_text: &mut DrawText,
    cx: &mut Cx2d,
    rect: Rect,
    text: &str,
    color: AtomicColor,
    font_size: f64,
    align: Align,
) {
    if rect.size.x <= 0.0 || rect.size.y <= 0.0 || text.is_empty() {
        return;
    }
    draw_text.color = color.to_vec4();
    draw_text.text_style.font_size = font_size as f32;
    draw_text.max_lines = 1;
    draw_text.text_overflow = TextOverflow::Ellipsis;
    cx.begin_turtle(
        Walk {
            abs_pos: Some(rect.pos),
            width: Size::Fixed(rect.size.x),
            height: Size::Fixed(rect.size.y),
            ..Walk::default()
        },
        Layout {
            clip_x: true,
            clip_y: true,
            align: Align { x: 0.0, y: align.y },
            ..Layout::default()
        },
    );
    draw_text.draw_walk(
        cx,
        Walk {
            width: Size::fill(),
            height: Size::fit(),
            ..Walk::default()
        },
        align,
        text,
    );
    cx.end_turtle();
}

fn draw_icon_path(
    draw: &mut DrawVector,
    cx: &Cx2d,
    icon: AtomicIcon,
    rect: Rect,
    color: AtomicColor,
) {
    let side = rect.size.x.min(rect.size.y).max(0.0);
    if side < 2.0 {
        return;
    }
    let x = rect.pos.x as f32;
    let y = rect.pos.y as f32;
    let side = side as f32;
    let mid_x = x + side * 0.5;
    let mid_y = y + side * 0.5;
    let edge = side * 0.24;
    draw.set_color(color.red, color.green, color.blue, color.alpha);
    match icon {
        AtomicIcon::Add => {
            draw.clear();
            draw.move_to(mid_x - edge, mid_y);
            draw.line_to(mid_x + edge, mid_y);
            draw.stroke_dip(cx, (side * 0.12).max(1.2));
            draw.clear();
            draw.move_to(mid_x, mid_y - edge);
            draw.line_to(mid_x, mid_y + edge);
            draw.stroke_dip(cx, (side * 0.12).max(1.2));
        }
        AtomicIcon::Close => {
            draw.clear();
            draw.move_to(mid_x - edge, mid_y - edge);
            draw.line_to(mid_x + edge, mid_y + edge);
            draw.stroke_dip(cx, (side * 0.12).max(1.2));
            draw.clear();
            draw.move_to(mid_x + edge, mid_y - edge);
            draw.line_to(mid_x - edge, mid_y + edge);
            draw.stroke_dip(cx, (side * 0.12).max(1.2));
        }
        AtomicIcon::More => {
            for factor in [0.30_f32, 0.50, 0.70] {
                draw.clear();
                draw.circle(x + side * factor, mid_y, (side * 0.075).max(1.0));
                draw.fill();
            }
        }
        AtomicIcon::Search => {
            draw.clear();
            draw.circle(mid_x - side * 0.08, mid_y - side * 0.08, side * 0.20);
            draw.stroke_dip(cx, (side * 0.10).max(1.1));
            draw.clear();
            draw.move_to(mid_x + side * 0.08, mid_y + side * 0.08);
            draw.line_to(mid_x + side * 0.27, mid_y + side * 0.27);
            draw.stroke_dip(cx, (side * 0.10).max(1.1));
        }
        AtomicIcon::ArrowRight => {
            draw.clear();
            draw.move_to(x + side * 0.22, mid_y);
            draw.line_to(x + side * 0.76, mid_y);
            draw.stroke_dip(cx, (side * 0.10).max(1.1));
            draw.clear();
            draw.move_to(x + side * 0.56, y + side * 0.29);
            draw.line_to(x + side * 0.76, mid_y);
            draw.line_to(x + side * 0.56, y + side * 0.71);
            draw.stroke_dip(cx, (side * 0.10).max(1.1));
        }
        AtomicIcon::Check => {
            draw.clear();
            draw.move_to(x + side * 0.22, mid_y);
            draw.line_to(x + side * 0.43, y + side * 0.70);
            draw.line_to(x + side * 0.79, y + side * 0.29);
            draw.stroke_dip(cx, (side * 0.11).max(1.1));
        }
        AtomicIcon::Info => {
            draw.clear();
            draw.circle(mid_x, mid_y, side * 0.30);
            draw.stroke_dip(cx, (side * 0.09).max(1.0));
            draw.clear();
            draw.circle(mid_x, y + side * 0.34, (side * 0.05).max(0.8));
            draw.fill();
            draw.clear();
            draw.move_to(mid_x, y + side * 0.44);
            draw.line_to(mid_x, y + side * 0.67);
            draw.stroke_dip(cx, (side * 0.08).max(0.9));
        }
        AtomicIcon::Person => {
            draw.clear();
            draw.circle(mid_x, y + side * 0.36, side * 0.14);
            draw.fill();
            draw.clear();
            draw.rounded_rect(
                x + side * 0.24,
                y + side * 0.56,
                side * 0.52,
                side * 0.23,
                side * 0.11,
            );
            draw.fill();
        }
        AtomicIcon::Missing => {
            draw.clear();
            draw.rounded_rect(
                x + side * 0.16,
                y + side * 0.16,
                side * 0.68,
                side * 0.68,
                side * 0.09,
            );
            draw.stroke_dip(cx, (side * 0.09).max(1.0));
            draw.clear();
            draw.move_to(x + side * 0.31, y + side * 0.31);
            draw.line_to(x + side * 0.69, y + side * 0.69);
            draw.stroke_dip(cx, (side * 0.09).max(1.0));
        }
    }
}

/// The fixed vocabulary accepted by Icon, IconButton, Toolbar and FloatButton.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq, Hash)]
pub enum AtomicIcon {
    #[default]
    Add,
    Close,
    More,
    Search,
    ArrowRight,
    Check,
    Info,
    Person,
    Missing,
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum ButtonVariant {
    #[default]
    Primary,
    Secondary,
    Ghost,
    Danger,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ButtonConfig {
    pub label: String,
    pub accessible_label: String,
    pub command: AtomicCommandId,
    pub variant: ButtonVariant,
    pub enabled: bool,
}

impl ButtonConfig {
    #[must_use]
    pub fn new(label: &str, command: AtomicCommandId) -> Self {
        let label = bounded_text(label, 512);
        Self {
            accessible_label: label.clone(),
            label,
            command,
            variant: ButtonVariant::Primary,
            enabled: true,
        }
    }
}

impl Default for ButtonConfig {
    fn default() -> Self {
        Self::new("Continue", 0)
    }
}

fn button_visual(
    variant: ButtonVariant,
    palette: AtomicPalette,
    interaction: AtomicInteraction,
    enabled: bool,
) -> (AtomicColor, AtomicColor) {
    if !enabled {
        return (palette.surface_disabled, palette.text_disabled);
    }
    let active = if interaction.pressed {
        palette.surface_active
    } else if interaction.hovered {
        palette.surface_hover
    } else {
        palette.surface
    };
    match variant {
        ButtonVariant::Primary => {
            let fill = if interaction.pressed || interaction.hovered {
                palette.primary_hover
            } else {
                palette.primary
            };
            (fill, palette.primary_text)
        }
        ButtonVariant::Secondary => (active, palette.text),
        ButtonVariant::Ghost => (AtomicColor::TRANSPARENT, palette.text),
        ButtonVariant::Danger => {
            let fill = if interaction.hovered || interaction.pressed {
                palette.danger.with_alpha(0.20)
            } else {
                palette.danger.with_alpha(0.11)
            };
            (fill, palette.danger)
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum FloatButtonSize {
    #[default]
    Compact40,
    Regular48,
}

impl FloatButtonSize {
    #[must_use]
    pub const fn logical_pixels(self) -> f64 {
        match self {
            Self::Compact40 => 40.0,
            Self::Regular48 => 48.0,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum FloatButtonEdge {
    TopLeft,
    TopRight,
    BottomLeft,
    #[default]
    BottomRight,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FloatButtonConfig {
    pub icon: AtomicIcon,
    pub accessible_label: String,
    pub command: AtomicCommandId,
    pub size: FloatButtonSize,
    pub edge: FloatButtonEdge,
    pub safe_inset: u16,
    pub stack_index: u8,
    pub enabled: bool,
}

impl FloatButtonConfig {
    #[must_use]
    pub fn new(icon: AtomicIcon, accessible_label: &str, command: AtomicCommandId) -> Self {
        Self {
            icon,
            accessible_label: bounded_text(accessible_label, 256),
            command,
            size: FloatButtonSize::Compact40,
            edge: FloatButtonEdge::BottomRight,
            safe_inset: 24,
            stack_index: 0,
            enabled: true,
        }
    }

    #[must_use]
    pub fn normalized_stack_index(&self) -> u8 {
        self.stack_index.min((MAX_FLOAT_BUTTON_STACK - 1) as u8)
    }

    /// Returns the host placement offset. The shell uses this to pin the
    /// widget; the widget itself never assumes a CSS-like fixed position.
    #[must_use]
    pub fn safe_offset(&self) -> (f64, f64) {
        let offset = f64::from(self.safe_inset)
            + f64::from(self.normalized_stack_index()) * (self.size.logical_pixels() + 8.0);
        match self.edge {
            FloatButtonEdge::TopLeft => (offset, offset),
            FloatButtonEdge::TopRight => (-offset, offset),
            FloatButtonEdge::BottomLeft => (offset, -offset),
            FloatButtonEdge::BottomRight => (-offset, -offset),
        }
    }
}

impl Default for FloatButtonConfig {
    fn default() -> Self {
        Self::new(AtomicIcon::Add, "Add", 0)
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum IconSize {
    Small12,
    #[default]
    Regular16,
    Medium20,
    Large24,
    XLarge32,
}

impl IconSize {
    #[must_use]
    pub const fn logical_pixels(self) -> f64 {
        match self {
            Self::Small12 => 12.0,
            Self::Regular16 => 16.0,
            Self::Medium20 => 20.0,
            Self::Large24 => 24.0,
            Self::XLarge32 => 32.0,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum IconStatus {
    #[default]
    Neutral,
    Success,
    Warning,
    Danger,
    Missing,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IconConfig {
    pub icon: AtomicIcon,
    pub size: IconSize,
    pub status: IconStatus,
    pub accessible_label: Option<String>,
}

impl Default for IconConfig {
    fn default() -> Self {
        Self {
            icon: AtomicIcon::Info,
            size: IconSize::Regular16,
            status: IconStatus::Neutral,
            accessible_label: None,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum TypographyRole {
    Heading1,
    Heading2,
    #[default]
    Body,
    Meta,
    Code,
    Keyboard,
    Link,
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum TypographyAction {
    #[default]
    None,
    Link,
    Copy,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TypographyConfig {
    pub text: String,
    pub role: TypographyRole,
    pub action: TypographyAction,
    pub command: AtomicCommandId,
    pub max_lines: u8,
    pub enabled: bool,
}

impl TypographyConfig {
    #[must_use]
    pub fn new(text: &str, role: TypographyRole) -> Self {
        Self {
            text: bounded_text(text, MAX_ATOMIC_TEXT_BYTES),
            role,
            action: TypographyAction::None,
            command: 0,
            max_lines: 0,
            enabled: true,
        }
    }
}

impl Default for TypographyConfig {
    fn default() -> Self {
        Self::new("Tessera native text", TypographyRole::Body)
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum IconButtonSize {
    Small32,
    #[default]
    Regular36,
    Large40,
}

impl IconButtonSize {
    #[must_use]
    pub const fn logical_pixels(self) -> f64 {
        match self {
            Self::Small32 => 32.0,
            Self::Regular36 => 36.0,
            Self::Large40 => 40.0,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IconButtonConfig {
    pub icon: AtomicIcon,
    pub accessible_label: String,
    pub command: AtomicCommandId,
    pub size: IconButtonSize,
    pub enabled: bool,
}

impl IconButtonConfig {
    pub fn new(
        icon: AtomicIcon,
        accessible_label: &str,
        command: AtomicCommandId,
    ) -> Result<Self, AtomicConfigError> {
        let accessible_label = bounded_text(accessible_label.trim(), 256);
        if accessible_label.is_empty() {
            return Err(AtomicConfigError::EmptyAccessibleLabel);
        }
        Ok(Self {
            icon,
            accessible_label,
            command,
            size: IconButtonSize::Regular36,
            enabled: true,
        })
    }
}

impl Default for IconButtonConfig {
    fn default() -> Self {
        Self::new(AtomicIcon::More, "More actions", 0).expect("non-empty static accessible label")
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum ToolbarPriority {
    Primary,
    #[default]
    Secondary,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ToolbarItem {
    pub command: AtomicCommandId,
    pub icon: AtomicIcon,
    pub label: String,
    pub priority: ToolbarPriority,
    pub enabled: bool,
}

impl ToolbarItem {
    #[must_use]
    pub fn new(command: AtomicCommandId, icon: AtomicIcon, label: &str) -> Self {
        Self {
            command,
            icon,
            label: bounded_text(label, 256),
            priority: ToolbarPriority::Secondary,
            enabled: true,
        }
    }
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct ToolbarConfig {
    pub items: Vec<ToolbarItem>,
    pub enabled: bool,
}

impl ToolbarConfig {
    pub fn validate(&self) -> Result<(), AtomicConfigError> {
        if self.items.len() > MAX_TOOLBAR_ITEMS {
            return Err(AtomicConfigError::TooManyToolbarItems {
                maximum: MAX_TOOLBAR_ITEMS,
                actual: self.items.len(),
            });
        }
        for (index, item) in self.items.iter().enumerate() {
            if item.label.trim().is_empty() {
                return Err(AtomicConfigError::EmptyAccessibleLabel);
            }
            if self.items[..index]
                .iter()
                .any(|existing| existing.command == item.command)
            {
                return Err(AtomicConfigError::DuplicateToolbarCommand(item.command));
            }
        }
        Ok(())
    }
}

/// Direct item slots calculated from actual widget width. One slot is reserved
/// for overflow whenever not every command can be visible.
#[must_use]
pub fn toolbar_visible_items(width: f64, item_count: usize) -> usize {
    if item_count == 0 || !width.is_finite() || width <= 0.0 {
        return 0;
    }
    let slots = (width / 40.0).floor().max(0.0) as usize;
    if slots >= item_count {
        item_count
    } else {
        slots.saturating_sub(1).min(item_count)
    }
}

/// One geometry model for painting, hit testing and the overflow anchor.
#[derive(Clone, Copy, Debug)]
struct ToolbarLayout {
    rect: Rect,
    direct: usize,
    overflow: bool,
}

impl ToolbarLayout {
    fn new(rect: Rect, count: usize) -> Self {
        let count = count.min(MAX_TOOLBAR_ITEMS);
        let valid = [rect.pos.x, rect.pos.y, rect.size.x, rect.size.y]
            .iter()
            .all(|value| value.is_finite())
            && rect.size.x >= 40.0
            && rect.size.y >= 40.0;
        let direct = if valid {
            toolbar_visible_items(rect.size.x, count)
        } else {
            0
        };
        Self {
            rect,
            direct,
            overflow: valid && direct < count,
        }
    }

    fn slots(self) -> usize {
        self.direct + usize::from(self.overflow)
    }

    fn slot(self, index: usize) -> Option<Rect> {
        (index < self.slots()).then(|| Rect {
            pos: self.rect.pos + dvec2(index as f64 * 40.0 + 2.0, (self.rect.size.y - 36.0) * 0.5),
            size: dvec2(36.0, 36.0),
        })
    }

    fn hit(self, point: Vec2d) -> Option<usize> {
        (0..self.slots()).find(|index| self.slot(*index).is_some_and(|rect| rect.contains(point)))
    }

    fn enabled(self, config: &ToolbarConfig) -> [bool; MAX_TOOLBAR_ITEMS] {
        let mut enabled = [false; MAX_TOOLBAR_ITEMS];
        for (index, value) in enabled.iter_mut().enumerate().take(self.slots()) {
            *value = config.enabled && (index == self.direct || config.items[index].enabled);
        }
        enabled
    }

    fn next(self, config: &ToolbarConfig, current: Option<usize>, key: KeyCode) -> Option<usize> {
        let enabled = self.enabled(config);
        if self.slots() == 0 {
            return None;
        }
        enabled_choice_index(
            key,
            current.filter(|index| *index < self.slots()).unwrap_or(0),
            &enabled[..self.slots()],
        )
    }

    fn active(self, config: &ToolbarConfig, current: Option<usize>) -> Option<usize> {
        current
            .filter(|index| self.enabled(config).get(*index).copied().unwrap_or(false))
            .or_else(|| self.next(config, None, KeyCode::Home))
    }
}

const TOOLBAR_MENU_IDS: [&[LiveId]; MAX_TOOLBAR_ITEMS] = [
    ids!(toolbar_menu_0),
    ids!(toolbar_menu_1),
    ids!(toolbar_menu_2),
    ids!(toolbar_menu_3),
    ids!(toolbar_menu_4),
    ids!(toolbar_menu_5),
    ids!(toolbar_menu_6),
    ids!(toolbar_menu_7),
    ids!(toolbar_menu_8),
    ids!(toolbar_menu_9),
    ids!(toolbar_menu_10),
    ids!(toolbar_menu_11),
];

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum DividerOrientation {
    #[default]
    Horizontal,
    Vertical,
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct DividerConfig {
    pub orientation: DividerOrientation,
    pub label: Option<String>,
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum SpaceAxis {
    #[default]
    Horizontal,
    Vertical,
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum SpaceToken {
    #[default]
    Px4,
    Px8,
    Px12,
    Px16,
    Px24,
    Px32,
}

impl SpaceToken {
    #[must_use]
    pub const fn logical_pixels(self) -> f64 {
        match self {
            Self::Px4 => 4.0,
            Self::Px8 => 8.0,
            Self::Px12 => 12.0,
            Self::Px16 => 16.0,
            Self::Px24 => 24.0,
            Self::Px32 => 32.0,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct SpaceConfig {
    pub axis: SpaceAxis,
    pub token: SpaceToken,
    pub flex: bool,
}

#[derive(Clone, Debug, PartialEq)]
pub struct WatermarkConfig {
    pub text: String,
    pub opacity: f32,
    pub rotation_degrees: f32,
    pub spacing: u16,
    pub enabled: bool,
}

impl WatermarkConfig {
    pub fn validate(&self) -> Result<(), AtomicConfigError> {
        if !self.opacity.is_finite()
            || !(0.0..=1.0).contains(&self.opacity)
            || !self.rotation_degrees.is_finite()
            || self.spacing < 32
        {
            return Err(AtomicConfigError::InvalidWatermark);
        }
        Ok(())
    }

    #[must_use]
    pub fn tile_count(&self, width: f64, height: f64) -> usize {
        if !self.enabled || self.text.is_empty() || !width.is_finite() || !height.is_finite() {
            return 0;
        }
        let spacing = f64::from(self.spacing.max(32));
        let columns = (width.max(0.0) / spacing).ceil() as usize + 1;
        let rows = (height.max(0.0) / spacing).ceil() as usize + 1;
        columns.saturating_mul(rows).min(MAX_WATERMARK_TILES)
    }
}

impl Default for WatermarkConfig {
    fn default() -> Self {
        Self {
            text: "INTERNAL".to_owned(),
            opacity: 0.10,
            rotation_degrees: -24.0,
            spacing: 160,
            enabled: true,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum BadgeStatus {
    #[default]
    Neutral,
    Success,
    Warning,
    Danger,
    Info,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BadgeValue {
    Dot,
    Count(u32),
    Status(BadgeStatus),
}

impl Default for BadgeValue {
    fn default() -> Self {
        Self::Count(0)
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BadgeConfig {
    pub value: BadgeValue,
    pub show_zero: bool,
    pub accessible_label: String,
}

impl BadgeConfig {
    #[must_use]
    pub fn display(&self) -> Option<String> {
        match self.value {
            BadgeValue::Dot => Some(String::new()),
            BadgeValue::Count(0) if !self.show_zero => None,
            BadgeValue::Count(count) if count > BADGE_DISPLAY_CAP => Some("99+".to_owned()),
            BadgeValue::Count(count) => Some(count.to_string()),
            BadgeValue::Status(_) => Some(String::new()),
        }
    }

    #[must_use]
    pub fn exact_accessible_label(&self) -> String {
        match self.value {
            BadgeValue::Count(count) if self.accessible_label.is_empty() => {
                format!("{count} notifications")
            }
            _ => bounded_text(&self.accessible_label, 256),
        }
    }

    /// Hosts reserve this inset on the owner rather than drawing the badge over
    /// its interactive target.
    #[must_use]
    pub fn owner_inset(self) -> f64 {
        match self.value {
            BadgeValue::Dot | BadgeValue::Status(_) => 8.0,
            BadgeValue::Count(count) if count > 9 => 20.0,
            BadgeValue::Count(_) => 16.0,
        }
    }
}

impl Default for BadgeConfig {
    fn default() -> Self {
        Self {
            value: BadgeValue::Count(3),
            show_zero: false,
            accessible_label: String::new(),
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum TagTone {
    #[default]
    Neutral,
    Success,
    Warning,
    Danger,
    Info,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TagConfig {
    pub label: String,
    pub accessible_label: String,
    pub command: AtomicCommandId,
    pub tone: TagTone,
    pub removable: bool,
    pub enabled: bool,
}

impl TagConfig {
    #[must_use]
    pub fn new(label: &str, command: AtomicCommandId) -> Self {
        let label = bounded_text(label, 512);
        Self {
            accessible_label: label.clone(),
            label,
            command,
            tone: TagTone::Neutral,
            removable: false,
            enabled: true,
        }
    }
}

impl Default for TagConfig {
    fn default() -> Self {
        Self::new("Draft", 0)
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum AvatarShape {
    #[default]
    Circle,
    RoundedSquare,
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub enum AvatarSource {
    #[default]
    Unknown,
    Initials(String),
    AssetReady,
    AssetFailed,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AvatarConfig {
    pub source: AvatarSource,
    pub accessible_label: String,
    pub command: Option<AtomicCommandId>,
    pub size: IconSize,
    pub shape: AvatarShape,
    pub enabled: bool,
}

impl AvatarConfig {
    #[must_use]
    pub fn unknown(accessible_label: &str) -> Self {
        Self {
            source: AvatarSource::Unknown,
            accessible_label: bounded_text(accessible_label, 256),
            command: None,
            size: IconSize::Large24,
            shape: AvatarShape::Circle,
            enabled: true,
        }
    }

    #[must_use]
    pub const fn actionable(&self) -> bool {
        self.command.is_some() && self.enabled
    }
}

impl Default for AvatarConfig {
    fn default() -> Self {
        Self::unknown("Unknown identity")
    }
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    use mod.text.*

    mod.widgets.TesseraAtomicBackground = mod.draw.DrawColor{
        radius: uniform(#(ATOMIC_CONTROL_RADIUS))
        pixel: fn() {
            let sdf = Sdf2d.viewport(self.pos * self.rect_size)
            let radius = min(self.radius, min(self.rect_size.x, self.rect_size.y) * 0.5)
            // The pinned Sdf2d.box uses twice its radius argument as the visual radius.
            sdf.box(0.0, 0.0, self.rect_size.x, self.rect_size.y, radius * 0.5)
            sdf.fill(self.color)
            return sdf.result
        }
    }

    mod.widgets.TesseraButtonBase = #(TesseraButton::register_widget(vm))
    mod.widgets.TesseraFloatButtonBase = #(TesseraFloatButton::register_widget(vm))
    mod.widgets.TesseraIconBase = #(TesseraIcon::register_widget(vm))
    mod.widgets.TesseraTypographyBase = #(TesseraTypography::register_widget(vm))
    mod.widgets.TesseraIconButtonBase = #(TesseraIconButton::register_widget(vm))
    mod.widgets.TesseraToolbarBase = #(TesseraToolbar::register_widget(vm))
    mod.widgets.TesseraDividerBase = #(TesseraDivider::register_widget(vm))
    mod.widgets.TesseraSpaceBase = #(TesseraSpace::register_widget(vm))
    mod.widgets.TesseraWatermarkBase = #(TesseraWatermark::register_widget(vm))
    mod.widgets.TesseraBadgeBase = #(TesseraBadge::register_widget(vm))
    mod.widgets.TesseraTagBase = #(TesseraTag::register_widget(vm))
    mod.widgets.TesseraAvatarBase = #(TesseraAvatar::register_widget(vm))

    mod.widgets.TesseraButton = set_type_default() do mod.widgets.TesseraButtonBase{
        width: Fit
        height: 36
        align: Align{x: 0.5, y: 0.5}
        padding: Inset{left: 8, right: 8}
        text: "Continue"
        enabled: true
        draw_bg: mod.widgets.TesseraAtomicBackground{
            color: theme.color_tessera_primary
        }
        draw_text +: {color: theme.color_tessera_primary_text text_style: theme.font_regular {font_size: 13.0}}
    }
    mod.widgets.TesseraFloatButton = set_type_default() do mod.widgets.TesseraFloatButtonBase{
        width: 40
        height: 40
        enabled: true
        draw_bg +: {color: theme.color_tessera_transparent}
        draw_text +: {color: theme.color_tessera_text_on_accent text_style: theme.font_regular {font_size: 12.0}}
    }
    mod.widgets.TesseraIcon = set_type_default() do mod.widgets.TesseraIconBase{
        width: 20
        height: 20
        draw_bg +: {color: theme.color_tessera_transparent}
    }
    mod.widgets.TesseraTypography = set_type_default() do mod.widgets.TesseraTypographyBase{
        width: Fill
        height: Fit
        text: "Tessera native text"
        enabled: true
        draw_bg +: {color: theme.color_tessera_transparent}
        draw_text +: {color: theme.color_text text_style: theme.font_regular {font_size: 14.0}}
    }
    mod.widgets.TesseraIconButton = set_type_default() do mod.widgets.TesseraIconButtonBase{
        width: 36
        height: 36
        enabled: true
        draw_bg: mod.widgets.TesseraAtomicBackground{color: theme.color_tessera_transparent}
    }
    mod.widgets.TesseraToolbarMenuItem = Button{
        width: Fill height: 32 margin: 0
        align: Align{x: 0.0 y: 0.5}
        label_walk: Walk{width: Fill height: Fit}
        draw_text +: {max_lines: 1 text_overflow: #(TextOverflow::Ellipsis)}
    }
    mod.widgets.TesseraToolbar = set_type_default() do mod.widgets.TesseraToolbarBase{
        width: Fill
        height: 40
        enabled: true
        draw_bg: mod.widgets.TesseraAtomicBackground{color: theme.color_tessera_transparent}
        overlays: View{
            width: 0 height: 0
            toolbar_tooltip := CalloutTooltip{}
            toolbar_popup := PopupNotification{
                content := RoundedView{
                    width: 280 height: Fit flow: Down spacing: 4
                    padding: Inset{left: 8 right: 8 top: 8 bottom: 8}
                    clip_x: true clip_y: true show_bg: true
                    draw_bg +: {color: theme.color_fg_app border_radius: 4.0 border_size: 1.0 border_color: theme.color_bevel}
                    toolbar_menu_0 := mod.widgets.TesseraToolbarMenuItem{}
                    toolbar_menu_1 := mod.widgets.TesseraToolbarMenuItem{}
                    toolbar_menu_2 := mod.widgets.TesseraToolbarMenuItem{}
                    toolbar_menu_3 := mod.widgets.TesseraToolbarMenuItem{}
                    toolbar_menu_4 := mod.widgets.TesseraToolbarMenuItem{}
                    toolbar_menu_5 := mod.widgets.TesseraToolbarMenuItem{}
                    toolbar_menu_6 := mod.widgets.TesseraToolbarMenuItem{}
                    toolbar_menu_7 := mod.widgets.TesseraToolbarMenuItem{}
                    toolbar_menu_8 := mod.widgets.TesseraToolbarMenuItem{}
                    toolbar_menu_9 := mod.widgets.TesseraToolbarMenuItem{}
                    toolbar_menu_10 := mod.widgets.TesseraToolbarMenuItem{}
                    toolbar_menu_11 := mod.widgets.TesseraToolbarMenuItem{}
                }
            }
        }
    }
    mod.widgets.TesseraDivider = set_type_default() do mod.widgets.TesseraDividerBase{
        width: Fill
        height: 20
        draw_bg +: {color: theme.color_tessera_transparent}
        draw_text +: {color: theme.color_text_meta text_style: theme.font_regular {font_size: 11.0}}
    }
    mod.widgets.TesseraSpace = set_type_default() do mod.widgets.TesseraSpaceBase{
        width: 8
        height: 8
    }
    mod.widgets.TesseraWatermark = set_type_default() do mod.widgets.TesseraWatermarkBase{
        width: Fill
        height: Fill
        draw_bg +: {color: theme.color_tessera_transparent}
        draw_text +: {color: theme.color_tessera_watermark text_style: theme.font_regular {font_size: 12.0}}
    }
    mod.widgets.TesseraBadge = set_type_default() do mod.widgets.TesseraBadgeBase{
        width: 24
        height: 20
        draw_bg +: {color: theme.color_tessera_transparent}
        draw_text +: {color: theme.color_tessera_text_on_accent text_style: theme.font_regular {font_size: 10.0}}
    }
    mod.widgets.TesseraTag = set_type_default() do mod.widgets.TesseraTagBase{
        width: Fit
        height: 24
        enabled: true
        draw_bg +: {color: theme.color_tessera_transparent}
        draw_text +: {color: theme.color_text text_style: theme.font_regular {font_size: 11.0}}
    }
    mod.widgets.TesseraAvatar = set_type_default() do mod.widgets.TesseraAvatarBase{
        width: 32
        height: 32
        enabled: true
        draw_bg +: {color: theme.color_tessera_transparent}
        draw_text +: {color: theme.color_text text_style: theme.font_regular {font_size: 11.0}}
        draw_image +: {opacity: 1.0}
    }
}

/// Command button with explicit visual variant, disabled behavior and focus state.
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraButton {
    #[uid]
    uid: WidgetUid,
    #[source]
    source: ScriptObjectRef,
    #[walk]
    walk: Walk,
    #[layout]
    layout: Layout,
    #[redraw]
    #[live]
    draw_bg: DrawColor,
    #[live]
    draw_text: DrawText,
    #[rust]
    focus_region: FocusRegion,
    #[live(true)]
    enabled: bool,
    #[live]
    text: ArcStringMut,
    #[rust]
    config: ButtonConfig,
    #[rust]
    interaction: AtomicInteraction,
    #[rust]
    palette: AtomicPalette,
}

impl TesseraButton {
    pub fn set_config(&mut self, cx: &mut Cx, config: ButtonConfig) {
        self.enabled = config.enabled;
        self.text.set(&config.label);
        self.config = config;
        self.redraw(cx);
    }

    pub fn set_palette(&mut self, cx: &mut Cx, palette: AtomicPalette) {
        self.palette = palette;
        self.redraw(cx);
    }
}

impl Widget for TesseraButton {
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, _scope: &mut Scope) {
        let enabled = self.enabled && self.config.enabled;
        if let Some(signal) = command_signal(
            cx,
            event,
            self.draw_bg.area(),
            enabled,
            &mut self.interaction,
        ) {
            emit_command(
                cx,
                self.uid,
                AtomicComponent::Button,
                self.config.command,
                signal,
            );
            self.redraw(cx);
        }
    }

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        let (background, foreground) = button_visual(
            self.config.variant,
            self.palette,
            self.interaction,
            self.enabled && self.config.enabled,
        );
        self.draw_bg.color = background.to_vec4();
        self.draw_bg.begin(cx, walk, self.layout);
        self.draw_text.color = foreground.to_vec4();
        self.draw_text.text_style.font_size = 13.0;
        self.draw_text.max_lines = 1;
        self.draw_text.text_overflow = TextOverflow::Ellipsis;
        self.draw_text.draw_walk(
            cx,
            Walk {
                width: Size::fill(),
                height: Size::fit(),
                ..Walk::default()
            },
            Align { x: 0.5, y: 0.5 },
            &self.config.label,
        );
        self.draw_bg.end(cx);
        if self.enabled && self.config.enabled {
            self.focus_region.register(
                cx,
                self.uid,
                self.draw_bg.area(),
                NavRole::TextInput,
                ATOMIC_CONTROL_RADIUS,
            );
        } else {
            self.focus_region.clear();
        }
        DrawStep::done()
    }
}

/// Circular, shell-positioned command. Placement is produced by `FloatButtonConfig`.
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraFloatButton {
    #[uid]
    uid: WidgetUid,
    #[source]
    source: ScriptObjectRef,
    #[walk]
    walk: Walk,
    #[layout]
    layout: Layout,
    #[redraw]
    #[live]
    draw_bg: DrawColor,
    #[live]
    draw_vector: DrawVector,
    #[rust]
    focus_region: FocusRegion,
    #[live]
    draw_text: DrawText,
    #[live(true)]
    enabled: bool,
    #[rust]
    config: FloatButtonConfig,
    #[rust]
    interaction: AtomicInteraction,
    #[rust]
    palette: AtomicPalette,
}

impl TesseraFloatButton {
    pub fn set_config(&mut self, cx: &mut Cx, config: FloatButtonConfig) {
        self.enabled = config.enabled;
        self.config = config;
        self.redraw(cx);
    }

    pub fn set_palette(&mut self, cx: &mut Cx, palette: AtomicPalette) {
        self.palette = palette;
        self.redraw(cx);
    }
}

impl Widget for TesseraFloatButton {
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, _scope: &mut Scope) {
        let enabled = self.enabled && self.config.enabled;
        if let Some(signal) = command_signal(
            cx,
            event,
            self.draw_bg.area(),
            enabled,
            &mut self.interaction,
        ) {
            emit_command(
                cx,
                self.uid,
                AtomicComponent::FloatButton,
                self.config.command,
                signal,
            );
            self.redraw(cx);
        }
    }

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        self.draw_bg.color = AtomicColor::TRANSPARENT.to_vec4();
        let rect = self.draw_bg.draw_walk(cx, walk);
        let side = rect
            .size
            .x
            .min(rect.size.y)
            .min(self.config.size.logical_pixels());
        let shape = Rect {
            pos: dvec2(
                rect.pos.x + (rect.size.x - side).max(0.0) * 0.5,
                rect.pos.y + (rect.size.y - side).max(0.0) * 0.5,
            ),
            size: dvec2(side.max(0.0), side.max(0.0)),
        };
        let fill = if self.enabled && self.config.enabled {
            if self.interaction.pressed {
                self.palette.accent.with_alpha(0.78)
            } else if self.interaction.hovered {
                self.palette.accent.with_alpha(0.90)
            } else {
                self.palette.accent
            }
        } else {
            self.palette.surface_disabled
        };
        self.draw_vector.begin();
        self.draw_vector
            .set_color(fill.red, fill.green, fill.blue, fill.alpha);
        self.draw_vector.circle(
            (shape.pos.x + shape.size.x * 0.5) as f32,
            (shape.pos.y + shape.size.y * 0.5) as f32,
            (shape.size.x * 0.5) as f32,
        );
        self.draw_vector.fill();
        draw_icon_path(
            &mut self.draw_vector,
            cx,
            self.config.icon,
            inset_rect(shape, shape.size.x * 0.25),
            if self.enabled && self.config.enabled {
                self.palette.inverse_text
            } else {
                self.palette.text_disabled
            },
        );
        self.draw_vector.end(cx);
        if self.enabled && self.config.enabled {
            self.focus_region.register(
                cx,
                self.uid,
                self.draw_bg.area(),
                NavRole::TextInput,
                shape.size.x * 0.5,
            );
        } else {
            self.focus_region.clear();
        }
        DrawStep::done()
    }
}

/// Deterministic vector glyph; callers cannot inject SVG, shader or resource paths.
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraIcon {
    #[uid]
    uid: WidgetUid,
    #[source]
    source: ScriptObjectRef,
    #[walk]
    walk: Walk,
    #[layout]
    layout: Layout,
    #[redraw]
    #[live]
    draw_bg: DrawColor,
    #[live]
    draw_vector: DrawVector,
    #[rust]
    config: IconConfig,
    #[rust]
    palette: AtomicPalette,
}

impl TesseraIcon {
    pub fn set_config(&mut self, cx: &mut Cx, config: IconConfig) {
        self.config = config;
        self.redraw(cx);
    }

    pub fn set_palette(&mut self, cx: &mut Cx, palette: AtomicPalette) {
        self.palette = palette;
        self.redraw(cx);
    }
}

impl Widget for TesseraIcon {
    fn is_interactive(&self) -> bool {
        false
    }

    fn handle_event(&mut self, _cx: &mut Cx, _event: &Event, _scope: &mut Scope) {}

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        self.draw_bg.color = AtomicColor::TRANSPARENT.to_vec4();
        let rect = self.draw_bg.draw_walk(cx, walk);
        let side = rect
            .size
            .x
            .min(rect.size.y)
            .min(self.config.size.logical_pixels());
        let icon_rect = Rect {
            pos: dvec2(
                rect.pos.x + (rect.size.x - side).max(0.0) * 0.5,
                rect.pos.y + (rect.size.y - side).max(0.0) * 0.5,
            ),
            size: dvec2(side.max(0.0), side.max(0.0)),
        };
        let color = match self.config.status {
            IconStatus::Neutral => self.palette.text_muted,
            IconStatus::Success => self.palette.success,
            IconStatus::Warning => self.palette.warning,
            IconStatus::Danger => self.palette.danger,
            IconStatus::Missing => self.palette.danger,
        };
        self.draw_vector.begin();
        draw_icon_path(
            &mut self.draw_vector,
            cx,
            if self.config.status == IconStatus::Missing {
                AtomicIcon::Missing
            } else {
                self.config.icon
            },
            icon_rect,
            color,
        );
        self.draw_vector.end(cx);
        DrawStep::done()
    }
}

/// Text roles with bounded content, optional typed link/copy behavior and focus state.
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraTypography {
    #[uid]
    uid: WidgetUid,
    #[source]
    source: ScriptObjectRef,
    #[walk]
    walk: Walk,
    #[layout]
    layout: Layout,
    #[redraw]
    #[live]
    draw_bg: DrawColor,
    #[live]
    draw_text: DrawText,
    #[rust]
    focus_region: FocusRegion,
    #[live]
    text: ArcStringMut,
    #[live(true)]
    enabled: bool,
    #[rust]
    config: TypographyConfig,
    #[rust]
    interaction: AtomicInteraction,
    #[rust]
    palette: AtomicPalette,
}

impl TesseraTypography {
    pub fn set_config(&mut self, cx: &mut Cx, config: TypographyConfig) {
        self.enabled = config.enabled;
        self.text.set(&config.text);
        self.config = config;
        self.redraw(cx);
    }

    pub fn set_palette(&mut self, cx: &mut Cx, palette: AtomicPalette) {
        self.palette = palette;
        self.redraw(cx);
    }

    fn interactive(&self) -> bool {
        self.enabled && self.config.enabled && self.config.action != TypographyAction::None
    }
}

impl Widget for TesseraTypography {
    fn is_interactive(&self) -> bool {
        self.interactive()
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, _scope: &mut Scope) {
        if !self.interactive() {
            return;
        }
        if let Some(signal) =
            command_signal(cx, event, self.draw_bg.area(), true, &mut self.interaction)
        {
            if signal == CommandSignal::Activated {
                let action = match self.config.action {
                    TypographyAction::Copy => AtomicAction::CopyRequested {
                        command: self.config.command,
                    },
                    TypographyAction::Link => AtomicAction::Activated {
                        component: AtomicComponent::Typography,
                        command: self.config.command,
                    },
                    TypographyAction::None => AtomicAction::None,
                };
                cx.widget_action(self.uid, action);
            }
            self.redraw(cx);
        }
    }

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        let interactive = self.interactive();
        let background = match self.config.role {
            TypographyRole::Code | TypographyRole::Keyboard => self.palette.surface_hover,
            _ => AtomicColor::TRANSPARENT,
        };
        self.draw_bg.color = background.to_vec4();
        let rect = self.draw_bg.draw_walk(cx, walk);
        let (size, color) = match self.config.role {
            TypographyRole::Heading1 => (24.0, self.palette.text),
            TypographyRole::Heading2 => (18.0, self.palette.text),
            TypographyRole::Body => (14.0, self.palette.text),
            TypographyRole::Meta => (11.0, self.palette.text_muted),
            TypographyRole::Code | TypographyRole::Keyboard => (12.0, self.palette.text),
            TypographyRole::Link => (14.0, self.palette.accent),
        };
        self.draw_text.color = color.to_vec4();
        self.draw_text.text_style.font_size = size as f32;
        self.draw_text.max_lines = usize::from(self.config.max_lines);
        self.draw_text.text_overflow = if self.config.max_lines > 0 {
            TextOverflow::Ellipsis
        } else {
            TextOverflow::Clip
        };
        cx.begin_turtle(
            Walk {
                abs_pos: Some(inset_rect(rect, 4.0).pos),
                width: Size::Fixed((rect.size.x - 8.0).max(0.0)),
                height: Size::Fixed((rect.size.y - 8.0).max(0.0)),
                ..Walk::default()
            },
            Layout {
                clip_x: true,
                clip_y: true,
                ..Layout::default()
            },
        );
        self.draw_text.draw_walk(
            cx,
            Walk {
                width: Size::fill(),
                height: Size::fit(),
                ..Walk::default()
            },
            Align::default(),
            self.text.as_ref(),
        );
        cx.end_turtle();
        if interactive {
            self.focus_region
                .register(cx, self.uid, self.draw_bg.area(), NavRole::TextInput, 4.0);
        } else {
            self.focus_region.clear();
        }
        DrawStep::done()
    }
}

/// Fixed square icon command with mandatory accessible label in `IconButtonConfig`.
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraIconButton {
    #[uid]
    uid: WidgetUid,
    #[source]
    source: ScriptObjectRef,
    #[walk]
    walk: Walk,
    #[layout]
    layout: Layout,
    #[redraw]
    #[live]
    draw_bg: DrawColor,
    #[live]
    draw_vector: DrawVector,
    #[rust]
    focus_region: FocusRegion,
    #[live(true)]
    enabled: bool,
    #[rust]
    config: IconButtonConfig,
    #[rust]
    interaction: AtomicInteraction,
    #[rust]
    palette: AtomicPalette,
}

impl TesseraIconButton {
    pub fn set_config(&mut self, cx: &mut Cx, config: IconButtonConfig) {
        self.enabled = config.enabled;
        self.config = config;
        self.redraw(cx);
    }

    pub fn set_palette(&mut self, cx: &mut Cx, palette: AtomicPalette) {
        self.palette = palette;
        self.redraw(cx);
    }
}

impl Widget for TesseraIconButton {
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, _scope: &mut Scope) {
        let enabled = self.enabled && self.config.enabled;
        if let Some(signal) = command_signal(
            cx,
            event,
            self.draw_bg.area(),
            enabled,
            &mut self.interaction,
        ) {
            emit_command(
                cx,
                self.uid,
                AtomicComponent::IconButton,
                self.config.command,
                signal,
            );
            self.redraw(cx);
        }
    }

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        let enabled = self.enabled && self.config.enabled;
        self.draw_bg.color = if !enabled {
            self.palette.surface_disabled.to_vec4()
        } else if self.interaction.pressed {
            self.palette.surface_active.to_vec4()
        } else if self.interaction.hovered {
            self.palette.surface_hover.to_vec4()
        } else {
            AtomicColor::TRANSPARENT.to_vec4()
        };
        let rect = self.draw_bg.draw_walk(cx, walk);
        let side = rect
            .size
            .x
            .min(rect.size.y)
            .min(self.config.size.logical_pixels());
        let icon_rect = Rect {
            pos: dvec2(
                rect.pos.x + (rect.size.x - side).max(0.0) * 0.5,
                rect.pos.y + (rect.size.y - side).max(0.0) * 0.5,
            ),
            size: dvec2(side.max(0.0), side.max(0.0)),
        };
        self.draw_vector.begin();
        draw_icon_path(
            &mut self.draw_vector,
            cx,
            self.config.icon,
            inset_rect(icon_rect, icon_rect.size.x * 0.25),
            if enabled {
                self.palette.text
            } else {
                self.palette.text_disabled
            },
        );
        self.draw_vector.end(cx);
        if enabled {
            self.focus_region.register(
                cx,
                self.uid,
                self.draw_bg.area(),
                NavRole::TextInput,
                ATOMIC_CONTROL_RADIUS,
            );
        } else {
            self.focus_region.clear();
        }
        DrawStep::done()
    }
}

/// Dense icon commands with bounded native tooltip and overflow widgets.
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraToolbar {
    #[uid]
    uid: WidgetUid,
    #[source]
    source: ScriptObjectRef,
    #[walk]
    walk: Walk,
    #[layout]
    layout: Layout,
    #[redraw]
    #[live]
    draw_bg: DrawColor,
    #[live]
    draw_vector: DrawVector,
    #[find]
    #[live]
    overlays: View,
    #[rust]
    focus_region: FocusRegion,
    #[live(true)]
    enabled: bool,
    #[rust]
    config: ToolbarConfig,
    // The roving command target persists independently of keyboard focus visibility.
    #[rust]
    active_index: Option<usize>,
    #[rust]
    hovered: Option<usize>,
    #[rust]
    pressed: Option<usize>,
    #[rust]
    tooltip_index: Option<usize>,
    #[rust]
    pending_menu_focus: Option<usize>,
    #[rust]
    drawn_direct: usize,
    #[rust]
    palette: AtomicPalette,
}

impl TesseraToolbar {
    pub fn set_config(
        &mut self,
        cx: &mut Cx,
        mut config: ToolbarConfig,
    ) -> Result<(), AtomicConfigError> {
        config.validate()?;
        self.close_menu(cx, false, "configure");
        self.hide_tooltip(cx);
        for item in &mut config.items {
            item.label = bounded_text(&item.label, 256);
        }
        self.enabled = config.enabled;
        self.config = config;
        self.active_index = None;
        self.hovered = None;
        self.pressed = None;
        self.redraw(cx);
        Ok(())
    }

    pub fn set_palette(&mut self, cx: &mut Cx, palette: AtomicPalette) {
        self.palette = palette;
        self.hide_tooltip(cx);
        self.redraw(cx);
    }

    fn enabled(&self) -> bool {
        self.enabled && self.config.enabled
    }

    fn popup(&self, cx: &mut Cx) -> PopupNotificationRef {
        self.overlays.popup_notification(cx, ids!(toolbar_popup))
    }

    fn geometry(&self, cx: &Cx) -> ToolbarLayout {
        ToolbarLayout::new(self.draw_bg.area().rect(cx), self.config.items.len())
    }

    fn hide_tooltip(&mut self, cx: &mut Cx) {
        if self.tooltip_index.take().is_some() {
            self.overlays
                .callout_tooltip(cx, ids!(toolbar_tooltip))
                .hide(cx);
        }
    }

    fn show_tooltip(&mut self, cx: &mut Cx, layout: ToolbarLayout, index: Option<usize>) {
        if self.popup(cx).is_open() || self.tooltip_index == index {
            return;
        }
        self.hide_tooltip(cx);
        let Some(index) = index else {
            return;
        };
        let Some(anchor) = layout.slot(index) else {
            return;
        };
        let label = if index == layout.direct {
            "More commands"
        } else {
            &self.config.items[index].label
        };
        self.overlays
            .callout_tooltip(cx, ids!(toolbar_tooltip))
            .show_with_options(
                cx,
                label,
                anchor,
                CalloutTooltipOptions {
                    position: TooltipPosition::Bottom,
                    text_color: self.palette.text.to_vec4(),
                    bg_color: self.palette.surface_hover.to_vec4(),
                    ..Default::default()
                },
            );
        self.tooltip_index = Some(index);
    }

    fn close_menu(&mut self, cx: &mut Cx, restore: bool, reason: &'static str) {
        let popup = self.popup(cx);
        if popup.is_open() {
            crate::foundation::focus_trace::record(
                cx,
                "toolbar-menu-close",
                Some(self.draw_bg.area()),
                || format!("reason={reason} restore={restore}"),
            );
            popup.close(cx);
            self.pending_menu_focus = None;
            if restore {
                cx.set_key_focus(self.draw_bg.area());
            }
            cx.widget_action(self.uid, AtomicAction::ToolbarOverflowClosed);
            self.redraw(cx);
        }
    }

    fn open_menu(&mut self, cx: &mut Cx, layout: ToolbarLayout) {
        if !self.enabled() || !layout.overflow {
            return;
        }
        if self.popup(cx).is_open() {
            self.close_menu(cx, true, "toggle");
            return;
        }
        self.hide_tooltip(cx);
        self.active_index = Some(layout.direct);
        for (index, id) in TOOLBAR_MENU_IDS.iter().enumerate() {
            let button = self.overlays.button(cx, id);
            let item = self
                .config
                .items
                .get(index)
                .filter(|_| index >= layout.direct);
            button.set_visible(cx, item.is_some());
            if let Some(item) = item {
                button.set_text(cx, &item.label);
                set_button_enabled(&button, cx, item.enabled);
            }
        }
        self.pending_menu_focus = (layout.direct..self.config.items.len())
            .find(|index| self.config.items[*index].enabled);
        self.popup(cx).open(cx);
        cx.widget_action(self.uid, AtomicAction::ToolbarOverflowOpened);
        self.redraw(cx);
    }

    fn activate(&mut self, cx: &mut Cx, layout: ToolbarLayout, index: usize) {
        if !self.enabled() {
            return;
        }
        if index == layout.direct && layout.overflow {
            self.open_menu(cx, layout);
        } else if let Some(item) = self
            .config
            .items
            .get(index)
            .filter(|item| index < layout.direct && item.enabled)
        {
            self.active_index = Some(index);
            cx.widget_action(
                self.uid,
                AtomicAction::Activated {
                    component: AtomicComponent::Toolbar,
                    command: item.command,
                },
            );
        }
    }

    fn handle_menu(
        &mut self,
        cx: &mut Cx,
        event: &Event,
        actions: &Actions,
        layout: ToolbarLayout,
    ) -> bool {
        if !self.popup(cx).is_open() {
            return false;
        }
        for (index, id) in TOOLBAR_MENU_IDS
            .iter()
            .enumerate()
            .skip(layout.direct)
            .take(self.config.items.len() - layout.direct)
        {
            let button = self.overlays.button(cx, id);
            if self.config.items[index].enabled
                && (button.clicked(actions) || button_keyboard_activation(&button, cx, event))
            {
                let command = self.config.items[index].command;
                self.close_menu(cx, true, "activate");
                cx.widget_action(
                    self.uid,
                    AtomicAction::Activated {
                        component: AtomicComponent::Toolbar,
                        command,
                    },
                );
                return true;
            }
        }
        if let Event::KeyDown(key) = event {
            if key.modifiers.control || key.modifiers.logo || key.modifiers.alt {
                return false;
            }
            match key.key_code {
                KeyCode::Escape => {
                    self.close_menu(cx, true, "escape");
                    return true;
                }
                KeyCode::Tab => {
                    self.close_menu(cx, true, "tab");
                    set_tab_navigation_origin(cx, self.draw_bg.area());
                    return true;
                }
                KeyCode::Home | KeyCode::End | KeyCode::ArrowUp | KeyCode::ArrowDown => {
                    let current = TOOLBAR_MENU_IDS
                        .iter()
                        .position(|id| self.overlays.button(cx, id).key_focus(cx))
                        .unwrap_or(layout.direct);
                    let mut enabled = [false; MAX_TOOLBAR_ITEMS];
                    for (index, item) in self.config.items.iter().enumerate() {
                        enabled[index] = index >= layout.direct && item.enabled;
                    }
                    if let Some(index) = enabled_choice_index(
                        key.key_code,
                        current,
                        &enabled[..self.config.items.len()],
                    ) {
                        cx.set_key_focus(self.overlays.button(cx, TOOLBAR_MENU_IDS[index]).area());
                    }
                    return true;
                }
                _ => {}
            }
        }
        if let Event::MouseDown(mouse) = event {
            let popup = self.popup(cx).view(cx, ids!(content)).area().rect(cx);
            let opener = layout.slot(layout.direct);
            if !popup.contains(mouse.abs) && !opener.is_some_and(|rect| rect.contains(mouse.abs)) {
                self.close_menu(cx, false, "outside");
            }
        }
        false
    }
}

impl Widget for TesseraToolbar {
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        if matches!(
            event,
            Event::Pause | Event::WindowLostFocus(_) | Event::ClearHover | Event::Scroll(_)
        ) {
            self.close_menu(cx, false, "lifecycle");
            self.hide_tooltip(cx);
            self.hovered = None;
            self.pressed = None;
        }
        let layout = self.geometry(cx);
        let actions = cx.capture_actions(|cx| self.overlays.handle_event(cx, event, scope));
        if self.handle_menu(cx, event, &actions, layout) {
            return;
        }
        let before = (self.active_index, self.hovered, self.pressed);
        match event.hits(cx, self.draw_bg.area()) {
            Hit::KeyFocus(_) => {
                self.active_index = layout.active(&self.config, self.active_index);
                self.show_tooltip(cx, layout, self.active_index);
            }
            Hit::KeyFocusLost(_) => {
                self.pressed = None;
                self.hide_tooltip(cx);
            }
            Hit::FingerHoverIn(hit) | Hit::FingerHoverOver(hit) => {
                self.hovered = layout.hit(hit.abs);
                if let Some(index) = self.hovered {
                    cx.set_cursor(if self.enabled() && layout.enabled(&self.config)[index] {
                        MouseCursor::Hand
                    } else {
                        MouseCursor::NotAllowed
                    });
                } else {
                    cx.set_cursor(MouseCursor::Default);
                }
                self.show_tooltip(cx, layout, self.hovered);
            }
            Hit::FingerHoverOut(_) => {
                self.hovered = None;
                self.hide_tooltip(cx);
            }
            Hit::FingerDown(hit) if hit.is_primary_hit() && self.enabled() => {
                self.pressed = layout
                    .hit(hit.abs)
                    .filter(|index| layout.enabled(&self.config)[*index]);
                if let Some(index) = self.pressed {
                    self.active_index = Some(index);
                    cx.set_key_focus(self.draw_bg.area());
                }
                self.hide_tooltip(cx);
            }
            Hit::FingerUp(hit) if hit.is_primary_hit() => {
                let pressed = self.pressed.take();
                if let Some(index) = pressed.filter(|index| layout.hit(hit.abs) == Some(*index)) {
                    self.activate(cx, layout, index);
                }
            }
            Hit::KeyDown(key)
                if self.enabled()
                    && !key.modifiers.control
                    && !key.modifiers.logo
                    && !key.modifiers.alt =>
            {
                if let Some(index) = layout.next(&self.config, self.active_index, key.key_code) {
                    if self.active_index != Some(index) {
                        self.active_index = Some(index);
                        cx.widget_action(
                            self.uid,
                            AtomicAction::ToolbarMoved {
                                active_index: index,
                            },
                        );
                    }
                    self.show_tooltip(cx, layout, self.active_index);
                } else if !key.is_repeat && activation_key(key.key_code) {
                    if let Some(index) = self.active_index {
                        self.hide_tooltip(cx);
                        self.activate(cx, layout, index);
                    }
                } else if key.key_code == KeyCode::Escape {
                    self.hide_tooltip(cx);
                }
            }
            _ => {}
        }
        if before != (self.active_index, self.hovered, self.pressed) {
            self.redraw(cx);
        }
    }

    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.draw_bg.color = self.palette.surface.with_alpha(0.72).to_vec4();
        let rect = self.draw_bg.draw_walk(cx, walk);
        let layout = ToolbarLayout::new(rect, self.config.items.len());
        if self.drawn_direct != layout.direct || !self.enabled() {
            self.close_menu(cx, false, "geometry-or-disabled");
            self.hide_tooltip(cx);
            self.hovered = None;
            self.pressed = None;
        }
        self.drawn_direct = layout.direct;
        self.active_index = layout.active(&self.config, self.active_index);
        // Pointer dispatch may give another control focus after closing the menu.
        // Repair only a closed menu's remaining focus, after that dispatch settles.
        if !self.popup(cx).is_open()
            && cx.key_focus().is_valid(cx)
            && TOOLBAR_MENU_IDS
                .iter()
                .any(|id| self.overlays.button(cx, id).key_focus(cx))
        {
            cx.set_key_focus(if self.enabled() {
                self.draw_bg.area()
            } else {
                Area::Empty
            });
        }
        let enabled = layout.enabled(&self.config);
        self.draw_vector.begin();
        for index in 0..layout.slots() {
            let slot = layout.slot(index).unwrap();
            let is_enabled = self.enabled() && enabled[index];
            // This fill indicates the roving command target, not focus visibility.
            let fill = if is_enabled && self.pressed == Some(index) {
                Some(self.palette.surface_active)
            } else if self.hovered == Some(index) {
                Some(self.palette.surface_hover)
            } else if is_enabled && self.active_index == Some(index) {
                Some(self.palette.surface_active.with_alpha(0.55))
            } else {
                None
            };
            if let Some(fill) = fill {
                self.draw_vector
                    .set_color(fill.red, fill.green, fill.blue, fill.alpha);
                self.draw_vector.rounded_rect(
                    slot.pos.x as f32,
                    slot.pos.y as f32,
                    36.0,
                    36.0,
                    5.0,
                );
                self.draw_vector.fill();
            }
            let icon = if index == layout.direct {
                AtomicIcon::More
            } else {
                self.config.items[index].icon
            };
            draw_icon_path(
                &mut self.draw_vector,
                cx,
                icon,
                inset_rect(slot, 10.0),
                if is_enabled {
                    self.palette.text
                } else {
                    self.palette.text_disabled
                },
            );
        }
        self.draw_vector.end(cx);
        if self.enabled() && enabled.iter().any(|value| *value) {
            self.focus_region.register(
                cx,
                self.uid,
                self.draw_bg.area(),
                NavRole::TextInput,
                ATOMIC_CONTROL_RADIUS,
            );
        } else {
            self.focus_region.clear();
        }
        if self.popup(cx).is_open() {
            let anchor = layout.slot(layout.direct).unwrap();
            let bounds = safe_popup_rect(cx.current_pass_size(), 48.0);
            let requested = dvec2(
                280.0,
                12.0 + (self.config.items.len() - layout.direct) as f64 * 36.0,
            );
            position_popup(
                &self.popup(cx),
                cx,
                popup_rect(bounds, requested, PopupPlacement::BelowAnchor(anchor)),
            );
        }
        let step = self.overlays.draw_walk(
            cx,
            scope,
            Walk {
                abs_pos: Some(dvec2(0.0, 0.0)),
                width: Size::Fixed(0.0),
                height: Size::Fixed(0.0),
                ..Default::default()
            },
        );
        if step.is_done() {
            if let Some(index) = self.pending_menu_focus.take() {
                let area = self.overlays.button(cx, TOOLBAR_MENU_IDS[index]).area();
                if area.is_valid(cx) {
                    cx.set_key_focus(area);
                }
            }
        }
        step
    }
}

/// Semantic horizontal or vertical rule. It is deliberately not focusable.
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraDivider {
    #[uid]
    uid: WidgetUid,
    #[source]
    source: ScriptObjectRef,
    #[walk]
    walk: Walk,
    #[layout]
    layout: Layout,
    #[redraw]
    #[live]
    draw_bg: DrawColor,
    #[live]
    draw_rule: DrawColor,
    #[live]
    draw_text: DrawText,
    #[rust]
    config: DividerConfig,
    #[rust]
    palette: AtomicPalette,
}

impl TesseraDivider {
    pub fn set_config(&mut self, cx: &mut Cx, config: DividerConfig) {
        self.config = config;
        self.redraw(cx);
    }

    pub fn set_palette(&mut self, cx: &mut Cx, palette: AtomicPalette) {
        self.palette = palette;
        self.redraw(cx);
    }
}

impl Widget for TesseraDivider {
    fn is_interactive(&self) -> bool {
        false
    }

    fn handle_event(&mut self, _cx: &mut Cx, _event: &Event, _scope: &mut Scope) {}

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        self.draw_bg.color = AtomicColor::TRANSPARENT.to_vec4();
        let rect = self.draw_bg.draw_walk(cx, walk);
        self.draw_rule.color = self.palette.border.to_vec4();
        match self.config.orientation {
            DividerOrientation::Vertical => {
                self.draw_rule.draw_abs(
                    cx,
                    Rect {
                        pos: dvec2(rect.pos.x + rect.size.x * 0.5, rect.pos.y),
                        size: dvec2(1.0, rect.size.y.max(0.0)),
                    },
                );
            }
            DividerOrientation::Horizontal => {
                let label = self.config.label.as_deref().unwrap_or("");
                if label.is_empty() {
                    self.draw_rule.draw_abs(
                        cx,
                        Rect {
                            pos: dvec2(rect.pos.x, rect.pos.y + rect.size.y * 0.5),
                            size: dvec2(rect.size.x.max(0.0), 1.0),
                        },
                    );
                } else {
                    let label_width = (label.len() as f64 * 7.0 + 16.0).min(rect.size.x.max(0.0));
                    let left = ((rect.size.x - label_width) * 0.5).max(0.0);
                    self.draw_rule.draw_abs(
                        cx,
                        Rect {
                            pos: dvec2(rect.pos.x, rect.pos.y + rect.size.y * 0.5),
                            size: dvec2(left, 1.0),
                        },
                    );
                    self.draw_rule.draw_abs(
                        cx,
                        Rect {
                            pos: dvec2(
                                rect.pos.x + left + label_width,
                                rect.pos.y + rect.size.y * 0.5,
                            ),
                            size: dvec2((rect.size.x - left - label_width).max(0.0), 1.0),
                        },
                    );
                    draw_text_line(
                        &mut self.draw_text,
                        cx,
                        Rect {
                            pos: dvec2(rect.pos.x + left + 8.0, rect.pos.y),
                            size: dvec2((label_width - 16.0).max(0.0), rect.size.y),
                        },
                        label,
                        self.palette.text_muted,
                        11.0,
                        Align { x: 0.5, y: 0.5 },
                    );
                }
            }
        }
        DrawStep::done()
    }
}

/// Token spacer with no action or focus route.
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraSpace {
    #[uid]
    uid: WidgetUid,
    #[source]
    source: ScriptObjectRef,
    #[walk]
    walk: Walk,
    #[layout]
    layout: Layout,
    #[redraw]
    #[rust]
    area: Area,
    #[rust]
    config: SpaceConfig,
}

impl TesseraSpace {
    pub fn set_config(&mut self, cx: &mut Cx, config: SpaceConfig) {
        self.config = config;
        self.redraw(cx);
    }
}

impl Widget for TesseraSpace {
    fn is_interactive(&self) -> bool {
        false
    }

    fn handle_event(&mut self, _cx: &mut Cx, _event: &Event, _scope: &mut Scope) {}

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        let gap = self.config.token.logical_pixels();
        let walk = if self.config.flex {
            walk
        } else {
            match self.config.axis {
                SpaceAxis::Horizontal => Walk {
                    width: Size::Fixed(gap),
                    ..walk
                },
                SpaceAxis::Vertical => Walk {
                    height: Size::Fixed(gap),
                    ..walk
                },
            }
        };
        let rect = cx.walk_turtle(walk);
        // The area exists only for stable widget-tree geometry. The widget is
        // non-interactive and does not register a navigation stop.
        cx.add_rect_area(&mut self.area, rect);
        DrawStep::done()
    }
}

/// Clipped paint-layer watermark with bounded draw work and no animation tick.
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraWatermark {
    #[uid]
    uid: WidgetUid,
    #[source]
    source: ScriptObjectRef,
    #[walk]
    walk: Walk,
    #[layout]
    layout: Layout,
    #[redraw]
    #[live]
    draw_bg: DrawColor,
    #[live]
    draw_text: DrawRotatedText,
    #[rust]
    config: WatermarkConfig,
    #[rust]
    palette: AtomicPalette,
}

impl TesseraWatermark {
    pub fn set_config(
        &mut self,
        cx: &mut Cx,
        config: WatermarkConfig,
    ) -> Result<(), AtomicConfigError> {
        config.validate()?;
        self.config = WatermarkConfig {
            text: bounded_text(&config.text, 512),
            ..config
        };
        self.redraw(cx);
        Ok(())
    }

    pub fn set_palette(&mut self, cx: &mut Cx, palette: AtomicPalette) {
        self.palette = palette;
        self.redraw(cx);
    }
}

impl Widget for TesseraWatermark {
    fn is_interactive(&self) -> bool {
        false
    }

    fn handle_event(&mut self, _cx: &mut Cx, _event: &Event, _scope: &mut Scope) {}

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        self.draw_bg.color = AtomicColor::TRANSPARENT.to_vec4();
        let rect = self.draw_bg.draw_walk(cx, walk);
        if !self.config.enabled
            || self.config.text.is_empty()
            || self.config.tile_count(rect.size.x, rect.size.y) == 0
        {
            return DrawStep::done();
        }
        let spacing = f64::from(self.config.spacing.max(32));
        let columns = (rect.size.x.max(0.0) / spacing).ceil() as usize + 1;
        let rows = (rect.size.y.max(0.0) / spacing).ceil() as usize + 1;
        let color = self.palette.watermark.with_alpha(self.config.opacity);
        self.draw_text.color = color.to_vec4();
        self.draw_text.text_style.font_size = 12.0;
        self.draw_text.rotation = self.config.rotation_degrees.to_radians();
        cx.begin_turtle(
            Walk {
                abs_pos: Some(rect.pos),
                width: Size::Fixed(rect.size.x.max(0.0)),
                height: Size::Fixed(rect.size.y.max(0.0)),
                ..Walk::default()
            },
            Layout {
                clip_x: true,
                clip_y: true,
                ..Layout::default()
            },
        );
        let mut drawn = 0usize;
        'rows: for row in 0..rows {
            for column in 0..columns {
                if drawn >= MAX_WATERMARK_TILES {
                    break 'rows;
                }
                let x = rect.pos.x + column as f64 * spacing + 16.0;
                let y = rect.pos.y + row as f64 * spacing + 22.0;
                self.draw_text.rotation_origin = vec2(x as f32, y as f32);
                self.draw_text.draw_abs(cx, dvec2(x, y), &self.config.text);
                drawn += 1;
            }
        }
        cx.end_turtle();
        DrawStep::done()
    }
}

/// Decorative count, dot or status badge. Focus remains on its owner.
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraBadge {
    #[uid]
    uid: WidgetUid,
    #[source]
    source: ScriptObjectRef,
    #[walk]
    walk: Walk,
    #[layout]
    layout: Layout,
    #[redraw]
    #[live]
    draw_bg: DrawColor,
    #[live]
    draw_vector: DrawVector,
    #[live]
    draw_text: DrawText,
    #[rust]
    config: BadgeConfig,
    #[rust]
    palette: AtomicPalette,
}

impl TesseraBadge {
    pub fn set_config(&mut self, cx: &mut Cx, config: BadgeConfig) {
        self.config = config;
        self.redraw(cx);
    }

    pub fn set_palette(&mut self, cx: &mut Cx, palette: AtomicPalette) {
        self.palette = palette;
        self.redraw(cx);
    }
}

impl Widget for TesseraBadge {
    fn is_interactive(&self) -> bool {
        false
    }

    fn handle_event(&mut self, _cx: &mut Cx, _event: &Event, _scope: &mut Scope) {}

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        self.draw_bg.color = AtomicColor::TRANSPARENT.to_vec4();
        let rect = self.draw_bg.draw_walk(cx, walk);
        let Some(label) = self.config.display() else {
            return DrawStep::done();
        };
        let tone = match self.config.value {
            BadgeValue::Status(BadgeStatus::Success) => self.palette.success,
            BadgeValue::Status(BadgeStatus::Warning) => self.palette.warning,
            BadgeValue::Status(BadgeStatus::Info) => self.palette.accent,
            BadgeValue::Status(BadgeStatus::Danger) | BadgeValue::Count(_) | BadgeValue::Dot => {
                self.palette.danger
            }
            BadgeValue::Status(BadgeStatus::Neutral) => self.palette.text_muted,
        };
        let width = if label.is_empty() {
            8.0
        } else {
            (label.len() as f64 * 7.0 + 12.0).min(rect.size.x.max(8.0))
        };
        let height = if label.is_empty() {
            8.0
        } else {
            18.0_f64.min(rect.size.y.max(0.0))
        };
        let badge = Rect {
            pos: dvec2(
                rect.pos.x + (rect.size.x - width).max(0.0),
                rect.pos.y + (rect.size.y - height).max(0.0) * 0.5,
            ),
            size: dvec2(width, height),
        };
        self.draw_vector.begin();
        self.draw_vector
            .set_color(tone.red, tone.green, tone.blue, tone.alpha);
        self.draw_vector.rounded_rect(
            badge.pos.x as f32,
            badge.pos.y as f32,
            badge.size.x as f32,
            badge.size.y as f32,
            (badge.size.y * 0.5) as f32,
        );
        self.draw_vector.fill();
        self.draw_vector.end(cx);
        if !label.is_empty() {
            draw_text_line(
                &mut self.draw_text,
                cx,
                badge,
                &label,
                self.palette.inverse_text,
                10.0,
                Align { x: 0.5, y: 0.5 },
            );
        }
        DrawStep::done()
    }
}

/// Compact status tag. Only its explicit remove affordance becomes focusable.
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraTag {
    #[uid]
    uid: WidgetUid,
    #[source]
    source: ScriptObjectRef,
    #[walk]
    walk: Walk,
    #[layout]
    layout: Layout,
    #[redraw]
    #[live]
    draw_bg: DrawColor,
    #[live]
    draw_vector: DrawVector,
    #[live]
    draw_text: DrawText,
    #[rust]
    focus_region: FocusRegion,
    #[live(true)]
    enabled: bool,
    #[rust]
    remove_area: Area,
    #[rust]
    config: TagConfig,
    #[rust]
    interaction: AtomicInteraction,
    #[rust]
    palette: AtomicPalette,
}

impl TesseraTag {
    pub fn set_config(&mut self, cx: &mut Cx, config: TagConfig) {
        self.enabled = config.enabled;
        self.config = config;
        self.redraw(cx);
    }

    pub fn set_palette(&mut self, cx: &mut Cx, palette: AtomicPalette) {
        self.palette = palette;
        self.redraw(cx);
    }

    fn removable(&self) -> bool {
        self.enabled && self.config.enabled && self.config.removable
    }
}

impl Widget for TesseraTag {
    fn is_interactive(&self) -> bool {
        self.removable()
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, _scope: &mut Scope) {
        if !self.removable() {
            return;
        }
        if let Some(signal) =
            command_signal(cx, event, self.remove_area, true, &mut self.interaction)
        {
            if signal == CommandSignal::Activated {
                cx.widget_action(
                    self.uid,
                    AtomicAction::TagRemoved {
                        command: self.config.command,
                    },
                );
            }
            self.redraw(cx);
        }
    }

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        let removable = self.removable();
        let palette = self.palette;
        let config = &self.config;
        self.draw_bg.color = AtomicColor::TRANSPARENT.to_vec4();
        let rect = self.draw_bg.draw_walk(cx, walk);
        let (foreground, background) = match config.tone {
            TagTone::Neutral => (palette.text, palette.surface_hover),
            TagTone::Success => (palette.success, palette.success.with_alpha(0.14)),
            TagTone::Warning => (palette.warning, palette.warning.with_alpha(0.14)),
            TagTone::Danger => (palette.danger, palette.danger.with_alpha(0.14)),
            TagTone::Info => (palette.accent, palette.accent.with_alpha(0.12)),
        };
        self.draw_vector.begin();
        self.draw_vector.set_color(
            background.red,
            background.green,
            background.blue,
            background.alpha,
        );
        self.draw_vector.rounded_rect(
            rect.pos.x as f32,
            rect.pos.y as f32,
            rect.size.x.max(0.0) as f32,
            rect.size.y.max(0.0) as f32,
            (rect.size.y * 0.5) as f32,
        );
        self.draw_vector.fill();
        let remove_width = if removable {
            24.0_f64.min(rect.size.x.max(0.0))
        } else {
            0.0
        };
        if removable {
            let remove_rect = Rect {
                pos: dvec2(
                    rect.pos.x + (rect.size.x - remove_width).max(0.0),
                    rect.pos.y,
                ),
                size: dvec2(remove_width, rect.size.y.max(0.0)),
            };
            cx.add_rect_area(&mut self.remove_area, remove_rect);
            draw_icon_path(
                &mut self.draw_vector,
                cx,
                AtomicIcon::Close,
                inset_rect(remove_rect, 7.0),
                if self.interaction.hovered {
                    palette.danger
                } else {
                    foreground
                },
            );
            self.focus_region
                .register(cx, self.uid, self.remove_area, NavRole::TextInput, 4.0);
        } else {
            self.focus_region.clear();
            self.remove_area = Area::Empty;
        }
        self.draw_vector.end(cx);
        draw_text_line(
            &mut self.draw_text,
            cx,
            Rect {
                pos: dvec2(rect.pos.x + 8.0, rect.pos.y),
                size: dvec2((rect.size.x - 16.0 - remove_width).max(0.0), rect.size.y),
            },
            &config.label,
            if removable {
                foreground
            } else {
                foreground.with_alpha(0.62)
            },
            11.0,
            Align { x: 0.0, y: 0.5 },
        );
        DrawStep::done()
    }
}

/// Avatar that accepts only a host-owned texture object, never a path or URL.
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraAvatar {
    #[uid]
    uid: WidgetUid,
    #[source]
    source: ScriptObjectRef,
    #[walk]
    walk: Walk,
    #[layout]
    layout: Layout,
    #[redraw]
    #[live]
    draw_bg: DrawColor,
    #[live]
    draw_image: DrawImage,
    #[live]
    draw_vector: DrawVector,
    #[rust]
    focus_region: FocusRegion,
    #[live]
    draw_text: DrawText,
    #[live(true)]
    enabled: bool,
    #[rust]
    texture_ready: bool,
    #[rust]
    config: AvatarConfig,
    #[rust]
    interaction: AtomicInteraction,
    #[rust]
    palette: AtomicPalette,
}

impl TesseraAvatar {
    pub fn set_config(&mut self, cx: &mut Cx, config: AvatarConfig) {
        self.enabled = config.enabled;
        self.config = config;
        self.redraw(cx);
    }

    /// Installs an already-approved, host-owned texture. Decoding, paths,
    /// network and image-cache policy remain outside this atomic write set.
    pub fn set_texture(&mut self, cx: &mut Cx, texture: Texture) {
        self.draw_image.draw_vars.set_texture(0, &texture);
        self.texture_ready = true;
        self.redraw(cx);
    }

    pub fn set_palette(&mut self, cx: &mut Cx, palette: AtomicPalette) {
        self.palette = palette;
        self.redraw(cx);
    }

    fn actionable(&self) -> bool {
        self.enabled && self.config.actionable()
    }
}

impl Widget for TesseraAvatar {
    fn is_interactive(&self) -> bool {
        self.actionable()
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, _scope: &mut Scope) {
        let Some(command) = self.config.command else {
            return;
        };
        if !self.actionable() {
            return;
        }
        if let Some(signal) =
            command_signal(cx, event, self.draw_bg.area(), true, &mut self.interaction)
        {
            emit_command(cx, self.uid, AtomicComponent::Avatar, command, signal);
            self.redraw(cx);
        }
    }

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        let actionable = self.actionable();
        let palette = self.palette;
        let config = &self.config;
        let texture_ready = self.texture_ready;
        self.draw_bg.color = AtomicColor::TRANSPARENT.to_vec4();
        let rect = self.draw_bg.draw_walk(cx, walk);
        let side = rect
            .size
            .x
            .min(rect.size.y)
            .min(config.size.logical_pixels())
            .max(0.0);
        let avatar = Rect {
            pos: dvec2(
                rect.pos.x + (rect.size.x - side).max(0.0) * 0.5,
                rect.pos.y + (rect.size.y - side).max(0.0) * 0.5,
            ),
            size: dvec2(side, side),
        };
        let base = match config.source {
            AvatarSource::AssetFailed => palette.danger.with_alpha(0.16),
            AvatarSource::Unknown => palette.surface_hover,
            _ => palette.accent.with_alpha(0.14),
        };
        self.draw_vector.begin();
        self.draw_vector
            .set_color(base.red, base.green, base.blue, base.alpha);
        match config.shape {
            AvatarShape::Circle => self.draw_vector.circle(
                (avatar.pos.x + avatar.size.x * 0.5) as f32,
                (avatar.pos.y + avatar.size.y * 0.5) as f32,
                (avatar.size.x * 0.5) as f32,
            ),
            AvatarShape::RoundedSquare => self.draw_vector.rounded_rect(
                avatar.pos.x as f32,
                avatar.pos.y as f32,
                avatar.size.x as f32,
                avatar.size.y as f32,
                (avatar.size.x * 0.22) as f32,
            ),
        }
        self.draw_vector.fill();
        if matches!(
            config.source,
            AvatarSource::Unknown | AvatarSource::AssetFailed
        ) {
            draw_icon_path(
                &mut self.draw_vector,
                cx,
                if matches!(config.source, AvatarSource::AssetFailed) {
                    AtomicIcon::Missing
                } else {
                    AtomicIcon::Person
                },
                inset_rect(avatar, avatar.size.x * 0.23),
                if matches!(config.source, AvatarSource::AssetFailed) {
                    palette.danger
                } else {
                    palette.text_muted
                },
            );
        }
        self.draw_vector.end(cx);
        if matches!(config.source, AvatarSource::AssetReady) && texture_ready {
            // The host texture has already passed its resource policy. Keep it
            // inset so the vector border remains visible in both shapes.
            self.draw_image
                .draw_abs(cx, inset_rect(avatar, avatar.size.x * 0.12));
        }
        if let AvatarSource::Initials(initials) = &config.source {
            draw_text_line(
                &mut self.draw_text,
                cx,
                avatar,
                &bounded_text(initials, 12),
                palette.accent,
                (avatar.size.x * 0.36).clamp(10.0, 18.0),
                Align { x: 0.5, y: 0.5 },
            );
        }
        if actionable {
            self.focus_region.register(
                cx,
                self.uid,
                self.draw_bg.area(),
                NavRole::TextInput,
                match config.shape {
                    AvatarShape::Circle => avatar.size.x * 0.5,
                    AvatarShape::RoundedSquare => avatar.size.x * 0.22,
                },
            );
        } else {
            self.focus_region.clear();
        }
        DrawStep::done()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn interaction_area(cx: &mut Cx) -> (DrawList, Area) {
        let list = DrawList::new(cx);
        cx.draw_lists[list.id()].redraw_id = 1;
        cx.draw_lists[list.id()].rect_areas.push(CxRectArea {
            rect: Rect {
                pos: dvec2(10.0, 10.0),
                size: dvec2(100.0, 36.0),
            },
            draw_clip: (dvec2(0.0, 0.0), dvec2(200.0, 200.0)),
        });
        let area = Area::Rect(RectArea {
            draw_list_id: list.id(),
            rect_id: 0,
            redraw_id: 1,
        });
        assert!(area.is_valid(cx));
        cx.new_draw_event = DrawEvent::default();
        (list, area)
    }

    #[test]
    fn focus_changes_invalidate_without_emitting_commands() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let (list, area) = interaction_area(&mut cx);
        let mut interaction = AtomicInteraction::default();
        for (prev, focus, expected) in [(Area::Empty, area, true), (area, Area::Empty, false)] {
            cx.new_draw_event = DrawEvent::default();
            let signal = command_signal(
                &mut cx,
                &Event::KeyFocus(KeyFocusEvent { prev, focus }),
                area,
                true,
                &mut interaction,
            );
            assert!(signal.is_none());
            assert_eq!(interaction.focused, expected);
            assert_eq!(cx.new_draw_event.draw_lists, vec![list.id()]);
            assert!(!cx.new_draw_event.redraw_all);
            assert!(cx.new_actions.is_empty());
        }
    }

    #[test]
    fn hover_change_invalidates_once_and_idle_events_do_not() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let (list, area) = interaction_area(&mut cx);
        let mut interaction = AtomicInteraction::default();
        let pointer = || {
            Event::MouseMove(MouseMoveEvent {
                abs: dvec2(40.0, 20.0),
                lock_delta: dvec2(0.0, 0.0),
                window_id: WindowId(0, 0),
                modifiers: KeyModifiers::default(),
                time: 1.0,
                handled: std::cell::Cell::new(Area::Empty),
            })
        };
        assert!(command_signal(&mut cx, &pointer(), area, true, &mut interaction).is_none());
        assert!(interaction.hovered);
        assert_eq!(cx.new_draw_event.draw_lists, vec![list.id()]);
        cx.new_draw_event = DrawEvent::default();
        assert!(command_signal(&mut cx, &pointer(), area, true, &mut interaction).is_none());
        assert!(command_signal(&mut cx, &Event::Startup, area, true, &mut interaction).is_none());
        assert!(!cx.new_draw_event.will_redraw());
        assert!(cx.new_actions.is_empty());
    }

    #[test]
    fn catalog_is_exact_and_maps_to_real_component_ids() {
        assert_eq!(AtomicSurfaceCatalog::COMPONENTS.len(), 12);
        assert!(AtomicSurfaceCatalog::contains(ComponentId::Button));
        assert!(AtomicSurfaceCatalog::contains(ComponentId::Avatar));
        assert!(!AtomicSurfaceCatalog::contains(ComponentId::Table));
        assert_eq!(
            AtomicSurfaceCatalog::component(ComponentId::Badge),
            Some(AtomicComponent::Badge)
        );
    }

    #[test]
    fn bounded_text_preserves_utf8_and_hard_limit() {
        let value = bounded_text("Tessera-zhong-wen", 12);
        assert_eq!(value, "Tessera-z...");
        let chinese = bounded_text("Tessera-zhong-wen", 10);
        assert!(chinese.len() <= 10);
        assert!(std::str::from_utf8(chinese.as_bytes()).is_ok());
    }

    #[test]
    fn icon_button_rejects_missing_accessibility_label() {
        assert_eq!(
            IconButtonConfig::new(AtomicIcon::Add, " ", 9),
            Err(AtomicConfigError::EmptyAccessibleLabel)
        );
    }

    #[test]
    fn badge_caps_pixels_but_keeps_exact_accessible_count() {
        let badge = BadgeConfig {
            value: BadgeValue::Count(123),
            ..BadgeConfig::default()
        };
        assert_eq!(badge.display().as_deref(), Some("99+"));
        assert_eq!(badge.exact_accessible_label(), "123 notifications");
        let zero = BadgeConfig {
            value: BadgeValue::Count(0),
            show_zero: false,
            ..BadgeConfig::default()
        };
        assert_eq!(zero.display(), None);
    }

    #[test]
    fn float_button_stack_and_safe_offset_are_bounded() {
        let config = FloatButtonConfig {
            stack_index: 9,
            ..FloatButtonConfig::default()
        };
        assert_eq!(config.normalized_stack_index(), 4);
        assert_eq!(config.safe_offset(), (-216.0, -216.0));
    }

    #[test]
    fn toolbar_visibility_reserves_overflow_without_exceeding_width() {
        assert_eq!(toolbar_visible_items(0.0, 4), 0);
        assert_eq!(toolbar_visible_items(160.0, 4), 4);
        assert_eq!(toolbar_visible_items(120.0, 8), 2);
        assert_eq!(toolbar_visible_items(39.0, 8), 0);
    }

    #[test]
    fn toolbar_paint_and_hit_geometry_share_fixed_slots_at_all_widths() {
        for width in [40.0, 80.0, 120.0, 240.0, 532.0, 932.0] {
            let rect = Rect {
                pos: dvec2(20.0, 30.0),
                size: dvec2(width, 40.0),
            };
            let layout = ToolbarLayout::new(rect, 12);
            assert!(layout.slots() <= MAX_TOOLBAR_ITEMS);
            assert_eq!(layout.hit(rect.pos), None);
            for index in 0..layout.slots() {
                let slot = layout.slot(index).unwrap();
                assert_eq!(slot.size, dvec2(36.0, 36.0));
                assert!(slot.pos.x + slot.size.x <= rect.pos.x + width);
                assert_eq!(layout.hit(slot.pos + slot.size * 0.5), Some(index));
                assert_eq!(layout.hit(slot.pos - dvec2(1.0, 0.0)), None);
            }
            assert_eq!(layout.hit(dvec2(rect.pos.x + width - 1.0, 50.0)), None);
        }
    }

    #[test]
    fn toolbar_navigation_skips_disabled_commands_and_exposes_overflow() {
        let mut config = ToolbarConfig {
            items: (0..12)
                .map(|i| ToolbarItem::new(i, AtomicIcon::Add, "Command"))
                .collect(),
            enabled: true,
        };
        config.items[1].enabled = false;
        config.items[4].enabled = false;
        let layout = ToolbarLayout::new(
            Rect {
                pos: dvec2(0.0, 0.0),
                size: dvec2(240.0, 40.0),
            },
            12,
        );
        assert_eq!(layout.direct, 5);
        assert_eq!(layout.active(&config, None), Some(0));
        assert_eq!(layout.next(&config, Some(0), KeyCode::ArrowRight), Some(2));
        assert_eq!(layout.next(&config, Some(3), KeyCode::ArrowRight), Some(5));
        assert_eq!(layout.next(&config, Some(0), KeyCode::ArrowLeft), Some(5));
        assert_eq!(layout.next(&config, Some(0), KeyCode::End), Some(5));
        assert_eq!(layout.next(&config, Some(5), KeyCode::Home), Some(0));
        // The roving target is independent of pointer/keyboard focus modality.
        assert_eq!(layout.active(&config, Some(3)), Some(3));
        config.enabled = false;
        assert_eq!(layout.active(&config, Some(3)), None);
    }

    #[test]
    fn toolbar_invalid_bounds_and_empty_configuration_have_no_targets() {
        for size in [dvec2(39.0, 40.0), dvec2(40.0, 39.0), dvec2(f64::NAN, 40.0)] {
            let layout = ToolbarLayout::new(
                Rect {
                    pos: dvec2(0.0, 0.0),
                    size,
                },
                12,
            );
            assert_eq!(layout.slots(), 0);
        }
        let layout = ToolbarLayout::new(
            Rect {
                pos: dvec2(0.0, 0.0),
                size: dvec2(240.0, 40.0),
            },
            0,
        );
        assert_eq!(layout.slots(), 0);
        assert_eq!(layout.active(&ToolbarConfig::default(), None), None);
        let config = ToolbarConfig {
            items: vec![ToolbarItem::new(0, AtomicIcon::Add, " ")],
            enabled: true,
        };
        assert_eq!(
            config.validate(),
            Err(AtomicConfigError::EmptyAccessibleLabel)
        );
    }

    #[test]
    fn toolbar_config_rejects_unbounded_or_ambiguous_actions() {
        let items = (0..=MAX_TOOLBAR_ITEMS)
            .map(|index| ToolbarItem::new(index as u32, AtomicIcon::Add, "Action"))
            .collect();
        let too_many = ToolbarConfig {
            items,
            enabled: true,
        };
        assert_eq!(
            too_many.validate(),
            Err(AtomicConfigError::TooManyToolbarItems {
                maximum: 12,
                actual: 13
            })
        );
        let duplicate = ToolbarConfig {
            items: vec![
                ToolbarItem::new(2, AtomicIcon::Add, "A"),
                ToolbarItem::new(2, AtomicIcon::Close, "B"),
            ],
            enabled: true,
        };
        assert_eq!(
            duplicate.validate(),
            Err(AtomicConfigError::DuplicateToolbarCommand(2))
        );
    }

    #[test]
    fn space_tokens_are_four_point_steps_and_never_negative() {
        for token in [
            SpaceToken::Px4,
            SpaceToken::Px8,
            SpaceToken::Px12,
            SpaceToken::Px16,
            SpaceToken::Px24,
            SpaceToken::Px32,
        ] {
            assert!(token.logical_pixels() > 0.0);
            assert_eq!(token.logical_pixels() % 4.0, 0.0);
        }
    }

    #[test]
    fn watermark_validation_and_tile_budget_fail_closed() {
        let invalid = WatermarkConfig {
            opacity: f32::NAN,
            ..WatermarkConfig::default()
        };
        assert_eq!(invalid.validate(), Err(AtomicConfigError::InvalidWatermark));
        let config = WatermarkConfig {
            spacing: 32,
            ..WatermarkConfig::default()
        };
        assert_eq!(config.tile_count(10_000.0, 10_000.0), MAX_WATERMARK_TILES);
    }

    #[test]
    fn tag_and_avatar_only_focus_when_explicitly_actionable() {
        let tag = TagConfig::default();
        assert!(!tag.removable);
        let avatar = AvatarConfig::unknown("Ada");
        assert!(!avatar.actionable());
        let actionable = AvatarConfig {
            command: Some(7),
            ..avatar
        };
        assert!(actionable.actionable());
    }

    #[test]
    fn palette_has_distinct_light_and_dark_focus_colors() {
        assert_ne!(AtomicPalette::light().focus, AtomicPalette::dark().focus);
        assert_ne!(
            AtomicPalette::light().surface,
            AtomicPalette::dark().surface
        );
    }

    #[test]
    fn runtime_palette_and_primary_states_use_the_shared_theme() {
        for tokens in [
            &crate::foundation::theme::LIGHT,
            &crate::foundation::theme::DARK,
        ] {
            let palette = AtomicPalette::from_tokens(tokens);
            assert_eq!(palette.text, AtomicColor::from_token(tokens.text));
            assert_eq!(
                palette.text_disabled,
                AtomicColor::from_token(tokens.text_disabled)
            );
            assert_eq!(palette.watermark, AtomicColor::from_token(tokens.watermark));
            assert_eq!(palette.surface_hover.alpha, 1.0);
            assert_eq!(palette.surface_active.alpha, 1.0);
            for (hovered, pressed) in [(false, false), (true, false), (true, true)] {
                let interaction = AtomicInteraction {
                    hovered,
                    pressed,
                    ..Default::default()
                };
                let (bg, fg) = button_visual(ButtonVariant::Primary, palette, interaction, true);
                assert_eq!(
                    bg,
                    AtomicColor::from_token(if hovered || pressed {
                        tokens.primary_button_bg_hover
                    } else {
                        tokens.primary_button_bg
                    })
                );
                assert_eq!(fg, AtomicColor::from_token(tokens.primary_button_fg));
                assert_eq!(bg.alpha, 1.0);
            }
            assert_eq!(
                button_visual(
                    ButtonVariant::Primary,
                    palette,
                    AtomicInteraction::default(),
                    false
                ),
                (palette.surface_disabled, palette.text_disabled)
            );
        }
    }
}
