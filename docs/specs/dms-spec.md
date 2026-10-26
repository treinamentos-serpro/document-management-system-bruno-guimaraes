# Especificação - Document Management System

> Documento de referência para orientar a implementação incremental do DMS. Nesta tarefa, somente esta especificação é criada; as etapas de backend e frontend abaixo são trabalho futuro.

## 1. Objetivo

Entregar uma aplicação web simples para enviar, listar e baixar documentos armazenados no filesystem local, com metadados mantidos em memória e associação a um usuário configurado.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos associados ao usuário configurado.
- Download de um documento pelo identificador.
- Interface React para upload, listagem e download.
- Armazenamento dos arquivos em `backend/storage`, usando Multer com `diskStorage`.
- Metadados mantidos em memória durante a execução do processo.
- Configuração por variáveis de ambiente para porta, diretório, limite de upload e identificador do usuário.

### Fora do escopo

- Autenticação, autorização real, cadastro ou gestão de múltiplos usuários.
- Armazenamento em nuvem, banco de dados ou qualquer provedor externo.
- Persistência ou recuperação dos metadados após reinício do backend.
- Versionamento, edição e exclusão de documentos.
- Busca, filtros e paginação.
- Allowlist rígida de extensões ou tipos MIME.

### Estado inicial do repositório

O backend Express é um seed e possui `GET /health`; upload, listagem e download ainda precisam ser implementados. O frontend React/Vite também é um seed. O proxy de desenvolvimento do Vite encaminha `/api/*` ao backend e remove o prefixo `/api`; portanto, as rotas do backend previstas nesta especificação são `/upload`, `/documents` e `/documents/:id/download`. O endpoint de saúde existente deve continuar funcionando.

## 3. Requisitos funcionais

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF-01 | O sistema deve aceitar o upload de um documento por vez usando `multipart/form-data` e o campo `file`. | Com um arquivo válido dentro do limite, responde `201 Created` com os metadados do documento. |
| RF-02 | O sistema deve rejeitar o upload quando o arquivo estiver ausente ou exceder o limite configurado. | Arquivo ausente responde `400`; arquivo acima do limite responde `413`; nenhuma entrada de metadados é criada. |
| RF-03 | O sistema deve gerar um identificador único e um nome físico que não dependam de caminhos ou nomes fornecidos pelo cliente. | Cada upload recebe um ID UUID; o arquivo é gravado dentro do diretório local configurado. |
| RF-04 | O sistema deve associar cada documento ao usuário definido pela configuração do backend. | O campo `owner` é preenchido pelo servidor e não pode ser escolhido pelo corpo da requisição. |
| RF-05 | O sistema deve listar os documentos associados ao usuário configurado. | `GET /documents` retorna `200` e um array JSON; documentos são ordenados do mais recente para o mais antigo. |
| RF-06 | O sistema deve permitir baixar um documento pelo ID, somente quando ele constar nos metadados em memória do usuário configurado. | O download responde `200` com o conteúdo binário; ID desconhecido ou arquivo indisponível responde `404`. |
| RF-07 | O sistema deve fornecer uma interface para enviar, visualizar e baixar documentos. | A interface mostra estados de carregamento, sucesso e erro, e usa a API via prefixo `/api`. |
| RF-08 | O sistema deve apresentar erros da API em formato consistente. | Respostas de erro JSON incluem código estável e mensagem legível, exceto quando a resposta é um download binário bem-sucedido. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser gravados somente no filesystem local da aplicação, por Multer com `diskStorage`, no diretório padrão `backend/storage`. |
| RNF-02 | Os metadados devem permanecer em memória. Reiniciar o backend descarta os metadados; arquivos anteriormente gravados podem permanecer órfãos e não são recuperados automaticamente. |
| RNF-03 | A configuração deve vir do ambiente, com valores padrão documentados e sem segredos embutidos no código. |
| RNF-04 | O limite padrão de upload deve ser 10 MiB (10.485.760 bytes), configurável por ambiente. |
| RNF-05 | O nome original do arquivo não deve ser usado como caminho físico. O download deve ser servido como anexo, com cabeçalhos de conteúdo apropriados e nome apresentado com segurança. |
| RNF-06 | A aplicação deve preservar a separação de responsabilidades: `routes -> controllers -> services -> repositories`. Camadas internas não devem depender de Express ou da interface React. |
| RNF-07 | Falhas de escrita/leitura do filesystem devem ser tratadas sem expor caminhos locais ou stack traces na resposta HTTP. |
| RNF-08 | Sem autenticação nesta fase, o sistema não deve ser considerado adequado para uso multiusuário ou exposição pública. |

