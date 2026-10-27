const express = require('express');
const { createDocumentsController } = require('../controllers/documents.controller');

function createDocumentsRouter({ documentsService, authenticate, upload }) {
  const router = express.Router();
  const controller = createDocumentsController(documentsService);

  router.post('/upload', authenticate, upload.single('file'), controller.upload);
  router.get('/documents', authenticate, controller.list);
  router.get('/documents/:id/download', authenticate, controller.download);

  return router;
}

module.exports = { createDocumentsRouter };