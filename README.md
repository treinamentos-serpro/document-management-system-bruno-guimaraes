# Document Management System com GitHub Copilot

<img src="https://octodex.github.com/images/Professortocat_v2.png" align="right" height="200px" />

Hey brunobastosg!

Mona here. I'm done preparing your exercise. Hope you enjoy! 💚

Remember, it's self-paced so feel free to take a break! ☕️

[![](https://img.shields.io/badge/Go%20to%20Exercise-%E2%86%92-1f883d?style=for-the-badge&logo=github&labelColor=197935)](https://github.com/treinamentos-serpro/document-management-system-bruno-guimaraes/issues/1)

---

## Backend

```sh
cd backend
npm install
npm start
```

Execute `npm test` no diretório `backend` para validar a API. Os testes usam
armazenamento temporário e removem os arquivos ao terminar.

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP. |
| `STORAGE_DIR` | `storage` | Diretório local, relativo a `backend` ou absoluto. |
| `MAX_FILE_SIZE_BYTES` | `10485760` | Limite por arquivo; inteiro positivo, em bytes. |
| `DOCUMENT_OWNER` | `local-user` | Dono definido pelo servidor para os documentos. |

- `POST /upload`: recebe um arquivo no campo multipart `file` e retorna os metadados com status `201`.
- `GET /documents`: retorna `{ "documents": [...] }`, do mais recente ao mais antigo.
- `GET /documents/:id/download`: retorna o arquivo como anexo.
- `GET /health`: retorna `{ "status": "ok" }`.

Os arquivos ficam exclusivamente no filesystem local, em `backend/storage` por
padrão, com nomes físicos aleatórios. Os metadados ficam em memória: reiniciar o
backend torna os arquivos anteriores inacessíveis pela API, sem removê-los do disco.
Esta versão não tem autenticação e não deve ser exposta publicamente.

&copy; 2025 GitHub &bull; [Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/code_of_conduct.md) &bull; [MIT License](https://gh.io/mit)

