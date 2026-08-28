# CHANGELOG — Waimarino Shears Speed Shear Booking Pack

This changelog records meaningful completed changes. Keep it current whenever functionality, workflow, deployment, URLs, policy wording or architecture changes.

## 28 August 2026

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
- This is a GitHub Pages frontend change only; no Booking Receiver Apps Script deployment is required. Production publication/browser smoke testing remains pending.

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
