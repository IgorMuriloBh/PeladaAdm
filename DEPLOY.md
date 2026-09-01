# Deploy — Pelada ADM

Aplicação em 3 partes: **Frontend** (Next.js), **Backend** (Express + Prisma) e **PostgreSQL**.
Tudo está dockerizado. Há dois caminhos para colocar em produção.

---

## Rodar localmente com Docker (stack completa)

```bash
cp .env.example .env       # ajuste as senhas/segredos
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend:  http://localhost:3001
- As migrações do banco rodam sozinhas ao subir o backend.

Portas configuráveis (se 3000/3001 estiverem ocupadas):
```bash
FRONTEND_PORT=3005 BACKEND_PORT=3006 docker compose up
```

---

## Opção A — VPS com Docker (controle total, ~US$5/mês)

Ex.: DigitalOcean, Hetzner, Contabo. Passos:

1. Crie um servidor Ubuntu e instale Docker + Docker Compose.
2. Aponte um domínio (ex.: `pelada.seudominio.com` e `api.pelada.seudominio.com`) para o IP.
3. Clone o repositório no servidor:
   ```bash
   git clone https://github.com/IgorMuriloBh/PeladaAdm.git
   cd PeladaAdm
   cp .env.example .env
   ```
4. Edite `.env` com os valores de produção:
   ```
   POSTGRES_PASSWORD=<senha forte>
   JWT_SECRET=<string longa e aleatória>
   APP_URL=https://pelada.seudominio.com
   CORS_ORIGINS=https://pelada.seudominio.com
   NEXT_PUBLIC_API_URL=https://api.pelada.seudominio.com/api
   ```
5. Suba: `docker compose up -d --build`
6. Coloque um proxy reverso (Caddy ou Nginx) na frente para HTTPS:
   - `pelada.seudominio.com` → frontend (porta 3000)
   - `api.pelada.seudominio.com` → backend (porta 3001)

Para atualizar após mudanças: `git pull && docker compose up -d --build`.

---

## Opção B — Railway (gerenciado, deploy no git push) — recomendado para testes

Não exige servidor nem cuidar de HTTPS. Cada `git push` publica.

1. Acesse railway.app e crie um projeto a partir do repositório GitHub.
2. **Banco:** adicione um PostgreSQL (Railway gera a `DATABASE_URL`).
3. **Backend:** novo serviço a partir do repo, Root Directory = `backend`.
   - Railway detecta o `Dockerfile`.
   - Variáveis: `DATABASE_URL` (referência ao Postgres), `JWT_SECRET`, `NODE_ENV=production`,
     `APP_URL`, `CORS_ORIGINS` (a URL do frontend), `UPLOAD_DIR=uploads`.
   - Adicione um **Volume** montado em `/app/uploads` (senão as fotos/comprovantes somem a cada deploy).
4. **Frontend:** novo serviço, Root Directory = `frontend`.
   - Variável de **build**: `NEXT_PUBLIC_API_URL` = URL pública do backend + `/api`.
5. Ajuste `CORS_ORIGINS`/`APP_URL` no backend com a URL final do frontend.

---

## Observações importantes

- **Uploads (fotos, QR Code, comprovantes):** ficam em `backend/uploads`. Em produção use um
  **volume persistente** (compose e Railway já previstos acima). Para escala real, migrar para
  storage externo (S3/Cloudinary) é o próximo passo.
- **Segredos:** nunca comitar `.env`. Gere um `JWT_SECRET` forte em produção.
- **Primeiro acesso:** cadastre o admin via `POST /api/auth/register` (nome, email, senha).
