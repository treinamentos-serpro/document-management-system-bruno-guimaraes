import { DownloadButton } from './DownloadButton.jsx';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({ documents, loading, onRefresh, token }) {
  return (
    <section className="workspace-section">
      <div className="section-heading">
        <h2>Seus documentos <span className="document-count">{documents.length}</span></h2>
        <button className="button button-secondary" disabled={loading} onClick={onRefresh} type="button">
          {loading ? 'Atualizando...' : 'Atualizar lista'}
        </button>
      </div>

      {documents.length === 0 ? (
        <p className="empty-state">{loading ? 'Carregando documentos...' : 'Nenhum documento enviado.'}</p>
      ) : (
        <ul className="document-list">
          {documents.map((document) => (
            <li className="document-row" key={document.id}>
              <div className="document-details">
                <span className="document-name">{document.originalName}</span>
                <span className="document-meta">
                  {formatSize(document.size)} · {new Date(document.uploadedAt).toLocaleString('pt-BR')}
                </span>
              </div>
              <DownloadButton document={document} token={token} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}