use crate::{
    document_runtime::DomHandle,
    dom::native::{DomHost, DomMutationEffects},
};

pub(crate) fn form_owner_mutation_effects_touch_html_form(
    dom_host: &DomHost,
    effects: &DomMutationEffects,
) -> bool {
    effects
        .tree()
        .connected_roots()
        .iter()
        .chain(effects.tree().disconnected_roots())
        .copied()
        .any(|root| subtree_contains_html_form(dom_host, root))
        || effects
            .style()
            .child_list_mutations()
            .iter()
            .any(|mutation| {
                mutation
                    .added_nodes()
                    .iter()
                    .chain(mutation.removed_nodes())
                    .copied()
                    .any(|root| subtree_contains_html_form(dom_host, root))
            })
}

fn subtree_contains_html_form(dom_host: &DomHost, root: DomHandle) -> bool {
    let mut stack = vec![root];
    while let Some(handle) = stack.pop() {
        if dom_host.is_html_element_named(handle, "form") {
            return true;
        }
        let mut child = dom_host.first_child(handle);
        while let Some(current) = child {
            stack.push(current);
            child = dom_host.next_sibling(current);
        }
        if let Some(shadow_root) = dom_host.shadow_root_handle(handle) {
            stack.push(shadow_root);
        }
    }
    false
}
