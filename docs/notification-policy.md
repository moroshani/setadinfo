# Notification Policy

SetadInfo sends messages only when a user-visible fact changes.

## Event Types

- `baseline_summary`: one first-run summary for a monitor.
- `listing_new`: a new matching خرید، مناقصه، or مزایده appears.
- `listing_changed`: an important listing field changes.
- `listing_removed`: a previously matched listing disappears from the monitor result.
- `offer_new`: a new public auction offer appears.
- `offer_changed`: an important auction offer field changes.
- `run_failed`: a monitor run fails and the failure alert is not throttled.
- `monitor_needs_attention`: a monitor changes state in a way the operator should notice.

## Message Rules

- Unchanged scheduled checks do not send messages.
- The first successful run sends one baseline summary, not one message per listing.
- Listing and offer changes include before/after values when available.
- Rubika messages are compact Persian text and always explain why they were sent.
- Failed delivery attempts are recorded and can be retried without recreating events.

## Important Listing Fields

Title, organization, province, city, category, send deadline, document deadline, price, and detail URL are considered user-visible fields.

## Important Offer Fields

Bidder, amount, submitted time, status, and rank are considered user-visible offer fields.