## 5. Modelo de dados

### Documento (metadados da aplicação)

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | string | Sim | UUID gerado no servidor e usado nas rotas de consulta/download. |
| `originalName` | string | Sim | Nome original informado pelo cliente, preservado como metadado para apresentação e download. |
| `size` | number | Sim | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Sim | Data e hora UTC do upload em ISO 8601. |
| `owner` | string | Sim | Identificador configurado no servidor; não vem do cliente. |

O repositório de arquivos deve manter internamente o vínculo entre `id` e o nome físico aleatório gerado para o arquivo. Esse nome físico não faz parte da resposta pública nem pode ser fornecido pelo cliente. Os metadados retornados pela API não incluem caminhos do filesystem.

### Configuração

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `STORAGE_DIR` | `backend/storage` | Diretório local usado para os arquivos. Deve ser resolvido de forma consistente a partir da configuração da aplicação. |
| `MAX_FILE_SIZE_BYTES` | `10485760` | Tamanho máximo de cada arquivo, em bytes (10 MiB). Deve ser um inteiro positivo. |
| `DOCUMENT_OWNER` | `local-user` | Identificador único associado aos documentos nesta fase. |

## 6. Contratos de API

As rotas abaixo são definidas no backend. No frontend de desenvolvimento, o Vite disponibiliza as mesmas operações sob `/api` e encaminha as requisições ao backend removendo esse prefixo.

### Formato de erro

Erros da API que retornam JSON devem usar a forma:

```json
{
  "error": {
    "code": "FILE_REQUIRED",
    "message": "Envie um arquivo no campo 'file'."
  }
}
```

`code` deve ser estável para tratamento pelo frontend; `message` deve ser legível e não deve expor detalhes internos. Falhas no download mantêm esse formato JSON. O sucesso do download retorna binário, não JSON.

### POST /upload

- `Content-Type`: `multipart/form-data`.
- Campo obrigatório: `file`, exatamente um arquivo.
- O servidor define `owner`, gera `id` e `uploadedAt`, e grava o arquivo no armazenamento local.
- Sucesso: `201 Created`, `Content-Type: application/json`.

```json
{
  "id": "9f36c990-7e10-4c15-b7a7-305fd4a13fed",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "uploadedAt": "2026-10-26T12:00:00.000Z",
  "owner": "local-user"
}
```

- Erros previstos:
  - `400 Bad Request`, `FILE_REQUIRED`: campo `file` ausente ou nenhum arquivo enviado.
  - `413 Content Too Large`, `FILE_TOO_LARGE`: arquivo excede `MAX_FILE_SIZE_BYTES`.
  - `500 Internal Server Error`, `STORAGE_ERROR`: falha ao gravar o arquivo ou registrar os metadados; não deve permanecer metadado sem arquivo. Se o arquivo já foi gravado, a aplicação deve tentar removê-lo quando o registro dos metadados falhar.

### GET /documents

- Sem corpo de requisição.
- Retorna somente documentos associados ao `DOCUMENT_OWNER` em execução, ordenados por `uploadedAt` decrescente.
- Sucesso: `200 OK`, `Content-Type: application/json`.

```json
{
  "documents": [
    {
      "id": "9f36c990-7e10-4c15-b7a7-305fd4a13fed",
      "originalName": "relatorio.pdf",
      "size": 24576,
      "uploadedAt": "2026-10-26T12:00:00.000Z",
      "owner": "local-user"
    }
  ]
}
```

- Uma lista vazia é representada por `200 OK` com `"documents": []`.
- Falha inesperada ao consultar o repositório: `500 Internal Server Error`, `INTERNAL_ERROR`.

### GET /documents/:id/download

- `id` é o UUID retornado por `POST /upload`.
- O servidor procura o documento nos metadados em memória e resolve o caminho físico exclusivamente pelo vínculo interno entre o ID e o nome gerado; nunca concatena entrada do cliente como caminho.
- Sucesso: `200 OK`, conteúdo binário, `Content-Disposition: attachment` com o nome original devidamente tratado, `Content-Length` quando disponível e `Content-Type: application/octet-stream`.
- Erros previstos:
  - `404 Not Found`, `DOCUMENT_NOT_FOUND`: ID não existe na memória ou o arquivo local não está disponível.
  - `500 Internal Server Error`, `STORAGE_ERROR`: falha de leitura diferente de arquivo ausente.

