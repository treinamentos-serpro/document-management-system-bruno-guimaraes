import { useEffect, useState } from 'react';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import { listDocuments } from './services/api.js';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    async function loadDocuments() {
      try {
        const result = await listDocuments({ signal: controller.signal });
        if (!controller.signal.aborted) {
          setDocuments(result);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadDocuments();
    return () => controller.abort();
  }, [refreshCount]);

  function refreshDocuments() {
    setRefreshCount((count) => count + 1);
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Document Management System</h1>
      <UploadComponent onUpload={refreshDocuments} />
      <section aria-labelledby="documents-heading">
        <h2 id="documents-heading">Documentos</h2>
        <button type="button" onClick={refreshDocuments} disabled={loading}>
          Atualizar lista
        </button>
        {error && <p role="alert">{error}</p>}
        <DocumentList documents={documents} loading={loading} error={error} />
      </section>
    </main>
  );
}
