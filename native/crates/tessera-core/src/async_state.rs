//! Pure, generation-checked async resource semantics.

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Default)]
pub struct Generation(u64);

impl Generation {
    #[must_use]
    pub const fn initial() -> Self {
        Self(0)
    }

    #[must_use]
    pub const fn value(self) -> u64 {
        self.0
    }

    #[must_use]
    pub const fn next(self) -> Option<Self> {
        match self.0.checked_add(1) {
            Some(value) => Some(Self(value)),
            None => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GenerationExhausted;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AsyncState<T, E> {
    Loading,
    Refreshing { previous: T },
    Ready(T),
    Empty,
    Failed(E),
}

impl<T, E> AsyncState<T, E> {
    #[must_use]
    pub const fn is_loading(&self) -> bool {
        matches!(self, Self::Loading | Self::Refreshing { .. })
    }

    #[must_use]
    pub const fn is_terminal(&self) -> bool {
        !self.is_loading()
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AsyncCompletion<T, E> {
    Ready(T),
    Empty,
    Failed(E),
}

/// The sole owner of an async result and its latest issued generation.
///
/// Starting a request advances the generation. A completion only mutates the
/// state when it carries that current generation, so cancellation remains an
/// optimization rather than a correctness condition.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AsyncResource<T, E> {
    generation: Generation,
    state: AsyncState<T, E>,
}

impl<T, E> Default for AsyncResource<T, E> {
    fn default() -> Self {
        Self::empty()
    }
}

impl<T, E> AsyncResource<T, E> {
    #[must_use]
    pub const fn empty() -> Self {
        Self {
            generation: Generation::initial(),
            state: AsyncState::Empty,
        }
    }

    #[must_use]
    pub const fn generation(&self) -> Generation {
        self.generation
    }

    #[must_use]
    pub const fn state(&self) -> &AsyncState<T, E> {
        &self.state
    }

    /// Issues the next request and returns the generation it must carry.
    pub fn begin(&mut self) -> Result<Generation, GenerationExhausted> {
        let generation = self.generation.next().ok_or(GenerationExhausted)?;
        self.generation = generation;
        self.state = match std::mem::replace(&mut self.state, AsyncState::Loading) {
            AsyncState::Ready(previous) | AsyncState::Refreshing { previous } => {
                AsyncState::Refreshing { previous }
            }
            AsyncState::Loading | AsyncState::Empty | AsyncState::Failed(_) => AsyncState::Loading,
        };
        Ok(generation)
    }

    /// Applies a result only when it belongs to the most recently issued work.
    pub fn complete(&mut self, generation: Generation, completion: AsyncCompletion<T, E>) -> bool {
        if generation != self.generation {
            return false;
        }

        self.state = match completion {
            AsyncCompletion::Ready(value) => AsyncState::Ready(value),
            AsyncCompletion::Empty => AsyncState::Empty,
            AsyncCompletion::Failed(error) => AsyncState::Failed(error),
        };
        true
    }
}

#[cfg(test)]
mod tests {
    use super::{AsyncCompletion, AsyncResource, AsyncState, Generation};

    #[test]
    fn stale_completion_cannot_replace_newer_request_state() {
        let mut resource = AsyncResource::<String, String>::empty();
        let first = resource.begin().expect("first generation");
        let second = resource.begin().expect("second generation");

        assert!(!resource.complete(first, AsyncCompletion::Ready(String::from("stale"))));
        assert_eq!(resource.state(), &AsyncState::Loading);
        assert!(resource.complete(second, AsyncCompletion::Ready(String::from("current"))));
        assert_eq!(
            resource.state(),
            &AsyncState::Ready(String::from("current"))
        );
    }

    #[test]
    fn refresh_preserves_the_last_successful_value_until_completion() {
        let mut resource = AsyncResource::<u8, &'static str>::empty();
        let initial = resource.begin().expect("initial generation");
        assert!(resource.complete(initial, AsyncCompletion::Ready(7)));

        let refresh = resource.begin().expect("refresh generation");
        assert_eq!(resource.state(), &AsyncState::Refreshing { previous: 7 });
        assert!(resource.complete(refresh, AsyncCompletion::Failed("offline")));
        assert_eq!(resource.state(), &AsyncState::Failed("offline"));
    }

    #[test]
    fn generation_never_wraps_to_reuse_an_old_value() {
        assert_eq!(Generation(u64::MAX).next(), None);
    }
}
