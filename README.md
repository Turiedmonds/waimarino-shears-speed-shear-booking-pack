# Waimarino Shears Incorporated — Speed Shear Hire & Booking Pack

Browser-based booking and competition setup pack used for Waimarino Shears Speed Shear system hire.

## Live site

https://bookings.waimarinoshears.com

## Start here in a new ChatGPT/Codex session

Before making changes, read these files in this order:

1. `README.md`
2. `PROJECT_STATE.md`
3. `CHANGELOG.md`

`PROJECT_STATE.md` is the authoritative current-state handoff. `CHANGELOG.md` records completed changes by date.

**Maintenance rule:** every meaningful functional, workflow, deployment, URL, data-model or policy change must update `PROJECT_STATE.md` and `CHANGELOG.md` before the work is considered finished. Update this README when architecture, deployment instructions or public behaviour changes.

## Current production baseline

As at **30 August 2026**:

- Effective app version: **1.5.1**
- Hire options layer: **1.0.5**
- Terms/privacy effective date: **28 August 2026**
- Booking Receiver Apps Script live deployment: **Version 23**
- Booking Pack custom domain: **bookings.waimarinoshears.com**
- Entry Manager handoff is live and connected to the separate Speed Shear Entries system.
- Uniform Waimarino custom confirmation/error dialogs are live and production verified.
- Booking Pack `<select>` controls now use Waimarino Shears custom option dialogs rather than browser/device-native option popups. The original selects remain underneath as the actual form controls so existing booking logic continues to run through the same `input` / `change` events.
- Native competition date/time pickers remain unchanged.

See `PROJECT_STATE.md` for the full verified state and outstanding work.

## Booking flow

1. Hire Information
2. Booking Details
3. Competition Configuration
4. Review & Download
5. Submit Booking Request

The organiser accepts the Hire Terms & Conditions before submission. A submitted booking request is not treated as confirmed until the required booking/deposit process has been completed.

## Uniform dialogs

User-controlled confirmation/error popups and select-option pickers use the same Waimarino Shears visual style across the Speed Shear web tools: white rounded panel, red top accent, dark overlay, consistent wording/actions and destructive buttons clearly marked in red.

Booking Pack implementation:

- `waimarino-dialog.css`
- `waimarino-dialog.js`
- loaded by the final `clear-form.js` compatibility layer

The shared dialog layer replaces the Booking Pack's known browser-native confirmations for clearing drafts/forms, deleting saved drafts, resetting the Programme of Events, converting a grade/event to a straight Final, and downloading a Booking File despite review warnings. Legacy application alerts are also presented through the custom dialog layer.

The same frontend layer now provides custom option dialogs for Booking Pack `<select>` controls such as Hire setup, branding, competition entry method, digital entries, judging and round-format selections. The underlying select values and existing listeners are preserved rather than replacing the booking data model or workflow logic.

Google/browser account, permission or security prompts are platform UI and cannot be restyled by the Booking Pack. Competition date and start time are deliberately left on their existing native picker/validation path.

## Competition contact for competitor enquiries

The booking pack records which competition contact should be shown to competitors and used by the Speed Shear Entries system.

The organiser can either:

- use the booking contact details; or
- provide a separate competition contact.

The selected competition contact is passed into the Entry Manager handoff and becomes the organiser contact on the public competitor-entry form and automatic entry emails.

Waimarino Shears is the system provider/operator. The competition organiser remains responsible for competition administration, competitor enquiries, entry changes/cancellations, payments and check-in.

## Multiple booking drafts

The frontend supports multiple independent saved booking drafts in the same browser. Each draft has its own booking ID, can be reopened later, and does not overwrite another competition draft.

## Booking Reference

The Google Apps Script backend creates a human-readable unique reference when a booking is submitted.

Format:

`WS-YYYY-NNNN`

Example:

`WS-2026-0016`

## Entry Manager handoff

After a successful booking submission, the Booking Receiver sends an authorised competition-setup payload to the separate Speed Shear Entries backend.

The handoff includes:

- Booking Reference
- competition name, date and venue
- selected competition contact
- grades/events
- confirmed Programme of Events

The Entry Manager backend creates or reuses the competition record and returns private organiser and public competitor-entry links. Those links are included in the internal Waimarino Shears booking email, not automatically released to the organiser at booking-request stage.

The current public Entry Manager domain is:

`https://entries.waimarinoshears.com`

## After submission

A successful booking request currently produces:

- internal Waimarino Shears email with booking details, Booking Pack PDF, timing-system JSON and Entry Manager links/status;
- organiser booking confirmation email with the Booking Pack PDF;
- Entry Manager competition record created from the booking data.

Changes to a submitted booking should be handled against the existing Booking Reference rather than by submitting a duplicate booking request.

## Timing-system JSON

The JSON attachment is specifically for import into the Speed Shear Timing System. It is not intended to duplicate the full commercial or agreement record.

It contains competition setup information required for import, including:

- competition identity and date/time
- Booking Reference
- grades/events
- Programme of Events rounds
- sheep per shearer
- qualifiers
- clean-shear settings/time limits where applicable
- judging configuration

Commercial hire details and the agreement record remain in the Booking Pack PDF/backend record.

## Main files

Frontend:

- `index.html` — main booking page
- `styles.css` — base styling
- `app.js` — core booking/configuration state and form logic
- `branding.js` — business rules/submission endpoint layer
- `competition-contact.js` — competition contact workflow
- `multi-booking-drafts.js` — independent saved booking drafts
- `terms-acceptance-final.js` — final terms acceptance guard
- `booking-policy-final.js` / `booking-policy-final-core.js` — current booking policy compatibility layer
- `waimarino-dialog.css` / `waimarino-dialog.js` — shared custom popup and select-picker presentation/compatibility layer
- `clear-form.js` — final frontend loader that also loads the shared dialog layer

Google Apps Script source:

- `google-apps-script/Code.gs` — booking receiver, references, files and emails
- `google-apps-script/HireOptions.gs` — hire options and final version/terms overrides
- `google-apps-script/EntryManagerHandoff.gs` — Booking Pack → Entry Manager handoff
- `google-apps-script/PdfLayoutPolish.gs` — PDF layout/polish
- `google-apps-script/BookingDateRules.gs` — booking date rules

## Google Apps Script deployment

The live Booking Receiver is a versioned Google Apps Script web app.

When server-side Apps Script changes are made:

1. Copy the complete current repository file(s) into the Waimarino Speed Shear Booking Receiver Apps Script project.
2. Save the Apps Script project.
3. Open **Deploy → Manage deployments**.
4. Edit the active web app deployment.
5. Select **New version**.
6. Deploy.
7. Keep the existing web app URL unless a new deployment is intentionally required.
8. Record the new live version in `PROJECT_STATE.md` and `CHANGELOG.md`.

Frontend-only GitHub Pages changes such as dialog styling do not require a Booking Receiver Apps Script deployment.

## Testing baseline

After a material booking-flow change, test at least one complete booking and confirm:

- booking form still progresses normally;
- Terms acceptance remains accepted through final submission;
- multiple saved drafts remain independent;
- custom confirmation dialogs do not change the underlying action being confirmed;
- custom select dialogs leave the original form value/listener behaviour intact;
- internal Waimarino email arrives with PDF + JSON;
- organiser booking confirmation arrives with PDF;
- Entry Manager competition record is created successfully;
- returned private/public links open the correct competition;
- selected competition contact is passed correctly;
- Booking Reference and competition data are correct.