### GET /health (existente)

- Responde `200 OK` com `{"status":"ok"}` quando o backend está disponível.
- Deve continuar funcionando; não substitui verificações específicas de leitura/escrita do armazenamento.

## 7. Decisões arquiteturais

### Backend

- Node.js e Express em CommonJS; testes com `node:test`.
- Dependências fluem em uma direção: `routes -> controllers -> services -> repositories`.
- `routes/` declara os endpoints e aplica o middleware Multer `upload.single('file')`.
- Multer usa `diskStorage` para gravar localmente em `STORAGE_DIR`, com nome físico gerado no servidor (por exemplo, UUID sem extensão). O nome original não determina o destino no filesystem.
- `controllers/` traduzem requisições/respostas HTTP e convertem erros conhecidos para status e códigos de API.
- `services/` aplicam as regras de negócio: criação dos metadados, associação ao dono, ordenação da listagem e coordenação de upload/download.
- `repositories/` mantêm os metadados em memória e encapsulam o acesso aos arquivos locais. Não introduzir banco de dados ou serviço externo.
- A configuração deve ser lida e validada na inicialização; configuração inválida deve produzir mensagem operacional clara.

### Frontend

- React com componentes funcionais e Hooks, usando a organização `components/`, `pages/` e `services/`.
- A comunicação com o backend usa `fetch` através de `/api`; a configuração do proxy Vite continua sendo somente para desenvolvimento.
- A tela deve permitir selecionar/enviar um arquivo, apresentar os documentos retornados e iniciar o download pelo endpoint correspondente.
- A interface não deve permitir que o usuário escolha o `owner`; ele é definido pelo backend.

### Armazenamento e limites

- Arquivos exclusivamente locais em `backend/storage` por padrão. Não usar provedores ou serviços de terceiros.
- Metadados em memória não sobrevivem a reinícios. Arquivos sem metadados não aparecem na listagem nem podem ser baixados pelo ID; limpeza automática de órfãos fica fora desta fase.
- O limite por arquivo é aplicado pelo Multer. Não há allowlist de tipos nesta versão; downloads são entregues como anexo e `application/octet-stream`.
- Sem autenticação, todos os documentos desta instância pertencem ao único `DOCUMENT_OWNER` configurado. Esse comportamento não representa isolamento seguro entre usuários.

## 8. Plano de execução

As etapas abaixo orientam implementação futura. Para esta entrega, somente `docs/specs/dms-spec.md` deve ser criado; não implementar nem alterar arquivos de backend ou frontend.

1. **Configuração e armazenamento backend**: validar variáveis de ambiente, preparar o diretório local e configurar Multer `diskStorage` com limite e nome físico gerado no servidor.
2. **Domínio e repositórios**: implementar o modelo/validações de metadados em memória e o acesso local aos arquivos, mantendo o vínculo interno entre ID e nome físico.
3. **Serviços, controllers e rotas**: implementar upload, listagem e download, além do tratamento consistente de erros e preservação de `GET /health`.
4. **Testes backend**: cobrir upload válido, ausência e excesso de tamanho, listagem/ordenação, download válido, ID inexistente, falhas de armazenamento e isolamento por dono configurado. Usar diretório temporário nos testes e limpar os artefatos ao final.
5. **Serviços e interface frontend**: integrar `fetch` via `/api`; construir os fluxos de upload, listagem e download e apresentar os estados de carregamento, sucesso e erro.
6. **Validação integrada**: executar testes backend, validar o fluxo completo via proxy Vite e confirmar que arquivos são gravados apenas localmente e que o comportamento após reinício corresponde à limitação documentada.

### Critérios de conclusão

- Upload dentro do limite retorna metadados e cria arquivo local com nome físico gerado.
- Listagem contém somente metadados em memória do dono configurado e está ordenada do mais novo para o mais antigo.
- Download pelo ID retorna o arquivo como anexo sem aceitar caminhos fornecidos pelo cliente.
- Erros de entrada, tamanho e armazenamento retornam status/códigos documentados, sem stack trace ou caminho local.
- Frontend usa o proxy `/api`; `GET /health` continua disponível.
- Nenhum arquivo é enviado a armazenamento externo; metadados são perdidos no reinício, conforme documentado.
