//! Event views for one Navigation dispatch. User callbacks never receive the
//! internal control object, so page expandos cannot cross into another world.

use super::{events, shared_event_targets, world_wrappers};

pub(super) fn event_in_realm<'s>(
    scope: &mut v8::PinScope<'s, '_>,
    target: v8::Local<'s, v8::Object>,
    event: v8::Local<'s, v8::Object>,
    context: v8::Local<'s, v8::Context>,
) -> Option<v8::Local<'s, v8::Object>> {
    if !shared_event_targets::is_shared_target(scope, target) {
        return Some(event);
    }
    let backing = events::event_backing(scope, event);
    let target = shared_event_targets::target_in_realm(scope, target, context);
    // A callback in another same-world Document still receives the owning
    // Window's wrapper. Its callback realm is entered separately by the invoker.
    let context = target.get_creation_context(scope).unwrap_or(context);
    if let Some(wrapper) = world_wrappers::get(scope, backing, context) {
        return Some(wrapper);
    }
    let scope = &mut v8::ContextScope::new(scope, context);
    events::new_event_wrapper(scope, backing)
}
