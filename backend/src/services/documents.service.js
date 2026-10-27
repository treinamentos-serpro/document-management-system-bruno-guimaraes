const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function publicDocument(document) {
  const { storageName, ...metadata } = document;
  return metadata;
}

function sanitizeOriginalName(originalName) {
  const portableName = String(originalName || '').replace(/\\/g, '/');
  const name = path.posix.basename(portableName).replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return name || 'document';
}

function createDocumentsService({ repository, storageDir, maxUserStorage }) {
  const resolvedStorageDir = path.resolve(storageDir);

  return {
    async create({ file, owner }) {
      if (repository.getTotalSizeByOwner(owner) + file.size > maxUserStorage) {
        await fs.unlink(file.path).catch(() => {});
        const error = new Error('O limite total de armazenamento deste usuário foi atingido.');
        error.statusCode = 413;
        error.code = 'USER_STORAGE_LIMIT';
        throw error;
      }

      const document = {
        id: randomUUID(),
        originalName: sanitizeOriginalName(file.originalname),
        size: file.size,
        uploadedAt: new Date().toISOString(),
        owner,
        storageName: file.filename,
      };

      try {
        repository.save(document);
      } catch (error) {
        await fs.unlink(file.path).catch(() => {});
        throw error;
      }

      return publicDocument(document);
    },

    list(owner) {
      return repository.findByOwner(owner).map(publicDocument);
    },

    async findDownload(id, owner) {
      if (!UUID_PATTERN.test(id)) return null;

      const document = repository.findByIdAndOwner(id, owner);
      if (!document || !UUID_PATTERN.test(document.storageName)) return null;

      const filePath = path.resolve(resolvedStorageDir, document.storageName);
      if (!filePath.startsWith(`${resolvedStorageDir}${path.sep}`)) return null;

      try {
        await fs.access(filePath);
      } catch {
        return null;
      }

      return { path: filePath, originalName: document.originalName };
    },
  };
}

module.exports = { createDocumentsService };