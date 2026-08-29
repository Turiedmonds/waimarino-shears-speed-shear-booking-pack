# PROJECT STATE — Waimarino Shears Speed Shear Booking Pack

**Last updated:** 29 August 2026

This file is the authoritative current-state handoff for future ChatGPT/Codex sessions.

## Working rule for future changes

Before making changes:

1. Read `README.md`.
2. Read this file completely.
3. Read the latest entries in `CHANGELOG.md`.
4. Inspect the exact live/repository source before assuming behaviour.

Before finishing any meaningful change:

1. Update this file if the current state, architecture, deployment, URLs, workflow, known limitations or next steps changed.
2. Add a dated entry to `CHANGELOG.md`.
3. Update `README.md` if public behaviour, setup or deployment instructions changed.
4. Do not rely on a previous chat as the only record of an implementation decision.

## Project identity

Repository: `Turiedmonds/waimarino-shears-speed-shear-booking-pack`

Production frontend: `https://bookings.waimarinoshears.com`

Purpose: browser-based hire/booking and competition-configuration pack for the Waimarino Shears Speed Shear system.

## Production baseline

Current verified production state as at 29 August 2026:

- Effective frontend/backend app version: **1.5.1** via the final Hire Options compatibility layer.
- Hire Options version: **1.0.5**.
- Current Hire Terms/privacy effective date: **28 August 2026**.
- Booking Receiver Google Apps Script active deployment: **Version 23**.
- Booking Receiver endpoint remains the existing production web-app deployment; do not create a replacement deployment unless intentionally required.
- Custom domain `bookings.waimarinoshears.com` is configured through Wix DNS/GitHub Pages.
- Shared Waimarino custom-dialog layer is published and smoke-tested.
- Shared `ENTRY_MANAGER_SHARED_SECRET` was rotated on 29 August 2026 in both Booking Receiver and Speed Shear Entry Manager; never record or reveal its value.
- Step 1 Hire Information introduction now signs off **“Noho ora mai,”** followed by **Waimarino Shears**; this is frontend-only and awaits normal GitHub Pages publication/visual check.

## Uniform custom-dialog standard

User-controlled dialogs use the Waimarino pattern: white rounded panel, red top accent, dark overlay, Waimarino branding, consistent heading/actions, destructive confirmation in red. Browser-native alerts/confirms should not be used where application UI can control the interaction.

Booking Pack implementation uses `waimarino-dialog.css` and `waimarino-dialog.js`, loaded by `clear-form.js` after the existing application scripts.

## Booking flow

1. Hire Information
2. Booking Details
3. Competition Configuration
4. Review & Submit

The organiser accepts the Hire Terms & Conditions before submission. A submitted booking request is not treated as confirmed until the required booking/deposit process has been completed.

## Competition contact for competitor enquiries

The booking pack records which competition contact should be shown to competitors and used by the Speed Shear Entries system. The organiser can reuse the booking contact or supply a separate competition contact. The selected contact is passed to the Entry Manager/public form and entry emails.

## Multiple booking drafts

Multiple independent saved booking drafts are supported in the same browser. Each draft has its own booking ID and does not overwrite another competition draft.

## Booking Reference and Entry Manager handoff

The Booking Receiver creates the booking reference and sends the authorised competition setup payload to the separate Speed Shear Entries system. Existing central-record architecture and endpoints remain unchanged.

Required shared Script Property: `ENTRY_MANAGER_SHARED_SECRET`. Never commit/document its value.

## Current wording note

Step 1 introduction closing text is:

**Noho ora mai,**  
**Waimarino Shears**

This replaces the previous **Ngā mihi nui,** wording only; no other introduction text or booking logic changed.

## Deployment notes

Frontend changes publish through GitHub Pages. The introduction wording change does not require a Booking Receiver Apps Script deployment.

## Next planned work

1. After GitHub Pages publishes the Step 1 wording change, visually confirm **Noho ora mai, Waimarino Shears** appears correctly.
2. Continue normal Booking Pack regression checks only if another issue is found.

For detailed historical changes, see `CHANGELOG.md`.