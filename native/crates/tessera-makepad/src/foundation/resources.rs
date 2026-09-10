use std::rc::Rc;

use crate::makepad_widgets::script::res::{
    CxScriptResource, CxScriptResourceData, CxScriptResources,
};

/// Seed trusted, compiled-in assets before their crate_resource handles are created.
/// Re-registration during a theme LiveEdit reuses the same bytes.
pub fn register_embedded_resource(
    resources: &CxScriptResources,
    absolute_path: &'static str,
    dependency_path: &'static str,
    load: impl FnOnce() -> Vec<u8>,
) {
    let mut entries = resources.resources.borrow_mut();
    if entries.iter().any(|entry| entry.abs_path == absolute_path) {
        return;
    }
    entries.push(CxScriptResource {
        abs_path: absolute_path.into(),
        dependency_path: Some(dependency_path.into()),
        web_url: None,
        data: CxScriptResourceData::Loaded(Rc::new(load())),
        handles: Vec::new(),
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embedded_resource_is_loaded_once_without_filesystem_access() {
        let resources = CxScriptResources::default();
        register_embedded_resource(&resources, "/abs/asset", "crate/asset", || vec![1, 2, 3]);
        register_embedded_resource(&resources, "/abs/asset", "crate/asset", || {
            panic!("LiveEdit must not decode the asset again")
        });
        let entries = resources.resources.borrow();
        assert_eq!(entries.len(), 1);
        let CxScriptResourceData::Loaded(bytes) = &entries[0].data else {
            panic!("embedded resource must not require lazy file I/O")
        };
        assert_eq!(bytes.as_slice(), &[1, 2, 3]);
        assert!(entries[0].handles.is_empty());
    }
}
