# CHANGELOG — Waimarino Shears Speed Shear Booking Pack

This changelog records meaningful completed changes. Keep it current whenever functionality, workflow, deployment, URLs, policy wording or architecture changes.

## 30 August 2026

### Hire Information entry-management wording

- Replaced the outdated **“Competition entry forms, if required”** item under **What we provide**.
- The Booking Pack now describes the actual supplied service as an **online competitor entry and competition entry management system**, allowing competitors to enter online while organisers can add manual entries and manage competitor registrations in one place.
- This is a frontend wording-only change and does not alter Entry Manager behaviour or require a Booking Receiver Apps Script deployment.

## 29 August 2026

### Hire Information introduction sign-off

- Changed the Step 1 introduction sign-off from **“Ngā mihi nui,”** to **“Noho ora mai,”** above **Waimarino Shears**.
- This is a frontend wording-only change; no Booking Receiver Apps Script deployment is required.

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
- Selected competition contact is passed into the Entry Manager handoff and becomes the organiser contact on the public competitor-entry form and automatic entry emails.
- Clarified system roles: Waimarino Shears is the system provider/operator; the competition organiser remains responsible for entry administration.

### Multiple booking drafts

- Added independent multi-booking draft storage.
- Added Saved Drafts UI with open/reload/delete/start-new behaviour.
- Prevented one competition draft from overwriting another in the same browser.
- Retained the legacy localStorage key only as a compatibility mirror.
- Tested two simultaneous booking drafts successfully.
