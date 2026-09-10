//! Opt-in focus diagnostics in Makepad's bounded remote log; no UI-thread file I/O.
use crate::makepad_widgets::makepad_micro_serde::*;
use crate::makepad_widgets::*;

#[derive(Default)]
struct FocusTrace {
    sequence: u64,
}

#[derive(SerJson, DeJson)]
struct FocusRecord {
    sequence: u64,
    redraw: u64,
    stage: String,
    focus: String,
    focus_valid: bool,
    focus_rect: Option<[f64; 4]>,
    target: Option<String>,
    target_valid: bool,
    target_is_focus: bool,
    target_rect: Option<[f64; 4]>,
    detail: String,
}

pub fn enable(cx: &mut Cx) {
    cx.set_global(FocusTrace::default());
}

pub fn enabled(cx: &mut Cx) -> bool {
    cx.has_global::<FocusTrace>()
}

fn rect(cx: &Cx, area: Area) -> Option<[f64; 4]> {
    if !area.is_valid(cx) {
        return None;
    }
    let rect = area.clipped_rect(cx);
    let values = [rect.pos.x, rect.pos.y, rect.size.x, rect.size.y];
    values
        .iter()
        .all(|value| value.is_finite())
        .then_some(values)
}

/// Callers supply structural state only, never field text, clipboard or user data.
pub fn record(
    cx: &mut Cx,
    stage: &'static str,
    target: Option<Area>,
    detail: impl FnOnce() -> String,
) {
    if !enabled(cx) {
        return;
    }
    let trace = cx.global::<FocusTrace>();
    let Some(sequence) = trace.sequence.checked_add(1) else {
        return;
    };
    trace.sequence = sequence;
    let focus = cx.key_focus();
    let entry = FocusRecord {
        sequence,
        redraw: cx.redraw_id(),
        stage: stage.into(),
        focus: format!("{focus:?}"),
        focus_valid: focus.is_valid(cx),
        focus_rect: rect(cx, focus),
        target: target.map(|area| format!("{area:?}")),
        target_valid: target.is_some_and(|area| area.is_valid(cx)),
        target_is_focus: target.is_some_and(|area| area == focus),
        target_rect: target.and_then(|area| rect(cx, area)),
        detail: detail(),
    };
    makepad_platform::remote::push_log_line(format!("[tessera-focus] {}", entry.serialize_json()));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn disabled_trace_does_not_allocate_state_or_evaluate_payload() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        record(&mut cx, "test", None, || {
            panic!("disabled trace evaluated payload")
        });
        assert!(!enabled(&mut cx));
    }

    #[test]
    fn enabled_trace_is_observational_and_sequence_does_not_wrap() {
        let mut cx = Cx::new(Box::new(|_, _| {}));
        enable(&mut cx);
        let focus = cx.key_focus();
        record(&mut cx, "test", Some(Area::Empty), String::new);
        assert_eq!(cx.key_focus(), focus);
        assert_eq!(cx.global::<FocusTrace>().sequence, 1);
        cx.global::<FocusTrace>().sequence = u64::MAX;
        record(&mut cx, "test", None, || {
            panic!("exhausted trace evaluated payload")
        });
        assert_eq!(cx.global::<FocusTrace>().sequence, u64::MAX);
    }

    #[test]
    fn record_uses_json_escaping_and_preserves_structural_fields() {
        let entry = FocusRecord {
            sequence: 1,
            redraw: 2,
            stage: "paint".into(),
            focus: "Empty".into(),
            focus_valid: false,
            focus_rect: None,
            target: None,
            target_valid: false,
            target_is_focus: false,
            target_rect: None,
            detail: "quoted \"state\"\nnext".into(),
        };
        let parsed = FocusRecord::deserialize_json(&entry.serialize_json()).unwrap();
        assert_eq!(parsed.detail, entry.detail);
        assert_eq!(parsed.sequence, 1);
        assert_eq!(parsed.redraw, 2);
        assert!(parsed.target_rect.is_none());
    }
}
