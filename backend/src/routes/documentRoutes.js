const { Router } = require('express');
const multer = require('multer');
const { randomUUID } = require('node:crypto');
const controller = require('../controllers/documentController');
const { maxFileSizeBytes } = require('../config');

const storage = multer.diskStorage({
  destination(req, file, callback) {
    controller.prepareStorage().then(
      (directory) => callback(null, directory),
      (error) => callback(error),
    );
  },
  filename(req, file, callback) {
    callback(null, randomUUID());
  },
});

const upload = multer({ storage, limits: { fileSize: maxFileSizeBytes } });
const router = Router();

router.post('/upload', upload.single('file'), controller.upload);
router.get('/documents', controller.list);
router.get('/documents/:id/download', controller.download);

module.exports = router;