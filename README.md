# Pause. Listen. Unfold.

Website for Irene Fraile Fuente's holistic counselling & embodied musicianship practice.

Plain HTML/CSS/JS with a Netlify function for form emails. The build copies only public website assets into `public/`; email code and configuration stay outside the published directory.

## Files

```
index.html      All page content and structure
styles.css      All design (colors, type, layout, animation)
script.js       Mobile menu, scroll effects, booking calendar, form feedback
favicon.ico, favicon-*.png, apple-touch-icon.png   Browser tab / phone icons (made from the main logo)
assets/         Logos, About photo, Inquiry Circle and Common Ground sketches
netlify.toml    Netlify build/publish + security header settings
```

## Preview locally

Open `index.html` in your browser (double-click it). No server needed.

## Sync with GitHub

First time, from inside this folder:

```bash
git init
git add .
git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

(Create the empty repository on GitHub first, without a README or license.)

After any edit:

```bash
git add .
git commit -m "Describe your change"
git push
```

## Deploy on Netlify

1. app.netlify.com > **Add new site > Import an existing project** > choose this GitHub repository.
2. Use **Build command** `npm run build` and **Publish directory** `public` (set in `netlify.toml`).
3. Click **Deploy**. Netlify redeploys automatically on every `git push`.

## Forms

The contact form and the "Book Free Orientation Call" booking form both use **Netlify Forms**
(`data-netlify="true"`). They only deliver submissions once the site is hosted on Netlify.
Enable form detection in Netlify **Forms**, then redeploy. Submissions appear under **Forms**.

### Email setup (required before emails can be delivered)

The `submission-created` function sends two separate emails after Netlify verifies a contact or booking submission:

- Irene receives the submitted details at `pauselistenunfold@posteo.com`; Reply addresses the visitor.
- The visitor receives a fixed acknowledgment; Reply addresses Irene. Booking emails acknowledge a request, not a confirmed appointment.

Posteo is the default sender. In Netlify **Project configuration > Environment variables**, add `SMTP_PASSWORD` with Irene's Posteo password for SMTP (or the applicable app password). Scope it to **Functions** and the production deploy context. Do not put it in `netlify.toml`.

These settings are already supplied by the code and only need environment variables if overriding them:

| Variable | Value |
| --- | --- |
| `SMTP_HOST` | `posteo.de` |
| `SMTP_PORT` | `465` (TLS) |
| `SMTP_USER` | `pauselistenunfold@posteo.com`; override if Irene's Posteo login differs |
| `MAIL_FROM` | `pauselistenunfold@posteo.com` |

Enter secrets directly in Netlify, never in site files or chat. Redeploy after setting them. Deploy using the connected Git repository or Netlify CLI with functions support; uploading only the static website folder does not deploy the email function.

The form's on-page success message confirms Netlify received the submission, not email delivery. Check the `submission-created` function logs for delivery failures. A successful SMTP response means the mail server accepted the emails; check both recipient inboxes and spam folders to confirm arrival.

If native Netlify email notifications are already configured for Irene, remove the duplicate notification only after testing the function successfully. The function itself sends Irene's copy.

Run `npm ci`, `npm test`, and `npm run build` locally. Tests use a fake mail sender and send no real messages. A live submission is still required to verify Netlify's event trigger and both inboxes. There is no durable retry queue: if sending fails, the original submission remains in Netlify for follow-up; replaying an event can duplicate an already-sent email.

The booking calendar is a lightweight picker: it does not check Irene's real calendar.

## Editing tips

- **Text:** edit directly in `index.html`.
- **Colors/fonts:** variables at the top of `styles.css` (the `:root` block).
- **Booking slots:** `TIME_SLOTS` and `FRIDAY_SLOTS` in `script.js`.
