import { useState } from 'react';
import { DocumentList } from './components/DocumentList.jsx';
import { UploadComponent } from './components/UploadComponent.jsx';
import { listDocuments, uploadDocument } from './services/documentsApi.js';
import './App.css';

export default function App() {
  const [tokenInput, setTokenInput] = useState('');
  const [token, setToken] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function connect(event) {
    event.preventDefault();
    const candidateToken = tokenInput.trim();
    setLoading(true);
    setError('');
    try {
      setDocuments(await listDocuments(candidateToken));
      setToken(candidateToken);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(file) {
    const document = await uploadDocument(file, token);
    setDocuments((currentDocuments) => [document, ...currentDocuments]);
  }

  async function handleRefresh() {
    setLoading(true);
    setError('');
    try {
      setDocuments(await listDocuments(token));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function disconnect() {
    setToken('');
    setTokenInput('');
    setError('');
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Documentos</p>
          <h1>Acervo</h1>
        </div>
        {token && (
          <button className="button button-secondary" type="button" onClick={disconnect}>
            Desconectar
          </button>
        )}
      </header>

      {!token ? (
        <form
          className="access-form"
          onSubmit={connect}
        >
          <label htmlFor="api-token">Token de acesso</label>
          <div className="access-controls">
            <input
              autoComplete="off"
              id="api-token"
              onChange={(event) => setTokenInput(event.target.value)}
              placeholder="Informe seu token"
              required
              type="password"
              value={tokenInput}
            />
            <button className="button button-primary" disabled={loading} type="submit">
              {loading ? 'Conectando...' : 'Conectar'}
            </button>
          </div>
        </form>
      ) : (
        <>
          <UploadComponent onUpload={handleUpload} />
          <DocumentList
            documents={documents}
            loading={loading}
            onRefresh={handleRefresh}
            token={token}
          />
        </>
      )}

      {error && <p className="notice notice-error" role="alert">{error}</p>}
    </main>
  );
}
