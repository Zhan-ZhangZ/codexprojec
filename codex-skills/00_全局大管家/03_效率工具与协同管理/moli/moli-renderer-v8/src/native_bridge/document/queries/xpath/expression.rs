use std::{cell::RefCell, collections::HashMap, rc::Rc};

use moli_webapi_declare::WebApiObject;
use moli_xpath::Expression;

use crate::{
    util::{get_private_value, set_private_value},
    web_api_interfaces,
};

const EXPRESSION_ID_SLOT: &str = "__moliXPathExpressionId";
type Store = Rc<RefCell<Expressions>>;

#[derive(Default)]
struct Expressions {
    next_id: u64,
    entries: HashMap<u64, (v8::Weak<v8::Object>, Rc<Expression>)>,
}

#[derive(WebApiObject)]
#[webapi(interface = web_api_interfaces::XPathExpression)]
struct XPathExpressionDeclaration {}

pub(super) fn new_xpath_expression<'s>(
    scope: &mut v8::PinScope<'s, '_>,
    expression: Expression,
) -> Option<v8::Local<'s, v8::Object>> {
    let object = XPathExpressionDeclaration::new().bind(scope).ok()?;
    retain_expression(scope, object, expression);
    Some(object)
}

// Compiled expressions contain resolved names and Rust values only. Neither
// the resolver nor a native host/context pointer survives compilation. The
// wrapper's weak entry releases the AST on GC or isolate teardown.
fn retain_expression<'s>(
    scope: &mut v8::PinScope<'s, '_>,
    object: v8::Local<'s, v8::Object>,
    expression: Expression,
) {
    let store = if let Some(store) = scope.get_slot::<Store>() {
        store.clone()
    } else {
        let store = Store::default();
        scope.set_slot(store.clone());
        store
    };
    let id = {
        let mut store = store.borrow_mut();
        store.next_id = store
            .next_id
            .checked_add(1)
            .expect("XPath expression identity exhausted");
        store.next_id
    };
    set_private_value(
        scope,
        object,
        EXPRESSION_ID_SLOT,
        v8::BigInt::new_from_u64(scope, id).into(),
    );
    let weak_store = Rc::downgrade(&store);
    let weak = v8::Weak::with_finalizer(
        scope,
        object,
        Box::new(move |_| {
            if let Some(store) = weak_store.upgrade() {
                store.borrow_mut().entries.remove(&id);
            }
        }),
    );
    store
        .borrow_mut()
        .entries
        .insert(id, (weak, Rc::new(expression)));
}

pub(super) fn expression_for_receiver<'s>(
    scope: &mut v8::PinScope<'s, '_>,
    object: v8::Local<'s, v8::Object>,
) -> Option<Rc<Expression>> {
    let value = get_private_value(scope, object, EXPRESSION_ID_SLOT)?;
    let (id, lossless) = v8::Local::<v8::BigInt>::try_from(value).ok()?.u64_value();
    if !lossless {
        return None;
    }
    scope
        .get_slot::<Store>()?
        .borrow()
        .entries
        .get(&id)
        .map(|(_, expression)| expression.clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compiled_xpath_lifetime_follows_wrapper_gc_and_isolate_teardown() {
        moli_v8_test_util::ensure_v8();
        for collect in [true, false] {
            let weak_expression = {
                let mut isolate = v8::Isolate::new(Default::default());
                let (wrapper, weak_expression) = {
                    let scope = std::pin::pin!(v8::HandleScope::new(&mut isolate));
                    let scope = &mut scope.init();
                    let context = v8::Context::new(scope, Default::default());
                    let scope = &mut v8::ContextScope::new(scope, context);
                    let object = v8::Object::new(scope);
                    retain_expression(scope, object, Expression::ContextItem);
                    let expression = expression_for_receiver(scope, object).expect("stored AST");
                    (v8::Global::new(scope, object), Rc::downgrade(&expression))
                };
                isolate.low_memory_notification();
                assert!(
                    weak_expression.upgrade().is_some(),
                    "live wrapper retains AST"
                );
                drop(wrapper);
                if collect {
                    isolate.low_memory_notification();
                    assert!(weak_expression.upgrade().is_none(), "GC releases AST");
                    assert!(
                        isolate
                            .get_slot::<Store>()
                            .unwrap()
                            .borrow()
                            .entries
                            .is_empty()
                    );
                }
                weak_expression
            };
            assert!(
                weak_expression.upgrade().is_none(),
                "isolate teardown releases AST"
            );
        }
    }
}
