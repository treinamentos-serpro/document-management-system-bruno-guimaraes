const fs = require('node:fs/promises');
const path = require('node:path');
const { storageDirectory } = require('../config');

const documents = new Map();

async function prepareStorage() {
  await fs.mkdir(storageDirectory, { recursive: true });
  return storageDirectory;
}

function save(document, filename) {
  documents.set(document.id, { document: { ...document }, filename });
}

function listByOwner(owner) {
  return Array.from(documents.values())
    .filter((entry) => entry.document.owner === owner)
    .map((entry) => ({ ...entry.document }));
}

async function findDownloadById(id, owner) {
  const entry = documents.get(id);
  if (!entry || entry.document.owner !== owner) {
    return null;
  }

  const filePath = path.join(storageDirectory, entry.filename);
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      return null;
    }
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      return null;
    }
    throw error;
  }

  return { document: { ...entry.document }, filePath };
}

async function removeFile(filename) {
  await fs.unlink(path.join(storageDirectory, filename));
}

module.exports = { prepareStorage, save, listByOwner, findDownloadById, removeFile };