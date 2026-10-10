/// Runs a host-owned JavaScript entry while recording V8 microtask nesting.
///
/// Explicit-policy embedders remain responsible for checkpoints. Scoped-policy
/// embedders checkpoint when the outermost scope exits. Auto policy already
/// applies V8's per-API-call behavior, so adding a scope would change timing.
pub fn with_microtasks_scope<'s, R>(
    scope: &mut v8::PinScope<'s, '_>,
    operation: impl FnOnce(&mut v8::PinScope<'s, '_>) -> R,
) -> R {
    if scope.get_microtasks_policy() == v8::MicrotasksPolicy::Auto {
        return operation(scope);
    }
    let microtasks = std::pin::pin!(v8::MicrotasksScope::new(
        scope,
        v8::MicrotasksScopeType::RunMicrotasks,
    ));
    operation(microtasks.init())
}

#[cfg(test)]
mod tests {
    use super::with_microtasks_scope;
    use moli_v8_test_util::ensure_v8;

    #[test]
    fn explicit_policy_tracks_nested_scope_depth_without_checkpointing() {
        ensure_v8();
        let mut isolate = v8::Isolate::new(v8::CreateParams::default());
        isolate.set_microtasks_policy(v8::MicrotasksPolicy::Explicit);
        let scope = std::pin::pin!(v8::HandleScope::new(&mut isolate));
        let scope = &mut scope.init();
        let context = v8::Context::new(scope, Default::default());
        let scope = &mut v8::ContextScope::new(scope, context);
        let queue = context
            .get_microtask_queue()
            .expect("context microtask queue");

        assert_eq!(queue.get_microtasks_scope_depth(), 0);
        with_microtasks_scope(scope, |scope| {
            assert_eq!(
                scope
                    .get_current_context()
                    .get_microtask_queue()
                    .expect("active microtask queue")
                    .get_microtasks_scope_depth(),
                1
            );
            with_microtasks_scope(scope, |scope| {
                assert_eq!(
                    scope
                        .get_current_context()
                        .get_microtask_queue()
                        .expect("nested microtask queue")
                        .get_microtasks_scope_depth(),
                    2
                );
            });
        });
        assert_eq!(queue.get_microtasks_scope_depth(), 0);
    }

    #[test]
    fn auto_policy_preserves_v8_api_behavior_without_a_scope() {
        ensure_v8();
        let mut isolate = v8::Isolate::new(v8::CreateParams::default());
        assert_eq!(isolate.get_microtasks_policy(), v8::MicrotasksPolicy::Auto);
        let scope = std::pin::pin!(v8::HandleScope::new(&mut isolate));
        let scope = &mut scope.init();
        let context = v8::Context::new(scope, Default::default());
        let scope = &mut v8::ContextScope::new(scope, context);

        with_microtasks_scope(scope, |scope| {
            assert_eq!(
                scope
                    .get_current_context()
                    .get_microtask_queue()
                    .expect("auto-policy microtask queue")
                    .get_microtasks_scope_depth(),
                0
            );
        });
    }
}
