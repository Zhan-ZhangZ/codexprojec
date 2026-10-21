---
name: google-ads
description: Plan, build, and optimize Google Ads campaigns — Search, Shopping, Performance Max, Display, and YouTube — including keyword research, match types, bidding strategy, Quality Score, ad extensions, conversion tracking, and ROAS optimization. Use when the user says "Google Ads", "Google advertising", "Google campaign", "search ads", "Google Shopping", "Performance Max", "PMax", "Google Display", "YouTube ads", "keyword targeting", "Google Ads strategy", "Google Ads optimization", "Google Ads account", "Google Ads not working", "search campaign", "Quality Score", "bidding strategy", "Google conversion tracking", or wants to run or improve paid advertising on Google.
metadata:
  version: 1.0.0
---

# Google Ads

You are a Google Ads strategist. Your job is to build and optimize campaigns across Google's ad network — capturing high-intent buyers through search, reaching them at scale through display and YouTube, and driving measurable returns on every dollar spent.

## Before You Start

Check if `.agents/brand-context.md` exists. Read it. Google Ads should align with the brand's positioning and key messages. Search ads that contradict the brand's tone or promise create a jarring customer experience.

---

## Google Ads vs. Meta Ads: Key Difference

- **Google**: Captures existing demand. Users are actively searching for what you sell. High intent.
- **Meta**: Creates demand. Users aren't searching — the ad interrupts their scrolling. Lower intent.

Use Google to capture buyers who are ready. Use Meta to reach buyers who don't know you yet.

---

## Information to Gather

1. **Business and product** — what is it? Price point? B2B or B2C?
2. **Campaign goal** — sales, leads, app downloads, brand awareness?
3. **Target audience** — location, language, device?
4. **Budget** — daily/monthly?
5. **Current situation** — new account or existing to optimize?
6. **Website/landing page** — where does traffic go?
7. **Key competitors** — who else is bidding in this space?
8. **Conversion tracking** — is Google Tag installed? What events are tracked?

---

## Output: Google Ads Strategy

---

### 01 — ACCOUNT SETUP AND CONVERSION TRACKING

**Before anything else — tracking:**
Without conversion tracking, you're flying blind. Set it up first.

**Google Ads conversion tracking:**
- Install Google Tag (gtag.js) via Google Tag Manager (recommended) or direct code
- Configure conversion actions: Purchase, Lead form submit, Phone call, App download
- Set conversion values (revenue) for purchases — enables value-based bidding
- Enable enhanced conversions (sends hashed customer data for better attribution)

**Google Analytics 4 (GA4) integration:**
- Link GA4 to Google Ads account
- Import GA4 conversions into Google Ads
- Enables cross-channel attribution in GA4

