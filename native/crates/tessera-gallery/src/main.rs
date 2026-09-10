#![forbid(unsafe_code)]

mod makepad_entry {
    use tessera_gallery::app::App;
    use tessera_makepad::makepad_widgets::*;

    app_main!(App);
}

fn main() {
    use tessera_makepad::makepad_widgets::{resolve_studio_http, should_run_stdin_loop_from_env};

    if let Err(error) = validate_runtime_mode(
        std::env::args().any(|arg| arg == "--hot"),
        &resolve_studio_http(),
        should_run_stdin_loop_from_env(),
    ) {
        eprintln!("{error}");
        std::process::exit(2);
    }
    if let Err(error) =
        tessera_gallery::app::validate_component_selector_args(std::env::args().skip(1))
    {
        eprintln!("invalid component selector: {error}");
        std::process::exit(2);
    }

    makepad_entry::app_main();
}

fn validate_runtime_mode(
    hot_reload: bool,
    studio_endpoint: &str,
    stdin_loop: bool,
) -> Result<(), &'static str> {
    if hot_reload || !studio_endpoint.is_empty() || stdin_loop {
        return Err(
            "Tessera uses a frozen widget graph: LiveEdit, Studio, and stdin-loop are unsupported. Rebuild and restart after source changes.",
        );
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::validate_runtime_mode;

    #[test]
    fn frozen_runtime_rejects_each_live_dsl_ingress_before_startup() {
        assert!(validate_runtime_mode(true, "", false).is_err());
        assert!(validate_runtime_mode(false, "http://127.0.0.1:8001/app?build=1", false).is_err());
        assert!(validate_runtime_mode(false, "", true).is_err());
    }

    #[test]
    fn frozen_runtime_keeps_normal_and_remote_diagnostic_launches_available() {
        assert!(validate_runtime_mode(false, "", false).is_ok());
    }
}
