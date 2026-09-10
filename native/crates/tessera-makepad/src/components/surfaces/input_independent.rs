//! Independent Makepad widgets for the eight foundational input routes.
//!
//! The pure controller in `input.rs` remains shared deliberately, but each
//! component owns its live widget tree, state instance, reset path, and widget
//! UID. This keeps a route from becoming a visual variant of one generic input
//! shell while retaining one bounded validation model.

use super::input::{
    CheckState, InputSurface, InputSurfaceId, KeyboardIntent, SurfaceEvent, SurfaceOutcome,
    SurfaceState,
};
use crate::foundation::input::{
    ButtonActivationExt, checkbox_change, control_keyboard_activation, disabled_control_pointer,
    enabled_choice_index, focused_navigation_key,
};
use crate::makepad_widgets::makepad_draw::text::selection::Cursor;
use crate::makepad_widgets::*;
use tessera_core::catalog::ComponentId;

/// Actions emitted by each component-owned foundational input widget.
#[derive(Clone, Debug, Default)]
pub enum InputSurfaceAction {
    Changed {
        component: ComponentId,
        outcome: SurfaceOutcome,
    },
    Failed {
        component: ComponentId,
    },
    #[default]
    None,
}

/// Registry for the routes backed by an independent input widget.
pub struct InputWidgetCatalog;

impl InputWidgetCatalog {
    pub const RUNTIME_COMPONENTS: [ComponentId; 8] = [
        ComponentId::Input,
        ComponentId::Textarea,
        ComponentId::InputNumber,
        ComponentId::Checkbox,
        ComponentId::Radio,
        ComponentId::Switch,
        ComponentId::Slider,
        ComponentId::Select,
    ];

    #[must_use]
    pub const fn component(id: ComponentId) -> Option<InputSurfaceId> {
        match id {
            ComponentId::Input => Some(InputSurfaceId::Input),
            ComponentId::Textarea => Some(InputSurfaceId::Textarea),
            ComponentId::InputNumber => Some(InputSurfaceId::InputNumber),
            ComponentId::Checkbox => Some(InputSurfaceId::Checkbox),
            ComponentId::Radio => Some(InputSurfaceId::Radio),
            ComponentId::Switch => Some(InputSurfaceId::Switch),
            ComponentId::Slider => Some(InputSurfaceId::Slider),
            ComponentId::Select => Some(InputSurfaceId::Select),
            _ => None,
        }
    }

    #[must_use]
    pub const fn contains(id: ComponentId) -> bool {
        Self::component(id).is_some()
    }

    #[must_use]
    pub const fn widget_name(id: ComponentId) -> Option<&'static str> {
        match id {
            ComponentId::Input => Some("TesseraInput"),
            ComponentId::Textarea => Some("TesseraTextarea"),
            ComponentId::InputNumber => Some("TesseraInputNumber"),
            ComponentId::Checkbox => Some("TesseraCheckbox"),
            ComponentId::Radio => Some("TesseraRadio"),
            ComponentId::Switch => Some("TesseraSwitch"),
            ComponentId::Slider => Some("TesseraSlider"),
            ComponentId::Select => Some("TesseraSelect"),
            _ => None,
        }
    }
}

fn apply_controller_event(
    cx: &mut Cx,
    view: &View,
    widget_uid: WidgetUid,
    controller: &mut InputSurface,
    component: ComponentId,
    status: &[LiveId],
    event: SurfaceEvent,
) {
    let result = controller.reduce(event);
    match result {
        Ok(outcome) => {
            view.label(cx, status)
                .set_text(cx, &format!("{} / {:?}", component.spec().name, outcome));
            cx.widget_action(
                widget_uid,
                InputSurfaceAction::Changed { component, outcome },
            );
        }
        Err(_) => {
            view.label(cx, status).set_text(
                cx,
                &format!(
                    "{} / validation error; draft retained",
                    component.spec().name
                ),
            );
            cx.widget_action(widget_uid, InputSurfaceAction::Failed { component });
        }
    }
}

fn reset_status(cx: &mut Cx, view: &View, status: &[LiveId], component: ComponentId) {
    view.label(cx, status).set_text(
        cx,
        &format!(
            "Native {} / controller reset / keyboard ready",
            component.spec().slug
        ),
    );
}

fn set_fixture_text(cx: &mut Cx, input: &TextInputRef, text: &str) {
    input.set_text(cx, text);
    input.set_cursor(
        cx,
        Cursor {
            index: text.len(),
            prefer_next_row: false,
        },
        false,
    );
}

