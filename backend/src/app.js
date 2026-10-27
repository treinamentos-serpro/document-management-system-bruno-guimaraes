const express = require('express');
const path = require('node:path');
const { createDocumentsRouter } = require('./routes/documents.routes');
const { createDocumentRepository } = require('./repositories/document.repository');
const { createDocumentsService } = require('./services/documents.service');
const { createAuthenticationMiddleware, parseUsers } = require('./services/authentication.service');
const { createUploadMiddleware } = require('./services/upload.service');

function parsePositiveInteger(value, fallback) {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function createApp(options = {}) {
  const storageDir = path.resolve(options.storageDir || process.env.DMS_STORAGE_DIR || path.join(__dirname, '..', 'storage'));
  const users = options.users || parseUsers(process.env.DMS_USERS);
  const maxFileSize = options.maxFileSize || parsePositiveInteger(process.env.DMS_MAX_FILE_SIZE, 10 * 1024 * 1024);
  const maxUserStorage = options.maxUserStorage || parsePositiveInteger(process.env.DMS_MAX_USER_STORAGE, 100 * 1024 * 1024);
  const repository = options.repository || createDocumentRepository();
  const documentsService = createDocumentsService({ repository, storageDir, maxUserStorage });
  const authenticate = createAuthenticationMiddleware(users);
  const upload = createUploadMiddleware({ storageDir, maxFileSize });
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use(createDocumentsRouter({ documentsService, authenticate, upload }));

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'FILE_TOO_LARGE', message: 'O arquivo excede o tamanho máximo permitido.' });
    }

    if (error.name === 'MulterError') {
      return res.status(400).json({ error: error.code || 'INVALID_UPLOAD', message: 'O envio do arquivo é inválido.' });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.code, message: error.message });
    }

    console.error('Erro inesperado ao processar requisição:', error);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Não foi possível processar a solicitação.' });
  });

  return app;
}

const app = createApp();
app.createApp = createApp;

if (require.main === module) {
  const port = parsePositiveInteger(process.env.PORT, 3000);
  app.listen(port, () => console.log(`DMS backend ouvindo na porta ${port}`));
}

module.exports = app;
