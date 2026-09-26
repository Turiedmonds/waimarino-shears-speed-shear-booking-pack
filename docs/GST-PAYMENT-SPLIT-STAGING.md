# GST payment split staging — 27 September 2026

Status: source staged only; not approved for live rollout.

The agreed standard Speed Shear hire split is:

- hire base: NZ$750.00
- GST: NZ$112.50
- total booking: NZ$862.50
- deposit base: NZ$300.00
- deposit GST: NZ$45.00
- deposit invoice total: NZ$345.00
- remaining base: NZ$450.00
- remaining GST: NZ$67.50
- final invoice total: NZ$517.50

GST is apportioned between the two hire payments and is not charged twice.

Customer wording is staged on this branch for the booking page/terms, booking-request confirmation email, generated Booking Pack PDF, backup email path and Event System handoff.

Important deployment boundary:

- `main` is the GitHub Pages source for the live Booking Pack website at `bookings.waimarinoshears.com`.
- Do not merge this branch to `main` until the website change and Booking Receiver Apps Script update are ready to launch together and Turi has explicitly approved that coordinated rollout.
- The Google Apps Script production Booking Receiver has not been redeployed for this change.
- Live Speed Shear Stripe deposits remain disabled.

Before rollout, review cancellation/postponement wording and complete the Event System Stripe invoice implementation/test so the actual deposit invoice matches the customer-facing NZ$345 breakdown.