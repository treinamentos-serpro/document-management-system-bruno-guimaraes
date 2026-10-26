const { randomUUID } = require('node:crypto');
const repository = require('../repositories/documentRepository');
const { documentOwner } = require('../config');

async function uploadDocument(file) {
  if (!file) {
    throw Object.assign(new Error('Envie um arquivo no campo \'file\'.'), { code: 'FILE_REQUIRED' });
  }

  const document = {
    id: randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner: documentOwner,
  };

  try {
    repository.save(document, file.filename);
  } catch (error) {
    await repository.removeFile(file.filename).catch(() => {});
    throw Object.assign(new Error('Falha ao registrar o documento.'), { code: 'STORAGE_ERROR' });
  }

  return document;
}

function listDocuments() {
  return repository.listByOwner(documentOwner)
    .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt));
}

async function downloadDocument(id) {
  const download = await repository.findDownloadById(id, documentOwner);
  if (!download) {
    throw Object.assign(new Error('Documento nao encontrado.'), { code: 'DOCUMENT_NOT_FOUND' });
  }
  return download;
}

module.exports = {
  uploadDocument,
  listDocuments,
  downloadDocument,
  prepareStorage: repository.prepareStorage,
};