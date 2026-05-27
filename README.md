# Sistema de Pedidos de Publicações

Aplicação web local para cadastrar, acompanhar, organizar e exportar pedidos de publicações.

## Como rodar

1. Abra o terminal nesta pasta.
2. Execute:

```bash
npm.cmd start
```

3. Acesse:

```text
http://localhost:3000
```

## Funcionalidades

- Cadastro, edição e exclusão de pedidos.
- Campo de observações para detalhes de entrega, contato ou substituição.
- Nome do irmão com autocomplete a partir de nomes já cadastrados.
- Sugestão automática das publicações mais usadas.
- Status: `Pendente`, `Pedido realizado` e `Recebido`.
- Data do pedido automática e editável.
- Data de chegada preenchida automaticamente ao marcar como recebido.
- Busca, filtro por status, filtro por data e ordenação por data, nome, status e chegada.
- Histórico completo ao clicar no nome de um irmão.
- Dashboard com totais.
- Contador de quantidades por publicação.
- Alerta de possível duplicação.
- Exportação para CSV e XLSX.
- Backup automático no navegador e opção de baixar/restaurar backup JSON com confirmação interna.

## Armazenamento

Os dados ficam salvos no `localStorage` do navegador usado para acessar o sistema. Isso mantém a aplicação simples e rápida para uso local. Para trocar de computador ou navegador, use o botão `Baixar backup` e depois `Restaurar`.

## Estrutura

```text
pedidos-sistema/
  package.json
  server.js
  public/
    index.html
    styles.css
    app.js
```
