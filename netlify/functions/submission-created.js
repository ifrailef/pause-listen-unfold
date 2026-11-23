// Runs automatically on Netlify every time a (verified) form submission arrives.
// Sends the visitor a confirmation email through Resend and, optionally,
// a copy of the submission to the site owner.
//
// Environment variables (Netlify > Site configuration > Environment variables):
//   RESEND_API_KEY   required  API key from resend.com
//   MAIL_FROM        required  e.g.  Irene Fraile Fuente <hello@pauselistenunfold.com>
//                              (the domain must be verified in Resend)
//   MAIL_REPLY_TO    optional  where visitor replies go (default: pauselistenunfold@posteo.com)
//   MAIL_OWNER       optional  if set, a copy of every submission is emailed here too

const DEFAULT_REPLY_TO = 'pauselistenunfold@posteo.com';

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

// Strip line breaks so visitor-supplied text can never inject email headers.
const oneLine = (s) => String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').trim();

function visitorEmail(formName, data) {
  const name = oneLine(data.name) || 'there';
  if (formName === 'booking') {
    const when = [oneLine(data.date), oneLine(data.time)].filter(Boolean).join(' at ');
    return {
      subject: 'Your orientation call request: pending confirmation',
      text:
        `Hi ${name},\n\n` +
        `Thank you for requesting a free orientation call${when ? ' on ' + when : ''}.\n\n` +
        `This request is pending confirmation. I will be in touch by email shortly to arrange a time.\n\n` +
        `With warmth,\nIrene Fraile Fuente\nPause. Listen. Unfold.\n`,
      html:
        `<p>Hi ${esc(name)},</p>` +
        `<p>Thank you for requesting a free orientation call${when ? ' on <strong>' + esc(when) + '</strong>' : ''}.</p>` +
        `<p>This request is <strong>pending confirmation</strong>. I will be in touch by email shortly to arrange a time.</p>` +
        `<p>With warmth,<br>Irene Fraile Fuente<br>Pause. Listen. Unfold.</p>`
    };
  }
  return {
    subject: 'Thank you for getting in touch',
    text:
      `Hi ${name},\n\n` +
      `Thank you for your message. I have received it and will reply as soon as I can.\n\n` +
      `With warmth,\nIrene Fraile Fuente\nPause. Listen. Unfold.\n`,
    html:
      `<p>Hi ${esc(name)},</p>` +
      `<p>Thank you for your message. I have received it and will reply as soon as I can.</p>` +
      `<p>With warmth,<br>Irene Fraile Fuente<br>Pause. Listen. Unfold.</p>`
  };
}

function ownerEmail(formName, data) {
  const rows = Object.entries(data)
    .filter(([k]) => !/bot-field|form-name/i.test(k))
    .map(([k, v]) => [k, String(v)]);
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  const html = rows
    .map(([k, v]) => `<p><strong>${esc(k)}:</strong><br>${esc(v).replace(/\n/g, '<br>')}</p>`)
    .join('');
  return {
    subject: `New ${formName} submission from ${oneLine(data.name) || 'the website'}`,
    text,
    html
  };
}

async function send({ apiKey, from, to, replyTo, subject, text, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], reply_to: replyTo, subject, text, html })
  });
  if (!res.ok) {
    throw new Error(`Resend responded ${res.status}: ${await res.text()}`);
  }
}

exports.handler = async (event) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) {
    console.error('Missing RESEND_API_KEY or MAIL_FROM environment variable; no emails sent.');
    return { statusCode: 500, body: 'Email is not configured.' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body).payload;
  } catch (err) {
    console.error('Could not read submission payload', err);
    return { statusCode: 400, body: 'Bad payload' };
  }

  const formName = payload.form_name;
  const data = payload.data || {};
  const replyTo = process.env.MAIL_REPLY_TO || DEFAULT_REPLY_TO;
  const owner = process.env.MAIL_OWNER;
  const jobs = [];

  if (isEmail(data.email)) {
    jobs.push(send({ apiKey, from, to: data.email.trim(), replyTo, ...visitorEmail(formName, data) }));
  } else {
    console.warn('Submission has no valid visitor email; skipping confirmation.');
  }
  if (owner && isEmail(owner)) {
    jobs.push(
      send({
        apiKey, from, to: owner.trim(),
        replyTo: isEmail(data.email) ? data.email.trim() : replyTo,
        ...ownerEmail(formName, data)
      })
    );
  }

  const results = await Promise.allSettled(jobs);
  const failed = results.filter((r) => r.status === 'rejected');
  failed.forEach((r) => console.error(r.reason));
  return { statusCode: failed.length ? 500 : 200, body: failed.length ? 'Some emails failed.' : 'OK' };
};
