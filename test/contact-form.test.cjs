const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync('script.js', 'utf8');
const contactCode = source.slice(source.indexOf('// Contact form:'), source.indexOf('// Booking widget:'));

function loadForm(fetch) {
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
