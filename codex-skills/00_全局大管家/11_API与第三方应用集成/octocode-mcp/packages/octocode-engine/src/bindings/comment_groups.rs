pub fn parse_comment_groups(val: &Option<serde_json::Value>) -> Vec<String> {
    match val {
        None => Vec::new(),
        Some(serde_json::Value::String(s)) => vec![s.clone()],
        Some(serde_json::Value::Array(arr)) => arr
            .iter()
            .filter_map(|v| v.as_str().map(|s| s.to_owned()))
            .collect(),
        _ => Vec::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn parses_all_union_shapes() {
        assert!(parse_comment_groups(&None).is_empty());
        assert_eq!(parse_comment_groups(&Some(json!("hash"))), vec!["hash"]);
        assert_eq!(
            parse_comment_groups(&Some(json!(["a", "b"]))),
            vec!["a", "b"]
        );
        assert!(parse_comment_groups(&Some(json!(7))).is_empty());
    }
}
