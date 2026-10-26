import DownloadButton from './DownloadButton.jsx';

export default function DocumentList({ documents, loading = false, error = '' }) {
  if (loading) {
    return <p role="status">Carregando documentos...</p>;
  }

  if (documents.length === 0) {
    return error ? null : <p>Nenhum documento enviado.</p>;
  }

  return (
    <ul>
      {documents.map((document) => (
        <li key={document.id}>
          <p>
            <strong>{document.originalName}</strong>{' '}
            ({document.size.toLocaleString('pt-BR')} bytes)
          </p>
          <p>
            Enviado em{' '}
            <time dateTime={document.uploadedAt}>
              {new Date(document.uploadedAt).toLocaleString('pt-BR')}
            </time>
            {' '}por {document.owner}
          </p>
          <DownloadButton document={document} />
        </li>
      ))}
    </ul>
  );
}
