---
name: aso
description: Optimize an app's store listing for maximum visibility and downloads — keyword strategy, title and subtitle optimization, screenshots, preview videos, rating and review management, and A/B testing on the App Store (iOS) and Google Play (Android). Use when the user says "ASO", "app store optimization", "optimize my app listing", "improve app store ranking", "app store keywords", "app store screenshots", "app store rating", "Google Play optimization", "app visibility", "increase app downloads", "app store SEO", "app store conversion", "my app isn't getting downloads", or wants to improve how their app appears and converts in the App Store or Google Play.
metadata:
  version: 1.0.0
---

# ASO (App Store Optimization)

You are an App Store Optimization specialist. Your job is to maximize an app's visibility in search results and its conversion rate from listing page visitor to download — across both the Apple App Store and Google Play.

## Before You Start

Check if `.agents/brand-context.md` exists. Read it to understand the brand, audience, and app positioning before optimizing the listing.

---

## ASO = SEO + CRO for App Stores

ASO has two distinct jobs:
1. **Visibility** (like SEO): Getting the app to appear in search results for the right keywords
2. **Conversion** (like CRO): Getting people who find the listing to download

Both must be optimized. High ranking with poor creative = low downloads. Great creative with poor ranking = no traffic.

---

## Information to Gather

1. **App name and description** — what does the app do?
2. **Target platform** — iOS, Android, or both?
3. **App Store URL** — if live, share the link for audit
4. **Target audience** — who is this app for?
5. **Primary use case** — what job does the app do for the user?
6. **Current metrics** — downloads, rating, conversion rate from listing (if known)?
7. **Top competitors** — which apps compete directly?
8. **Primary keywords** — what words does the team think users search for?

---

## Output: ASO Optimization Plan

---

### 01 — KEYWORD RESEARCH AND STRATEGY

Keywords are the foundation of app store visibility. The goal: rank for high-volume, relevant terms where competition isn't impossible.

**Keyword research process:**

**Step 1 — Seed keywords:**
What words describe what the app does? What would a user type to find it?
- Primary job (e.g., "meditation", "budget tracker", "photo editor")
- Audience type (e.g., "for runners", "small business")
- Feature-based (e.g., "AI writing", "offline maps")

**Step 2 — Competitor keyword mining:**
- Look at top 3–5 competitors' titles, subtitles, and keyword fields
- Note which keywords they rank for that you don't
- Identify gaps — keywords they're not using that you could own

**Step 3 — Keyword scoring:**
Rate each keyword on:
- **Volume**: How many people search for this? (high/medium/low)
- **Competition**: How hard is it to rank? (high/medium/low)
- **Relevance**: How closely does it match the app?

**Priority**: Medium volume + low competition + high relevance (the sweet spot)

**Keyword placement — where they count:**
- **App name/title**: Highest weight — put primary keyword here
- **Subtitle** (iOS) / **Short description** (Android): Second highest — secondary keywords
- **Keyword field** (iOS only, 100 chars): Additional keywords — no spaces, use commas
- **Long description**: Helps on Google Play (more like SEO); lesser on iOS

---

### 02 — TITLE AND SUBTITLE OPTIMIZATION

**App title formula:**
`[Brand Name] — [Primary Keyword + Value Proposition]`

Examples:
- "Calm — Sleep & Meditation" (brand + primary keyword + secondary use)
- "YNAB — Budget & Finance" (brand + category keyword)
- "Headspace: Mindful Meditation" (brand + adjective + keyword)

**Rules:**
- iOS: Max 30 characters
- Android: Max 30 characters (title) + 80 characters (short description)
- Include the single most important keyword in the title
- Don't keyword stuff — it hurts ranking and looks spammy

**Subtitle (iOS) / Short description (Android):**
- Expand on the primary value proposition
- Include secondary keywords naturally
- 30 characters (iOS) / 80 characters (Android)
- This is the first text users read — make it clear and benefit-focused

---

### 03 — DESCRIPTION OPTIMIZATION

**Structure for maximum conversion:**

**First 2 lines (above "More" fold):**
The most important — most users don't tap "more." Must communicate:
- What the app does in plain language
- The primary benefit (not feature)

**Body copy (below fold):**
- 3–5 key features as short paragraphs
- Social proof (ratings, awards, press mentions)
- Use case examples ("perfect for runners who...")
- Call to action at the end

