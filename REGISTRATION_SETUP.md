# ADL 2027 Registration Backend Setup

The public registration flow is:

GitHub Pages registration form -> Vercel Function -> Google Apps Script -> Google Sheet

Participants never connect directly to Google.

## 1. Create the Google Sheet

Create a Google Sheet in the organizer's Google Drive, for example:

ADL 2027 Registrations

The Apps Script will automatically create a tab named `Registrations` and add the header row on the first successful submission.

## 2. Add the Google Apps Script

In the Google Sheet, open:

Extensions -> Apps Script

Replace the default script with the contents of:

`google-apps-script/Code.gs`

In Apps Script, open Project Settings -> Script Properties and create:

- Property: `REGISTRATION_SHARED_SECRET`
- Value: a long random secret string

Do not put this secret in GitHub.

Deploy the Apps Script as a Web App:

- Execute as: Me
- Who has access: Anyone

Copy the Web App URL ending in `/exec`.

## 3. Connect this repository to Vercel

Deploy the repository `haesangsun-bit/adl2027` as a Vercel project.

The server function is already located at:

`api/register.js`

The Vercel configuration is already in:

`vercel.json`

Add these Environment Variables in Vercel:

- `GOOGLE_APPS_SCRIPT_URL` = the Apps Script Web App `/exec` URL
- `REGISTRATION_SHARED_SECRET` = exactly the same secret stored in Apps Script
- `ALLOWED_ORIGINS` = `https://haesangsun-bit.github.io`

Redeploy after adding the variables.

The resulting API endpoint will be:

`https://<your-vercel-project>.vercel.app/api/register`

## 4. Activate the public form

The finished form is currently staged at:

`registration-form.html`

Before making it public:

1. Set the `data-registration-api` attribute on the opening `<html>` tag to the Vercel API endpoint.
2. Replace the current `registration.html` with the staged form.
3. Test one registration and verify that a row appears in the Google Sheet.

## Stored columns

The Sheet contains only:

1. Timestamp
2. Name
3. Affiliation
4. Position
5. Country / region
6. Attendance dates
7. Accommodation needed
8. Comments

No email address is collected.

## Security notes

- The Google Apps Script URL and shared secret are stored only in Vercel environment variables.
- The browser never receives the shared secret.
- The GitHub Pages site does not store registration data.
- A hidden honeypot field rejects simple automated spam submissions.
- The Vercel API accepts browser requests only from the configured site origin.
