# Execucao local

## Backend

Configure ao menos um usuario e um token bearer aleatorio com 32 ou mais caracteres. Os tokens sao configurados no servidor; a identidade do dono do documento e derivada do token validado, nunca de um campo enviado pelo cliente.

```sh
export DMS_USERS='{"alice":"substitua-por-um-token-aleatorio-de-32-caracteres-ou-mais"}'
export DMS_MAX_FILE_SIZE=10485760
export DMS_MAX_USER_STORAGE=104857600
npm --prefix backend start
```

O armazenamento padrao e `backend/storage`. `DMS_STORAGE_DIR` pode apontar para outro diretorio local. O tamanho maximo por arquivo e 10 MiB e a cota padrao por usuario e 100 MiB. A rota `/health` nao exige autenticacao; upload, listagem e download exigem bearer token.

## Frontend

```sh
npm --prefix frontend run dev
```

No ambiente de desenvolvimento, o Vite encaminha `/api` ao backend em `localhost:3000`. A interface solicita o token a cada sessao e o mantem somente em memoria. Em outra topologia, configure `VITE_API_BASE_URL`; em producao, prefira um proxy reverso same-origin com TLS para a API.

## Limites desta fase

Os metadados ficam em memoria e desaparecem ao reiniciar o backend. Os arquivos permanecem no disco, portanto esta versao e adequada apenas a uma instancia e pode deixar arquivos sem metadados depois de reinicios. Os tokens estaticos devem ser mantidos fora do repositorio, ser distintos por usuario e ser rotacionados; isso nao substitui um provedor completo de identidade para producao.