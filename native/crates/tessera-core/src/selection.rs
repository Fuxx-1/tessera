//! Stable-ID selection state. Ordering comes from the host's visible sequence,
//! never from transient row indices.

use std::collections::BTreeSet;

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct SingleSelection<Id> {
    selected: Option<Id>,
}

impl<Id> SingleSelection<Id> {
    #[must_use]
    pub const fn selected(&self) -> Option<&Id> {
        self.selected.as_ref()
    }

    #[must_use]
    pub const fn is_empty(&self) -> bool {
        self.selected.is_none()
    }

    pub fn select(&mut self, id: Id) {
        self.selected = Some(id);
    }

    pub fn clear(&mut self) {
        self.selected = None;
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct MultiSelection<Id: Ord> {
    selected: BTreeSet<Id>,
}

impl<Id: Ord> MultiSelection<Id> {
    #[must_use]
    pub const fn selected(&self) -> &BTreeSet<Id> {
        &self.selected
    }

    #[must_use]
    pub fn is_selected(&self, id: &Id) -> bool {
        self.selected.contains(id)
    }

    pub fn select(&mut self, id: Id) -> bool {
        self.selected.insert(id)
    }

    pub fn deselect(&mut self, id: &Id) -> bool {
        self.selected.remove(id)
    }

    pub fn toggle(&mut self, id: Id) -> bool {
        if self.selected.remove(&id) {
            false
        } else {
            self.selected.insert(id);
            true
        }
    }

    pub fn clear(&mut self) {
        self.selected.clear();
    }

    /// Prunes only IDs the authoritative data owner says no longer exist.
    pub fn retain_known(&mut self, known: &BTreeSet<Id>) {
        self.selected.retain(|id| known.contains(id));
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RangeMode {
    Replace,
    Extend,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RangeSelectionError<Id> {
    DuplicateId(Id),
    MissingAnchor(Id),
    MissingTarget(Id),
}

/// Multi-selection with a stable-ID anchor for Shift/range selection.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct RangeSelection<Id: Ord> {
    selected: BTreeSet<Id>,
    anchor: Option<Id>,
}

impl<Id: Ord + Clone> RangeSelection<Id> {
    #[must_use]
    pub const fn selected(&self) -> &BTreeSet<Id> {
        &self.selected
    }

    #[must_use]
    pub const fn anchor(&self) -> Option<&Id> {
        self.anchor.as_ref()
    }

    pub fn select(&mut self, id: Id) {
        self.selected.clear();
        self.selected.insert(id.clone());
        self.anchor = Some(id);
    }

    pub fn toggle(&mut self, id: Id) -> bool {
        self.anchor = Some(id.clone());
        if self.selected.remove(&id) {
            false
        } else {
            self.selected.insert(id);
            true
        }
    }

    pub fn clear(&mut self) {
        self.selected.clear();
        self.anchor = None;
    }

    /// Selects the host-defined inclusive range between anchor and target.
    ///
    /// The sequence must use unique stable IDs. Filtering does not change this
    /// state; callers only prune it after an authoritative deletion.
    pub fn select_range(
        &mut self,
        ordered_ids: &[Id],
        target: Id,
        mode: RangeMode,
    ) -> Result<(), RangeSelectionError<Id>> {
        let mut seen = BTreeSet::new();
        for id in ordered_ids {
            if !seen.insert(id.clone()) {
                return Err(RangeSelectionError::DuplicateId(id.clone()));
            }
        }

        let anchor = self.anchor.clone().unwrap_or_else(|| target.clone());
        let anchor_index = ordered_ids
            .iter()
            .position(|id| id == &anchor)
            .ok_or_else(|| RangeSelectionError::MissingAnchor(anchor.clone()))?;
        let target_index = ordered_ids
            .iter()
            .position(|id| id == &target)
            .ok_or_else(|| RangeSelectionError::MissingTarget(target.clone()))?;
        let (start, end) = if anchor_index <= target_index {
            (anchor_index, target_index)
        } else {
            (target_index, anchor_index)
        };

        if mode == RangeMode::Replace {
            self.selected.clear();
        }
        self.selected
            .extend(ordered_ids[start..=end].iter().cloned());
        self.anchor = Some(anchor);
        Ok(())
    }

    pub fn retain_known(&mut self, known: &BTreeSet<Id>) {
        self.selected.retain(|id| known.contains(id));
        if self.anchor.as_ref().is_some_and(|id| !known.contains(id)) {
            self.anchor = None;
        }
    }
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeSet;

    use super::{MultiSelection, RangeMode, RangeSelection, RangeSelectionError, SingleSelection};

    #[test]
    fn single_selection_owns_one_stable_id() {
        let mut selection = SingleSelection::default();
        selection.select(String::from("row-42"));

        assert_eq!(selection.selected().map(String::as_str), Some("row-42"));
        selection.clear();
        assert!(selection.is_empty());
    }

    #[test]
    fn multi_selection_only_prunes_authoritatively_deleted_ids() {
        let mut selection = MultiSelection::default();
        selection.select(10);
        selection.select(20);
        selection.retain_known(&BTreeSet::from([20, 30]));

        assert_eq!(selection.selected(), &BTreeSet::from([20]));
    }

    #[test]
    fn range_selection_uses_visible_stable_id_order_not_numeric_order() {
        let mut selection = RangeSelection::default();
        selection.select(String::from("item-b"));
        selection
            .select_range(
                &[
                    String::from("item-c"),
                    String::from("item-b"),
                    String::from("item-a"),
                ],
                String::from("item-a"),
                RangeMode::Replace,
            )
            .expect("stable visible range");

        assert_eq!(
            selection.selected(),
            &BTreeSet::from([String::from("item-a"), String::from("item-b")])
        );
        assert_eq!(selection.anchor().map(String::as_str), Some("item-b"));
    }

    #[test]
    fn duplicate_ids_make_a_range_ambiguous_and_are_rejected() {
        let mut selection = RangeSelection::default();
        selection.select(1);

        assert_eq!(
            selection.select_range(&[1, 1], 1, RangeMode::Replace),
            Err(RangeSelectionError::DuplicateId(1))
        );
    }
}
