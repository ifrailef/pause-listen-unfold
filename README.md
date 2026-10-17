# Pause. Listen. Unfold.

Website for Irene Fraile Fuente's holistic counselling & embodied musicianship practice.

Plain HTML/CSS/JS with native Netlify Forms email notifications. The build copies only public website assets into `public/`.

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

### Email setup — same system as nicolomantini.com

The reference site's live Netlify configuration was inspected: one native `email` notification on the `submission_created` event, for all forms, addressed to the owner. No custom email function or visitor autoresponder is deployed there.

In Irene's Netlify project, go to **Configuration > Notifications > Form submission notifications > Add notification > Email notification** (also accessible from Forms). Set the recipient to `pauselistenunfold@posteo.com` and select all forms, or add one notification each for `contact` and `booking`. Do not add duplicates if this notification already exists. This dashboard setting is required and cannot be enabled by HTML or `netlify.toml`; saving the notification does not require a new deploy.

The visitor's `email` field lets Irene reply to the visitor. Both forms include a subject field with a unique submission identifier, matching the reference site's approach. Netlify stores the submitted message and sends the owner notification through its own mail service; Irene's mailbox password is not used.

This matches the reference site: it sends owner notifications, not automatic confirmation emails to visitors. Visitors see an on-page acknowledgment. Booking requests remain pending until Irene replies.

The previous `submission-created` SMTP function has been removed. The `SMTP_*`, `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_OWNER`, and `MAIL_REPLY_TO` environment variables are no longer used and can be removed from Irene's Netlify settings. Revoke any exposed Resend key in Resend itself.

Run `npm test` and `npm run build` locally. Tests send no real emails. Basic localhost/file previews display an explicit preview message and preserve the entered data, as on the reference website. A live submission is required to confirm that Netlify's notification reaches Irene's inbox; local tests cannot verify that external setting.

The booking calendar is a lightweight picker: it does not check Irene's real calendar.

## Editing tips

- **Text:** edit directly in `index.html`.
- **Colors/fonts:** variables at the top of `styles.css` (the `:root` block).
- **Booking slots:** `TIME_SLOTS` and `FRIDAY_SLOTS` in `script.js`.
