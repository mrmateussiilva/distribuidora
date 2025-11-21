# PDV - Distribuidora de Gás e Água

Sistema de Ponto de Venda (PDV) desenvolvido com Tauri v2, Rust e React para uma distribuidora de Gás e Água.

## Características

- ✅ Arquitetura Local-First com SQLite
- ✅ Gerenciamento de vasilhames/cascos
- ✅ Controle de estoque duplo (cheios e vazios)
- ✅ Interface moderna com Tailwind CSS
- ✅ Preços diferenciados (com/sem casco)

## Tecnologias

- **Backend:** Tauri v2 + Rust + SQLite (sqlx)
- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS + Lucide React

## Instalação

1. Instale as dependências do frontend:
```bash
npm install
```

2. O Rust e o Cargo devem estar instalados. Se não estiverem:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

3. Para rodar em desenvolvimento:
```bash
npm run tauri dev
```

4. Para build de produção:
```bash
npm run tauri build
```

## Estrutura do Banco de Dados

O banco de dados SQLite é criado automaticamente no diretório de dados do aplicativo.

### Tabelas

- **products**: Produtos (Gás, Água, Outros)
- **orders**: Pedidos/Vendas
- **order_items**: Itens dos pedidos

## Regras de Negócio

1. **Preços:**
   - `price_refill`: Preço quando o cliente traz o casco vazio
   - `price_full`: Preço quando o cliente não traz o casco

2. **Estoque:**
   - `stock_full`: Quantidade de produtos cheios
   - `stock_empty`: Quantidade de cascos vazios

3. **Ao finalizar venda:**
   - Sempre diminui `stock_full`
   - Se o cliente trouxe o casco, aumenta `stock_empty`

## Uso

1. Selecione produtos clicando nos cards
2. No carrinho, ajuste a quantidade e marque se o cliente trouxe o casco
3. O preço é atualizado automaticamente
4. Finalize o pedido clicando em "Finalizar Pedido"

## Desenvolvimento

O projeto está estruturado da seguinte forma:

```
distribbuidora/
├── src/                    # Frontend React
│   ├── components/         # Componentes React
│   ├── App.tsx             # Componente principal
│   └── types.ts            # Tipos TypeScript
├── src-tauri/              # Backend Rust
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   ├── db.rs           # Configuração do banco
│   │   └── models.rs       # Modelos de dados
│   └── migrations/         # Migrações SQL
└── package.json
```

