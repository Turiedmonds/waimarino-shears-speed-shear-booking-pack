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

Repository:

`Turiedmonds/waimarino-shears-speed-shear-booking-pack`

Production frontend:

`https://bookings.waimarinoshears.com`

Purpose:

The browser-based hire/booking and competition-configuration pack for the Waimarino Shears Speed Shear system. It collects the information needed for hire administration, generates the booking record/PDF and timing import, and creates the corresponding competition in the separate Speed Shear Entries system.

## Production baseline

Current verified production state as at 29 August 2026:

- Effective frontend/backend app version: **1.5.1** via the final Hire Options compatibility layer.
- Hire Options version: **1.0.5**.
- Current Hire Terms/privacy effective date: **28 August 2026**.
- Booking Receiver Google Apps Script active deployment: **Version 23**.
- Booking Receiver endpoint remains the existing production web-app deployment; do not create a replacement deployment unless intentionally required.
- Custom domain `bookings.waimarinoshears.com` is configured through Wix DNS/GitHub Pages.
- The shared Waimarino custom-dialog layer is published live and has been manually smoke-tested successfully in the production Booking Pack.
- The shared `ENTRY_MANAGER_SHARED_SECRET` was rotated on **29 August 2026** in both the Booking Receiver and Speed Shear Entry Manager Apps Script projects. The replacement value is intentionally not recorded in GitHub or chat.

## Uniform custom-dialog standard

The Speed Shear ecosystem is standardising user-controlled popup dialogs around the same Waimarino Shears visual pattern:

- white rounded panel;
- Waimarino red top accent;
- dark page overlay;
- **Waimarino Shears** eyebrow/branding;
- consistent heading, body copy and button spacing;
- red confirmation button only for destructive/warning actions;
- browser-native `alert()` / `confirm()` should not be used where the system controls the interface.

Booking Pack implementation:

- `waimarino-dialog.css` — shared modal styling;
- `waimarino-dialog.js` — reusable dialog API plus compatibility bridge for legacy native confirmation points;
- `clear-form.js` loads the shared dialog CSS/JS layer after the existing Booking Pack UI scripts.

The compatibility bridge intentionally preserves the existing tested actions and intercepts the known native-browser popup paths before replaying the original action after the user confirms.

Current Booking Pack actions covered:

- Clear Form / clear current draft;
- Delete Saved Draft;
- Reset Programme of Events;
- Remove Heats and run as a straight Final;
- Download Booking File despite review warnings;
- legacy Booking File open error alerts.

Existing custom dialogs such as Grade / Event Round Format help and Saved Drafts are visually harmonised by the same stylesheet.

Production browser testing has confirmed the new dialog presentation works correctly. Google/browser security or authorisation prompts are outside the application and cannot be restyled.

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

The secret value configured here must exactly match the `ENTRY_MANAGER_SHARED_SECRET` value configured in the Speed Shear Entry Manager Apps Script project. Both were rotated together on 29 August 2026 after the previous development secret had been exposed in conversation history. Script Property changes do not require a new Apps Script deployment.

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

The secret rotation itself is configuration-complete; the next new booking handoff will naturally confirm that the two rotated Script Property values still match.

## Current Entry Manager destination

Production Entry Manager/competitor domain:

`https://entries.waimarinoshears.com`

The Entry Manager and private System Operator Portal source are maintained in:

`Turiedmonds/speed-shear-roster-builder`

Work on Entry Manager UI, operator portal or competitor-entry behaviour belongs primarily in that repository unless the booking handoff itself must change.

## Files that are especially important

- `google-apps-script/EntryManagerHandoff.gs`
- `google-apps-script/HireOptions.gs`
- `google-apps-script/Code.gs`
- `competition-contact.js`
- `multi-booking-drafts.js`
- `terms-acceptance-final.js`
- `booking-policy-final.js`
- `booking-policy-final-core.js`
- `waimarino-dialog.css`
- `waimarino-dialog.js`
- `clear-form.js`

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
9. Record the new live version here and in `CHANGELOG.md`.

Frontend-only GitHub Pages changes do **not** require a Booking Receiver Apps Script deployment. Script Property value changes also do **not** require a new deployment.

## Security/cleanup note

The shared Booking Receiver ↔ Entry Manager secret rotation is complete. Never record the current secret value in this repository, chat, emails or public output.

## Next planned work

1. Let the next legitimate booking handoff confirm the rotated shared-secret pairing in normal operation; do not create a duplicate real booking solely for this test.
2. When back at the Raspberry Pi, complete the separate Timing System custom-dialog pull/test workflow from its own repository.

## Do not assume

- Do not assume old chat context is authoritative if it conflicts with repository source.
- Do not assume GitHub source is live until the relevant GitHub Pages publication or Apps Script deployment/version has also been updated.
- Do not change the production Apps Script deployment URL casually; both systems depend on it.
- Do not expose full access tokens or shared secrets in documentation.
