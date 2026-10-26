const service = require('../services/documentService');

async function upload(req, res) {
  const document = await service.uploadDocument(req.file);
  res.status(201).json(document);
}

function list(req, res) {
  res.json({ documents: service.listDocuments() });
}

async function download(req, res, next) {
  const result = await service.downloadDocument(req.params.id);
  res.type('application/octet-stream');
  res.download(result.filePath, result.document.originalName, (error) => {
    if (error) {
      next(error);
    }
  });
}

function handleError(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let status = 500;
  let code = req.path === '/upload' || req.path.endsWith('/download')
    ? 'STORAGE_ERROR' : 'INTERNAL_ERROR';
  let message = 'Nao foi possivel concluir a operacao.';

  if (error.code === 'FILE_REQUIRED') {
    status = 400;
    code = 'FILE_REQUIRED';
    message = 'Envie um arquivo no campo \'file\'.';
  } else if (error.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    code = 'FILE_TOO_LARGE';
    message = 'O arquivo excede o tamanho permitido.';
  } else if (error.name === 'MulterError' || error.status === 400) {
    status = 400;
    code = 'INVALID_REQUEST';
    message = 'Envie exatamente um arquivo no campo \'file\'.';
  } else if (error.code === 'DOCUMENT_NOT_FOUND'
    || (req.path.endsWith('/download') && ['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code))) {
    status = 404;
    code = 'DOCUMENT_NOT_FOUND';
    message = 'Documento nao encontrado.';
  }

  res.status(status).json({ error: { code, message } });
}

module.exports = { upload, list, download, handleError, prepareStorage: service.prepareStorage };