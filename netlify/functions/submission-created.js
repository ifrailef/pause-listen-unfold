const nodemailer = require('nodemailer');
const { messagesFor, deliver } = require('../../lib/form-emails.cjs');

// Netlify invokes this reserved event function for verified form submissions.
// Netlify verifies the platform event signature before invoking this handler.
exports.handler = async (event) => {
  const { payload } = JSON.parse(event.body);
  const form = payload?.form_name || payload?.data?.['form-name'];
  if (!['contact', 'booking'].includes(form)) return { statusCode: 204 };

  const {
    SMTP_HOST = 'posteo.de',
    SMTP_PORT = '465',
    SMTP_USER = 'pauselistenunfold@posteo.com',
    SMTP_PASSWORD,
    MAIL_FROM = 'pauselistenunfold@posteo.com'
  } = process.env;
  if (![SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM].every(Boolean)) {
    throw new Error('Email sender is not configured. Set SMTP_PASSWORD in Netlify; check SMTP settings for empty overrides.');
  }
  const port = Number(SMTP_PORT);
  if (![465, 587].includes(port)) throw new Error('Use encrypted SMTP on port 465 or 587');
  const messages = messagesFor(payload, MAIL_FROM);
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: true,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    disableFileAccess: true,
    disableUrlAccess: true
  });
  await deliver(messages, transport);
  return { statusCode: 200, body: 'Emails accepted by mail server' };
};
