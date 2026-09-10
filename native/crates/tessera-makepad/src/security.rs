pub const MAX_MARKDOWN_BYTES: usize = 16 * 1024;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MarkdownReject {
    Oversize,
    Html,
    LiveOrScript,
    DangerousScheme,
}

impl MarkdownReject {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Oversize => "oversize",
            Self::Html => "html",
            Self::LiveOrScript => "live-or-script",
            Self::DangerousScheme => "dangerous-scheme",
        }
    }
}

pub fn validate_markdown(input: &str) -> Result<(), MarkdownReject> {
    if input.len() > MAX_MARKDOWN_BYTES {
        return Err(MarkdownReject::Oversize);
    }

    let normalized = input.to_ascii_lowercase();
    if normalized.contains('<') || normalized.contains('>') {
        return Err(MarkdownReject::Html);
    }
    if normalized.contains("live_design!")
        || normalized.contains("script_mod!")
        || normalized.contains("live {")
        || normalized.contains("script {")
    {
        return Err(MarkdownReject::LiveOrScript);
    }
    if ["javascript:", "data:", "vbscript:", "file:", "shell:"]
        .iter()
        .any(|scheme| normalized.contains(scheme))
    {
        return Err(MarkdownReject::DangerousScheme);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_bounded_plain_markdown_with_https_links() {
        assert_eq!(
            validate_markdown("[Makepad](https://github.com/makepad/makepad)"),
            Ok(())
        );
    }

    #[test]
    fn rejects_dangerous_schemes_case_insensitively() {
        assert_eq!(
            validate_markdown("[x](JaVaScRiPt:alert(1))"),
            Err(MarkdownReject::DangerousScheme)
        );
        assert_eq!(
            validate_markdown("data:text/html,unsafe"),
            Err(MarkdownReject::DangerousScheme)
        );
    }

    #[test]
    fn rejects_html_and_live_or_script_markers() {
        assert_eq!(validate_markdown("<img src=x>"), Err(MarkdownReject::Html));
        assert_eq!(
            validate_markdown("script_mod! { user_payload }"),
            Err(MarkdownReject::LiveOrScript)
        );
    }

    #[test]
    fn rejects_an_input_above_the_hard_byte_limit() {
        let oversize = "a".repeat(MAX_MARKDOWN_BYTES + 1);
        assert_eq!(validate_markdown(&oversize), Err(MarkdownReject::Oversize));
    }
}
