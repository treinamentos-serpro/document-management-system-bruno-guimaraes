function createDocumentsController(documentsService) {
  return {
    upload: async (req, res) => {
      if (!req.file) {
        return res.status(400).json({ error: 'FILE_REQUIRED', message: 'Envie um arquivo no campo "file".' });
      }

      const document = await documentsService.create({ file: req.file, owner: req.user.id });
      return res.status(201).json(document);
    },

    list: (req, res) => res.json(documentsService.list(req.user.id)),

    download: async (req, res, next) => {
      const document = await documentsService.findDownload(req.params.id, req.user.id);
      if (!document) {
        return res.status(404).json({ error: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' });
      }

      res.set('X-Content-Type-Options', 'nosniff');
      return res.download(document.path, document.originalName, { headers: { 'Content-Type': 'application/octet-stream' } }, (error) => {
        if (error && !res.headersSent) next(error);
      });
    },
  };
}

module.exports = { createDocumentsController };