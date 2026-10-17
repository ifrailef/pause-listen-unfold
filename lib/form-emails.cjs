const OWNER = 'pauselistenunfold@posteo.com';

function email(value) {
  return typeof value === 'string' && value.length <= 254 &&
    /^[^\s<>(),;:"\\@]+@[^\s<>(),;:"\\@]+\.[^\s<>(),;:"\\@]+$/.test(value);
}

function messagesFor(payload, from, owner = OWNER) {
  const data = payload?.data;
  const form = payload?.form_name || data?.['form-name'];
  if (!['contact', 'booking'].includes(form)) return [];
  if (!data || data['bot-field'] || data['booking-bot-field']) return [];
  if (!email(data.email)) throw new Error('Invalid visitor email');
  if (!email(from) || !email(owner)) throw new Error('Invalid sender or owner email');
  const booking = form === 'booking';
  const details = booking
    ? `Requested date: ${data.date || ''}\nRequested time: ${data.time || ''}`
    : `Interest: ${data.interest || ''}\n\nMessage:\n${data.message || ''}`;
  return [
    {
      from: { name: 'Pause. Listen. Unfold.', address: from },
      to: { address: owner },
      replyTo: { address: data.email },
      subject: booking ? 'New orientation call request' : 'New website message',
      text: `Name: ${data.name || ''}\nEmail: ${data.email}\n\n${details}`
    },
    {
      from: { name: 'Irene — Pause. Listen. Unfold.', address: from },
      to: { address: data.email },
      replyTo: { address: owner },
      subject: booking ? 'Your orientation call request has been received' : 'Thank you for your message',
      // Do not echo visitor-controlled text into an automatic reply.
      text: booking
        ? 'Thank you for requesting an orientation call. Your request has been received. I will be in touch to confirm availability and arrange the details.\n\nYour appointment is not yet confirmed.\n\nWarmly,\nIrene\nPause. Listen. Unfold.'
        : 'Thank you for getting in touch. Your message has been received, and I will reply personally as soon as I can.\n\nWarmly,\nIrene\nPause. Listen. Unfold.'
    }
  ];
}

async function deliver(messages, transport) {
  const results = await Promise.allSettled(messages.map(message => transport.sendMail(message)));
  const failed = results.flatMap((result, index) =>
    result.status === 'rejected' || result.value?.rejected?.length
      ? [index === 0 ? 'owner notification' : 'visitor confirmation'] : []);
  if (failed.length) throw new Error(`Email delivery failed: ${failed.join(', ')}`);
}

module.exports = { messagesFor, deliver };
