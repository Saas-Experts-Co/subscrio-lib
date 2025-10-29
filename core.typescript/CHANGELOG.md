# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-12-19

### Added
- Initial release of @subscrio/core TypeScript library
- Complete subscription management system with feature flags
- PostgreSQL integration with Drizzle ORM
- Stripe webhook processing and integration
- Feature resolution hierarchy (subscription overrides → plan values → defaults)
- API key management with scoped permissions
- Comprehensive TypeScript type definitions
- ESM and CommonJS dual package support
- Full test suite with E2E testing

### Features
- **Product Management**: Create and manage subscription products
- **Feature Flags**: Granular feature control with numeric, toggle, and text values
- **Plan Management**: Flexible subscription plans with feature value overrides
- **Customer Management**: Customer lifecycle and external ID mapping
- **Subscription Lifecycle**: Complete subscription management from trial to renewal
- **Billing Cycles**: Flexible billing periods (monthly, annual, custom)
- **Feature Resolution**: Smart hierarchy for determining feature access
- **Stripe Integration**: Webhook processing and payment synchronization
- **API Keys**: Secure API access with admin and readonly scopes
- **TypeScript Support**: Full type safety and excellent developer experience

### Technical Details
- Built with TypeScript 5.0+
- Uses Drizzle ORM for database operations
- Supports PostgreSQL 12+
- Node.js 18+ required
- MIT License
