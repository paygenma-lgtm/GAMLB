# GAMLB Backend

Backend для регистрации, обычного входа, Google OAuth и серверной сессии.

## Запуск

```bash
cp .env.example .env
# замените JWT_SECRET на случайную строку длиной не менее 32 символов
npm install
npm run dev
```

API:

- `POST /api/auth/register` — регистрация по имени, email и паролю;
- `POST /api/auth/login` — вход по email и паролю;
- `POST /api/auth/google` — проверка Google Identity credential на сервере;
- `GET /api/auth/me` — восстановление текущей сессии;
- `POST /api/auth/logout` — удаление HttpOnly cookie;
- `GET /api/health` — health check.

## Важно для production

`src/store.js` использует JSON-файл только как временное хранилище. Перед production замените его на PostgreSQL/MySQL/SQLite с миграциями, уникальным индексом email и транзакциями.

Также необходимо:

- задать `NODE_ENV=production`;
- использовать HTTPS;
- сгенерировать новый `JWT_SECRET`;
- добавить домен production в Google OAuth Client ID;
- настроить CORS только на домен frontend;
- добавить email verification, password reset и CSRF-защиту для выбранной схемы cookie;
- не хранить секреты в репозитории.
