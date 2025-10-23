# Subscrio - Business Summary & Go-to-Market Plan

## The Problem

**Every time a user clicks a button, creates a resource, or calls an API endpoint, your application asks the same critical question: "Is this customer allowed to do this?"**

You monetize your software product through pricing tiers, product editions, and feature lists. While customers access your product, your application needs real-time answers to these kinds of questions:

- Can they create another project?
- Do they have API access?
- What's their storage limit?

Your billing system knows which plan each customer purchased. But translating "Pro Plan" into actionable permissions throughout your application—that's the gap most companies struggle to bridge.

**The missing link in every software stack:**

Right now, software companies have two disconnected systems:

1. **Billing/License Management** (Stripe, Paddle, license keys) - Handles payments, invoices, and subscription status
2. **Application Code** - Enforces what users can actually do

But there's a critical gap between them: **Who manages the subscription from within the application's code?** 

For example, when a customer upgrades to Pro, something needs to translate "Pro plan" into actionable rules: can create 50 projects, has API access, gets advanced reporting. That translation layer—and the code to check it everywhere in your application—doesn't exist in your billing system.

**The current approach: Build it yourself**

Nearly every company hard-codes this logic throughout their application. While some opinionated application frameworks (like ABP.io) include basic plan management, they require adopting the entire framework—forcing architectural decisions that may not fit your product.

```typescript
// Scattered across dozens of files:
if (customer.plan === 'pro') {
  maxProjects = 50;
} else if (customer.plan === 'enterprise') {
  maxProjects = 999;
}
```

This creates massive problems:

- **Change a plan?** Requires code deployment and testing
- **Custom deals?** Engineers must build one-off override logic
- **Multiple products?** Conditional statements become unmaintainable
- **Audit compliance?** No trail of who changed what entitlements when
- **Sales flexibility?** Product team can't experiment without engineering
- **Vendor lock-in?** You're forced to parse your billing system's data structures, making it nearly impossible to switch providers

**The real cost:** Development teams spend hundreds of hours building this "entitlement layer" from scratch, and it still ends up rigid, error-prone, and difficult to change.

## The Opportunity

**The entitlement layer is infrastructure every subscription application needs but nobody wants to build.**

The market is massive and underserved:
- 30,000+ B2B SaaS companies operating today
- 95% build subscription/entitlement logic in-house
- Feature flag tools (LaunchDarkly, Split) solve a different problem
- Billing platforms (Stripe, Paddle) don't manage feature entitlements
- No dominant open-source solution exists

**What companies are actually looking for:**

A system that sits between their billing platform and application code—a definitive source of truth that answers: "What features and limits does this customer have right now?"

They need:
- **Product catalog management** - Define your SaaS products and their features
- **Plan configuration** - Set feature values per pricing tier (Free/Pro/Enterprise)
- **Customer subscriptions** - Link customers to plans with lifecycle tracking
- **Entitlement resolution** - Real-time answers: Can this customer do X?
- **Business flexibility** - Change plans and grant exceptions without deployments
- **Billing integration** - Sync automatically with Stripe/Paddle webhooks

## The Solution

**Subscrio is the entitlement layer your SaaS application is missing.**

It's not feature flags for gradual rollouts. It's not a billing system for processing payments. It's the authoritative system between them that knows exactly what each customer is entitled to access.

### How Subscrio Works

**1. Define Your Business Model (Once)**

Configure your products, features, and plans:
- **Products:** "Project Management", "CRM", "Analytics"
- **Features:** "max-projects" (numeric), "api-access" (toggle), "export-formats" (text)
- **Plans:** Free (5 projects), Pro (50 projects), Enterprise (unlimited)

**2. Assign Customers to Plans and Editions**

Assign initial plans and editions when customers sign up. When a customer purchases or when a subscription renews, Subscrio receives the alert and keeps everything in sync automatically. Manage the complete lifecycle: activation dates, expiration handling, renewals, and cancellations. Optionally apply custom overrides for special deals and set expiration dates for temporary access.

**3. Enforce Entitlements Throughout Your App**

Your application asks Subscrio before allowing any action:

```typescript
// In your project creation endpoint:
const features = await subscrio.getCustomerFeatures(customerId);
const maxProjects = features.get('max-projects');

if (currentProjects >= maxProjects) {
  throw new Error('Upgrade to create more projects');
}
```

**4. Business Teams Control Configuration**

When sales needs to close a deal with custom terms:
- Open the admin dashboard
- Create a subscription override: "max-projects: 75" (expires in 12 months)
- Customer immediately gets access—no deployment needed

### What Makes It Different

**vs. Feature Flags (LaunchDarkly, Split):**
- Feature flags roll out new code gradually to users
- Subscrio manages what customers paid for and can access
- Different problems, different solutions

**vs. Billing Systems (Stripe, Paddle):**
- Billing handles payments and invoices
- Subscrio translates subscriptions into feature entitlements
- Tightly integrated, not competing

