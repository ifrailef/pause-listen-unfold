const { test } = require('node:test');
const assert = require('node:assert/strict');
const { messagesFor, deliver } = require('../lib/form-emails.cjs');
const payload = { form_name: 'contact', data: { name: 'Local Test', email: 'visitor@example.com', message: 'Private message', interest: 'Sessions' } };
test('sends separate owner and visitor messages with correct reply addresses', () => {
  const [owner, visitor] = messagesFor(payload, 'sender@example.com');
  assert.equal(owner.to.address, 'pauselistenunfold@posteo.com');
  assert.equal(owner.replyTo.address, 'visitor@example.com');
  assert.match(owner.text, /Private message/);
  assert.equal(visitor.to.address, 'visitor@example.com');
  assert.equal(visitor.replyTo.address, owner.to.address);
  assert.doesNotMatch(visitor.text, /Private message/);
});
test('ignores unrelated forms and honeypot submissions', () => {
  assert.deepEqual(messagesFor({ form_name: 'other' }, 'sender@example.com'), []);
  assert.deepEqual(messagesFor({ ...payload, data: { ...payload.data, 'bot-field': 'spam' } }, 'sender@example.com'), []);
});
test('rejects multiple recipients and header injection', () => {
  for (const email of ['a@example.com,b@example.com', 'a@example.com\r\nBcc: b@example.com', 'not-an-email']) {
    assert.throws(() => messagesFor({ ...payload, data: { ...payload.data, email } }, 'sender@example.com'));
  }
});
test('booking acknowledgment does not promise a confirmed appointment', () => {
  const messages = messagesFor({ ...payload, form_name: 'booking' }, 'sender@example.com');
  assert.match(messages[1].text, /appointment is not yet confirmed/);
});
test('attempts both messages even when one fails, and reports failure', async () => {
  const calls = [];
  await assert.rejects(deliver([{}, {}], { sendMail: async message => {
    calls.push(message);
    if (calls.length === 1) throw new Error('SMTP error');
    return { rejected: [] };
  } }), /owner notification/);
  assert.equal(calls.length, 2);
});
test('reports rejected SMTP recipients and accepts successful sends', async () => {
  await assert.rejects(deliver([{}], { sendMail: async () => ({ rejected: ['owner@example.com'] }) }), /owner notification/);
  await deliver([{}, {}], { sendMail: async () => ({ rejected: [] }) });
});
test('reports authentication diagnostics without exposing secrets or raw SMTP responses', async () => {
  const error = Object.assign(new Error('password secret-value'), {
    code: 'EAUTH', responseCode: 535,
    command: 'AUTH PLAIN secret-value', response: '535 secret-value visitor@example.com'
  });
  await assert.rejects(deliver([{}], { sendMail: async () => { throw error; } }), failure => {
    assert.match(failure.message, /EAUTH; SMTP 535; stage AUTH/);
    assert.doesNotMatch(failure.message, /secret-value|visitor@example.com/);
    return true;
  });
});
test('distinguishes network failures and suppresses unexpected error fields', async () => {
  for (const code of ['ETIMEDOUT', 'ECONNECTION', 'secret-value']) {
    await assert.rejects(deliver([{}], { sendMail: async () => {
      throw { code, responseCode: 'secret-value', command: 'secret-value' };
    } }), failure => {
      assert.match(failure.message, new RegExp(code === 'secret-value' ? 'SMTP_FAILURE' : code));
      assert.doesNotMatch(failure.message, /secret-value/);
      return true;
    });
  }
});
