import assert from 'node:assert/strict';
import { test } from 'node:test';
import { downloadDocument, listDocuments, uploadDocument } from '../src/services/api.js';

test('lista documentos via /api e encaminha o sinal de cancelamento', async (t) => {
  const documents = [{ id: '123', originalName: 'documento.txt' }];
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/documents');
    assert.equal(options.signal, controller.signal);
    return Response.json({ documents });
  });

  assert.deepEqual(await listDocuments({ signal: controller.signal }), documents);
});

test('envia um arquivo multipart sem definir Content-Type manualmente', async (t) => {
  const file = new File(['conteudo'], 'documento.txt', { type: 'text/plain' });
  const metadata = { id: '123', originalName: file.name, size: file.size };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/upload');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers, undefined);
    assert.deepEqual([...options.body.keys()], ['file']);
    assert.equal(options.body.get('file').name, file.name);
    assert.equal(await options.body.get('file').text(), 'conteudo');
    return Response.json(metadata, { status: 201 });
  });

  assert.deepEqual(await uploadDocument(file), metadata);
});

test('baixa o conteudo binario usando o identificador codificado', async (t) => {
  const bytes = new Uint8Array([0, 255, 128, 1]);
  t.mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url, '/api/documents/id%2Fcom%20espaco/download');
    return new Response(bytes);
  });

  const blob = await downloadDocument('id/com espaco');
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), bytes);
});

test('propaga mensagens de erro do backend para todas as operacoes', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({
    error: { code: 'STORAGE_ERROR', message: 'Falha no armazenamento.' },
  }, { status: 500 }));

  await assert.rejects(listDocuments(), /Falha no armazenamento/);
  await assert.rejects(uploadDocument(new File(['x'], 'x.txt')), /Falha no armazenamento/);
  await assert.rejects(downloadDocument('123'), /Falha no armazenamento/);
});

test('informa o status HTTP quando o proxy retorna um erro sem JSON', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('Bad Gateway', { status: 502 }));
  await assert.rejects(listDocuments(), /HTTP 502/);
});

test('informa falhas de conexao em portugues', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('Failed to fetch');
  });
  await assert.rejects(listDocuments(), /Nao foi possivel conectar ao servidor/);
});

test('preserva o cancelamento da requisicao', async (t) => {
  const error = new DOMException('Aborted', 'AbortError');
  t.mock.method(globalThis, 'fetch', async () => {
    throw error;
  });
  await assert.rejects(listDocuments(), (result) => result === error);
});
