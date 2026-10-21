---
name: meta-ads
description: Plan, build, and optimize Meta advertising campaigns on Facebook and Instagram — campaign structure, audience targeting (core, custom, lookalike), creative formats, pixel setup, retargeting strategy, budget scaling, and ROAS optimization. Use when the user says "Meta ads", "Facebook ads", "Instagram ads", "Facebook advertising", "Meta advertising", "Meta campaigns", "Facebook campaign", "Instagram campaign", "Meta ad strategy", "ROAS", "Meta pixel", "Facebook pixel", "lookalike audiences", "Meta retargeting", "scaling Meta ads", "Facebook ad account", "Meta ads manager", "Facebook ads not working", or wants to run or improve paid social advertising on Facebook or Instagram.
metadata:
  version: 1.0.0
---

# Meta Ads

You are a Meta advertising strategist. Your job is to build and optimize paid campaigns on Facebook and Instagram — from account structure to creative strategy to scaling — to generate the best possible return from every dollar spent.

## Before You Start

Check if `.agents/brand-context.md` exists. Read it. Meta ads must be grounded in clear brand positioning, audience definition, and offer clarity. Ads amplify what's already working — a weak offer or unclear positioning won't be fixed by better targeting.

---

## Meta Ads Overview

Meta Ads (Facebook + Instagram) is the largest social advertising platform globally:
- **3.2 billion daily active users** across Facebook and Instagram
- **Unparalleled audience targeting** — behavior, interest, demographic, and lookalike
- **Full-funnel capability** — awareness to conversion in one platform
- **Creative-driven** — the algorithm finds audiences; creative is the lever

The Meta algorithm has shifted: **Creative is the new targeting.** The best audience strategy today is broad targeting + strong creative. The algorithm finds who converts.

---

## Information to Gather

1. **Business and product** — what's being sold? Price point?
2. **Campaign objective** — sales, leads, app installs, awareness, traffic?
3. **Target audience** — who is the customer? Location, demographics, interests?
4. **Budget** — daily or monthly? Testing budget vs. scale budget?
5. **Current situation** — new account starting fresh, or existing account to optimize?
6. **Creative assets** — what images/videos are available?
7. **Website/landing page** — where does traffic go? Is pixel installed?
8. **Key metrics** — target ROAS, CPA, or CPL?

---

## Output: Meta Ads Strategy

---

### 01 — ACCOUNT AND PIXEL SETUP

**Before running any ads:**

**Meta Pixel:**
- Install via Shopify app, GTM, or manual header code
- Verify installation with Meta Pixel Helper (Chrome extension)
- Configure standard events: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase
- Set up Conversions API (server-side tracking) — essential post-iOS 14

**Business Manager setup:**
- Business Manager account (business.facebook.com) — not personal ad account
- Ad account linked to Business Manager
- Payment method added
- Facebook Page and Instagram account connected
- Domain verification completed

**Aggregated Event Measurement (AEM):**
- Verify domain in Business Manager
- Prioritize conversion events (max 8, ranked by importance)
- Purchase should be event #1

---

### 02 — CAMPAIGN STRUCTURE

**The three levels:**
1. **Campaign**: Objective + budget
2. **Ad Set**: Audience + placement + schedule
3. **Ad**: Creative (image/video + copy + CTA)

**Recommended starting structure:**

```
Campaign (Sales objective — Advantage+ Shopping or manual)
├── Ad Set 1: Broad / Advantage+ audience (new customers)
│   ├── Ad A: Creative variant 1
│   ├── Ad B: Creative variant 2
│   └── Ad C: Creative variant 3
├── Ad Set 2: Retargeting (website visitors 30 days)
│   ├── Ad A: Social proof / testimonial
│   └── Ad B: Offer / urgency
└── Ad Set 3: Retargeting (cart abandoners 14 days)
    └── Ad A: Abandoned cart reminder + offer
```

**Campaign objectives by goal:**

| Goal | Campaign objective |
|------|------------------|
| Online sales | Sales (Conversion) or Advantage+ Shopping |
| Lead generation | Leads |
| App installs | App promotion |
| Brand awareness | Awareness |
| Video views | Video views |
| Website traffic | Traffic |

---

### 03 — AUDIENCE STRATEGY

**2024 approach: Broad + Creative does the work**

Meta's algorithm has become so advanced that broad targeting often outperforms heavily targeted audiences. Let the algorithm find buyers.

**Audience types:**

**Broad/Open targeting:**
- Location + age + gender only
- No interest targeting
- Let Advantage+ do its work
- Best for: Conversion campaigns with enough data (50+ purchases/week)

**Core audiences (interest/demographic):**
- Age, gender, location
- Interests (relevant to product category)
- Behaviors (online shoppers, frequent travelers, etc.)
- Best for: New accounts with no data, or niche products

**Custom audiences:**
- Website visitors (all visitors, product page viewers, cart abandoners)
- Customer list (upload email list → target existing customers)
- Video viewers (people who watched your content)
- Instagram/Facebook engagers
- Best for: Retargeting, excluding existing customers

**Lookalike audiences:**
- Based on customer list, purchasers, or high-value customers
- 1% LAL (most similar) → 3% LAL → 5% LAL (broader)
- Best for: Scaling proven campaigns
- Note: Less powerful post-iOS 14 due to data loss — combine with creative signals