**Description rules:**
- iOS: The App Store description does NOT directly affect search ranking (keywords here don't count for iOS ASO). Focus on conversion.
- Google Play: Description DOES affect ranking. Include keywords naturally throughout.
- Use line breaks and emoji to aid scannability
- Keep paragraphs to 2–3 sentences max

---

### 04 — SCREENSHOTS AND PREVIEW VIDEO

Screenshots are the #1 conversion driver. Users decide to download (or not) based on screenshots more than any other element.

**Screenshot strategy:**

**Screenshot 1 (hero):**
The most important. Many users only see this one.
- Feature the app's core value proposition visually
- Include a short headline (3–6 words)
- Show the best-looking screen of the app

**Screenshots 2–8:**
Tell a story. Each screenshot = one benefit or feature.
- Screenshot 2: Second most important feature
- Screenshot 3–5: Supporting features/use cases
- Screenshot 6–8: Social proof, awards, or final CTA

**Screenshot best practices:**
- Portrait orientation performs better on most apps (matches phone use)
- Dark mode versions often perform better — test both
- Include device frame or go frameless (test this)
- Use consistent color system that matches brand
- Text on screenshots: max 6–8 words, large enough to read on mobile

**Preview video (optional but impactful):**
- 15–30 seconds maximum
- Show the app in use, not abstract animations
- Most important action in first 3 seconds (autoplays muted)
- Can increase conversion by 20–35% when well-made
- Capture real in-app footage, not a marketing video

---

### 05 — RATINGS AND REVIEW STRATEGY

**Why ratings matter:**
- Below 4.0: significant conversion killer
- 4.0–4.4: acceptable
- 4.5+: strong conversion signal
- Volume matters too — 10,000 reviews at 4.6 beats 100 reviews at 5.0

**Getting more ratings:**

**In-app rating prompt (most important):**
- Use SKStoreReviewRequestAPI (iOS) — only shows Apple's native prompt
- Trigger at a positive moment: after completing a task, after a session streak, after a positive interaction
- Do NOT trigger after errors, purchases, or frustrating moments
- Prompt once per 365 days maximum (Apple's limit)

**Email prompts:**
- Ask NPS 9–10 users to leave a review (they're most likely to do it)
- Include direct link to the review page

**Responding to reviews:**
- Respond to every 1–3 star review (shows care, can convert to update)
- Respond to 4–5 star reviews occasionally (reinforces loyalty)
- Response template for negative reviews: "Thank you for the feedback. [Acknowledge the issue]. [What we're doing about it]. Please reach out at [support email] and we'll make it right."

---

### 06 — A/B TESTING ON THE APP STORE

**What to test:**
- App icon (biggest impact on browse discovery)
- Screenshot 1 (hero frame and headline)
- Screenshot order
- Preview video vs. no video
- Dark vs. light mode screenshots

**How to test:**

**iOS (Product Page Optimization):**
- Available in App Store Connect
- Test up to 3 treatments vs. control
- Minimum 90 days for statistical significance
- Only visible to users who find the app in App Store (not existing users)

**Google Play (Store Listing Experiments):**
- Available in Google Play Console
- Test icon, screenshots, short description, long description
- Set traffic split (recommend 50/50)
- Run for minimum 7 days, ideally 30+

---

### 07 — CATEGORY AND METADATA OPTIMIZATION

**Category selection:**
- Primary category: most relevant (don't game it — it hurts)
- Secondary category (iOS): choose where competition is lower but audience still relevant
- Subcategory: be as specific as possible

**Age rating:**
- Set accurately — misrating can get the app removed
- Lower ratings (4+, Everyone) allow broader distribution

**Localization:**
- Translating the listing to local languages can increase downloads 50–100%+ in non-English markets
- Priority markets to localize: Brazil (Portuguese), Germany, France, Japan, South Korea
- Don't just translate — localize keywords for each market (keywords vary by language)

---

### 08 — ASO METRICS AND MONITORING

Track monthly:

| Metric | What it shows | Tool |
|--------|--------------|------|
| Keyword rankings | Visibility in search | AppFollow, Sensor Tower, AppTweak |
| Impression → product page view rate | Discovery effectiveness | App Store Connect |
| Product page → download rate | Conversion rate | App Store Connect |
| Rating and review volume | Trust signal growth | App Store Connect |
| Competitor ranking changes | Competitive shifts | AppFollow |
| Download volume by source | Where installs come from | App Store Connect |

---

## Related Skills

- **brand-identity**: Ensure app icon aligns with brand visual system
- **brand-messaging**: App description should follow brand messaging hierarchy
- **d2c-marketing**: App as DTC channel
- **brand-context**: Foundation context for all brand work
