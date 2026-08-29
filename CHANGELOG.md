# CHANGELOG — Waimarino Shears Speed Shear Booking Pack

This changelog records meaningful completed changes. Keep it current whenever functionality, workflow, deployment, URLs, policy wording or architecture changes.

## 30 August 2026

### Custom Waimarino select dialogs

- Replaced the Booking Pack's browser-native `<select>` popup presentation with Waimarino Shears custom selection dialogs.
- The original `<select>` elements remain the source of truth and are kept in the page, hidden visually behind the custom control.
- Selecting an option in the custom dialog updates the original select value and dispatches its existing `input` / `change` events, preserving existing hire setup, branding, entries, judging, round-format, draft and validation logic.
- Dynamic select controls created later in the booking flow are also detected and wrapped automatically.
- Native date and time inputs were deliberately left unchanged because they have separate validation/interaction behaviour.
- GitHub Pages deployment for merge commit `cd0852345e0ce7cc934e8013f3e3f60de2632657` completed successfully.
- Manual iPad browser checking confirmed the custom dialogs display correctly for Hire setup, competition branding, competitor entry method and digital-entry selection.
- This was a frontend GitHub Pages change only; no Booking Receiver Apps Script deployment was required.

### Hire Information wording and index repair

- Changed the Step 1 introduction sign-off from **“Ngā mihi nui,”** to **“Noho ora mai,”** above **Waimarino Shears**.
- Replaced **“Competition entry forms, if required, to assist with competitor entries”** with **“Online competitor entry and competition entry management system, allowing competitors to enter online, organisers to add manual entries, and manage competitor registrations in one place.”**
- Corrected an accidental broad `index.html` replacement by restoring the exact known-good file from commit `194a13009798c9852a3b8cbc354abb564dfab0f7` and reapplying only those two wording changes.
- Verified the repaired `index.html` differs from that known-good source by exactly **2 additions and 2 deletions**.
- This is a GitHub Pages frontend change only; no Booking Receiver Apps Script deployment is required.

## 29 August 2026

### Booking Receiver ↔ Entry Manager shared secret rotated

- Rotated the `ENTRY_MANAGER_SHARED_SECRET` Script Property in the **Waimarino Speed Shear Booking Receiver** Apps Script project.
- Rotated the same `ENTRY_MANAGER_SHARED_SECRET` Script Property in the **Speed Shear Entry Manager** Apps Script project.
- The replacement value is intentionally not stored in GitHub, documentation or chat.
- `ENTRY_MANAGER_ENDPOINT` was not changed.
- Existing Booking References, competition records, manager/public tokens and existing competition links were not changed.
- No Booking Receiver deployment was required because this was a Script Property value change only.
- The previous development secret that had been exposed in conversation history is no longer the configured shared secret.
- The next legitimate booking handoff will naturally confirm the rotated values match; do not submit a duplicate real booking solely to test the secret.

## 28 August 2026

### Uniform Waimarino custom dialogs — production verified

- Production Booking Pack browser testing completed successfully after GitHub Pages publication.
- Confirmed the new Waimarino custom-dialog layer displays and behaves correctly in the live booking form.
- The underlying booking actions remain unchanged; this was a presentation/interaction replacement for browser-native popup UI.
- The Booking Pack popup standard can now be treated as live and verified.

### Uniform Waimarino custom dialogs

- Added `waimarino-dialog.css` and `waimarino-dialog.js` as the Booking Pack shared modal layer.
- Updated `clear-form.js` to load the shared dialog layer after the existing frontend compatibility scripts.
- Replaced the user experience for the known browser-native confirmation paths without rewriting their tested underlying actions.
- Custom Waimarino dialogs now cover:
  - Clear Form / clear current draft;
  - Delete Saved Draft;
  - Reset Programme of Events;
  - Remove Heats / run as a straight Final;
  - Download Booking File despite review warnings;
  - legacy Booking File open error alerts.
- Existing Grade / Event Round Format help and Saved Drafts dialogs are visually harmonised by the same stylesheet.
- Dialog standard: white rounded card, Waimarino red top accent, dark overlay, consistent heading/actions, with destructive confirmation clearly shown in red.
- Google/browser security and authorisation prompts remain platform UI and cannot be restyled.
- This is a GitHub Pages frontend change only; no Booking Receiver Apps Script deployment is required.
- Production browser smoke testing subsequently passed as recorded above.

### Booking contact and competitor-contact workflow

- Added dedicated **Competition contact for competitor enquiries** workflow.
- Booking contact can be reused or replaced with a separate competition contact.
- Selected competition contact is passed into the Speed Shear Entries/Entry Manager setup payload.
- Public competitor form and automatic entry emails use the selected competition contact.
- Clarified system roles: Waimarino Shears is the system provider/operator; the competition organiser remains responsible for entry administration.

### Multiple booking drafts

- Added independent multi-booking draft storage.
- Added Saved Drafts UI with open/reload/delete/start-new behaviour.
- Prevented one competition draft from overwriting another in the same browser.
- Retained the legacy localStorage key only as a compatibility mirror.
- Tested two simultaneous booking drafts successfully.

### Terms acceptance

- Fixed a compatibility race that could clear the accepted Hire Terms during final validation/submission.
- Locked current terms effective date to **28 August 2026** across the active compatibility layers.
- Current final terms guard uses `terms-acceptance-final.js` v1.1.0 and `booking-policy-final.js` v1.2.4.
- Full booking submission retest passed.

### Entry Manager handoff

- Connected Booking Receiver to the separate Speed Shear Entries backend using Script Properties for endpoint + shared secret.
- Added authorised competition setup handoff including Booking Reference, competition details, selected competition contact, grades/events and Programme of Events.
- Added private/public Entry Manager links/status to the internal Waimarino Shears booking email.
- Fixed `HireOptions.gs` wrapper so it forwards the `entryManagerHandoff` argument rather than dropping it.
- Hire Options moved to **1.0.5** with final app version **1.5.1** and terms version **28 August 2026**.

### Production deployment

- Booking Receiver deployed as **Version 22** after the Hire Options handoff fix.
- Booking Receiver deployed as **Version 23** after final Entry Manager handoff/link updates.
- Existing production web-app deployment URL retained.

### End-to-end verification

- Booking **WS-2026-0016 — Speedshear o ngā Taniwha** successfully submitted.
- Internal booking email, PDF and timing JSON received.
- Entry Manager competition record created successfully.
- Private and public competition links opened correctly.
- Public entry submission, competitor receipt, organiser notification and Waimarino Shears backup email were verified.
- Entry Manager custom domain later verified as `entries.waimarinoshears.com`; old GitHub-hosted links redirect correctly.

### Documentation

- Replaced stale README production details with the current live baseline.
- Added `PROJECT_STATE.md` as the authoritative future-session handoff.
- Added this changelog.
- Added standing documentation rule: meaningful changes must update project state and changelog before completion.
