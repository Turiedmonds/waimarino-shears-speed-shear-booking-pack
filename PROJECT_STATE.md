## Event System booking handoff deployed to Booking Receiver — 23 September 2026

Turi explicitly approved and completed the existing Booking Receiver web-app deployment update for the Event System handoff. The active deployment was updated in place to **Version 24** using the existing deployment ID/URL; no replacement Booking Receiver deployment was created.

The production Booking Receiver now includes `EventSystemHandoff.gs` and the updated `Code.gs` call path. Required Script Properties had already been configured:
- `EVENT_SYSTEM_BOOKING_ENDPOINT`
- `EVENT_SYSTEM_SHARED_SECRET`

The Event System matching Cloudflare secret remains `BOOKING_PACK_SHARED_SECRET`.

Immediate acceptance checkpoint: submit one clearly labelled test booking through the live Booking Pack using a Waimarino-controlled email address. Confirm the same Booking Reference appears once in **Events → Speed Shear Bookings**, the Entry Manager record is still created, and the internal booking email reports the Event System handoff as recorded. Do not send a deposit invoice yet until the handoff is accepted.

