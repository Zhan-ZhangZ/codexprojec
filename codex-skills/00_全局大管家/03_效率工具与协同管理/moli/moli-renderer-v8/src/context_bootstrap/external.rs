//! HTML's legacy External object. Both operations are specified to do nothing.

use anyhow::Result;
use moli_webapi_declare::{WebApiFunctionTemplate, WebApiObject};

use crate::web_api_interfaces;

#[derive(WebApiObject)]
#[webapi(interface = web_api_interfaces::External)]
struct ExternalObjectDeclaration<'s> {
    #[webapi(prototype)]
    prototype: v8::Local<'s, v8::Object>,
}

#[derive(WebApiFunctionTemplate)]
#[webapi(interface = web_api_interfaces::External, enumerable, receiver)]
struct ExternalPrototypeDeclaration {
    #[webapi(method = "AddSearchProvider", length = 0, callback = external_noop)]
    add_search_provider: (),
    #[webapi(method = "IsSearchProviderInstalled", length = 0, callback = external_noop)]
    is_search_provider_installed: (),
}

pub(super) fn install_external_template_bindings<'s>(
    scope: &mut v8::PinScope<'s, '_, ()>,
    template: v8::Local<'s, v8::FunctionTemplate>,
    name: &str,
) {
    if name == "External" {
        ExternalPrototypeDeclaration::initialize_prototype_template(
            scope,
            template.prototype_template(scope),
        );
    }
}

pub(super) fn build_external_object<'s>(
    scope: &mut v8::PinScope<'s, '_>,
) -> Result<v8::Local<'s, v8::Object>> {
    let prototype = super::ensure_intrinsic_interface_prototype(scope, "External")?;
    Ok(ExternalObjectDeclaration::new(prototype).bind(scope)?)
}

fn external_noop<'s>(
    _scope: &mut v8::PinScope<'s, '_>,
    _args: v8::FunctionCallbackArguments<'s>,
    _rv: v8::ReturnValue<'s, v8::Value>,
) {
}
