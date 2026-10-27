const { timingSafeEqual } = require('node:crypto');

function parseUsers(rawUsers) {
  if (!rawUsers) return {};

  let users;
  try {
    users = JSON.parse(rawUsers);
  } catch {
    throw new Error('DMS_USERS deve ser um objeto JSON com usuário e token.');
  }

  if (!users || Array.isArray(users) || typeof users !== 'object') {
    throw new Error('DMS_USERS deve ser um objeto JSON com usuário e token.');
  }

  for (const [user, token] of Object.entries(users)) {
    if (!user.trim() || typeof token !== 'string' || token.length < 32) {
      throw new Error('Cada usuário em DMS_USERS deve ter um token com pelo menos 32 caracteres.');
    }
  }

  return users;
}

function createAuthenticationMiddleware(users) {
  return (req, res, next) => {
    if (Object.keys(users).length === 0) {
      return res.status(503).json({ error: 'AUTH_NOT_CONFIGURED', message: 'A autenticação não está configurada.' });
    }

    const match = /^Bearer\s+(.+)$/i.exec(req.get('authorization') || '');
    if (!match) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Autenticação necessária.' });
    }

    const suppliedToken = Buffer.from(match[1]);
    let owner = null;

    for (const [user, token] of Object.entries(users)) {
      const expectedToken = Buffer.from(token);
      if (suppliedToken.length === expectedToken.length && timingSafeEqual(suppliedToken, expectedToken)) {
        owner = user;
      }
    }

    if (!owner) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Token inválido.' });
    }

    req.user = { id: owner };
    return next();
  };
}

module.exports = { createAuthenticationMiddleware, parseUsers };