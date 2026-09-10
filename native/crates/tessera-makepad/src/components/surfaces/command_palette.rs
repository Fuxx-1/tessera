//! A command surface whose choices mutate local typed domain state.

use crate::foundation::input::ButtonActivationExt;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct CommandPaletteSurfaceCatalog;
impl CommandPaletteSurfaceCatalog {
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::CommandPalette => Some("TesseraCommandPalette"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PaletteCommand {
    ToggleCompact,
    ToggleDiagnostics,
    ClearQuery,
    Unsupported,
}
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct CommandPaletteState {
    pub open: bool,
    pub query: String,
    pub compact: bool,
    pub diagnostics_visible: bool,
}
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CommandPaletteEvent {
    ToggleOpen,
    QueryChanged(String),
    Invoke(PaletteCommand),
    Reset,
}
impl CommandPaletteState {
    pub fn reduce(&mut self, event: CommandPaletteEvent) -> Option<PaletteCommand> {
        match event {
            CommandPaletteEvent::ToggleOpen => {
                self.open = !self.open;
                None
            }
            CommandPaletteEvent::QueryChanged(query) => {
                self.query = query;
                None
            }
            CommandPaletteEvent::Invoke(command) => {
                match command {
                    PaletteCommand::ToggleCompact => self.compact = !self.compact,
                    PaletteCommand::ToggleDiagnostics => {
                        self.diagnostics_visible = !self.diagnostics_visible
                    }
                    PaletteCommand::ClearQuery => self.query.clear(),
                    PaletteCommand::Unsupported => {}
                }
                Some(command)
            }
            CommandPaletteEvent::Reset => {
                *self = Self::default();
                None
            }
        }
    }
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum CommandPaletteAction {
    OpenChanged {
        open: bool,
    },
    DomainChanged {
        command: PaletteCommand,
        compact: bool,
        diagnostics_visible: bool,
    },
    Unsupported,
    Reset,
    #[default]
    None,
}

script_mod! { use mod.prelude.widgets_internal.* use mod.widgets.*
    mod.widgets.TesseraCommandPaletteBase = #(TesseraCommandPalette::register_widget(vm))
    mod.widgets.TesseraCommandPalette = set_type_default() do mod.widgets.TesseraCommandPaletteBase{
        width: Fill height: Fit flow: Down spacing: 6 padding: Inset{left: 12, right: 12, top: 10, bottom: 10} show_bg: true
        draw_bg +: {color: theme.color_fg_app border_radius: 4.0 border_size: 1.0 border_color: theme.color_bevel}
        command_palette_title := Label{width: Fill height: Fit text: "Command palette" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        command_palette_open := Button{width: Fit height: 30 text: "Open"}
        command_palette_query := TextInputFlat{width: Fill height: 34 empty_text: "Search local commands"}
        command_palette_choices := DropDown2{width: Fill height: 34 labels: ["Toggle compact density" "Toggle diagnostics" "Clear query" "Release notes (unsupported)"]}
        command_palette_status := Label{width: Fill height: Fit text: "Closed" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
}
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraCommandPalette {
    #[deref]
    view: View,
    #[rust]
    state: CommandPaletteState,
}
impl TesseraCommandPalette {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.state.reduce(CommandPaletteEvent::Reset);
        self.sync(cx);
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .button(cx, ids!(command_palette_open))
            .set_text(cx, if self.state.open { "Close" } else { "Open" });
        self.view
            .text_input(cx, ids!(command_palette_query))
            .set_text(cx, &self.state.query);
        self.view.label(cx, ids!(command_palette_status)).set_text(
            cx,
            if self.state.open {
                "Select a local command"
            } else {
                "Closed"
            },
        );
        self.view.redraw(cx);
    }
    fn invoke(&mut self, cx: &mut Cx, command: PaletteCommand) {
        self.state.reduce(CommandPaletteEvent::Invoke(command));
        self.sync(cx);
        match command {
            PaletteCommand::Unsupported => {
                cx.widget_action(self.widget_uid(), CommandPaletteAction::Unsupported)
            }
            _ => cx.widget_action(
                self.widget_uid(),
                CommandPaletteAction::DomainChanged {
                    command,
                    compact: self.state.compact,
                    diagnostics_visible: self.state.diagnostics_visible,
                },
            ),
        }
    }
}
impl Widget for TesseraCommandPalette {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(command_palette_open))
            .activated(cx, event, &actions)
        {
            self.state.reduce(CommandPaletteEvent::ToggleOpen);
            self.sync(cx);
            cx.widget_action(
                self.widget_uid(),
                CommandPaletteAction::OpenChanged {
                    open: self.state.open,
                },
            );
        }
        if let Some(query) = self
            .view
            .text_input(cx, ids!(command_palette_query))
            .changed(&actions)
        {
            self.state.reduce(CommandPaletteEvent::QueryChanged(query));
        }
        if let Some(index) = self
            .view
            .drop_down(cx, ids!(command_palette_choices))
            .changed(&actions)
        {
            let command = match index {
                0 => PaletteCommand::ToggleCompact,
                1 => PaletteCommand::ToggleDiagnostics,
                2 => PaletteCommand::ClearQuery,
                _ => PaletteCommand::Unsupported,
            };
            self.invoke(cx, command);
        }
        if self.state.open
            && matches!(event, Event::KeyDown(key) if key.key_code == KeyCode::Escape)
        {
            self.state.reduce(CommandPaletteEvent::ToggleOpen);
            self.sync(cx);
            cx.widget_action(
                self.widget_uid(),
                CommandPaletteAction::OpenChanged { open: false },
            );
        }
    }
}
#[cfg(test)]
mod tests {
    use super::{CommandPaletteEvent, CommandPaletteState, PaletteCommand};
    #[test]
    fn commands_change_domain_state_or_fail_closed() {
        let mut state = CommandPaletteState::default();
        state.reduce(CommandPaletteEvent::Invoke(PaletteCommand::ToggleCompact));
        state.reduce(CommandPaletteEvent::Invoke(
            PaletteCommand::ToggleDiagnostics,
        ));
        assert!(state.compact && state.diagnostics_visible);
        assert_eq!(
            state.reduce(CommandPaletteEvent::Invoke(PaletteCommand::Unsupported)),
            Some(PaletteCommand::Unsupported)
        );
    }
}
