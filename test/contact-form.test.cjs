const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync('script.js', 'utf8');
const contactCode = source.slice(source.indexOf('// Contact form:'), source.indexOf('// Booking widget:'));

function loadForm(fetch, hostname = 'pauselistenunfold.com') {
  const button = { disabled: false };
  const note = { textContent: '' };
  let submit;
  const form = {
    fields: [['form-name', 'contact'], ['name', 'Test & Example'], ['email', 'visitor@example.com'], ['message', 'A + B & C'], ['bot-field', '']],
    resets: 0,
    querySelector: () => button,
    addEventListener: (type, handler) => { if (type === 'submit') submit = handler; },
    reset() { this.resets++; }
  };
  vm.runInNewContext(contactCode, {
    document: { querySelector: () => form, getElementById: () => note },
    FormData: class { constructor(f) { return f.fields; } },
    URLSearchParams,
    location: { hostname, protocol: hostname ? 'https:' : 'file:' },
    crypto: require('node:crypto').webcrypto,
    fetch
  });
  return { form, button, note, submit: () => submit({ preventDefault() {} }) };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('form URL-encodes submission, disables Send while pending, and resets after acceptance', async () => {
  let finish, request;
  const ui = loadForm((url, options) => {
    request = { url, options };
    return new Promise(resolve => { finish = resolve; });
  });
  ui.submit();
  assert.equal(ui.button.disabled, true);
  assert.equal(ui.note.textContent, 'Sending…');
  assert.equal(request.url, '/');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers['Content-Type'], 'application/x-www-form-urlencoded');
  const body = new URLSearchParams(request.options.body);
  assert.equal(body.get('form-name'), 'contact');
  assert.equal(body.get('message'), 'A + B & C');
  assert.equal(body.get('bot-field'), '');
  finish({ ok: true, status: 200 });
  await settle();
  assert.equal(ui.form.resets, 1);
  assert.equal(ui.button.disabled, false);
  assert.match(ui.note.textContent, /Thank you/);
});

for (const failure of ['server', 'network']) {
  test(`${failure} failure preserves the message and enables retry`, async () => {
    const ui = loadForm(() => failure === 'server'
      ? Promise.resolve({ ok: false, status: 500 })
      : Promise.reject(new Error('offline')));
    ui.submit();
    await settle();
    assert.equal(ui.form.resets, 0);
    assert.equal(ui.button.disabled, false);
    assert.match(ui.note.textContent, /could not be sent/);
    assert.match(ui.note.textContent, /pauselistenunfold@posteo.com/);
  });
}

for (const hostname of ['localhost', '127.0.0.1', '[::1]', '']) {
  test(`local preview ${hostname || 'file'} preserves data and sends no request`, async () => {
    const ui = loadForm(() => { throw new Error('Local preview must not submit'); }, hostname);
    ui.submit();
    await settle();
    assert.match(ui.note.textContent, /No request is sent/);
    assert.equal(ui.form.resets, 0);
    assert.equal(ui.button.disabled, false);
  });
}

test('duplicate clicks send only one pending request', async () => {
  let requests = 0, finish;
  const ui = loadForm(() => { requests++; return new Promise(resolve => { finish = resolve; }); });
  ui.submit(); ui.submit();
  assert.equal(requests, 1);
  finish({ ok: true });
  await settle();
});

test('native notification subjects have unique identifiers and sanitized names', async () => {
  const subjects = [];
  const ui = loadForm((url, options) => {
    subjects.push(new URLSearchParams(options.body).get('subject'));
    return Promise.resolve({ ok: true });
  });
  ui.form.fields[1][1] = '  Test\nName\u200B  ';
  ui.submit(); await settle();
  ui.submit(); await settle();
  assert.match(subjects[0], /^New contact — Test Name — /);
  assert.notEqual(subjects[0], subjects[1]);
  assert.doesNotMatch(subjects[0], /[\r\n\u200B]/);
});

function loadBooking(sendToNetlify) {
  let submit, pending = 0;
  const button = { disabled: false }, note = { textContent: '' };
  const form = { querySelector: () => button, addEventListener: (event, callback) => { submit = callback; } };
  const start = source.indexOf("  bookingForm.addEventListener('submit'");
  const code = source.slice(start, source.lastIndexOf('\n}'));
  vm.runInNewContext(code, {
    bookingForm: form, sendToNetlify, renderPending: () => { pending++; },
    document: { getElementById: () => note }, FALLBACK_EMAIL: 'pauselistenunfold@posteo.com'
  });
  return { button, note, submit: () => submit({ preventDefault() {} }), pending: () => pending };
}

test('booking preview keeps form usable without displaying a real pending request', async () => {
  const ui = loadBooking(() => Promise.resolve({ preview: true }));
  ui.submit(); await settle();
  assert.equal(ui.pending(), 0);
  assert.equal(ui.button.disabled, false);
  assert.match(ui.note.textContent, /No request is sent/);
});

test('accepted live booking displays pending confirmation once', async () => {
  let requests = 0, finish;
  const ui = loadBooking(() => { requests++; return new Promise(resolve => { finish = resolve; }); });
  ui.submit(); ui.submit();
  assert.equal(requests, 1);
  finish(); await settle();
  assert.equal(ui.pending(), 1);
});
