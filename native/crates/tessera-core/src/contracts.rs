//! Renderer-independent contracts for bounded asynchronous work.
//!
//! This module owns admission and lifecycle semantics only. It never starts,
//! cancels, or observes an external task. A renderer or platform adapter may
//! translate the typed actions into its own runtime, while the gate remains
//! the authority for generation ordering and result acceptance.

use crate::async_state::{Generation, GenerationExhausted};

/// An opaque identity for one issued asynchronous request.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct RequestToken {
    generation: Generation,
}

impl RequestToken {
    #[must_use]
    pub const fn generation(self) -> Generation {
        self.generation
    }

    #[must_use]
    pub const fn cancellation(self) -> CancellationToken {
        CancellationToken {
            generation: self.generation,
        }
    }
}

/// A typed cancellation capability bound to exactly one request generation.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct CancellationToken {
    generation: Generation,
}

impl CancellationToken {
    #[must_use]
    pub const fn generation(self) -> Generation {
        self.generation
    }
}

/// Typed lifecycle actions sent back to the core reducer.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RequestAction<T, E> {
    Cancel(CancellationToken),
    Complete {
        token: RequestToken,
        result: Result<T, E>,
    },
}

impl<T, E> RequestAction<T, E> {
    #[must_use]
    pub const fn cancel(token: CancellationToken) -> Self {
        Self::Cancel(token)
    }

    #[must_use]
    pub const fn complete(token: RequestToken, result: Result<T, E>) -> Self {
        Self::Complete { token, result }
    }
}

/// Explicit rejection reasons for lifecycle actions.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RequestError {
    StaleGeneration {
        expected: Generation,
        received: Generation,
    },
    Cancelled {
        generation: Generation,
    },
    AlreadyCancelled {
        generation: Generation,
    },
    AlreadySettled {
        generation: Generation,
    },
    NoActiveRequest {
        generation: Generation,
    },
}

/// Result of reducing one lifecycle action.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RequestOutcome<T, E> {
    Accepted(T),
    Failed(E),
    Cancelled,
    Rejected(RequestError),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum RequestLifecycle {
    Idle,
    Active,
    Cancelled,
    Settled,
}

/// The single lifecycle authority for one family of asynchronous requests.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GenerationGate {
    current: Generation,
    lifecycle: RequestLifecycle,
}

impl GenerationGate {
    #[must_use]
    pub const fn new() -> Self {
        Self {
            current: Generation::initial(),
            lifecycle: RequestLifecycle::Idle,
        }
    }

    #[must_use]
    pub const fn current_generation(self) -> Generation {
        self.current
    }

    /// Issues the next generation. Generations never wrap and are never reused.
    pub fn begin(&mut self) -> Result<RequestToken, GenerationExhausted> {
        let generation = self.current.next().ok_or(GenerationExhausted)?;
        self.current = generation;
        self.lifecycle = RequestLifecycle::Active;
        Ok(RequestToken { generation })
    }

    /// Applies one typed action without executing any external work.
    pub fn reduce<T, E>(&mut self, action: RequestAction<T, E>) -> RequestOutcome<T, E> {
        match action {
            RequestAction::Cancel(token) => self.reduce_cancel(token),
            RequestAction::Complete { token, result } => self.reduce_complete(token, result),
        }
    }

    fn reduce_cancel<T, E>(&mut self, token: CancellationToken) -> RequestOutcome<T, E> {
        if let Some(error) = self.check_generation(token.generation) {
            return RequestOutcome::Rejected(error);
        }

        match self.lifecycle {
            RequestLifecycle::Active => {
                self.lifecycle = RequestLifecycle::Cancelled;
                RequestOutcome::Cancelled
            }
            RequestLifecycle::Cancelled => {
                RequestOutcome::Rejected(RequestError::AlreadyCancelled {
                    generation: self.current,
                })
            }
            RequestLifecycle::Settled => RequestOutcome::Rejected(RequestError::AlreadySettled {
                generation: self.current,
            }),
            RequestLifecycle::Idle => RequestOutcome::Rejected(RequestError::NoActiveRequest {
                generation: self.current,
            }),
        }
    }

