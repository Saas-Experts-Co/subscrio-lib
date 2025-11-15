# Subscription Lifecycle Reference

This guide explains every subscription status exposed by `SubscriptionDto.status`, the exact calculation rules, and how statuses can flow over time. These rules are enforced inside the `Subscription` domain entity, so every fetch reflects the latest lifecycle state without requiring callers to run manual cron jobs or SQL scripts.

## Calculation Order

Statuses are evaluated in a strict priority order. The first rule that matches wins:

1. `cancelled`
2. `expired`
3. `trial`
4. `cancellation_pending`
5. `suspended`
6. `active`
7. `pending` (fallback when activation has not happened yet)

If two conditions could apply simultaneously, whichever appears earlier in the list takes precedence.

## Status Definitions

| Status | How it is calculated | Typical usage |
| --- | --- | --- |
| `pending` | Subscription exists but `activationDate` is missing or in the future. None of the other rules match yet. | Pre-provisioned subscriptions waiting for onboarding or payment confirmation. |
| `active` | Default state once `activationDate` is in the past and there are no cancellations, expirations, suspensions, or trials in play. | Normal billing periods after trial completion. |
| `trial` | `trialEndDate` exists and is greater than the current time. Overrides `active` as long as the trial is ongoing. | Limited-time access before billing starts. |
| `cancellation_pending` | `cancellationDate` is set (indicating the subscriber asked to cancel) but the current period end or cancellation date is still in the future. | Grace period between a cancellation request and the final cut-off. |
| `cancelled` | `cancellationDate` exists and is in the past (or equals now). Indicates the subscription has fully ended due to cancellation. | Final state after the cancellation effective date passes. |
| `expired` | `expirationDate` exists and is in the past, **and** there is no cancellation. Used for time-bound subscriptions that simply reach their expiration. | Fixed-term offers or promotional subscriptions that lapse automatically. |
| `suspended` | Subscription has been explicitly suspended via `suspend()` (e.g., payment failure or manual enforcement). This state only applies when none of the higher-priority rules match. | Temporary service pause until the issue is resolved. |

> **Important**: `cancellation_pending` and `cancelled` always win over `trial`, `active`, `suspended`, and `pending`. This ensures cancellation intent is honored regardless of trial or suspension status.

## Status Flow Diagram

```mermaid
flowchart LR
    Pending["pending\n(no activation yet)"] -->|activationDate reached| Trial
    Pending -->|activationDate reached| Active
    Trial["trial\n(trialEndDate in future)"] -->|trialEndDate passed| Active
    Active -->|suspend()| Suspended
    Suspended["suspended\n(manual suspension)"] -->|resume()| Active
    Active -->|set cancellationDate in future| CancelPending
    Trial -->|set cancellationDate in future| CancelPending
    CancelPending["cancellation_pending\n(cancellationDate in future)"] -->|cancellationDate reached| Cancelled
    Active -->|set expirationDate in future| ActiveExp
    ActiveExp["active\n(with expiration pending)"] -->|expirationDate reached| Expired
    Pending -->|set expirationDate in future| Pending
    Expired["expired\n(expirationDate passed)"]
    Cancelled["cancelled\n(cancellationDate passed)"]
```

The diagram illustrates common flows but does not represent every edge case (e.g., reactivation or plan transitions). Any state may move directly to `cancelled` or `expired` when the relevant date is set retroactively.

## Practical Tips

- Setting `trialEndDate` automatically enters `trial` until the timestamp is reached. Remove or backdate the field to exit trial immediately.
- To stage a future cancellation, set `cancellationDate` to the end of the current period. The subscription becomes `cancellation_pending` until the date passes.
- Removing `cancellationDate` (e.g., a customer rescinds cancellation) returns the subscription to `active` or `trial`, depending on other fields.
- `suspended` is only set via explicit service calls (e.g., billing failure automation). Once you call `resume()`, the entity recomputes to whichever status applies next (`active`, `trial`, etc.).

Refer back to `subscriptions.md` for lifecycle-related APIs (`archiveSubscription`, `processAutomaticTransitions`, etc.), and to `feature-checker.md` for how these statuses affect runtime feature access.

