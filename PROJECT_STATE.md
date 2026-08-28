# PROJECT STATE — Waimarino Shears Speed Shear Booking Pack

**Last updated:** 28 August 2026

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

Repository:

`Turiedmonds/waimarino-shears-speed-shear-booking-pack`

Production frontend:

`https://bookings.waimarinoshears.com`

Purpose:

The browser-based hire/booking and competition-configuration pack for the Waimarino Shears Speed Shear system. It collects the information needed for hire administration, generates the booking record/PDF and timing import, and creates the corresponding competition in the separate Speed Shear Entries system.

## Production baseline

Current verified production state as at 28 August 2026:

- Effective frontend/backend app version: **1.5.1** via the final Hire Options compatibility layer.
- Hire Options version: **1.0.5**.
- Current Hire Terms/privacy effective date: **28 August 2026**.
- Booking Receiver Google Apps Script active deployment: **Version 23**.
- Booking Receiver endpoint remains the existing production web-app deployment; do not create a replacement deployment unless intentionally required.
- Custom domain `bookings.waimarinoshears.com` is configured through Wix DNS/GitHub Pages.

## Confirmed booking workflow

The booking pack currently supports:

- booking/hirer contact details;
- competition name, venue, date and start time;
- hire/setup options;
- grades/events and Programme of Events;
- judging configuration;
- clean-shear settings where applicable;
- hire Terms acceptance;
- review/submission;
- generated Booking Reference;
- PDF booking record;
- timing-system JSON;
- Entry Manager competition creation.

A booking request is received before the final commercial/deposit confirmation process is complete. Entry Manager links are created internally but are not automatically released to the competition organiser with the initial booking request.

## Competition contact workflow

The booking pack has a dedicated **Competition contact for competitor enquiries** workflow.

Default:

- `Use booking contact details above` is selected.

Alternative:

- organiser can provide a different competition contact name/role;
- phone and/or email can be supplied;
- the selected details are previewed;
- the selected details are authorised for use on the public competitor form and related automatic emails.

Data location:

`state.entries.competitorContact`

The selected contact is passed by `google-apps-script/EntryManagerHandoff.gs` as the Entry Manager `organiser` contact.

Important role distinction:

- Waimarino Shears = system provider/operator.
- Competition organiser = event/entry administrator responsible for competitor enquiries, changes/cancellations, entry fees/payments, check-in and draw administration.

Do not describe Waimarino Shears as the competition organiser unless it actually is the organiser of that specific event.

## Multiple booking drafts

The frontend supports multiple independent local booking drafts.

Implementation:

`multi-booking-drafts.js`

Key behaviour:

- each draft receives a unique `bookingId`;
- multiple competitions can be held safely in the same browser;
- Saved Drafts UI allows Open/Reload/Delete/Start New Booking;
- switching drafts does not overwrite another competition;
- the legacy localStorage key is retained only as a compatibility mirror;
- a successfully submitted draft is removed from the active draft set.

This behaviour was manually tested with two simultaneous test bookings and passed.

## Terms acceptance fix

A previous compatibility race caused the accepted Terms checkbox to be silently reset during final submission validation.

The current fix uses:

- `terms-acceptance-final.js` v1.1.0;
- `booking-policy-final.js` v1.2.4;
- the explicit current-terms accepted state/guard.

Manual retest passed: booking submission completed with the Terms acceptance retained.

Do not remove the final acceptance guard or revert to the older compatibility behaviour without retesting the complete submission flow.

## Entry Manager handoff

Server-side source:

`google-apps-script/EntryManagerHandoff.gs`

Configuration comes from Booking Receiver Script Properties:

- `ENTRY_MANAGER_ENDPOINT`
- `ENTRY_MANAGER_SHARED_SECRET`

Do not place the shared secret in repository files, documentation or user-facing output.

Handoff payload includes:

- Booking Reference;
- competition name/date/venue;
- selected competition contact;
- competition events/grades;
- confirmed Programme of Events.

The Booking Receiver calls the Entry Manager backend before rendering the internal booking email. The returned links/status are then shown in the internal Waimarino Shears email.

### Important bug already fixed

`HireOptions.gs` previously wrapped `buildInternalEmailHtml_` but dropped the second `entryManagerHandoff` argument. This made successful Entry Manager handoffs appear as failures in the HTML email.

Fixed in Hire Options **1.0.5** by forwarding both arguments:

`buildInternalEmailHtml_(pack, entryManagerHandoff)`

Do not reintroduce the one-argument wrapper.

## Verified end-to-end test

Test booking:

- Booking Reference: **WS-2026-0016**
- Competition: **Speedshear o ngā Taniwha**
- Date: **18 September 2026**
- Venue: **Turangawaewae marae**

Verified outcomes:

- booking submission succeeded;
- internal Waimarino Shears booking email arrived;
- Booking Pack PDF + timing JSON were attached;
- Entry Manager competition record was created;
- private Entry Manager link opened the correct competition;
- public competitor-entry link opened the correct competition;
- online entries appeared in the private manager;
- competitor receipt email worked;
- organiser new-entry notification worked;
- Waimarino Shears backup copy worked;
- old GitHub-hosted links already present in emails redirect successfully to the new custom Entry Manager domain.

## Current Entry Manager destination

Production Entry Manager/competitor domain:

`https://entries.waimarinoshears.com`

The Entry Manager is maintained in the separate repository:

`Turiedmonds/speed-shear-roster-builder`

Future work on Entry Manager UI, short links, operator portal or competitor-entry behaviour belongs primarily in that repository unless the booking handoff itself must change.

## Files that are especially important

- `google-apps-script/EntryManagerHandoff.gs`
- `google-apps-script/HireOptions.gs`
- `google-apps-script/Code.gs`
- `competition-contact.js`
- `multi-booking-drafts.js`
- `terms-acceptance-final.js`
- `booking-policy-final.js`
- `booking-policy-final-core.js`

## Deployment procedure

For Booking Receiver Apps Script changes:

1. Use the full current repository file, not a partial/manual line edit where avoidable.
2. Replace the corresponding live Apps Script file.
3. Save to Drive.
4. **Deploy → Manage deployments**.
5. Edit the active deployment.
6. Choose **New version**.
7. Deploy.
8. Confirm the active version and existing web-app URL.
9. Record the deployment version here and in `CHANGELOG.md`.

## Security/cleanup note

The shared Booking Receiver ↔ Entry Manager secret was exposed during development/testing conversation history. It should be rotated in both Apps Script projects before treating the setup as final production-hardening. Never record the secret value in this repository.

## Next planned work

The immediate next project is a **System Operator Portal** for Waimarino Shears.

Goal:

One permanent operator page where Waimarino Shears can see/open all competitions and their private/public entry links instead of searching booking emails.

The portal should be started from the `speed-shear-roster-builder` repository context, not by changing the Booking Pack frontend first.

## Do not assume

- Do not assume old chat context is authoritative if it conflicts with repository source.
- Do not assume GitHub source is live until the relevant Apps Script deployment/version has also been updated.
- Do not change the production Apps Script deployment URL casually; both systems depend on it.
- Do not expose full access tokens or shared secrets in documentation.
