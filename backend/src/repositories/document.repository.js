function createDocumentRepository() {
  const documents = new Map();

  return {
    save(document) {
      documents.set(document.id, { ...document });
      return { ...document };
    },

    findByOwner(owner) {
      return [...documents.values()]
        .filter((document) => document.owner === owner)
        .map((document) => ({ ...document }));
    },

    getTotalSizeByOwner(owner) {
      return [...documents.values()]
        .filter((document) => document.owner === owner)
        .reduce((total, document) => total + document.size, 0);
    },

    findByIdAndOwner(id, owner) {
      const document = documents.get(id);
      return document?.owner === owner ? { ...document } : null;
    },
  };
}

module.exports = { createDocumentRepository };