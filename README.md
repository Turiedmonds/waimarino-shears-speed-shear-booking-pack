# Waimarino Shears Incorporated — Speed Shear Hire & Booking Pack

Standalone browser-based booking and competition setup pack for Waimarino Shears Incorporated.

## Live site

https://turiedmonds.github.io/waimarino-shears-speed-shear-booking-pack/

## Current version

- App version: **1.3.1**
- Terms effective label: **August 2026**
- Timing-system import schema: **1**

## Booking flow

1. Hire Information
2. Booking Details
3. Competition Configuration
4. Review & Download
5. Submit Booking Request

The organiser accepts the Hire Terms & Conditions before submission. A submitted request is not confirmed until the NZ$300 deposit has been paid.

After submission:

- Waimarino Shears receives an internal email with the Booking Pack PDF and timing-system JSON attachment.
- The organiser receives a confirmation email with the Booking Pack PDF.
- Changes to a submitted booking are made by contacting **Waimarinoshears@gmail.com** and quoting the Booking Reference. A second booking request should not be submitted for changes.

## Booking Reference

The Google Apps Script backend automatically creates a human-readable unique reference when a booking is submitted.

Format:

`WS-YYYY-NNNN`

Example:

`WS-2026-0001`

The year is based on the competition year and the sequence is generated server-side.

## Timing-system JSON

The JSON attachment is specifically for import into the Speed Shear Timing System. It is not intended to duplicate the full commercial or agreement record.

It contains the competition setup information required for import, including:

- competition identity and date/time
- Booking Reference
- grades/events
- Programme of Events rounds
- sheep per shearer
- qualifiers
- clean-shear settings and time limit where applicable
- judging configuration

Agreement terms, commercial hire details and other organiser-facing contract information remain in the Booking Pack PDF/backend record rather than the timing-system import file.

## PDF behaviour

The submitted PDF includes:

- booking details
- booking cost
- entry arrangements
- judging configuration
- Programme of Events
- agreement record
- Booking Reference
- what happens next

`Clean shear: No` is not displayed. Clean-shear information is shown only when the selected grade/event is a clean shear.

## Main files

- `index.html` — page structure
- `styles.css` — base styling
- `logo.css` — branding and layout overrides
- `app.js` — core booking/configuration state and form logic
- `branding.js` — current business rules, submission UI and frontend submission endpoint
- `google-apps-script/Code.gs` — submission receiver, Booking Reference generation, PDF/JSON generation, Drive saving and email delivery
- `assets/Waimarino Shears Logo.png` — current logo

## Google Apps Script deployment

The live frontend submits to the web app endpoint configured in `branding.js`.

When `google-apps-script/Code.gs` changes:

1. Copy the current GitHub `Code.gs` into the Waimarino Speed Shear Booking Receiver Apps Script project.
2. Save the project.
3. Open **Deploy → Manage deployments**.
4. Edit the existing web app deployment.
5. Select **New version**.
6. Deploy the update.
7. Keep the existing web app URL unless a completely new deployment is intentionally created.

## Testing checklist

After a material change, test one complete booking and confirm:

- grade selection remains responsive
- Review & Download displays correctly
- submission succeeds
- organiser confirmation email arrives with PDF
- Waimarino Shears internal email arrives with PDF + JSON
- PDF dates, balance wording, Programme of Events and Booking Reference are correct
- Booking Reference increments uniquely
- timing-system JSON imports correctly
