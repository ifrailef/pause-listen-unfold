const { mkdirSync, copyFileSync, cpSync } = require('node:fs');
mkdirSync('public', { recursive: true });
for (const file of ['index.html', 'thank-you.html', 'script.js', 'styles.css',
  'favicon.ico', 'favicon.svg', 'favicon-32x32.png', 'favicon-192x192.png', 'apple-touch-icon.png']) {
  copyFileSync(file, `public/${file}`);
}
cpSync('assets', 'public/assets', { recursive: true });
