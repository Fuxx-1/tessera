//! Renderer-independent form validation semantics.

use std::fmt;

use crate::async_state::{Generation, GenerationExhausted};

#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct FieldId(String);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct InvalidFieldId;

impl FieldId {
    pub fn new(value: impl Into<String>) -> Result<Self, InvalidFieldId> {
        let value = value.into();
        if value.trim().is_empty() {
            return Err(InvalidFieldId);
        }
        Ok(Self(value))
    }

    #[must_use]
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for FieldId {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.0)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ValidationCode {
    Required,
    TooShort { minimum: usize },
    TooLong { maximum: usize },
    Custom(String),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FieldError {
    pub field: FieldId,
    pub code: ValidationCode,
}

impl FieldError {
    #[must_use]
    pub const fn new(field: FieldId, code: ValidationCode) -> Self {
        Self { field, code }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FormState {
    Pristine,
    Checking,
    Valid,
    Invalid(Vec<FieldError>),
}

impl FormState {
    #[must_use]
    pub const fn can_submit(&self) -> bool {
        matches!(self, Self::Valid)
    }

    #[must_use]
    pub const fn is_checking(&self) -> bool {
        matches!(self, Self::Checking)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TextRule {
    Required,
    MinChars(usize),
    MaxChars(usize),
}

/// Validates a text value without I/O, locale, renderer, or form-value state.
#[must_use]
pub fn validate_text(field: &FieldId, value: &str, rules: &[TextRule]) -> Vec<FieldError> {
    let length = value.chars().count();
    let mut errors = Vec::new();

    for rule in rules {
        let code = match rule {
            TextRule::Required if value.is_empty() => Some(ValidationCode::Required),
            TextRule::MinChars(minimum) if length < *minimum => {
                Some(ValidationCode::TooShort { minimum: *minimum })
            }
            TextRule::MaxChars(maximum) if length > *maximum => {
                Some(ValidationCode::TooLong { maximum: *maximum })
            }
            TextRule::Required | TextRule::MinChars(_) | TextRule::MaxChars(_) => None,
        };
        if let Some(code) = code {
            errors.push(FieldError::new(field.clone(), code));
        }
    }

    errors
}

/// Owns only validation status and generation, never a second copy of form values.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FormValidation {
    generation: Generation,
    state: FormState,
}

impl Default for FormValidation {
    fn default() -> Self {
        Self::new()
    }
}

impl FormValidation {
    #[must_use]
    pub const fn new() -> Self {
        Self {
            generation: Generation::initial(),
            state: FormState::Pristine,
        }
    }

    #[must_use]
    pub const fn generation(&self) -> Generation {
        self.generation
    }

    #[must_use]
    pub const fn state(&self) -> &FormState {
        &self.state
    }

    /// Marks a new validation run. The caller keeps the corresponding snapshot.
    pub fn begin(&mut self) -> Result<Generation, GenerationExhausted> {
        let generation = self.generation.next().ok_or(GenerationExhausted)?;
        self.generation = generation;
        self.state = FormState::Checking;
        Ok(generation)
    }

    /// Drops stale validation results and resolves the current request only.
    pub fn complete(&mut self, generation: Generation, errors: Vec<FieldError>) -> bool {
        if generation != self.generation {
            return false;
        }

        self.state = if errors.is_empty() {
            FormState::Valid
        } else {
            FormState::Invalid(errors)
        };
        true
    }

    /// A user edit invalidates prior validation without retaining a value copy.
    pub fn mark_dirty(&mut self) -> Result<(), GenerationExhausted> {
        self.generation = self.generation.next().ok_or(GenerationExhausted)?;
        self.state = FormState::Pristine;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::{FieldId, FormState, FormValidation, TextRule, ValidationCode, validate_text};

    #[test]
    fn text_rules_count_unicode_characters_not_utf8_bytes() {
        let field = FieldId::new("display-name").expect("valid field");
        let errors = validate_text(
            &field,
            "你好",
            &[TextRule::MinChars(3), TextRule::MaxChars(2)],
        );

        assert_eq!(errors.len(), 1);
        assert_eq!(errors[0].code, ValidationCode::TooShort { minimum: 3 });
    }

    #[test]
    fn form_validation_accepts_only_the_latest_generation() {
        let field = FieldId::new("email").expect("valid field");
        let mut validation = FormValidation::new();
        let first = validation.begin().expect("first generation");
        let second = validation.begin().expect("second generation");

        assert!(!validation.complete(first, validate_text(&field, "", &[TextRule::Required])));
        assert_eq!(validation.state(), &FormState::Checking);
        assert!(validation.complete(second, Vec::new()));
        assert_eq!(validation.state(), &FormState::Valid);
        assert!(validation.state().can_submit());
    }

    #[test]
    fn edits_clear_validation_status_without_duplicating_form_values() {
        let mut validation = FormValidation::new();
        let generation = validation.begin().expect("generation");
        assert!(validation.complete(generation, Vec::new()));

        validation.mark_dirty().expect("invalidate generation");
        assert_eq!(validation.state(), &FormState::Pristine);
        assert!(!validation.state().can_submit());
        assert!(!validation.complete(generation, Vec::new()));
        assert_eq!(validation.state(), &FormState::Pristine);
    }
}