    fn reduce_complete<T, E>(
        &mut self,
        token: RequestToken,
        result: Result<T, E>,
    ) -> RequestOutcome<T, E> {
        if let Some(error) = self.check_generation(token.generation) {
            return RequestOutcome::Rejected(error);
        }

        match self.lifecycle {
            RequestLifecycle::Active => {
                self.lifecycle = RequestLifecycle::Settled;
                match result {
                    Ok(value) => RequestOutcome::Accepted(value),
                    Err(error) => RequestOutcome::Failed(error),
                }
            }
            RequestLifecycle::Cancelled => RequestOutcome::Rejected(RequestError::Cancelled {
                generation: self.current,
            }),
            RequestLifecycle::Settled => RequestOutcome::Rejected(RequestError::AlreadySettled {
                generation: self.current,
            }),
            RequestLifecycle::Idle => RequestOutcome::Rejected(RequestError::NoActiveRequest {
                generation: self.current,
            }),
        }
    }

    fn check_generation(&self, received: Generation) -> Option<RequestError> {
        (received != self.current).then_some(RequestError::StaleGeneration {
            expected: self.current,
            received,
        })
    }
}

impl Default for GenerationGate {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::{GenerationGate, RequestAction, RequestError, RequestOutcome};

    #[test]
    fn generations_are_monotonic_and_old_results_are_stale() {
        let mut gate = GenerationGate::new();
        let first = gate.begin().expect("first request");
        let second = gate.begin().expect("second request");

        assert!(second.generation() > first.generation());
        assert_eq!(
            gate.reduce(RequestAction::complete(first, Ok::<_, &'static str>("old"))),
            RequestOutcome::Rejected(RequestError::StaleGeneration {
                expected: second.generation(),
                received: first.generation(),
            })
        );
        assert_eq!(
            gate.reduce(RequestAction::complete(
                second,
                Ok::<_, &'static str>("current")
            )),
            RequestOutcome::Accepted("current")
        );
    }

    #[test]
    fn cancellation_is_generation_bound_and_blocks_late_completion() {
        let mut gate = GenerationGate::new();
        let first = gate.begin().expect("first request");
        let second = gate.begin().expect("second request");

        assert_eq!(
            gate.reduce(RequestAction::<(), &'static str>::cancel(
                first.cancellation()
            )),
            RequestOutcome::Rejected(RequestError::StaleGeneration {
                expected: second.generation(),
                received: first.generation(),
            })
        );
        assert_eq!(
            gate.reduce(RequestAction::<(), &'static str>::cancel(
                second.cancellation()
            )),
            RequestOutcome::Cancelled
        );
        assert_eq!(
            gate.reduce(RequestAction::complete(
                second,
                Ok::<_, &'static str>("late")
            )),
            RequestOutcome::Rejected(RequestError::Cancelled {
                generation: second.generation(),
            })
        );
    }

    #[test]
    fn typed_failure_can_recover_on_a_new_generation() {
        let mut gate = GenerationGate::new();
        let failed = gate.begin().expect("failed request");

        assert_eq!(
            gate.reduce(RequestAction::complete(failed, Err::<(), _>("offline"))),
            RequestOutcome::Failed("offline")
        );

        let recovered = gate.begin().expect("retry request");
        assert_eq!(
            gate.reduce(RequestAction::complete(
                recovered,
                Ok::<_, &'static str>(())
            )),
            RequestOutcome::Accepted(())
        );
    }

    #[test]
    fn duplicate_cancel_and_completion_are_explicit_rejections() {
        let mut gate = GenerationGate::new();
        let cancelled = gate.begin().expect("cancelled request");
        assert_eq!(
            gate.reduce(RequestAction::<(), &'static str>::cancel(
                cancelled.cancellation(),
            )),
            RequestOutcome::Cancelled
        );
        assert_eq!(
            gate.reduce(RequestAction::<(), &'static str>::cancel(
                cancelled.cancellation(),
            )),
            RequestOutcome::Rejected(RequestError::AlreadyCancelled {
                generation: cancelled.generation(),
            })
        );

        let settled = gate.begin().expect("settled request");
        assert_eq!(
            gate.reduce(RequestAction::complete(settled, Ok::<_, &'static str>(1))),
            RequestOutcome::Accepted(1)
        );
        assert_eq!(
            gate.reduce(RequestAction::complete(settled, Ok::<_, &'static str>(2))),
            RequestOutcome::Rejected(RequestError::AlreadySettled {
                generation: settled.generation(),
            })
        );
    }
}
