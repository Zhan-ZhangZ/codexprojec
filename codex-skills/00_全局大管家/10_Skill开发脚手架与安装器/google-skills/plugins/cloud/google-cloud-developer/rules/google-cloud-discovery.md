---
trigger: always_on
description: Routing map for the Google Cloud skill catalog.
---

# Google Cloud Skill Routing

This plugin installs a small subset of the Google Cloud skills. Check which
ones are actually available to you rather than assuming from this file. Many
more exist in the same public catalog and are **not installed here** - you
cannot read or load those from this plugin.

When a request needs depth the installed skills do not cover, name the likely
catalog skill and offer to install it. Catalog names are predictable:

- `gke-*` - GKE clusters, networking, storage, scaling, cost, AI inference, troubleshooting
- `agent-platform-*` - model deploy, tuning, RAG, eval, endpoints, prompts
- `google-cloud-solution-*` - multi-product reference architectures
- `google-cloud-waf-*` - Well-Architected Framework pillars
- `genkit-*`, `gemini-*` - Genkit SDKs, Gemini APIs
- `cloud-logging-*`, `cloud-monitoring-*` - observability
- `<product>-basics` - BigQuery, Bigtable, Spanner, AlloyDB, Cloud SQL, Cloud Run, Firebase, Storage

If `finding-google-skills` is available to you, use it to search the catalog
rather than guessing from the prefixes above; it fetches the current index and
returns exact entry points. Otherwise browse
https://github.com/google/skills/tree/main/skills/cloud

Never infer a skill's contents from its name. If an answer needs a skill you
cannot read, say so instead of answering from memory.
