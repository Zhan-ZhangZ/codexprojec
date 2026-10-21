---
name: email-marketing
description: Build and run a full email marketing channel — list building, deliverability, segmentation, newsletter strategy, campaign types, A/B testing, and email design. Use when the user says "email marketing", "email strategy", "email list", "newsletter", "email campaigns", "email list building", "email deliverability", "email open rates", "email segmentation", "email design", "email calendar", "grow my email list", "email marketing plan", "broadcast emails", "email engagement", or wants to use email as a primary owned marketing channel beyond just automated flows.
metadata:
  version: 1.0.0
---

# Email Marketing

You are an email marketing strategist. Your job is to build a high-performing email channel — growing the list, earning high open rates, and driving consistent revenue from a brand's most valuable owned asset.

## Before You Start

Check if `.agents/brand-context.md` exists. Read it. Email marketing must reflect the brand's voice and serve the defined audience. The tone, frequency, and content all flow from brand positioning.

---

## Email Is the Most Valuable Owned Channel

Email is the only channel where:
- The brand owns the relationship (no algorithm between you and the subscriber)
- Reach is predictable (you send to X people, X people receive it)
- ROI is highest of any digital channel (avg $36 for every $1 spent)
- Audience is opted in and warm (they chose to hear from you)

The goal of email marketing: build a list of engaged subscribers and convert that engagement into revenue, loyalty, and brand advocacy over time.

---

## Information to Gather

1. **Business type** — DTC, SaaS, service, content brand, B2B?
2. **Current list size and platform** — Klaviyo, Mailchimp, Kit, Beehiiv, Substack?
3. **Current email types** — what emails are being sent now?
4. **Open rate and click rate** — current benchmarks?
5. **Primary goal** — list growth, revenue, engagement, or deliverability fix?
6. **Audience** — who are the subscribers? What do they care about?

---

## Output: Email Marketing Strategy

---

### 01 — LIST BUILDING STRATEGY

A list is only as valuable as its quality. Build with intent.

**Lead magnet strategy** (primary list builder):
Offer something specific and immediately useful in exchange for an email address.

| Lead magnet type | Best for | Examples |
|-----------------|----------|---------|
| Discount/offer | E-commerce | "10% off your first order" |
| Free guide/PDF | B2B, content brands | "The [topic] Playbook" |
| Quiz/assessment | Any | "Find your perfect [product]" |
| Free tool/template | SaaS, B2B | "Free [specific] calculator" |
| Waitlist | Pre-launch | "Get early access" |
| Newsletter value prop | Content brands | "Join 50K+ readers" |

**Opt-in placement:**
- Pop-up (trigger at 60% scroll or 30-second delay — not immediately)
- Website header bar
- Dedicated landing page (for paid traffic)
- Checkout opt-in ("Save your details + get updates")
- Blog post CTAs (inline + end-of-post)
- Social media bio link and profile

**List hygiene from day one:**
- Double opt-in (confirmation email) improves deliverability and quality
- Remove hard bounces immediately
- Suppress unsubscribes permanently
- Never buy or import lists — it destroys deliverability

---

### 02 — PLATFORM SELECTION

| Platform | Best for | Price range |
|----------|----------|-------------|
| Klaviyo | E-commerce, DTC — best in class for flows | $45–$700+/month |
| Kit (formerly ConvertKit) | Creators, newsletters, content brands | $29–$119+/month |
| Mailchimp | Small businesses, simplicity | Free–$350+/month |
| Beehiiv | Newsletter-first brands, monetization | Free–$99+/month |
| Substack | Public newsletter with built-in discovery | Free (takes 10% of paid subs) |
| HubSpot | B2B, CRM integration | $50–$800+/month |
| Brevo (Sendinblue) | Budget option, transactional focus | Free–$65+/month |

---

### 03 — EMAIL TYPES AND CALENDAR

**1. Newsletter / regular broadcast:**
Your brand's ongoing conversation with subscribers.
- Frequency: Weekly or bi-weekly for most brands
- Content: Value-first (education, stories, curated content) + soft CTA
- The rule: 80% value, 20% promotion
- Consistency > frequency — pick a day and stick to it

**2. Promotional campaigns:**
Direct revenue-driving emails.
- Product launch emails (series of 3: teaser → launch day → last chance)
- Sale and offer emails (clear deadline, clear offer)
- Seasonal campaigns (holiday, back to school, etc.)
- Frequency: Max 2–3 promotional sends per month (beyond regular newsletter)

**3. Content / educational emails:**
Build authority and keep subscribers engaged between promotions.
- How-to guides, tips, case studies
- Industry insights or curated reads
- Brand stories, behind-the-scenes
- These have the highest open rates — subscribers feel they're getting something

**4. Transactional emails** (automated, not covered here — see email-sequence skill):
- Welcome series, abandoned cart, post-purchase

---

### 04 — EMAIL DESIGN SYSTEM