**vs. Building In-House:**
- Saves 120+ hours of development
- Production-tested with audit trails
- No technical debt as your business model evolves

## The Product

Subscrio uses an open-core business model to build trust and monetize value:

### Core Library - Open Source (MIT License)

**`@subscrio/core`** - The complete entitlement engine
- Product, feature, and plan management
- Customer subscription lifecycle
- Real-time entitlement resolution
- PostgreSQL persistence
- Full TypeScript with type safety
- Free forever on npm

**Why open source the core?**
- Developers can evaluate without sales calls
- Builds trust through transparency
- Creates community adoption and contributions
- Proves production-readiness before purchase

### Commercial Components - Paid Licenses

**`@subscrio/api`** - REST API Server
- Pre-built HTTP endpoints for all operations
- API key authentication (admin/readonly scopes)
- Stripe webhook integration
- License validation on startup
- **Pricing:** $299-399 one-time OR $49-69/month

**`@subscrio/admin`** - Management Dashboard
- Professional React admin interface
- Visual product/plan configuration
- Customer subscription management
- Audit trail and reporting
- **Pricing:** Bundled with API or separate license

**Why charge for these?**
- Most companies want a ready-made admin UI
- REST API provides deployment flexibility
- Ongoing updates and support cost money
- Values convenience over doing it yourself

## Target Market

### Primary: B2B SaaS Companies (5-100 Employees)

**Profile:**
- Revenue stage: $500K - $20M ARR
- Company stage: Seed to Series B
- Tech stack: Node.js/TypeScript, PostgreSQL
- Current state: Spending months building subscription infrastructure or dealing with rigid hard-coded plans

**Ideal verticals:**
- Project management tools (limits by projects, users, storage)
- CRM systems (limits by contacts, seats, integrations)
- Analytics platforms (limits by data volume, API calls, retention)
- Developer tools (limits by builds, deployments, team size)
- API-first products (limits by requests, rate limits, endpoints)

**Buying triggers:**
- Launching tiered pricing for the first time
- Rebuilding subscription system as complexity grows
- Sales team frustrated by inability to offer custom deals
- Engineering backlog filled with "change plan limit" requests

### Secondary: Development Agencies

Agencies building multiple SaaS products for clients need reusable architecture. Subscrio provides a white-label entitlement layer they can deploy across projects without building from scratch each time.

## Go-to-Market Strategy

### Phase 1: Establish the Category (Months 1-6)

**Goal:** Educate developers that "entitlement management" is a solved problem

**Core Message:** "Stop building subscription infrastructure from scratch. Use Subscrio."

**Tactics:**
- Publish `@subscrio/core` to npm with comprehensive documentation
- Write educational content explaining the entitlement layer concept:
  - "Feature Flags vs. Entitlement Management: What's the Difference?"
  - "The Missing Layer in Your SaaS Stack"
  - "How Stripe, Subscrio, and Your App Work Together"
- Create implementation guides for common SaaS patterns
- Engage in developer communities (r/SaaS, r/node, Indie Hackers, Dev.to)
- Produce comparison content: "Subscrio vs. Building In-House" (TCO analysis)

**Success Metrics:**
- 10,000+ npm downloads
- 200+ GitHub stars
- 10+ companies using open-source core in production
- 5+ community contributions or feature requests

### Phase 2: Convert to Paid (Months 3-12)

**Goal:** Generate first 100 paid licenses and validate pricing

**Tactics:**
- Launch commercial API and admin dashboard
- Offer 30-day free trials with full functionality
- Direct outreach to companies already using the open-source core
- Product Hunt and Hacker News launches
- Create case studies from early adopters showing time/money saved
- Build email nurture sequence for npm downloaders:
  - Day 1: "Thanks for trying Subscrio"
  - Day 7: "5 subscription patterns every SaaS must handle"
  - Day 14: "See the admin dashboard in action" (demo video)
  - Day 30: "Special launch pricing" (trial offer)
- List on Stripe App Marketplace as complementary integration
- Sponsor relevant podcasts (Indie Hackers, SaaS Club, Startups For the Rest of Us)

**Pricing Strategy:**
- Early adopter discount: $199 one-time (vs. $299 regular)
- First 50 customers get lifetime 50% off monthly ($29/mo vs. $59)
- Transparently increase prices as product matures

**Success Metrics:**
- 100 paid licenses sold
- $30K MRR (mix of one-time and recurring)
- 70%+ customer satisfaction (NPS survey)
- 10+ public testimonials/case studies

### Phase 3: Scale Revenue (Months 12-24)

**Goal:** Achieve $150K MRR and establish market leadership

**Tactics:**
- Launch enterprise tier with managed hosting and SLA
- Build integration ecosystem:
  - Next.js starter templates with Subscrio pre-configured
  - Python/Ruby client libraries for polyglot teams
  - Paddle and Chargebee webhooks (beyond Stripe)
- Create agency partner program (20% revenue share on referrals)
- Expand content marketing:
  - Guest posts on high-traffic SaaS blogs
  - Conference talks at SaaStock, MicroConf, React conferences
  - Video tutorial series on YouTube
  - Monthly "Subscrio Office Hours" livestream
