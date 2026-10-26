const path = require('node:path');

const backendDirectory = path.resolve(__dirname, '..');
const maxFileSizeBytes = Number(process.env.MAX_FILE_SIZE_BYTES || 10485760);

if (!Number.isSafeInteger(maxFileSizeBytes) || maxFileSizeBytes <= 0) {
  throw new Error('MAX_FILE_SIZE_BYTES deve ser um inteiro positivo.');
}

module.exports = {
  storageDirectory: path.resolve(backendDirectory, process.env.STORAGE_DIR || 'storage'),
  maxFileSizeBytes,
  documentOwner: process.env.DOCUMENT_OWNER || 'local-user',
};