use serde::Deserialize;

use crate::{BrowserBrandVersion, BrowserUserAgentMetadataOverride};

/// The independent identity inputs accepted by CDP on both Pages and Workers.
/// Keep absent and empty values distinct: even an empty optional input can
/// activate an Inspector Emulation agent without contributing an override.
#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UserAgentOverride {
    pub user_agent: String,
    pub accept_language: Option<String>,
    pub platform: Option<String>,
    pub user_agent_metadata: Option<BrowserUserAgentMetadataOverride>,
}

impl UserAgentOverride {
    pub fn activates_agent(&self) -> bool {
        !self.user_agent.is_empty() || self.accept_language.is_some() || self.platform.is_some()
    }

    pub fn validate(&self) -> Result<(), &'static str> {
        let header_value =
            |value: &str| !value.bytes().any(|byte| matches!(byte, 0 | b'\r' | b'\n'));
        if !header_value(&self.user_agent) {
            return Err("Invalid characters found in userAgent");
        }
        if self
            .accept_language
            .as_deref()
            .is_some_and(|value| !header_value(value))
        {
            return Err("Invalid characters found in acceptLanguage");
        }
        if let Some(metadata) = &self.user_agent_metadata {
            if self.user_agent.is_empty() {
                return Err("Empty userAgent invalid with userAgentMetadata provided");
            }
            validate_brands(metadata.brands.as_deref())?;
            validate_brands(metadata.full_version_list.as_deref())?;
            for (value, error) in [
                (
                    metadata.full_version.as_deref(),
                    "Invalid full version string",
                ),
                (Some(metadata.platform.as_str()), "Invalid platform string"),
                (
                    Some(metadata.platform_version.as_str()),
                    "Invalid platform version string",
                ),
                (
                    Some(metadata.architecture.as_str()),
                    "Invalid architecture string",
                ),
                (Some(metadata.model.as_str()), "Invalid model string"),
                (metadata.bitness.as_deref(), "Invalid bitness string"),
            ] {
                validate_field(value, error)?;
            }
            for value in metadata.form_factors.iter().flatten() {
                validate_field(Some(value), "Invalid form factor string")?;
            }
        }
        Ok(())
    }
}

fn validate_field(value: Option<&str>, error: &'static str) -> Result<(), &'static str> {
    if value.is_some_and(|value| !value.bytes().all(|byte| (0x20..=0x7e).contains(&byte))) {
        Err(error)
    } else {
        Ok(())
    }
}

fn validate_brands(brands: Option<&[BrowserBrandVersion]>) -> Result<(), &'static str> {
    for brand in brands.into_iter().flatten() {
        validate_field(Some(&brand.brand), "Invalid brand string")?;
        validate_field(Some(&brand.version), "Invalid brand version string")?;
    }
    Ok(())
}