- Build customer community (Slack/Discord) for best practices sharing
- Introduce annual licensing discount (pay $499 vs. $59×12=$708)

**Success Metrics:**
- 500+ active paid licenses
- $150K MRR
- <5% monthly churn
- 15+ agency partners actively referring

### Distribution Channels Summary

1. **Organic npm discovery** - Developers searching for subscription solutions
2. **Content marketing** - Educational content ranks for "subscription management", "SaaS entitlements"
3. **Community engagement** - Active presence in r/SaaS, Indie Hackers, Discord servers
4. **Integration marketplaces** - Listed on Stripe, Paddle, Vercel ecosystems
5. **Direct outreach** - Twitter/LinkedIn targeting SaaS founders showing subscription pain
6. **Partner referrals** - Agencies and consultants recommending Subscrio

## Revenue Model

### One-Time License (Perpetual)
- **$299** (1-10 employees)
- **$399** (11-50 employees)
- **$499** (51+ employees)
- Includes: Perpetual usage rights, 1 year of updates, email support

### Monthly Subscription (Recurring)
- **$49/month** (Standard support)
- **$69/month** (Priority email, Slack access)
- Includes: Continuous updates, cancel anytime

### Enterprise (Custom Pricing)
- Managed hosting on our infrastructure
- Service-level agreements (99.9% uptime)
- Dedicated Slack channel with engineering team
- Custom integration assistance
- Volume licensing for agencies
- **Starting at $500/month**

### Year 1 Revenue Projection (Conservative)

**One-Time Sales:**
- 80 licenses × $349 average = $27,920

**Monthly Subscriptions:**
- 30 customers × $59 average × 8 months average = $14,160

**Enterprise Contracts:**
- 2 customers × $500 × 6 months average = $6,000

**Total Year 1: $48,080**

This validates product-market fit and funds Year 2 growth. The beauty of one-time licenses is they create cash flow for development while monthly subscriptions build recurring revenue foundation.

## Competitive Positioning

| **What They Do** | **What Subscrio Does** |
|-----------------|------------------------|
| **Stripe/Paddle:** Process payments and invoices | Translates paid subscriptions into feature entitlements |
| **LaunchDarkly/Split:** Roll out features gradually | Enforces what customers are allowed to access |
| **Auth0/Clerk:** User authentication and identity | Subscription and entitlement management |
| **Building in-house:** 120+ hours, ongoing maintenance | Production-ready in hours, updates included |

**Subscrio fills the gap between billing and application logic.**

## Why Subscrio Wins

**1. Purpose-Built Solution**
- Not a feature flag tool adapted for subscriptions
- Not a billing system trying to manage entitlements
- Focused exclusively on the entitlement layer

**2. Open Core Trust Model**
- Developers evaluate fully before buying
- No vendor lock-in—you own the data
- Community-driven improvements

**3. Time to Value**
- Integrate in hours, not weeks
- Pre-built admin UI saves $20K+ in development
- Change plans without deployments

**4. Developer Experience**
- TypeScript-first with full type safety
- Direct library integration (no REST latency for queries)
- PostgreSQL—no proprietary databases

**5. Business Flexibility**
- Product team controls features independently
- Sales can offer custom deals instantly
- Supports complex multi-product scenarios

## Next Steps

### Immediate (Next 30 Days)
- [ ] Finalize `@subscrio/core` documentation with quickstart guide
- [ ] Publish to npm with professional README and examples
- [ ] Create Subscrio landing page with demo video
- [ ] Set up Gumroad/Lemon Squeezy for license sales
- [ ] Write and publish first blog post: "The Missing Layer in Your SaaS Stack"

### Near-Term (60-90 Days)
- [ ] Complete admin dashboard MVP with core workflows
- [ ] Record comprehensive video walkthrough (15-20 minutes)
- [ ] Launch on Product Hunt and Hacker News
- [ ] Reach out to 50 target companies using SaaS subscription frameworks
- [ ] Create comparison guide: "Subscrio vs. Building In-House" (TCO calculator)
- [ ] Set up email automation for npm downloaders

### Long-Term (6-12 Months)
- [ ] Achieve 100 paid customers
- [ ] Publish 3-5 case studies from early adopters
- [ ] Launch agency partner program with referral structure
- [ ] Expand beyond Node.js ecosystem (Python client library)
- [ ] Host first "Subscrio SaaS Summit" virtual conference
- [ ] Introduce enterprise managed hosting tier

## Success Criteria

**Year 1 Goals:**
- 10,000+ npm downloads of core library
- 100+ paid licenses (any tier)
- $50K total revenue
- 70%+ renewal rate on monthly subscriptions
- 5+ case studies published
- <10% monthly churn

**Year 2 Goals:**
- 50,000+ npm downloads
- 500+ paid licenses
- $150K MRR
- <5% monthly churn
- 20+ agency partners
- Recognized as the standard solution for SaaS entitlement management