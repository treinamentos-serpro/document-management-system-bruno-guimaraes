const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { once } = require('node:events');

let temporaryDirectory;
let storageDirectory;
let server;
let baseUrl;
let app;

before(async () => {
  temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  storageDirectory = path.join(temporaryDirectory, 'storage');
  process.env.STORAGE_DIR = storageDirectory;
  process.env.MAX_FILE_SIZE_BYTES = '64';
  process.env.DOCUMENT_OWNER = 'test-user';
  app = require('../src/app');
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  if (temporaryDirectory) {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
});

function uploadFile(content, filename = 'document.txt', field = 'file') {
  const form = new FormData();
  form.append(field, new Blob([content]), filename);
  form.append('owner', 'client-user');
  return fetch(`${baseUrl}/upload`, { method: 'POST', body: form });
}

async function listDocuments() {
  const response = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(response.status, 200);
  return (await response.json()).documents;
}

test('o app backend e a rota de saude continuam disponiveis', async () => {
  assert.strictEqual(typeof app, 'function');
  const response = await fetch(`${baseUrl}/health`);
  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(await response.json(), { status: 'ok' });
});

test('lista inicialmente vazia', async () => {
  assert.deepStrictEqual(await listDocuments(), []);
});

test('upload grava arquivo local, lista metadados e permite download', async () => {
  const response = await uploadFile('conteudo do documento');
  assert.strictEqual(response.status, 201);
  const document = await response.json();
  assert.deepStrictEqual(Object.keys(document).sort(), ['id', 'originalName', 'owner', 'size', 'uploadedAt']);
  assert.match(document.id, /^[0-9a-f-]{36}$/);
  assert.strictEqual(document.originalName, 'document.txt');
  assert.strictEqual(document.owner, 'test-user');
  assert.strictEqual(document.size, Buffer.byteLength('conteudo do documento'));
  assert.strictEqual(new Date(document.uploadedAt).toISOString(), document.uploadedAt);
  assert.deepStrictEqual(await listDocuments(), [document]);

  const filenames = await fs.readdir(storageDirectory);
  assert.strictEqual(filenames.length, 1);
  assert.match(filenames[0], /^[0-9a-f-]{36}$/);
  assert.strictEqual(await fs.readFile(path.join(storageDirectory, filenames[0]), 'utf8'), 'conteudo do documento');

  const download = await fetch(`${baseUrl}/documents/${document.id}/download`);
  assert.strictEqual(download.status, 200);
  assert.strictEqual(download.headers.get('content-type'), 'application/octet-stream');
  assert.match(download.headers.get('content-disposition'), /attachment; filename="document.txt"/);
  assert.strictEqual(Number(download.headers.get('content-length')), document.size);
  assert.strictEqual(await download.text(), 'conteudo do documento');
});

test('listagem e ordenada e nao inclui documentos de outro dono', async () => {
  const repository = require('../src/repositories/documentRepository');
  repository.save({ id: 'other-owner', owner: 'other-user', uploadedAt: '2099-01-01T00:00:00.000Z' }, 'not-a-file');
  const response = await uploadFile('segundo documento');
  assert.strictEqual(response.status, 201);
  const document = await response.json();
  const documents = await listDocuments();
  assert.strictEqual(documents.length, 2);
  assert.ok(documents.some((entry) => entry.id === document.id));
  assert.ok(documents[0].uploadedAt >= documents[1].uploadedAt);
  const download = await fetch(`${baseUrl}/documents/other-owner/download`);
  assert.strictEqual(download.status, 404);
  assert.strictEqual((await download.json()).error.code, 'DOCUMENT_NOT_FOUND');
});

test('rejeita arquivo ausente, campo inesperado e tamanho excessivo sem gravar', async () => {
  const documentsBefore = await listDocuments();
  const filesBefore = await fs.readdir(storageDirectory);
  const missing = await fetch(`${baseUrl}/upload`, { method: 'POST' });
  assert.strictEqual(missing.status, 400);
  assert.strictEqual((await missing.json()).error.code, 'FILE_REQUIRED');
  const unexpected = await uploadFile('arquivo', 'arquivo.txt', 'wrong');
  assert.strictEqual(unexpected.status, 400);
  assert.strictEqual((await unexpected.json()).error.code, 'INVALID_REQUEST');
  const oversized = await uploadFile('x'.repeat(65));
  assert.strictEqual(oversized.status, 413);
  assert.strictEqual((await oversized.json()).error.code, 'FILE_TOO_LARGE');
  assert.deepStrictEqual(await listDocuments(), documentsBefore);
  assert.deepStrictEqual(await fs.readdir(storageDirectory), filesBefore);
});

test('download desconhecido ou sem arquivo retorna erro JSON', async () => {
  const unknown = await fetch(`${baseUrl}/documents/unknown/download`);
  assert.strictEqual(unknown.status, 404);
  assert.strictEqual((await unknown.json()).error.code, 'DOCUMENT_NOT_FOUND');
  const repository = require('../src/repositories/documentRepository');
  repository.save({ id: 'missing-file', owner: 'test-user', uploadedAt: '2000-01-01T00:00:00.000Z' }, 'missing-file');
  const missing = await fetch(`${baseUrl}/documents/missing-file/download`);
  assert.strictEqual(missing.status, 404);
  assert.strictEqual((await missing.json()).error.code, 'DOCUMENT_NOT_FOUND');
});

test('falha no registro remove o arquivo e nao cria metadados', async (context) => {
  const repository = require('../src/repositories/documentRepository');
  const documentsBefore = await listDocuments();
  const filesBefore = await fs.readdir(storageDirectory);
  const mockedSave = context.mock.method(repository, 'save', () => { throw new Error('falha interna'); });
  try {
    const response = await uploadFile('arquivo');
    assert.strictEqual(response.status, 500);
    assert.strictEqual((await response.json()).error.code, 'STORAGE_ERROR');
    assert.deepStrictEqual(await listDocuments(), documentsBefore);
    assert.deepStrictEqual(await fs.readdir(storageDirectory), filesBefore);
  } finally {
    mockedSave.mock.restore();
  }
});

test('falhas de escrita e leitura nao expoem detalhes internos', async (context) => {
  const documentsBefore = await listDocuments();
  const backupDirectory = path.join(temporaryDirectory, 'backup');
  await fs.rename(storageDirectory, backupDirectory);
  await fs.writeFile(storageDirectory, 'nao e um diretorio');
  try {
    const response = await uploadFile('arquivo');
    assert.strictEqual(response.status, 500);
    const body = await response.json();
    assert.strictEqual(body.error.code, 'STORAGE_ERROR');
    assert.ok(!JSON.stringify(body).includes(temporaryDirectory));
    assert.deepStrictEqual(await listDocuments(), documentsBefore);
  } finally {
    await fs.unlink(storageDirectory);
    await fs.rename(backupDirectory, storageDirectory);
  }
  const mockedStat = context.mock.method(fs, 'stat', async () => {
    throw Object.assign(new Error(storageDirectory), { code: 'EACCES' });
  });
  try {
    const response = await fetch(`${baseUrl}/documents/${documentsBefore[0].id}/download`);
    assert.strictEqual(response.status, 500);
    const body = await response.json();
    assert.strictEqual(body.error.code, 'STORAGE_ERROR');
    assert.ok(!JSON.stringify(body).includes(temporaryDirectory));
  } finally {
    mockedStat.mock.restore();
  }
});
