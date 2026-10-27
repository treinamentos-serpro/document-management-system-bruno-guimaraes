import { useState } from 'react';

export function UploadComponent({ onUpload }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (!file) return;

    const form = event.currentTarget;
    setUploading(true);
    setMessage('');
    try {
      await onUpload(file);
      setFile(null);
      form.reset();
      setMessage('Documento enviado.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="workspace-section upload-section">
      <div>
        <h2>Enviar documento</h2>
      </div>
      <form className="upload-controls" onSubmit={submit}>
        <input
          aria-label="Arquivo para envio"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          required
          type="file"
        />
        <button className="button button-primary" disabled={!file || uploading} type="submit">
          {uploading ? 'Enviando...' : 'Enviar arquivo'}
        </button>
      </form>
      {message && <p className="form-message" role="status">{message}</p>}
    </section>
  );
}