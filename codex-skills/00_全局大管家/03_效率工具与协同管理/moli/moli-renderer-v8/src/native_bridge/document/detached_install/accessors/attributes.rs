use super::super::super::{
    detached_attribute_name, detached_attributes_map, detached_map_get, detached_map_has,
    read_detached_native_attribute, read_detached_native_has_attribute,
};

pub(super) fn detached_element_attribute_value<'s>(
    scope: &mut v8::PinScope<'s, '_>,
    element: v8::Local<'s, v8::Object>,
    name: &str,
) -> Option<String> {
    let normalized = detached_attribute_name(scope, element, name);
    if let Some(has_attribute) = read_detached_native_has_attribute(scope, element, &normalized) {
        return if has_attribute {
            read_detached_native_attribute(scope, element, &normalized)
        } else {
            None
        };
    }
    let attributes = detached_attributes_map(scope, element)?;
    detached_map_get(scope, attributes, &normalized)
        .and_then(|value| value.to_string(scope))
        .map(|value| value.to_rust_string_lossy(scope))
}

pub(super) fn detached_element_has_attribute<'s>(
    scope: &mut v8::PinScope<'s, '_>,
    element: v8::Local<'s, v8::Object>,
    name: &str,
) -> bool {
    let normalized = detached_attribute_name(scope, element, name);
    if let Some(has_attribute) = read_detached_native_has_attribute(scope, element, &normalized) {
        return has_attribute;
    }
    detached_attributes_map(scope, element)
        .is_some_and(|attributes| detached_map_has(scope, attributes, &normalized))
}
