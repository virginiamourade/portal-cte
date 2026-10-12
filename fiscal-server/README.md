# Servidor fiscal próprio — CT-e SP

Base inicial para conexão direta, sem API fiscal comercial. Implementa **consulta de status e consulta por chave** usando os WebServices oficiais de SP, SOAP 1.2 e certificado A1 no TLS.

**Não implementa geração, assinatura XML, XSD, autorização, cancelamento, carta de correção, substituição nem DACTE.** O portal continua usando rascunhos até esses módulos serem concluídos e homologados.

## Hospedagem

Executar em servidor Node.js 22 ou container, atrás de HTTPS e com acesso restrito. A hospedagem atual do portal não expõe um binding mTLS para carregar o A1; o servidor separado faz essa conexão. Não hospedar este serviço como um site estático. Não expor porta HTTP sem proteção TLS.

Monte o `.pfx` e um arquivo com sua senha em caminhos de segredo. Nunca grave certificados, senha ou token no Git, no banco do portal ou na imagem Docker.

- `A1_PFX_PATH`: caminho para o A1 montado (padrão `/run/secrets/certificado.pfx`).
- `A1_PASSWORD_PATH`: caminho do arquivo de senha (padrão `/run/secrets/a1_password`).
- `FISCAL_TOKEN`: segredo aleatório com no mínimo 32 caracteres.
- `HOST`: padrão `127.0.0.1`; no container `0.0.0.0`.
- `PORT`: padrão `8080`.

Configure no servidor do portal, usando segredos de hospedagem, `FISCAL_SERVER_URL` (origem HTTPS do servidor próprio) e `FISCAL_SERVER_TOKEN` (o mesmo token). Esses valores nunca chegam ao navegador. O token não deve aparecer em logs ou em URLs.

## Operações implementadas

Todas exigem `Authorization: Bearer <token>`:

- `GET /health`: certificado carregado e capacidades; não significa serviço SEFAZ operacional.
- `POST /v1/status`: JSON `{"environment":"test"}` ou `production`. Retorna `cStat` e `xMotivo` oficiais; `operational` apenas para `107`.
- `POST /v1/consult`: JSON `{"environment":"test","key":"chave de 44 caracteres"}`. Não altera documentos do portal nem confunde importação com autorização.

Sem reenvio automático. URLs oficiais fixas; o cliente não pode selecionar um destino arbitrário. Erros não expõem senha, chave privada, conteúdo SOAP ou detalhes do certificado.

## Validação

`npm ci` e `npm test`. Os testes locais verificam SOAP, ambientes, preservação do A1 no transporte e interpretação de respostas. A conexão real não foi testada: certificado e servidor ainda não fornecidos. Homologar status, consultas, autorização e eventos antes de habilitar produção.

## Fontes

- https://portal.fazenda.sp.gov.br/servicos/cte/Paginas/Webservices.aspx
- https://dfe-portal.svrs.rs.gov.br/CTe/Documentos
- https://www.cte.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=0eu1YksSGXM%3D

## Módulos restantes

Montagem completa do CT-e a partir do formulário; validação XSD com schemas RTC vigentes; leitura/validação da identidade e validade do certificado; assinatura XMLDSig; autorização síncrona com XML compactado conforme MOC; controle atômico de série e número; idempotência e reconciliação por chave; registro persistente dos retornos e eventos; regras de cancelamento, correção e substituição; DACTE oficial. A opção pelo Simples não permite deduzir automaticamente todos os tratamentos de IBS/CBS.
