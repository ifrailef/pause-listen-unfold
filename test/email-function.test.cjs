const { test } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const nodemailer = require('nodemailer');
const { handler } = require('../netlify/functions/submission-created');

// Real SMTP exchange on loopback; no external mail server or credentials used.
async function withMailbox(run) {
  const messages = [];
  const server = net.createServer(socket => {
    socket.write('220 localhost test SMTP\r\n');
    let buffer = '', dataMode = false, mail = '', recipients = [];
    socket.on('data', chunk => {
      buffer += chunk;
      while (buffer.includes('\r\n')) {
        const end = buffer.indexOf('\r\n');
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (dataMode) {
          if (line === '.') {
            messages.push({ recipients, mail });
            dataMode = false;
            socket.write('250 queued locally\r\n');
          } else mail += line + '\r\n';
        } else if (/^(EHLO|HELO)/.test(line)) socket.write('250 localhost\r\n');
        else if (/^MAIL FROM:/.test(line)) {
          mail = ''; recipients = []; socket.write('250 OK\r\n');
        } else if (/^RCPT TO:/.test(line)) {
          recipients.push(line); socket.write('250 OK\r\n');
        } else if (line === 'DATA') {
          dataMode = true; socket.write('354 End with dot\r\n');
        } else if (line === 'QUIT') socket.end('221 Bye\r\n');
        else socket.write('250 OK\r\n');
      }
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const original = nodemailer.createTransport;
  const captured = [];
  nodemailer.createTransport = options => {
    captured.push(options);
    return original({ host: '127.0.0.1', port: server.address().port, secure: false, ignoreTLS: true });
  };
  const keys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM'];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  keys.forEach(key => delete process.env[key]);
  process.env.SMTP_PASSWORD = 'local-test-only';
  try { await run(messages, captured); }
  finally {
    nodemailer.createTransport = original;
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    await new Promise(resolve => server.close(resolve));
  }
}

const event = (form = 'contact', fields = {}) => ({ body: JSON.stringify({ payload: {
  form_name: form,
  data: { name: 'Local Test', email: 'visitor@example.com', message: 'LOCAL TEST MESSAGE', ...fields }
} }) });

test('contact handler delivers two MIME emails over local SMTP using Posteo production defaults', async () => {
  await withMailbox(async (messages, captured) => {
    assert.equal((await handler(event())).statusCode, 200);
    assert.equal(messages.length, 2);
    const owner = messages.find(m => m.recipients.some(r => r.includes('pauselistenunfold@posteo.com')));
    const visitor = messages.find(m => m.recipients.some(r => r.includes('visitor@example.com')));
    assert.match(owner.mail, /Reply-To: visitor@example.com/);
    assert.match(owner.mail, /LOCAL TEST MESSAGE/);
    assert.match(visitor.mail, /Reply-To: pauselistenunfold@posteo.com/);
    assert.match(visitor.mail, /Subject: Thank you for your message/);
    assert.doesNotMatch(visitor.mail, /LOCAL TEST MESSAGE/);
    assert.equal(captured[0].host, 'posteo.de');
    assert.equal(captured[0].port, 465);
    assert.equal(captured[0].secure, true);
    assert.equal(captured[0].requireTLS, true);
    assert.equal(captured[0].auth.user, 'pauselistenunfold@posteo.com');
  });
});

test('booking handler sends request details and an acknowledgment, not an appointment confirmation', async () => {
  await withMailbox(async messages => {
    await handler(event('booking', { date: 'Monday 19 October', time: '10:00' }));
    assert.equal(messages.length, 2);
    assert.ok(messages.some(m => /Requested time: 10:00/.test(m.mail)));
    assert.ok(messages.some(m => /appointment is not yet confirmed/.test(m.mail)));
  });
});

test('missing password and invalid port fail before sending', async () => {
  await withMailbox(async messages => {
    delete process.env.SMTP_PASSWORD;
    await assert.rejects(handler(event()), /not configured/);
    process.env.SMTP_PASSWORD = 'local-test-only';
    process.env.SMTP_PORT = '25';
    await assert.rejects(handler(event()), /encrypted SMTP/);
    assert.equal(messages.length, 0);
  });
});

test('spam fields and unknown forms send no emails', async () => {
  await withMailbox(async messages => {
    await handler(event('contact', { 'bot-field': 'filled' }));
    assert.equal((await handler(event('unrelated'))).statusCode, 204);
    assert.equal(messages.length, 0);
  });
});
