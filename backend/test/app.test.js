const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const app = require('../src/app');

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

async function withTestServer(options, callback) {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  const server = app.createApp({
    storageDir,
    users: { alice: 'a'.repeat(32), bob: 'b'.repeat(32) },
    ...options,
  }).listen(0);

  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    await callback({ baseUrl, storageDir });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await fs.rm(storageDir, { recursive: true, force: true });
  }
}

function authorization(token = 'a'.repeat(32)) {
  return { Authorization: `Bearer ${token}` };
}

test('exige autenticação para operações de documentos', async () => {
  await withTestServer({}, async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/documents`);
    assert.strictEqual(response.status, 401);
  });
});

test('faz upload, lista somente documentos do dono e baixa como anexo', async () => {
  await withTestServer({}, async ({ baseUrl }) => {
    const form = new FormData();
    form.append('file', new Blob(['conteudo']), '../relatorio.txt');

    const uploadResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: authorization(),
      body: form,
    });
    assert.strictEqual(uploadResponse.status, 201, await uploadResponse.clone().text());
    const document = await uploadResponse.json();
    assert.strictEqual(document.originalName, 'relatorio.txt');
    assert.strictEqual(document.owner, 'alice');
    assert.strictEqual(Object.hasOwn(document, 'storageName'), false);

    const ownList = await fetch(`${baseUrl}/documents`, { headers: authorization() });
    assert.deepStrictEqual(await ownList.json(), [document]);

    const otherList = await fetch(`${baseUrl}/documents`, { headers: authorization('b'.repeat(32)) });
    assert.deepStrictEqual(await otherList.json(), []);

    const forbiddenDownload = await fetch(`${baseUrl}/documents/${document.id}/download`, {
      headers: authorization('b'.repeat(32)),
    });
    assert.strictEqual(forbiddenDownload.status, 404);

    const download = await fetch(`${baseUrl}/documents/${document.id}/download`, { headers: authorization() });
    assert.strictEqual(download.status, 200);
    assert.strictEqual(await download.text(), 'conteudo');
    assert.match(download.headers.get('content-disposition'), /attachment/);
    assert.strictEqual(download.headers.get('x-content-type-options'), 'nosniff');
  });
});

test('rejeita identificadores inválidos e uploads acima do limite', async () => {
  await withTestServer({ maxFileSize: 4 }, async ({ baseUrl, storageDir }) => {
    const invalidDownload = await fetch(`${baseUrl}/documents/not-an-id/download`, { headers: authorization() });
    assert.strictEqual(invalidDownload.status, 404);

    const form = new FormData();
    form.append('file', new Blob(['12345']), 'large.txt');
    const uploadResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: authorization(),
      body: form,
    });
    assert.strictEqual(uploadResponse.status, 413);
    assert.deepStrictEqual(await fs.readdir(storageDir), []);
  });
});

test('impede que uploads repetidos excedam a cota do usuário', async () => {
  await withTestServer({ maxUserStorage: 4 }, async ({ baseUrl, storageDir }) => {
    async function upload(content, name) {
      const form = new FormData();
      form.append('file', new Blob([content]), name);
      return fetch(`${baseUrl}/upload`, {
        method: 'POST',
        headers: authorization(),
        body: form,
      });
    }

    assert.strictEqual((await upload('123', 'first.txt')).status, 201);
    const overQuota = await upload('12', 'second.txt');
    assert.strictEqual(overQuota.status, 413);
    assert.strictEqual((await overQuota.json()).error, 'USER_STORAGE_LIMIT');
    assert.strictEqual((await fs.readdir(storageDir)).length, 1);
  });
});