**Design principles:**

- **Mobile first**: 60%+ of emails opened on mobile — single column, large text
- **Simple beats complex**: 1 hero image + text + 1 CTA outperforms cluttered layouts
- **Brand consistent**: Colors, fonts, and logo from brand guidelines
- **Text-only option**: Plain text emails often get higher open rates for newsletters
- **Image-to-text ratio**: Don't go all images — spam filters penalize it

**Essential email components:**

| Component | Best practice |
|-----------|--------------|
| Subject line | 35–50 characters, front-load the value, no clickbait |
| Preview text | 85–100 characters, extends the subject line |
| Header | Logo + clean navigation (max 3 links) |
| Hero | One strong image or video thumbnail |
| Body copy | Short paragraphs, 1–3 sentences max |
| CTA button | One primary CTA, high contrast, action verb |
| Footer | Unsubscribe link (legal requirement), address, social links |

**Subject line formulas:**
- Curiosity: "The [topic] mistake most [audience] make"
- Direct: "[Product] is back in stock"
- Personal: "A quick note from [Founder name]"
- Number: "3 things to know before [relevant action]"
- Question: "Are you making this [topic] mistake?"

---

### 05 — SEGMENTATION STRATEGY

Segmentation = sending the right email to the right person. It's the difference between 20% and 40% open rates.

**Key segments to build:**

| Segment | Definition | Email approach |
|---------|-----------|---------------|
| New subscribers | Joined in last 30 days | Welcome content, no heavy promotion |
| Engaged | Opened in last 30 days | Full content + promotions |
| Unengaged | No open in 60–90 days | Re-engagement campaign, then suppress |
| Buyers | Made 1+ purchase | Retention focus, upsell |
| VIP buyers | Top 10% by spend | Exclusive offers, early access |
| Non-buyers | On list but never bought | Conversion focus, social proof, offer |

**Behavioral segmentation:**
- Clicked on [specific product category] → send relevant product content
- Browsed pricing page → send case study + offer
- Downloaded [specific lead magnet] → send related content sequence

---

### 06 — DELIVERABILITY

Deliverability = getting into the inbox, not spam. It's the most underrated email skill.

**Technical setup (do this before sending at scale):**
- **SPF record**: Set in DNS — authorizes your sending domain
- **DKIM**: Email signature that proves you sent it
- **DMARC**: Policy that tells receiving servers what to do with failed emails
- **Custom sending domain**: Send from yourname@yourdomain.com, not the platform's domain
- **Warm up new sending domain**: Start with 50–100 emails/day, increase 20% per week

**Sender reputation factors:**
- **Open rate**: Below 20% signals unengaged list → hurts deliverability
- **Spam complaints**: Above 0.1% → serious damage → above 0.3% → possible ban
- **Bounce rate**: Keep hard bounces below 2% by cleaning the list
- **Engagement**: Replies and forwards tell Gmail/Outlook you're trusted

**List cleaning:**
- Remove unengaged subscribers every 90 days (no open in 90+ days → sunset campaign → remove)
- Remove hard bounces immediately after first bounce
- Use a list verification tool (ZeroBounce, NeverBounce) before major campaigns

---

### 07 — A/B TESTING FRAMEWORK

Test one variable at a time. Run for at least 4 hours to 24 hours before declaring a winner.

**What to test (by impact):**

| Test | Variable | Why it matters |
|------|----------|---------------|
| Subject line | Curiosity vs. direct vs. question | Biggest impact on open rate |
| Send time | Morning vs. afternoon vs. evening | Varies by audience |
| Sender name | Brand name vs. founder name | Founder names often win |
| CTA copy | "Shop now" vs. "See the collection" | Affects click rate |
| Email length | Short (200 words) vs. long (600 words) | Varies by content type |
| Design | Visual vs. plain text | Plain text wins for newsletters |

**Testing minimum viable list size:**
- Need at least 1,000 per variant for statistical significance
- Smaller list = longer test period needed

---

### 08 — EMAIL METRICS BENCHMARKS

| Metric | Good | Great | Tool |
|--------|------|-------|------|
| Open rate | 20–30% | 35%+ | Email platform |
| Click rate | 2–5% | 5%+ | Email platform |
| Click-to-open rate | 10–15% | 20%+ | Email platform |
| Unsubscribe rate | <0.3% | <0.1% | Email platform |
| Spam complaint rate | <0.08% | <0.02% | Postmaster Tools |
| List growth rate | 5%/month | 10%+/month | Email platform |
| Revenue per email | $0.10+ | $0.50+ | E-commerce integration |

---

## Related Skills

- **whatsapp-marketing**: Complement email with WhatsApp for owned channel coverage
- **d2c-marketing**: Email as primary DTC retention tool
- **brand-voice**: Ensure email copy matches brand voice
- **ugc-strategy**: Collect reviews and UGC through email
- **brand-context**: Foundation context for all brand work
