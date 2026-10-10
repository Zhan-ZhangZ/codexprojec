//! `api:request` events from the core, fed into the app's own analytics window
//! and API screen (PLAN.md §2 decision 15, stage 4d).
//!
//! When the core serves the Local API the app's proxy sees no traffic, so the
//! PostHog summary and the request inspector would go blank. The core reports
//! each request instead, and this module hands it to the same two consumers the
//! proxy feeds: `ApiRequestAggregator` (three-minute summary on
//! `analytics://api_server_session_summary`) and `RequestInspector` (the
//! `api-inspector://` channels).
//!
//! Privacy (ATO-113): the event can carry prompt and reply previews. It is
//! therefore never re-emitted to the webview verbatim — only the inspector's
//! own channels carry previews — and the core is told to collect them only while
//! the API screen is open.

use std::future::Future;
use std::sync::{Arc, OnceLock};
use std::time::Duration;

use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager, Runtime};

use crate::core::server::api_request_analytics::{
    observation_from_core, ApiRequestAggregator, API_REQUEST_SUMMARY_CHANNEL,
    API_REQUEST_SUMMARY_WINDOW_SECS,
};
use crate::core::state::AppState;

/// The core's event, as the relay names it.
pub const EVENT: &str = "atomic-core://api:request";

static AGGREGATOR: OnceLock<Arc<ApiRequestAggregator>> = OnceLock::new();

/// The window core observations accumulate in, with its summary timer started
/// on first use. One per app process, like the proxy's per-server aggregator but
/// independent of whether the app's server ever ran.
fn aggregator<R: Runtime>(app: &AppHandle<R>) -> Arc<ApiRequestAggregator> {
    Arc::clone(AGGREGATOR.get_or_init(|| {
        let aggregator = Arc::new(ApiRequestAggregator::new());
        let timer_aggregator = Arc::clone(&aggregator);
        let app = app.clone();
        tauri::async_runtime::spawn(async move {
            let mut interval =
                tokio::time::interval(Duration::from_secs(API_REQUEST_SUMMARY_WINDOW_SECS));
            interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
            interval.tick().await;
            loop {
                interval.tick().await;
                if let Some(summary) = timer_aggregator.drain() {
                    if let Err(e) = app.emit(API_REQUEST_SUMMARY_CHANNEL, summary) {
                        log::debug!("[atomic-core] could not emit the API request summary: {e}");
                    }
                }
            }
        });
        aggregator
    }))
}

/// Take one event. Returns `true` when it was an `api:request` event, which the
/// caller must then not forward to the webview.
pub fn ingest<R: Runtime>(app: &AppHandle<R>, name: &str, payload: &Value) -> bool {
    if name != EVENT {
        return false;
    }
    if payload.get("phase").and_then(Value::as_str) == Some("finished") {
        if let Some(observation) = payload.get("observation").and_then(observation_from_core) {
            aggregator(app).record(observation);
        }
    }
    if let Some(state) = app.try_state::<AppState>() {
        // The inspector delivers to the webview through an emitter that was only ever bound when
        // the app's own proxy started. With the core serving the Local API that start never
        // happens, and every live event was counted as dropped: the API screen showed a request
        // only after it was reopened. Bind it here, on the path that needs it. Idempotent.
        state.api_request_inspector.attach(app.clone());
        state.api_request_inspector.ingest_core_event(payload);
    }
    true
}

static PUSH_TURN: OnceLock<tokio::sync::Mutex<()>> = OnceLock::new();

/// One push at a time, with the flag read once it is this push's turn. Opening and closing the
/// screen in quick succession (StrictMode mounts it twice in dev) queues several pushes, and
/// unordered requests could leave the core on a stale `false` while the screen watches.
async fn push_in_turn<Fut>(
    turn: &tokio::sync::Mutex<()>,
    read: impl FnOnce() -> Option<bool>,
    send: impl FnOnce(bool) -> Fut,
) where
    Fut: Future<Output = ()>,
{
    let _turn = turn.lock().await;
    if let Some(enabled) = read() {
        send(enabled).await;
    }
}

/// Tell the core whether the API screen is watching. Fire and forget: a core
/// that did not hear it keeps sending no previews, which is the safe side.
pub fn push_inspecting<R: Runtime>(app: &AppHandle<R>) {
    if app.try_state::<AppState>().is_none() {
        return;
    }
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let turn = PUSH_TURN.get_or_init(Default::default);
        let app = &app;
        let read = || Some(app.try_state::<AppState>()?.api_request_inspector.enabled());
        push_in_turn(turn, read, |enabled| async move {
            let Some(client) = app.try_state::<super::commands::AtomicCoreClient>() else {
                return;
            };
            if !client.is_enabled() {
                return;
            }
            if let Err(error) = client
                .call("PUT", "/server/inspector", Some(json!({ "enabled": enabled })))
                .await
            {
                log::debug!("[atomic-core] could not tell the core about the API screen: {}", error.message);
            }
        })
        .await;
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_the_api_request_event_is_taken() {
        assert_eq!(EVENT, "atomic-core://api:request");
    }

    #[tokio::test]
    async fn the_core_ends_on_the_flag_the_screen_has_now() {
        use std::sync::atomic::{AtomicBool, Ordering};
        use std::sync::Mutex;

        let turn = Arc::new(tokio::sync::Mutex::new(()));
        let watching = Arc::new(AtomicBool::new(true));
        let sent = Arc::new(Mutex::new(Vec::new()));

        // The first push reads `true` and is slow to deliver; the screen closes meanwhile.
        let slow = tokio::spawn({
            let (turn, watching, sent) = (turn.clone(), watching.clone(), sent.clone());
            async move {
                push_in_turn(&turn, || Some(watching.load(Ordering::SeqCst)), |enabled| async move {
                    tokio::time::sleep(Duration::from_millis(50)).await;
                    sent.lock().unwrap().push(enabled);
                })
                .await;
            }
        });
        tokio::task::yield_now().await;
        watching.store(false, Ordering::SeqCst);
        let fast = tokio::spawn({
            let (turn, watching, sent) = (turn.clone(), watching.clone(), sent.clone());
            async move {
                push_in_turn(&turn, || Some(watching.load(Ordering::SeqCst)), |enabled| async move {
                    sent.lock().unwrap().push(enabled);
                })
                .await;
            }
        });
        slow.await.unwrap();
        fast.await.unwrap();

        assert_eq!(*sent.lock().unwrap(), vec![true, false]);
    }

    #[tokio::test]
    async fn no_app_state_sends_nothing() {
        let turn = tokio::sync::Mutex::new(());
        let mut sent = None;
        push_in_turn(&turn, || None, |enabled| {
            sent = Some(enabled);
            async {}
        })
        .await;
        assert_eq!(sent, None);
    }
}
