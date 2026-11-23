# Pause. Listen. Unfold.

Website for Irene Fraile Fuente's holistic counselling & embodied musicianship practice.

Plain HTML/CSS/JS: no build step, no dependencies. Easy to host on GitHub + Netlify and to edit by hand.

## Files

```
index.html      All page content and structure
styles.css      All design (colors, type, layout, animation)
script.js       Mobile menu, scroll effects, booking calendar, form feedback
favicon.ico, favicon-*.png, apple-touch-icon.png   Browser tab / phone icons (made from the main logo)
assets/         Logos, About photo, Inquiry Circle and Common Ground sketches
netlify.toml    Netlify build/publish + security header settings
netlify/functions/submission-created.js   Sends confirmation emails after a form is submitted
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
2. Leave **Build command** empty and **Publish directory** as `.` (already set in `netlify.toml`).
3. Click **Deploy**. Netlify redeploys automatically on every `git push`.

## Forms

The contact form and the "Book Free Orientation Call" booking form both use **Netlify Forms**
(`data-netlify="true"`). They only deliver submissions once the site is hosted on Netlify.
Submissions appear under **Forms** in the Netlify dashboard; set up email notifications under
**Site settings > Forms > Form notifications**.

The "Book Free Orientation Call" button opens a short name + email form; Irene replies by email to arrange a time.

## Editing tips

- **Text:** edit directly in `index.html`.
- **Colors/fonts:** variables at the top of `styles.css` (the `:root` block).

## Confirmation emails (Resend)

`netlify/functions/submission-created.js` runs automatically after every verified form submission.
It emails the visitor a confirmation (a different text for the contact form and the booking form),
and optionally sends Irene a copy.

Setup, one time:

1. Create a free account at resend.com and add the domain `pauselistenunfold.com`.
   Resend shows DNS records (SPF/DKIM); add them in GoDaddy DNS and wait until Resend says "Verified".
2. In Resend, create an API key.
3. In Netlify: **Site configuration > Environment variables**, add:
   - `RESEND_API_KEY`: the key from step 2
   - `MAIL_FROM`: for example `Irene Fraile Fuente <hello@pauselistenunfold.com>` (must be on the verified domain)
   - `MAIL_REPLY_TO` (optional): where visitor replies go (default `pauselistenunfold@posteo.com`)
   - `MAIL_OWNER` (optional): an address that gets a copy of every submission
4. Push this folder to GitHub so Netlify redeploys, then send a test message from the live site.
   Errors appear in Netlify under **Logs > Functions > submission-created**.

To change the wording of the emails, edit `visitorEmail()` in the function file.
