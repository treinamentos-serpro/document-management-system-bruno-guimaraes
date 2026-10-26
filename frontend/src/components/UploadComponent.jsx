import { useState } from 'react';
import { uploadDocument } from '../services/api.js';

export default function UploadComponent({ onUpload }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!file) {
      setError('Selecione um arquivo para enviar.');
      return;
    }

    const form = event.currentTarget;
    setUploading(true);
    try {
      await uploadDocument(file);
      form.reset();
      setFile(null);
      setSuccess('Documento enviado com sucesso.');
      onUpload();
    } catch (error) {
      setError(error.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section aria-labelledby="upload-heading">
      <h2 id="upload-heading">Enviar documento</h2>
      <form onSubmit={handleSubmit} aria-busy={uploading}>
        <label htmlFor="document-file">Arquivo</label>{' '}
        <input
          id="document-file"
          name="file"
          type="file"
          required
          disabled={uploading}
          onChange={(event) => {
            setFile(event.target.files[0] || null);
            setError('');
            setSuccess('');
          }}
        />{' '}
        <button type="submit" disabled={uploading || !file}>
          {uploading ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}
    </section>
  );
}