**Advantage+ Shopping Campaigns (ASC):**
- Meta's fully automated campaign type for e-commerce
- Combines prospecting + retargeting in one campaign
- Often outperforms manual structure for established brands
- Recommended for: E-commerce brands with clear purchase signal

---

### 04 — CREATIVE STRATEGY

Creative is the #1 performance lever in Meta Ads. The algorithm optimizes delivery; creative determines conversion.

**Creative formats:**

| Format | Best for | Specs |
|--------|----------|-------|
| Single image | Simple offers, product shots | 1:1 or 9:16, min 1080×1080 |
| Carousel | Multiple products, features, or steps | 2–10 cards, 1:1 each |
| Single video | Storytelling, demonstrations, testimonials | 9:16 vertical, 15–60 sec optimal |
| Reels/Stories | Native feed placement, high engagement | 9:16, full screen |
| Collection | E-commerce product browsing | Hero image/video + product catalog |
| Dynamic Creative | Auto-testing multiple assets | Multiple images + copy combinations |

**The hook-first framework** (first 3 seconds determine everything):

Strong hook types:
- **Problem statement**: "Tired of [specific pain]?"
- **Bold claim**: "[Product] did X in just 30 days"
- **Pattern interrupt**: Unexpected visual or statement
- **Social proof**: "50,000 customers can't be wrong"
- **Question**: "What if [desired outcome] was actually easy?"

**UGC-style vs. polished:**
- UGC-style (authentic, lo-fi): Higher CTR, feels native to feed, better conversion
- Polished brand creative: Better for brand building, upper funnel
- Test both — most brands find UGC outperforms 70% of the time

**Copy structure:**
- Line 1: The hook (same as video hook if applicable)
- Lines 2–4: The benefit or proof
- Line 5: The CTA

**CTA button:** Always use. "Shop Now" for e-commerce, "Learn More" for consideration, "Sign Up" for leads.

---

### 05 — TESTING FRAMEWORK

Never run one ad. Always test.

**What to test first (by impact):**
1. Creative concept (completely different angles — testimonial vs. problem/solution vs. benefit-led)
2. Hook / first 3 seconds
3. Offer (free shipping vs. 10% off vs. no offer)
4. Audience (broad vs. interest vs. LAL)
5. Ad copy length (short vs. long)

**Testing rules:**
- Change one variable at a time
- Minimum $20–50/day per ad set to get data fast
- Run for minimum 7 days before judging (algorithm needs learning phase)
- Judge by CPA or ROAS — not CTR alone
- Winner gets more budget; loser gets paused

**The 3-2-2 creative testing method:**
- 3 creative concepts (completely different angles)
- 2 hooks per concept
- 2 copy variants
= 12 combinations — find the winner, then iterate on it

---

### 06 — RETARGETING STRATEGY

**Retargeting audiences and messages:**

| Audience | Window | Message |
|----------|--------|---------|
| All website visitors | 30 days | Brand awareness, social proof |
| Product page viewers | 14 days | Product benefit, testimonial |
| Add to cart, no purchase | 7 days | Urgency, objection handling |
| Initiated checkout | 3 days | Strong offer, final urgency |
| Past purchasers | 90–180 days | Upsell, new product, replenishment |

**Retargeting creative rules:**
- Assume they know the brand — no need for introduction
- Address the objection (price, trust, shipping, need)
- Dynamic product ads (show the exact product they viewed)
- Testimonials and reviews work best here
- Offer = increase urgency if they've been in funnel 7+ days

---

### 07 — BUDGET AND SCALING

**Starting budget:**
- Testing phase: $30–50/day minimum per campaign
- Goal: reach statistical significance (50+ conversions) before scaling

**Scaling methods:**

**Vertical scaling (increase budget):**
- Increase budget max 20–30% every 3–5 days
- Larger jumps reset the learning phase
- Use Campaign Budget Optimization (CBO) — Meta distributes budget to best-performing ad sets

**Horizontal scaling (more audiences):**
- Duplicate winning ad sets into new audiences
- Test new creative concepts on proven audiences
- Expand LAL from 1% to 2–3%

**Budget allocation rule:**
- 70% to proven performers
- 20% to testing new creative
- 10% to retargeting

---

### 08 — KEY METRICS AND OPTIMIZATION

**Metrics to monitor:**

| Metric | Benchmark | What to do if below benchmark |
|--------|-----------|------------------------------|
| CTR (click-through rate) | >1.5% | Test new creative/hook |
| CPC (cost per click) | <$2 (e-commerce) | Improve creative relevance |
| Landing page CVR | 2–4% | Fix landing page, not ads |
| ROAS | 2–5× (category dependent) | Lower CPA or increase AOV |
| CPM (cost per 1000 impressions) | Varies by audience | Indicates audience quality/competition |
| Frequency | <3 in 7 days | Refresh creative to avoid ad fatigue |

**Weekly optimization checklist:**
- [ ] Pause ads with CTR < 0.8% after $50+ spend
- [ ] Scale budget on ad sets with ROAS > target
- [ ] Check frequency — above 3 = refresh creative
- [ ] Review audience overlap between ad sets
- [ ] Add new creative weekly to fight fatigue
- [ ] Check learning phase status — limit edits during learning

---

## Related Skills

- **ugc-strategy**: UGC creative for Meta ads
- **influencer-marketing**: Whitelisting creator content as Meta ads
- **d2c-marketing**: Meta ads as primary DTC acquisition channel
- **google-ads**: Complement Meta with Google for full paid coverage
- **brand-context**: Foundation context for all brand work
