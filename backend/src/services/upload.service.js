const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');

function createUploadMiddleware({ storageDir, maxFileSize }) {
  fs.mkdirSync(storageDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, storageDir),
    filename: (_req, _file, callback) => callback(null, randomUUID()),
  });

  return multer({
    storage,
    limits: { fileSize: maxFileSize, files: 1, fields: 0 },
  });
}

module.exports = { createUploadMiddleware };