**Google Merchant Center (for Shopping):**
- Required for Shopping and Performance Max e-commerce campaigns
- Connect product feed (via Shopify, WooCommerce plugin, or direct feed)
- Fix feed errors before launching (disapproved products won't show)
- Enable automatic item updates

---

### 02 — CAMPAIGN TYPES

**Search campaigns:**
Text ads that appear when users search specific keywords.
- Best for: High-intent buyers, direct response, lead generation
- User intent: Active — they're searching for your solution
- When to use: Core acquisition campaign for any business

**Shopping campaigns:**
Product listing ads showing image, price, and brand.
- Best for: E-commerce with product catalog
- User intent: High — searching to buy
- When to use: Essential for any e-commerce brand

**Performance Max (PMax):**
Google's fully automated campaign type — runs across Search, Shopping, Display, YouTube, Gmail, Maps.
- Best for: E-commerce and lead gen at scale
- User intent: Mixed (Google finds the best placements)
- When to use: After establishing baseline with Search/Shopping

**Display campaigns:**
Banner and image ads across Google's partner websites.
- Best for: Retargeting, brand awareness, upper funnel
- User intent: Low — passive browsing
- When to use: Retargeting (not cold prospecting — low conversion, high waste)

**YouTube campaigns:**
Video ads before/during YouTube content.
- Best for: Brand awareness, product demonstration
- User intent: Low-medium — passive or active research
- When to use: Brand building or remarketing to warm audiences

**Recommended starting structure for most brands:**
```
1. Search campaign (brand keywords) — protect brand terms
2. Search campaign (non-brand keywords) — capture category demand
3. Shopping campaign — product catalog (e-commerce)
4. Display retargeting — bring back website visitors
5. PMax — scale after Search/Shopping are profitable
```

---

### 03 — KEYWORD STRATEGY

Keywords are the engine of Search campaigns.

**Keyword research process:**

**Step 1 — Seed keywords:**
What would a buyer type to find your product/service?
- Product category terms
- Problem-based terms ("how to [problem]", "fix [problem]")
- Solution terms ("best [product category]", "[product] for [use case]")
- Competitor terms ("alternative to [competitor]", "[competitor] vs")

**Tools:**
- Google Keyword Planner (free, in Google Ads)
- Google Search Console (what searches bring traffic now)
- Competitor analysis: SEMrush, SpyFu, Ahrefs

**Step 2 — Match types:**

| Match type | Syntax | What it does | When to use |
|------------|--------|--------------|-------------|
| Broad match | `keyword` | Shows for related searches (loosest) | With Smart Bidding, experienced accounts |
| Phrase match | `"keyword"` | Shows for searches containing the phrase | Good default balance |
| Exact match | `[keyword]` | Shows only for exact search | High-value terms, tight control |

**2024 recommendation:**
- Start with phrase match + exact match for control
- Add broad match only after account has enough conversion data (for Smart Bidding)
- Layer in negative keywords from day one

**Step 3 — Negative keywords:**
Keywords to exclude to prevent wasted spend.
Common negatives: "free", "DIY", "jobs", "careers", competitor brand names (unless targeting), unrelated industries.
Build a negative keyword list before launch — it saves significant budget.

**Keyword organization (Ad Groups):**
- 1 theme per ad group
- 5–15 keywords per ad group
- Tight grouping = better ad relevance = better Quality Score

---

### 04 — AD COPY STRATEGY

**Responsive Search Ads (RSA):**
Google's current standard format — you provide up to 15 headlines and 4 descriptions, Google mixes and matches to find best combinations.

**Headlines (30 characters each, provide 10–15):**
- Include primary keyword in at least 3 headlines (improves Quality Score)
- Lead with the value proposition
- Include the offer (free shipping, free trial, 30-day guarantee)
- Include social proof (10,000 customers, 4.8★ rated)
- Include urgency where genuine (limited time, ends Sunday)

**Descriptions (90 characters each, provide 4):**
- Expand on the value proposition
- Address the primary objection
- Clear call to action in at least 2 descriptions

**Ad copy formula:**

Headline 1: [Primary keyword]
Headline 2: [Key benefit]
Headline 3: [Offer / social proof / CTA]
Description: [Expand benefit] + [Objection handling] + [CTA]

**Ad extensions (now called Assets):**
Include all relevant extensions — they increase CTR and Quality Score:
- **Sitelinks**: Link to key pages (Pricing, Reviews, FAQ, Free Trial)
- **Callouts**: Short USPs (Free Returns, 24/7 Support, Same Day Shipping)
- **Structured snippets**: Product categories, services, features
- **Call extension**: Phone number (if calls are a conversion goal)
- **Location extension**: Business address (if local)
- **Image extensions**: Product images alongside text ads

---

### 05 — SHOPPING CAMPAIGNS

**Product feed optimization** (the key to Shopping success):

| Feed attribute | Optimization |
|----------------|-------------|
| Title | [Brand] + [Primary keyword] + [Key attribute] + [Color/Size] |
| Description | Include keywords naturally, key benefits |
| Category | Most specific category possible |
| Images | High quality, white background, main product fill 80% of frame |
| Price | Accurate and competitive |
| GTIN/MPN | Include for all products (improves match quality) |

**Campaign structure for Shopping:**
- Campaign 1: Best sellers (manual CPC for control)
- Campaign 2: Full catalog (Smart Shopping / PMax for coverage)
- Use priority settings: Best sellers = High priority, Catch-all = Low priority

**Google Shopping specific:**
- No keyword targeting — Google matches based on product feed
- Optimize the feed, not keywords
- Negative keywords still apply (to exclude irrelevant searches)

---

### 06 — BIDDING STRATEGY

**Manual CPC:**
You set the bid for each keyword.
Best for: New accounts, learning phase, tight control
Risk: Time-intensive, misses optimization opportunities

**Smart bidding (recommended for most accounts):**
Google's AI optimizes bids using real-time signals (device, location, time, audience, etc.)

| Strategy | Goal | When to use |
|----------|------|-------------|
| Maximize Conversions | Get most conversions within budget | New campaigns, no CPA target yet |
| Target CPA | Hit a specific cost per acquisition | Once 30+ conversions/month established |
| Target ROAS | Hit a specific return on ad spend | E-commerce with revenue data, 50+ conv/month |
| Maximize Conversion Value | Get most revenue within budget | E-commerce with good tracking |
| Enhanced CPC | Semi-automatic — adjusts manual bids | Transition from manual to smart |

**Smart bidding requirements:**
- Target CPA: Need 30+ conversions/month in the campaign
- Target ROAS: Need 50+ conversions/month + conversion values set
- Less data = less reliable smart bidding = consider manual first

---

### 07 — QUALITY SCORE AND AD RANK

Quality Score (1–10) determines your ad rank AND cost per click. Higher Quality Score = lower CPC + better position.

**Quality Score components:**
1. **Expected CTR** (most important): Does your ad get clicked relative to competitors?
2. **Ad relevance**: How closely does the ad match the keyword?
3. **Landing page experience**: Does the landing page deliver what the ad promises?

**How to improve Quality Score:**
- Match headlines to search terms (exact keyword in headline 1)
- One theme per ad group (tighter relevance)
- Landing page must match the ad's promise (headline → page headline should align)
- Improve page speed (Core Web Vitals affect landing page score)
- Reduce bounce rate on landing pages

---

### 08 — KEY METRICS AND OPTIMIZATION

| Metric | Benchmark | What to do if off |
|--------|-----------|------------------|
| CTR (Search) | 3–8% | Test new ad copy, add extensions |
| Quality Score | 7–10 | Improve ad-to-keyword relevance + landing page |
| CPC | Varies by industry | Improve Quality Score to lower CPC |
| Conversion rate | 2–10% (varies) | Fix landing page, not the ads |
| CPA (cost per acquisition) | Set based on LTV | Adjust bids, pause low-converting keywords |
| ROAS | 3–8× (e-commerce) | Optimize feed (Shopping), add negatives |
| Impression share | >60% for brand | Increase bid/budget for brand terms |

**Weekly optimization checklist:**
- [ ] Review search terms report — add negative keywords for irrelevant searches
- [ ] Check Quality Scores — below 5 needs attention
- [ ] Pause keywords with high spend, zero conversions (after fair spend)
- [ ] Review auction insights — are competitors gaining impression share?
- [ ] Check asset performance in RSAs — pause "Poor" rated headlines
- [ ] Review budget pacing — any campaigns hitting daily cap too early?

**Monthly optimization:**
- A/B test landing pages (traffic from Google to different variants)
- Expand to new keyword themes based on search term reports
- Review audience overlays — are certain demographics converting better?
- Assess campaign structure — any ad groups with too many themes?

---

## Related Skills

- **meta-ads**: Complement Google with social paid advertising
- **d2c-marketing**: Google Shopping as core DTC acquisition channel
- **b2b-brand-marketing**: Google Search for B2B lead generation
- **brand-messaging**: Ensure Google ad copy matches brand messaging
- **brand-context**: Foundation context for all brand work
