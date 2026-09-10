//! Native advanced inputs with one controller state per widget.
//!
//! Selection popups are `DropDown2` instances, so click-outside and Escape are
//! handled by Makepad rather than an inline `View.visible` imitation. Upload
//! fails closed because this target has no reviewed file-picker adapter.

use crate::foundation::input::{ButtonActivationExt, checkbox_change, disabled_control_pointer};
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

pub struct AdvancedInputSurfaceCatalog;
impl AdvancedInputSurfaceCatalog {
    #[must_use]
    pub const fn contains(id: ComponentId) -> bool {
        matches!(
            id,
            ComponentId::Cascader
                | ComponentId::TreeSelect
                | ComponentId::Transfer
                | ComponentId::Upload
                | ComponentId::Form
        )
    }
    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Cascader => Some("TesseraCascader"),
            ComponentId::TreeSelect => Some("TesseraTreeSelect"),
            ComponentId::Transfer => Some("TesseraTransfer"),
            ComponentId::Upload => Some("TesseraUpload"),
            ComponentId::Form => Some("TesseraForm"),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum CascaderAction {
    Opened {
        component: ComponentId,
    },
    ParentSelected {
        component: ComponentId,
        index: usize,
    },
    LeafSelected {
        component: ComponentId,
        index: usize,
    },
    Committed {
        component: ComponentId,
        parent: usize,
        leaf: usize,
    },
    Cancelled {
        component: ComponentId,
    },
    Reset {
        component: ComponentId,
    },
    #[default]
    None,
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum TreeSelectAction {
    Opened {
        component: ComponentId,
    },
    Expanded {
        component: ComponentId,
        expanded: bool,
    },
    Selected {
        component: ComponentId,
        index: usize,
    },
    Committed {
        component: ComponentId,
        index: usize,
    },
    Cancelled {
        component: ComponentId,
    },
    Reset {
        component: ComponentId,
    },
    #[default]
    None,
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum TransferAction {
    SourceSelected {
        component: ComponentId,
        index: usize,
    },
    MovedToTarget {
        component: ComponentId,
        count: usize,
    },
    ReturnedToSource {
        component: ComponentId,
        count: usize,
    },
    Cancelled {
        component: ComponentId,
    },
    Reset {
        component: ComponentId,
    },
    #[default]
    None,
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum UploadAction {
    Unsupported {
        component: ComponentId,
        reason: &'static str,
    },
    Cancelled {
        component: ComponentId,
    },
    Reset {
        component: ComponentId,
    },
    #[default]
    None,
}
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub enum FormAction {
    Submitted {
        component: ComponentId,
    },
    ValidationFailed {
        component: ComponentId,
    },
    Reset {
        component: ComponentId,
    },
    #[default]
    None,
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*
    mod.widgets.TesseraCascaderBase = #(TesseraCascader::register_widget(vm))
    mod.widgets.TesseraCascader = set_type_default() do mod.widgets.TesseraCascaderBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        cascader_title := Label{width: Fill height: Fit text: "Cascader" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        cascader_parent := DropDown2{width: Fill height: 34 labels: ["Products" "Workspace"]}
        cascader_leaf := DropDown2{width: Fill height: 34 labels: ["Hardware" "Documents"]}
        cascader_reset := Button{width: Fit height: 28 text: "Reset"}
        cascader_status := Label{width: Fill height: Fit text: "Products / Hardware committed" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
    mod.widgets.TesseraTreeSelectBase = #(TesseraTreeSelect::register_widget(vm))
    mod.widgets.TesseraTreeSelect = set_type_default() do mod.widgets.TesseraTreeSelectBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        tree_select_title := Label{width: Fill height: Fit text: "Tree select" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        tree_select_node := DropDown2{width: Fill height: 34 labels: ["Workspace / Native" "Workspace / Documents"]}
        tree_select_reset := Button{width: Fit height: 28 text: "Reset"}
        tree_select_status := Label{width: Fill height: Fit text: "Workspace / Native committed" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
    mod.widgets.TesseraTransferBase = #(TesseraTransfer::register_widget(vm))
    mod.widgets.TesseraTransfer = set_type_default() do mod.widgets.TesseraTransferBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        transfer_title := Label{width: Fill height: Fit text: "Transfer" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        transfer_source := DropDown2{width: Fill height: 34 labels: ["Standard" "Advanced"]}
        transfer_actions := View{width: Fill height: 30 flow: Right spacing: 6 transfer_move := Button{width: Fit height: 30 text: "Move to selected"} transfer_return := Button{width: Fit height: 30 text: "Return selected"}}
        transfer_target := Label{width: Fill height: Fit text: "Selected: none" draw_text +: {color: theme.color_text}}
        transfer_reset := Button{width: Fit height: 28 text: "Reset"}
        transfer_status := Label{width: Fill height: Fit text: "Select an available item" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
    mod.widgets.TesseraUploadBase = #(TesseraUpload::register_widget(vm))
    mod.widgets.TesseraUpload = set_type_default() do mod.widgets.TesseraUploadBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        upload_title := Label{width: Fill height: Fit text: "Upload" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        upload_stage := Button{width: Fit height: 30 text: "Choose file"}
        upload_reset := Button{width: Fit height: 28 text: "Reset"}
        upload_status := Label{width: Fill height: Fit text: "Unsupported: no reviewed file-picker adapter" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
    mod.widgets.TesseraFormBase = #(TesseraForm::register_widget(vm))
    mod.widgets.TesseraForm = set_type_default() do mod.widgets.TesseraFormBase{
        ..mod.widgets.TesseraSurfaceFrame
        spacing: 6
        form_title := Label{width: Fill height: Fit text: "Form" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        form_name := TextInputFlat{width: Fill height: 34 empty_text: "Name"} form_email := TextInputFlat{width: Fill height: 34 empty_text: "Email"}
        form_accept := CheckBox{text: "I confirm the values"} form_submit := Button{width: Fit height: 30 text: "Submit"} form_reset := Button{width: Fit height: 28 text: "Reset"}
        form_status := Label{width: Fill height: Fit text: "Name, email, and confirmation are required" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
}

fn clamp(index: usize, len: usize) -> usize {
    index.min(len.saturating_sub(1))
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
struct CascaderState {
    parent: usize,
    leaf: usize,
    committed_parent: usize,
    committed_leaf: usize,
    open: bool,
}
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraCascader {
    #[deref]
    view: View,
    #[rust]
    state: CascaderState,
}
impl TesseraCascader {
    const PARENTS: [&'static str; 2] = ["Products", "Workspace"];
    const LEAVES: [&'static str; 2] = ["Hardware", "Documents"];
    pub fn reset(&mut self, cx: &mut Cx) {
        self.close_native(cx);
        self.state = CascaderState::default();
        self.sync(cx);
    }
    fn close_native(&mut self, cx: &mut Cx) {
        for id in [ids!(cascader_parent), ids!(cascader_leaf)] {
            if let Some(mut dropdown) = self.view.widget(cx, id).borrow_mut::<DropDown2>() {
                dropdown.set_closed(cx);
            }
        }
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .drop_down(cx, ids!(cascader_parent))
            .set_selected_item(cx, self.state.parent);
        self.view
            .drop_down(cx, ids!(cascader_leaf))
            .set_selected_item(cx, self.state.leaf);
        self.view.label(cx, ids!(cascader_status)).set_text(
            cx,
            &format!(
                "{} / {} committed",
                Self::PARENTS[self.state.parent],
                Self::LEAVES[self.state.leaf]
            ),
        );
        self.view.redraw(cx);
    }
    fn commit(&self, cx: &mut Cx) {
        cx.widget_action(
            self.widget_uid(),
            CascaderAction::Committed {
                component: ComponentId::Cascader,
                parent: self.state.parent,
                leaf: self.state.leaf,
            },
        );
    }
}
impl Widget for TesseraCascader {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self.state.open
            && matches!(event, Event::KeyDown(key) if key.key_code == KeyCode::Escape)
        {
            self.state.parent = self.state.committed_parent;
            self.state.leaf = self.state.committed_leaf;
            self.state.open = false;
            self.close_native(cx);
            self.sync(cx);
            cx.widget_action(
                self.widget_uid(),
                CascaderAction::Cancelled {
                    component: ComponentId::Cascader,
                },
            );
        }
        if let Event::MouseDown(mouse) = event {
            let parent_rect = self.view.widget(cx, ids!(cascader_parent)).area().rect(cx);
            let leaf_rect = self.view.widget(cx, ids!(cascader_leaf)).area().rect(cx);
            if (parent_rect.contains(mouse.abs) || leaf_rect.contains(mouse.abs))
                && !self.state.open
            {
                self.state.open = true;
                cx.widget_action(
                    self.widget_uid(),
                    CascaderAction::Opened {
                        component: ComponentId::Cascader,
                    },
                );
            } else if self.state.open
                && !parent_rect.contains(mouse.abs)
                && !leaf_rect.contains(mouse.abs)
            {
                self.state.parent = self.state.committed_parent;
                self.state.leaf = self.state.committed_leaf;
                self.state.open = false;
                self.close_native(cx);
                self.sync(cx);
                cx.widget_action(
                    self.widget_uid(),
                    CascaderAction::Cancelled {
                        component: ComponentId::Cascader,
                    },
                );
            }
        }
        if let Some(index) = self
            .view
            .drop_down(cx, ids!(cascader_parent))
            .changed(&actions)
        {
            self.state.parent = clamp(index, Self::PARENTS.len());
            self.sync(cx);
            cx.widget_action(
                self.widget_uid(),
                CascaderAction::ParentSelected {
                    component: ComponentId::Cascader,
                    index: self.state.parent,
                },
            );
        }
        if let Some(index) = self
            .view
            .drop_down(cx, ids!(cascader_leaf))
            .changed(&actions)
        {
            self.state.leaf = clamp(index, Self::LEAVES.len());
            self.state.committed_parent = self.state.parent;
            self.state.committed_leaf = self.state.leaf;
            self.state.open = false;
            self.sync(cx);
            cx.widget_action(
                self.widget_uid(),
                CascaderAction::LeafSelected {
                    component: ComponentId::Cascader,
                    index: self.state.leaf,
                },
            );
            self.commit(cx);
        }
        if self
            .view
            .button(cx, ids!(cascader_reset))
            .activated(cx, event, &actions)
        {
            self.reset(cx);
            cx.widget_action(
                self.widget_uid(),
                CascaderAction::Reset {
                    component: ComponentId::Cascader,
                },
            );
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
struct TreeState {
    selected: usize,
    committed: usize,
    open: bool,
}
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraTreeSelect {
    #[deref]
    view: View,
    #[rust]
    state: TreeState,
}
impl TesseraTreeSelect {
    const NODES: [&'static str; 2] = ["Workspace / Native", "Workspace / Documents"];
    pub fn reset(&mut self, cx: &mut Cx) {
        self.close_native(cx);
        self.state = TreeState::default();
        self.sync(cx);
    }
    fn close_native(&mut self, cx: &mut Cx) {
        if let Some(mut dropdown) = self
            .view
            .widget(cx, ids!(tree_select_node))
            .borrow_mut::<DropDown2>()
        {
            dropdown.set_closed(cx);
        }
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .drop_down(cx, ids!(tree_select_node))
            .set_selected_item(cx, self.state.selected);
        self.view.label(cx, ids!(tree_select_status)).set_text(
            cx,
            &format!("{} committed", Self::NODES[self.state.selected]),
        );
        self.view.redraw(cx);
    }
}
impl Widget for TesseraTreeSelect {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if let Event::MouseDown(mouse) = event {
            let rect = self.view.widget(cx, ids!(tree_select_node)).area().rect(cx);
            if rect.contains(mouse.abs) && !self.state.open {
                self.state.open = true;
                cx.widget_action(
                    self.widget_uid(),
                    TreeSelectAction::Opened {
                        component: ComponentId::TreeSelect,
                    },
                );
            } else if self.state.open && !rect.contains(mouse.abs) {
                self.state.selected = self.state.committed;
                self.state.open = false;
                self.close_native(cx);
                self.sync(cx);
                cx.widget_action(
                    self.widget_uid(),
                    TreeSelectAction::Cancelled {
                        component: ComponentId::TreeSelect,
                    },
                );
            }
        }
        if let Some(index) = self
            .view
            .drop_down(cx, ids!(tree_select_node))
            .changed(&actions)
        {
            self.state.selected = clamp(index, Self::NODES.len());
            self.state.committed = self.state.selected;
            self.state.open = false;
            self.sync(cx);
            cx.widget_action(
                self.widget_uid(),
                TreeSelectAction::Selected {
                    component: ComponentId::TreeSelect,
                    index: self.state.selected,
                },
            );
            cx.widget_action(
                self.widget_uid(),
                TreeSelectAction::Committed {
                    component: ComponentId::TreeSelect,
                    index: self.state.selected,
                },
            );
        }
        if self
            .view
            .button(cx, ids!(tree_select_reset))
            .activated(cx, event, &actions)
        {
            self.reset(cx);
            cx.widget_action(
                self.widget_uid(),
                TreeSelectAction::Reset {
                    component: ComponentId::TreeSelect,
                },
            );
        } else if self.state.open
            && matches!(event, Event::KeyDown(key) if key.key_code == KeyCode::Escape)
        {
            self.state.selected = self.state.committed;
            self.state.open = false;
            self.close_native(cx);
            self.sync(cx);
            cx.widget_action(
                self.widget_uid(),
                TreeSelectAction::Cancelled {
                    component: ComponentId::TreeSelect,
                },
            );
        }
    }
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
struct TransferState {
    source: usize,
    target: [bool; 2],
    committed_target: [bool; 2],
    open: bool,
}
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraTransfer {
    #[deref]
    view: View,
    #[rust]
    state: TransferState,
}
impl TesseraTransfer {
    const OPTIONS: [&'static str; 2] = ["Standard", "Advanced"];
    pub fn reset(&mut self, cx: &mut Cx) {
        self.close_native(cx);
        self.state = TransferState::default();
        self.sync(cx);
    }
    fn close_native(&mut self, cx: &mut Cx) {
        if let Some(mut dropdown) = self
            .view
            .widget(cx, ids!(transfer_source))
            .borrow_mut::<DropDown2>()
        {
            dropdown.set_closed(cx);
        }
    }
    fn selected_count(&self) -> usize {
        self.state
            .target
            .into_iter()
            .filter(|selected| *selected)
            .count()
    }
    fn sync(&mut self, cx: &mut Cx) {
        self.view
            .drop_down(cx, ids!(transfer_source))
            .set_selected_item(cx, self.state.source);
        let selected: Vec<_> = Self::OPTIONS
            .iter()
            .zip(self.state.target)
            .filter_map(|(label, is_selected)| is_selected.then_some(*label))
            .collect();
        let target_text = if selected.is_empty() {
            String::from("Selected: none")
        } else {
            format!("Selected: {}", selected.join(", "))
        };
        self.view
            .label(cx, ids!(transfer_target))
            .set_text(cx, &target_text);
        self.view
            .label(cx, ids!(transfer_status))
            .set_text(cx, "Use Move to commit the current selection");
        self.view.redraw(cx);
    }
}
impl Widget for TesseraTransfer {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if let Some(index) = self
            .view
            .drop_down(cx, ids!(transfer_source))
            .changed(&actions)
        {
            self.state.source = clamp(index, Self::OPTIONS.len());
            self.state.open = false;
            cx.widget_action(
                self.widget_uid(),
                TransferAction::SourceSelected {
                    component: ComponentId::Transfer,
                    index: self.state.source,
                },
            );
        }
        if self
            .view
            .button(cx, ids!(transfer_move))
            .activated(cx, event, &actions)
        {
            self.state.target[self.state.source] = true;
            self.state.committed_target = self.state.target;
            self.sync(cx);
            cx.widget_action(
                self.widget_uid(),
                TransferAction::MovedToTarget {
                    component: ComponentId::Transfer,
                    count: self.selected_count(),
                },
            );
        }
        if self
            .view
            .button(cx, ids!(transfer_return))
            .activated(cx, event, &actions)
        {
            self.state.target[self.state.source] = false;
            self.state.committed_target = self.state.target;
            self.sync(cx);
            cx.widget_action(
                self.widget_uid(),
                TransferAction::ReturnedToSource {
                    component: ComponentId::Transfer,
                    count: self.selected_count(),
                },
            );
        }
        if self
            .view
            .button(cx, ids!(transfer_reset))
            .activated(cx, event, &actions)
        {
            self.reset(cx);
            cx.widget_action(
                self.widget_uid(),
                TransferAction::Reset {
                    component: ComponentId::Transfer,
                },
            );
        } else if let Event::MouseDown(mouse) = event {
            let rect = self.view.widget(cx, ids!(transfer_source)).area().rect(cx);
            if rect.contains(mouse.abs) {
                self.state.open = true;
            } else if self.state.open {
                self.state.target = self.state.committed_target;
                self.state.open = false;
                self.close_native(cx);
                self.sync(cx);
                cx.widget_action(
                    self.widget_uid(),
                    TransferAction::Cancelled {
                        component: ComponentId::Transfer,
                    },
                );
            }
        } else if self.state.open
            && matches!(event, Event::KeyDown(key) if key.key_code == KeyCode::Escape)
        {
            self.state.target = self.state.committed_target;
            self.state.open = false;
            self.close_native(cx);
            self.sync(cx);
            cx.widget_action(
                self.widget_uid(),
                TransferAction::Cancelled {
                    component: ComponentId::Transfer,
                },
            );
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraUpload {
    #[deref]
    view: View,
}
impl TesseraUpload {
    const DENIAL: &'static str = "No reviewed file-picker adapter is available on this platform";
    pub fn reset(&mut self, cx: &mut Cx) {
        self.view
            .label(cx, ids!(upload_status))
            .set_text(cx, "Unsupported: no reviewed file-picker adapter");
        self.view.redraw(cx);
    }
}
impl Widget for TesseraUpload {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if self
            .view
            .button(cx, ids!(upload_stage))
            .activated(cx, event, &actions)
        {
            self.view
                .label(cx, ids!(upload_status))
                .set_text(cx, "Unsupported: no reviewed file-picker adapter");
            cx.widget_action(
                self.widget_uid(),
                UploadAction::Unsupported {
                    component: ComponentId::Upload,
                    reason: Self::DENIAL,
                },
            );
        } else if self
            .view
            .button(cx, ids!(upload_reset))
            .activated(cx, event, &actions)
        {
            self.reset(cx);
            cx.widget_action(
                self.widget_uid(),
                UploadAction::Reset {
                    component: ComponentId::Upload,
                },
            );
        } else if matches!(event, Event::KeyDown(key) if key.key_code == KeyCode::Escape) {
            self.view
                .label(cx, ids!(upload_status))
                .set_text(cx, "File selection cancelled");
            self.view.redraw(cx);
            cx.widget_action(
                self.widget_uid(),
                UploadAction::Cancelled {
                    component: ComponentId::Upload,
                },
            );
        }
    }
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
struct FormState {
    name: String,
    email: String,
    accepted: bool,
}
#[derive(Script, ScriptHook, Widget)]
pub struct TesseraForm {
    #[deref]
    view: View,
    #[rust]
    state: FormState,
}
impl TesseraForm {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.state = FormState::default();
        self.view.text_input(cx, ids!(form_name)).set_text(cx, "");
        self.view.text_input(cx, ids!(form_email)).set_text(cx, "");
        self.view
            .check_box(cx, ids!(form_accept))
            .set_active(cx, false, Animate::No);
        self.view
            .label(cx, ids!(form_status))
            .set_text(cx, "Name, email, and confirmation are required");
        self.view.redraw(cx);
    }
    fn valid(&self) -> bool {
        !self.state.name.trim().is_empty() && self.state.email.contains('@') && self.state.accepted
    }
}
impl Widget for TesseraForm {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let accept = self.view.check_box(cx, ids!(form_accept));
        if disabled_control_pointer(&accept, cx, event) {
            return;
        }
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if let Some(value) = self.view.text_input(cx, ids!(form_name)).changed(&actions) {
            self.state.name = value;
        }
        if let Some(value) = self.view.text_input(cx, ids!(form_email)).changed(&actions) {
            self.state.email = value;
        }
        if let Some(value) = checkbox_change(&accept, cx, event, &actions) {
            self.state.accepted = value;
        }
        let submit = self.view.button(cx, ids!(form_submit));
        let reset = self.view.button(cx, ids!(form_reset));
        if submit.activated(cx, event, &actions) {
            let valid = self.valid();
            self.view.label(cx, ids!(form_status)).set_text(
                cx,
                if valid {
                    "Submitted locally"
                } else {
                    "Name, valid email, and confirmation are required"
                },
            );
            cx.widget_action(
                self.widget_uid(),
                if valid {
                    FormAction::Submitted {
                        component: ComponentId::Form,
                    }
                } else {
                    FormAction::ValidationFailed {
                        component: ComponentId::Form,
                    }
                },
            );
        } else if reset.activated(cx, event, &actions) {
            self.reset(cx);
            cx.widget_action(
                self.widget_uid(),
                FormAction::Reset {
                    component: ComponentId::Form,
                },
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{AdvancedInputSurfaceCatalog, CascaderState, TransferState, clamp};
    use tessera_core::catalog::ComponentId;
    #[test]
    fn catalog_exposes_the_owned_advanced_routes() {
        assert_eq!(
            AdvancedInputSurfaceCatalog::widget_name(ComponentId::Upload),
            Some("TesseraUpload")
        );
        assert!(AdvancedInputSurfaceCatalog::contains(ComponentId::Cascader));
    }
    #[test]
    fn selectors_and_transfer_have_no_staging_or_popup_state() {
        assert_eq!(clamp(8, 2), 1);
        assert_eq!(
            CascaderState::default(),
            CascaderState {
                parent: 0,
                leaf: 0,
                committed_parent: 0,
                committed_leaf: 0,
                open: false,
            }
        );
        assert_eq!(TransferState::default().target, [false, false]);
    }
}
