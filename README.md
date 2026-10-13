# Pause. Listen. Unfold.

Website for Irene Fraile Fuente's holistic counselling & embodied musicianship practice.

Plain HTML/CSS/JS: no build step, no dependencies. Easy to host on GitHub + Netlify and to edit by hand.

## Files

```
index.html      All page content and structure
styles.css      All design (colors, type, layout, animation)
script.js       Mobile menu, scroll effects, booking calendar, form feedback
favicon.svg     Browser tab icon
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
2. Leave **Build command** empty and **Publish directory** as `.` (already set in `netlify.toml`).
3. Click **Deploy**. Netlify redeploys automatically on every `git push`.

## Forms

The contact form and the "Book Free Orientation Call" booking form both use **Netlify Forms**
(`data-netlify="true"`). They only deliver submissions once the site is hosted on Netlify.
Submissions appear under **Forms** in the Netlify dashboard; set up email notifications under
**Site settings > Forms > Form notifications**.

The booking calendar is a lightweight picker: it does not check Irene's real calendar.

## Editing tips

- **Text:** edit directly in `index.html`.
- **Colors/fonts:** variables at the top of `styles.css` (the `:root` block).
- **Booking slots:** `TIME_SLOTS` and `FRIDAY_SLOTS` in `script.js`.
