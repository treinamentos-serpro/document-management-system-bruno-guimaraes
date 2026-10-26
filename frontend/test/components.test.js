import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

let server;
let App;
let DocumentList;
let UploadComponent;
let DownloadButton;

before(async () => {
  server = await createServer({
    server: { middlewareMode: true, watch: null, hmr: false },
  });
  [App, DocumentList, UploadComponent, DownloadButton] = await Promise.all([
    '/src/App.jsx',
    '/src/components/DocumentList.jsx',
    '/src/components/UploadComponent.jsx',
    '/src/components/DownloadButton.jsx',
  ].map(async (path) => (await server.ssrLoadModule(path)).default));
});

after(async () => {
  await server?.close();
});

test('monta o formulario e a listagem com estado inicial de carregamento', () => {
  const html = renderToStaticMarkup(createElement(App));
  assert.match(html, /Enviar documento/);
  assert.match(html, /Atualizar lista/);
  assert.match(html, /Carregando documentos/);
});

test('formulario associa o rotulo ao arquivo e impede envio sem selecao', () => {
  const html = renderToStaticMarkup(createElement(UploadComponent, { onUpload() {} }));
  assert.match(html, /for="document-file"/);
  assert.match(html, /type="file"[^>]*required/);
  assert.match(html, /<button type="submit" disabled="">Enviar<\/button>/);
});

test('distingue lista vazia, carregamento e falha', () => {
  function render(props) {
    return renderToStaticMarkup(createElement(DocumentList, { documents: [], ...props }));
  }

  assert.match(render({}), /Nenhum documento enviado/);
  assert.match(render({ loading: true }), /role="status"/);
  assert.equal(render({ error: 'Falha na listagem.' }), '');
});

test('lista metadados e reutiliza o botao de download escapando nomes', () => {
  const html = renderToStaticMarkup(createElement(DocumentList, {
    documents: [{
      id: '123',
      originalName: '<arquivo>.txt',
      size: 1234,
      uploadedAt: '2026-10-26T19:00:00.000Z',
      owner: 'local-user',
    }],
  }));
  assert.match(html, /&lt;arquivo&gt;\.txt/);
  assert.match(html, /1\.234 bytes/);
  assert.match(html, /dateTime="2026-10-26T19:00:00.000Z"/);
  assert.match(html, /local-user/);
  assert.match(html, /aria-label="Baixar &lt;arquivo&gt;\.txt"/);
});

test('botao de download identifica o arquivo de forma acessivel', () => {
  const html = renderToStaticMarkup(createElement(DownloadButton, {
    document: { id: '123', originalName: 'documento.txt' },
  }));
  assert.match(html, /type="button"/);
  assert.match(html, /aria-label="Baixar documento.txt"/);
});