script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*

    mod.widgets.TesseraInputBase = #(TesseraInput::register_widget(vm))
    mod.widgets.TesseraTextareaBase = #(TesseraTextarea::register_widget(vm))
    mod.widgets.TesseraInputNumberBase = #(TesseraInputNumber::register_widget(vm))
    mod.widgets.TesseraCheckboxBase = #(TesseraCheckbox::register_widget(vm))
    mod.widgets.TesseraRadioBase = #(TesseraRadio::register_widget(vm))
    mod.widgets.TesseraSwitchBase = #(TesseraSwitch::register_widget(vm))
    mod.widgets.TesseraSliderBase = #(TesseraSlider::register_widget(vm))
    mod.widgets.TesseraSelectBase = #(TesseraSelect::register_widget(vm))

    mod.widgets.TesseraInput = set_type_default() do mod.widgets.TesseraInputBase{
        ..mod.widgets.TesseraSurfaceFrame
        input_title := Label{width: Fill height: Fit text: "Input" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        input_control := TextInputFlat{width: Fill height: 36 empty_text: "Input value"}
        input_status := Label{width: Fill height: Fit text: "Native input ready" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }

    mod.widgets.TesseraTextarea = set_type_default() do mod.widgets.TesseraTextareaBase{
        ..mod.widgets.TesseraSurfaceFrame
        textarea_title := Label{width: Fill height: Fit text: "Textarea" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        textarea_control := TextInputFlat{width: Fill height: 104 is_multiline: true empty_text: "Textarea value"}
        textarea_status := Label{width: Fill height: Fit text: "Native textarea ready" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }

    mod.widgets.TesseraInputNumber = set_type_default() do mod.widgets.TesseraInputNumberBase{
        ..mod.widgets.TesseraSurfaceFrame
        input_number_title := Label{width: Fill height: Fit text: "Input number" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        input_number_row := View{width: Fill height: 36 flow: Right spacing: 6
            input_number_decrement := Button{width: 36 height: 36 margin: 0 text: "-"}
            input_number_control := TextInputFlat{width: Fill height: 36 margin: 0 is_numeric_only: true empty_text: "Number"}
            input_number_increment := Button{width: 36 height: 36 margin: 0 text: "+"}
        }
        input_number_status := Label{width: Fill height: Fit text: "Native number input ready" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }

    mod.widgets.TesseraCheckbox = set_type_default() do mod.widgets.TesseraCheckboxBase{
        ..mod.widgets.TesseraSurfaceFrame
        checkbox_title := Label{width: Fill height: Fit text: "Checkbox" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        checkbox_control := CheckBox{text: "Accept terms"}
        checkbox_status := Label{width: Fill height: Fit text: "Native checkbox ready" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }

    mod.widgets.TesseraRadio = set_type_default() do mod.widgets.TesseraRadioBase{
        ..mod.widgets.TesseraSurfaceFrame
        radio_title := Label{width: Fill height: Fit text: "Radio" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        radio_standard := RadioButton{text: "Standard"}
        radio_advanced := RadioButton{text: "Advanced"}
        radio_locked := RadioButton{text: "Locked"}
        radio_status := Label{width: Fill height: Fit text: "Native radio ready" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }

    mod.widgets.TesseraSwitch = set_type_default() do mod.widgets.TesseraSwitchBase{
        ..mod.widgets.TesseraSurfaceFrame
        switch_title := Label{width: Fill height: Fit text: "Switch" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        switch_control := Toggle{text: "Enabled"}
        switch_status := Label{width: Fill height: Fit text: "Native switch ready" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }

    mod.widgets.TesseraSlider = set_type_default() do mod.widgets.TesseraSliderBase{
        ..mod.widgets.TesseraSurfaceFrame
        slider_title := Label{width: Fill height: Fit text: "Slider" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        slider_control := Slider{width: Fill height: 44 min: 0.0 max: 100.0 step: 1.0 default: 48.0 text: "Value"}
        slider_status := Label{width: Fill height: Fit text: "Native slider ready" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }

    mod.widgets.TesseraSelect = set_type_default() do mod.widgets.TesseraSelectBase{
        ..mod.widgets.TesseraSurfaceFrame
        select_title := Label{width: Fill height: Fit text: "Select" draw_text +: {color: theme.color_text text_style +: {font_size: 14.0}}}
        select_control := DropDown2{width: Fill height: 36 labels: ["Standard" "Advanced" "Locked"]}
        select_status := Label{width: Fill height: Fit text: "Native select ready" draw_text +: {color: theme.color_text_meta flow: Flow.Right{wrap: true}}}
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraInput {
    #[deref]
    view: View,
    #[rust]
    controller: Option<InputSurface>,
}

impl TesseraInput {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.controller = Some(InputSurface::new(InputSurfaceId::Input));
        let input = self.view.text_input(cx, ids!(input_control));
        set_fixture_text(cx, &input, "Tessera input");
        reset_status(cx, &self.view, ids!(input_status), ComponentId::Input);
    }

    fn apply(&mut self, cx: &mut Cx, event: SurfaceEvent) {
        let widget_uid = self.widget_uid();
        if let Some(controller) = self.controller.as_mut() {
            apply_controller_event(
                cx,
                &self.view,
                widget_uid,
                controller,
                ComponentId::Input,
                ids!(input_status),
                event,
            );
        }
    }
}

impl Widget for TesseraInput {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if let Some(value) = self
            .view
            .text_input(cx, ids!(input_control))
            .changed(&actions)
        {
            self.apply(cx, SurfaceEvent::TextChanged(value));
        }
        if self
            .view
            .text_input(cx, ids!(input_control))
            .returned(&actions)
            .is_some()
        {
            self.apply(cx, SurfaceEvent::Submit);
        }
        if self
            .view
            .text_input(cx, ids!(input_control))
            .escaped(&actions)
        {
            self.apply(cx, SurfaceEvent::Cancel);
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraTextarea {
    #[deref]
    view: View,
    #[rust]
    controller: Option<InputSurface>,
}

impl TesseraTextarea {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.controller = Some(InputSurface::new(InputSurfaceId::Textarea));
        let input = self.view.text_input(cx, ids!(textarea_control));
        set_fixture_text(cx, &input, "Tessera multiline input\n组件 text");
        reset_status(cx, &self.view, ids!(textarea_status), ComponentId::Textarea);
    }

    fn apply(&mut self, cx: &mut Cx, event: SurfaceEvent) {
        let widget_uid = self.widget_uid();
        if let Some(controller) = self.controller.as_mut() {
            apply_controller_event(
                cx,
                &self.view,
                widget_uid,
                controller,
                ComponentId::Textarea,
                ids!(textarea_status),
                event,
            );
        }
    }
}

impl Widget for TesseraTextarea {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if let Some(value) = self
            .view
            .text_input(cx, ids!(textarea_control))
            .changed(&actions)
        {
            self.apply(cx, SurfaceEvent::TextChanged(value));
        }
        if self
            .view
            .text_input(cx, ids!(textarea_control))
            .escaped(&actions)
        {
            self.apply(cx, SurfaceEvent::Cancel);
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraInputNumber {
    #[deref]
    view: View,
    #[rust]
    controller: Option<InputSurface>,
}

impl TesseraInputNumber {
    pub fn reset(&mut self, cx: &mut Cx) {
        let mut controller = InputSurface::new(InputSurfaceId::InputNumber);
        controller
            .reduce(SurfaceEvent::TextChanged("42".into()))
            .expect("number fixture");
        controller
            .reduce(SurfaceEvent::Submit)
            .expect("number fixture");
        self.controller = Some(controller);
        let input = self.view.text_input(cx, ids!(input_number_control));
        set_fixture_text(cx, &input, "42");
        reset_status(
            cx,
            &self.view,
            ids!(input_number_status),
            ComponentId::InputNumber,
        );
    }

    fn apply(&mut self, cx: &mut Cx, event: SurfaceEvent) {
        let widget_uid = self.widget_uid();
        let update_text = !matches!(&event, SurfaceEvent::TextChanged(_));
        if let Some(controller) = self.controller.as_mut() {
            apply_controller_event(
                cx,
                &self.view,
                widget_uid,
                controller,
                ComponentId::InputNumber,
                ids!(input_number_status),
                event,
            );
            if update_text {
                if let SurfaceState::InputNumber(number) = &controller.state {
                    set_fixture_text(
                        cx,
                        &self.view.text_input(cx, ids!(input_number_control)),
                        &number.draft,
                    );
                }
            }
        }
    }
}

impl Widget for TesseraInputNumber {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if let Some(value) = self
            .view
            .text_input(cx, ids!(input_number_control))
            .changed(&actions)
        {
            self.apply(cx, SurfaceEvent::TextChanged(value));
        }
        if self
            .view
            .text_input(cx, ids!(input_number_control))
            .returned(&actions)
            .is_some()
        {
            self.apply(cx, SurfaceEvent::Submit);
        }
        if self
            .view
            .button(cx, ids!(input_number_decrement))
            .activated(cx, event, &actions)
        {
            self.apply(cx, SurfaceEvent::StepNumber(-1));
        }
        if self
            .view
            .button(cx, ids!(input_number_increment))
            .activated(cx, event, &actions)
        {
            self.apply(cx, SurfaceEvent::StepNumber(1));
        }
        if self
            .view
            .text_input(cx, ids!(input_number_control))
            .escaped(&actions)
        {
            self.apply(cx, SurfaceEvent::Cancel);
        }
        if let Event::KeyDown(key) = event {
            if self
                .view
                .text_input(cx, ids!(input_number_control))
                .key_focus(cx)
                && !key.modifiers.control
                && !key.modifiers.logo
                && !key.modifiers.alt
            {
                match key.key_code {
                    KeyCode::ArrowUp => self.apply(cx, SurfaceEvent::StepNumber(1)),
                    KeyCode::ArrowDown => self.apply(cx, SurfaceEvent::StepNumber(-1)),
                    _ => {}
                }
            }
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraCheckbox {
    #[deref]
    view: View,
    #[rust]
    controller: Option<InputSurface>,
}

impl TesseraCheckbox {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.controller = Some(InputSurface::new(InputSurfaceId::Checkbox));
        self.view
            .check_box(cx, ids!(checkbox_control))
            .set_active(cx, false, Animate::No);
        reset_status(cx, &self.view, ids!(checkbox_status), ComponentId::Checkbox);
    }

    fn apply(&mut self, cx: &mut Cx, event: SurfaceEvent) {
        let widget_uid = self.widget_uid();
        if let Some(controller) = self.controller.as_mut() {
            apply_controller_event(
                cx,
                &self.view,
                widget_uid,
                controller,
                ComponentId::Checkbox,
                ids!(checkbox_status),
                event,
            );
            if let SurfaceState::Checkbox(state) = &controller.state {
                self.view.check_box(cx, ids!(checkbox_control)).set_active(
                    cx,
                    state.value == CheckState::Checked,
                    Animate::No,
                );
            }
        }
    }
}

impl Widget for TesseraCheckbox {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let control = self.view.check_box(cx, ids!(checkbox_control));
        if disabled_control_pointer(&control, cx, event) {
            return;
        }
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if checkbox_change(&control, cx, event, &actions).is_some() {
            self.apply(cx, SurfaceEvent::Toggle);
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraRadio {
    #[deref]
    view: View,
    #[rust]
    controller: Option<InputSurface>,
}

impl TesseraRadio {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.controller = Some(InputSurface::new(InputSurfaceId::Radio));
        self.view
            .radio_button(cx, ids!(radio_standard))
            .set_active(cx, true, Animate::No);
        self.view
            .radio_button(cx, ids!(radio_advanced))
            .set_active(cx, false, Animate::No);
        self.view
            .radio_button(cx, ids!(radio_locked))
            .set_active(cx, false, Animate::No);
        self.view
            .radio_button(cx, ids!(radio_locked))
            .set_disabled(cx, true);
        reset_status(cx, &self.view, ids!(radio_status), ComponentId::Radio);
    }

    fn apply(&mut self, cx: &mut Cx, event: SurfaceEvent) {
        let widget_uid = self.widget_uid();
        if let Some(controller) = self.controller.as_mut() {
            apply_controller_event(
                cx,
                &self.view,
                widget_uid,
                controller,
                ComponentId::Radio,
                ids!(radio_status),
                event,
            );
        }
    }

    fn select(&mut self, cx: &mut Cx, choice: &str) {
        let unchanged = self.controller.as_ref().is_some_and(|controller| {
            matches!(&controller.state, SurfaceState::Radio(state)
                if state.selected.as_deref() == Some(choice))
        });
        if unchanged {
            return;
        }
        self.view.radio_button(cx, ids!(radio_standard)).set_active(
            cx,
            choice == "standard",
            Animate::No,
        );
        self.view.radio_button(cx, ids!(radio_advanced)).set_active(
            cx,
            choice == "advanced",
            Animate::No,
        );
        self.apply(cx, SurfaceEvent::Select(choice.to_owned()));
    }
}

impl Widget for TesseraRadio {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let controls = [
            self.view.radio_button(cx, ids!(radio_standard)),
            self.view.radio_button(cx, ids!(radio_advanced)),
            self.view.radio_button(cx, ids!(radio_locked)),
        ];
        for control in &controls {
            if disabled_control_pointer(control, cx, event) {
                return;
            }
        }
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        let enabled = controls.each_ref().map(|control| !control.disabled(cx));
        if matches!(event, Event::KeyDown(key) if key.key_code == KeyCode::Tab) {
            let preferred = controls.iter().position(|control| control.active(cx));
            let members = controls.each_ref().map(|control| &**control);
            crate::foundation::focus::constrain_tab_group(cx, event, &members, preferred);
        }
        let clicked = controls.iter().enumerate().find_map(|(index, control)| {
            (enabled[index]
                && (control.clicked(&actions) || control_keyboard_activation(control, cx, event)))
            .then_some(index)
        });
        let navigated = controls
            .iter()
            .position(|control| control.key_focus(cx))
            .and_then(|current| {
                focused_navigation_key(event, true)
                    .and_then(|key| enabled_choice_index(key, current, &enabled))
            });
        if let Some(index) = clicked.or(navigated) {
            controls[index].set_key_focus(cx);
            self.select(cx, ["standard", "advanced", "locked"][index]);
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraSwitch {
    #[deref]
    view: View,
    #[rust]
    controller: Option<InputSurface>,
}

impl TesseraSwitch {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.controller = Some(InputSurface::new(InputSurfaceId::Switch));
        self.view
            .check_box(cx, ids!(switch_control))
            .set_active(cx, false, Animate::No);
        reset_status(cx, &self.view, ids!(switch_status), ComponentId::Switch);
    }

    fn apply(&mut self, cx: &mut Cx, event: SurfaceEvent) {
        let widget_uid = self.widget_uid();
        if let Some(controller) = self.controller.as_mut() {
            apply_controller_event(
                cx,
                &self.view,
                widget_uid,
                controller,
                ComponentId::Switch,
                ids!(switch_status),
                event,
            );
            if let SurfaceState::Switch(state) = &controller.state {
                self.view.check_box(cx, ids!(switch_control)).set_active(
                    cx,
                    state.value,
                    Animate::No,
                );
            }
        }
    }
}

impl Widget for TesseraSwitch {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let control = self.view.check_box(cx, ids!(switch_control));
        if disabled_control_pointer(&control, cx, event) {
            return;
        }
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if checkbox_change(&control, cx, event, &actions).is_some() {
            self.apply(cx, SurfaceEvent::Toggle);
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraSlider {
    #[deref]
    view: View,
    #[rust]
    controller: Option<InputSurface>,
}

impl TesseraSlider {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.controller = Some(InputSurface::new(InputSurfaceId::Slider));
        self.view
            .slider(cx, ids!(slider_control))
            .set_value(cx, 48.0);
        reset_status(cx, &self.view, ids!(slider_status), ComponentId::Slider);
    }

    fn apply(&mut self, cx: &mut Cx, event: SurfaceEvent) {
        let widget_uid = self.widget_uid();
        if let Some(controller) = self.controller.as_mut() {
            apply_controller_event(
                cx,
                &self.view,
                widget_uid,
                controller,
                ComponentId::Slider,
                ids!(slider_status),
                event,
            );
            if let SurfaceState::Slider(state) = &controller.state {
                let slider = self.view.slider(cx, ids!(slider_control));
                slider.set_value(cx, state.value as f64);
                slider.redraw(cx);
            }
        }
    }
}

impl Widget for TesseraSlider {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        let step = self.view.draw_walk(cx, scope, walk);
        if step.is_done() {
            let area = self.view.slider(cx, ids!(slider_control)).area();
            cx.add_nav_stop(area, NavRole::Slider, Inset::default());
        }
        step
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        let slider = self.view.slider(cx, ids!(slider_control));
        let focus_state = match event {
            Event::KeyFocus(focus) if focus.focus == slider.area() => Some(ids!(focus.on)),
            Event::KeyFocusLost(focus) if focus.prev == slider.area() => Some(ids!(focus.off)),
            _ => None,
        };
        if let Some(state) = focus_state {
            if let Some(mut slider) = slider.borrow_mut() {
                slider.animator_play(cx, state);
            }
        }
        for action in actions.filter_widget_actions_cast::<SliderAction>(slider.widget_uid()) {
            match action {
                SliderAction::StartSlide => {
                    // The embedded editor may have no area when a track click
                    // requests focus. The track owns its keyboard navigation.
                    cx.set_key_focus(slider.area());
                    self.apply(cx, SurfaceEvent::BeginSlide);
                }
                SliderAction::TextSlide(value) | SliderAction::Slide(value) => {
                    self.apply(cx, SurfaceEvent::SetSlider(value.round() as i64));
                }
                SliderAction::EndSlide(value) => {
                    self.apply(cx, SurfaceEvent::SetSlider(value.round() as i64));
                    self.apply(cx, SurfaceEvent::FinishSlide);
                }
                _ => {}
            }
        }
        if let Some(key) =
            focused_navigation_key(event, slider.key_focus(cx) && !slider.disabled(cx))
        {
            let intent = match key {
                KeyCode::ArrowLeft => Some(KeyboardIntent::ArrowLeft),
                KeyCode::ArrowDown => Some(KeyboardIntent::ArrowDown),
                KeyCode::ArrowRight => Some(KeyboardIntent::ArrowRight),
                KeyCode::ArrowUp => Some(KeyboardIntent::ArrowUp),
                KeyCode::PageDown => Some(KeyboardIntent::PageDown),
                KeyCode::PageUp => Some(KeyboardIntent::PageUp),
                KeyCode::Home => Some(KeyboardIntent::Home),
                KeyCode::End => Some(KeyboardIntent::End),
                _ => None,
            };
            if let Some(intent) = intent {
                self.apply(cx, SurfaceEvent::Key(intent));
            }
        }
    }
}

#[derive(Script, ScriptHook, Widget)]
pub struct TesseraSelect {
    #[deref]
    view: View,
    #[rust]
    controller: Option<InputSurface>,
}

impl TesseraSelect {
    pub fn reset(&mut self, cx: &mut Cx) {
        self.controller = Some(InputSurface::new(InputSurfaceId::Select));
        self.view
            .drop_down2(cx, ids!(select_control))
            .set_selected_item(cx, 0);
        reset_status(cx, &self.view, ids!(select_status), ComponentId::Select);
    }

    fn apply(&mut self, cx: &mut Cx, event: SurfaceEvent) {
        let widget_uid = self.widget_uid();
        if let Some(controller) = self.controller.as_mut() {
            apply_controller_event(
                cx,
                &self.view,
                widget_uid,
                controller,
                ComponentId::Select,
                ids!(select_status),
                event,
            );
        }
    }
}

impl Widget for TesseraSelect {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        self.view.draw_walk(cx, scope, walk)
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let actions = cx.capture_actions(|cx| self.view.handle_event(cx, event, scope));
        if let Some(index) = self
            .view
            .drop_down2(cx, ids!(select_control))
            .changed(&actions)
        {
            let choice = ["standard", "advanced", "locked"]
                .get(index)
                .unwrap_or(&"standard");
            self.apply(cx, SurfaceEvent::Select((*choice).to_owned()));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tessera_core::catalog::ComponentId;

    #[test]
    fn boolean_controls_project_controller_state_and_reset() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let ui = cx.with_vm(|vm| {
            crate::makepad_widgets::script_mod(vm);
            super::script_mod(vm);
            let value = script_eval!(vm, {
                use mod.prelude.widgets.*
                use mod.widgets.*
                View{
                    check := TesseraCheckbox{}
                    toggle := TesseraSwitch{}
                }
            });
            WidgetRef::script_from_value(vm, value)
        });
        let check = ui.child_by_path(ids!(check));
        let mut check = check.borrow_mut::<TesseraCheckbox>().unwrap();
        check.reset(&mut cx);
        check.apply(&mut cx, SurfaceEvent::Toggle);
        assert!(
            check
                .view
                .check_box(&cx, ids!(checkbox_control))
                .active(&cx)
        );
        check.apply(&mut cx, SurfaceEvent::Toggle);
        assert!(
            !check
                .view
                .check_box(&cx, ids!(checkbox_control))
                .active(&cx)
        );
        check.apply(&mut cx, SurfaceEvent::Toggle);
        check.reset(&mut cx);
        assert!(
            !check
                .view
                .check_box(&cx, ids!(checkbox_control))
                .active(&cx)
        );

        let toggle = ui.child_by_path(ids!(toggle));
        let mut toggle = toggle.borrow_mut::<TesseraSwitch>().unwrap();
        toggle.reset(&mut cx);
        toggle.apply(&mut cx, SurfaceEvent::Toggle);
        assert!(toggle.view.check_box(&cx, ids!(switch_control)).active(&cx));
        toggle.apply(&mut cx, SurfaceEvent::FinishForm { accepted: false });
        assert!(!toggle.view.check_box(&cx, ids!(switch_control)).active(&cx));
        toggle.apply(&mut cx, SurfaceEvent::Toggle);
        toggle.reset(&mut cx);
        assert!(!toggle.view.check_box(&cx, ids!(switch_control)).active(&cx));
    }

    #[test]
    fn number_and_slider_draw_values_follow_the_controller() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        let ui = cx.with_vm(|vm| {
            crate::makepad_widgets::script_mod(vm);
            super::script_mod(vm);
            let value = script_eval!(vm, {
                use mod.prelude.widgets.*
                use mod.widgets.*
                View{
                    number := TesseraInputNumber{}
                    slider := TesseraSlider{}
                }
            });
            WidgetRef::script_from_value(vm, value)
        });
        let number = ui.child_by_path(ids!(number));
        let mut number = number.borrow_mut::<TesseraInputNumber>().unwrap();
        number.reset(&mut cx);
        number.apply(&mut cx, SurfaceEvent::StepNumber(1));
        assert_eq!(
            number
                .view
                .text_input(&cx, ids!(input_number_control))
                .text(),
            "43"
        );
        number.apply(&mut cx, SurfaceEvent::TextChanged("77.5".into()));
        number.apply(&mut cx, SurfaceEvent::StepNumber(1));
        assert_eq!(
            number
                .view
                .text_input(&cx, ids!(input_number_control))
                .text(),
            "78.5"
        );
        number.apply(&mut cx, SurfaceEvent::TextChanged("--2".into()));
        number.apply(&mut cx, SurfaceEvent::StepNumber(1));
        assert_eq!(
            number
                .view
                .text_input(&cx, ids!(input_number_control))
                .text(),
            "--2"
        );
        number.apply(&mut cx, SurfaceEvent::Cancel);
        assert_eq!(
            number
                .view
                .text_input(&cx, ids!(input_number_control))
                .text(),
            "78.5"
        );
        number.reset(&mut cx);
        assert_eq!(
            number
                .view
                .text_input(&cx, ids!(input_number_control))
                .text(),
            "42"
        );

        let slider = ui.child_by_path(ids!(slider));
        let mut slider = slider.borrow_mut::<TesseraSlider>().unwrap();
        slider.reset(&mut cx);
        for _ in 0..3 {
            slider.apply(&mut cx, SurfaceEvent::Key(KeyboardIntent::ArrowRight));
        }
        assert_eq!(
            slider.view.slider(&cx, ids!(slider_control)).value(),
            Some(51.0)
        );
        slider.apply(&mut cx, SurfaceEvent::Key(KeyboardIntent::End));
        slider.apply(&mut cx, SurfaceEvent::Key(KeyboardIntent::ArrowRight));
        assert_eq!(
            slider.view.slider(&cx, ids!(slider_control)).value(),
            Some(100.0)
        );
        slider.reset(&mut cx);
        assert_eq!(
            slider.view.slider(&cx, ids!(slider_control)).value(),
            Some(48.0)
        );
    }

    #[test]
    fn foundational_inputs_have_exact_widget_names() {
        let expected = [
            (ComponentId::Input, "TesseraInput"),
            (ComponentId::Textarea, "TesseraTextarea"),
            (ComponentId::InputNumber, "TesseraInputNumber"),
            (ComponentId::Checkbox, "TesseraCheckbox"),
            (ComponentId::Radio, "TesseraRadio"),
            (ComponentId::Switch, "TesseraSwitch"),
            (ComponentId::Slider, "TesseraSlider"),
            (ComponentId::Select, "TesseraSelect"),
        ];
        assert_eq!(InputWidgetCatalog::RUNTIME_COMPONENTS.len(), expected.len());
        for (component, name) in expected {
            assert_eq!(InputWidgetCatalog::widget_name(component), Some(name));
        }
    }
}
