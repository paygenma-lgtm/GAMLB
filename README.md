# 🌳 GAMLB — Полная проект структура

## 📁 Структура папок

```
gamlb-complete/
├── apps/
│   ├── api/src/              ← Backend (Node.js)
│   │   ├── admin.js          # Админ-панель API
│   │   ├── auth.js           # Аутентификация (Google, пароль)
│   │   ├── db.js             # Работа с PostgreSQL
│   │   ├── genealogy.js      # Генеалогия API (GEDCOM, персоны)
│   │   ├── gedcom.js         # Парсер GEDCOM
│   │   ├── plans.js          # API тарифов
│   │   ├── server.js         # Express сервер
│   │   └── store.js          # Хранилище (JSON + DB)
│   │
│   └── web/src/              ← Frontend (React)
│       ├── components/
│       │   ├── TreeView/     # 🌳 Семейное дерево
│       │   │   ├── TreeView.jsx
│       │   │   ├── TreeCanvas.jsx
│       │   │   ├── TreePerson.jsx
│       │   │   ├── PersonDetailCard.jsx
│       │   │   ├── TreeToolbar.jsx
│       │   │   ├── TreeView.css
│       │   │   ├── TreeCanvas.css
│       │   │   ├── TreePerson.css
│       │   │   ├── PersonDetailCard.css
│       │   │   └── TreeToolbar.css
│       │   ├── Button.jsx     # Переиспользуемая кнопка
│       │   └── PageTitle.jsx  # Заголовок страницы
│       ├── data/
│       │   └── treeData.js   # Данные 6 персон (Мартенс)
│       ├── utils/
│       │   └── treeUtils.js  # Функции для работы с деревом
│       ├── main.jsx          # Entry point (React)
│       └── styles.css        # Глобальные стили
└── README.md                 # Этот файл
```

---

## ⚡ Быстрый старт

### 1. Распакуй архив
```bash
unzip gamlb-complete.zip
cd gamlb-complete
```

### 2. Установи зависимости
```bash
# Backend
cd apps/api
npm install

# Frontend
cd ../web
npm install
```

### 3. Запусти оба приложения

**Терминал 1 — API сервер:**
```bash
cd apps/api
npm run dev
# Слушает http://localhost:3000
```

**Терминал 2 — Web интерфейс:**
```bash
cd apps/web
npm run dev
# Открывает http://localhost:5173
```

---

## 🎯 Что реализовано?

### ✅ Backend (API)
- ✅ Аутентификация (Email/пароль + Google OAuth)
- ✅ Система тарифов (Тариф 1/2/3 с разными лимитами)
- ✅ API генеалогии (люди, события, источники)
- ✅ Импорт/экспорт GEDCOM
- ✅ Админ-панель с управлением пользователями
- ✅ PostgreSQL + JSON файлы для dev

### ✅ Frontend (React)
- ✅ 🌳 **Мое древо** — визуализация семьи (3 поколения, 6 персон)
- ✅ **Мои фото** — галерея (заготовка)
- ✅ **Импорт GEDCOM** — загрузка родословной
- ✅ **Управление** — параметры дерева, члены
- ✅ **Источники** — документы и доказательства
- ✅ **Обзор** — статистика и быстрые ссылки

---

## 🌳 Мое древо — особенности

### Функции:
- 📊 **Два режима**: Поколения и Список
- 🔍 **Масштабирование**: от 50% до 200%
- 👤 **Клик на персону**: модальное окно с информацией
- 🎨 **Профессиональный дизайн**: гладкие анимации, адаптив
- ⚡ **Оптимизировано**: useCallback, useMemo, React.memo

### Данные персон:
```javascript
{
  id: 'ivan-1850',
  name: 'Иван Мартенс',
  role: 'дед',
  generation: 1,
  birthYear: 1850,
  deathYear: 1920,
  birthInfo: '1850, Кёнигсберг',
  birthPlace: 'Кёнигсберг',
  bio: 'Прусский купец...',
  isMainPerson: false
}
```

---

## 🔧 Файловая система

### Backend маршруты:
```
POST   /api/auth/register           — регистрация
POST   /api/auth/login              — вход
POST   /api/auth/google             — Google вход
GET    /api/auth/me                 — текущий пользователь
POST   /api/user/plan/select        — выбрать тариф
GET    /api/trees                   — список деревьев
POST   /api/trees/:id/people        — добавить персону
POST   /api/trees/:id/import/gedcom — импорт GEDCOM
GET    /api/admin/overview          — админ статистика
```

### Frontend страницы:
```
/                              — Обзор
/my-tree                       — Мое древо 🌳
/photos                        — Мои фото
/import                        — Импорт GEDCOM
/manage                        — Управление
/sources                       — Источники
/admin                         — Админ-панель
```

---

## 📋 Переменные окружения

### `.env` для API:
```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/gamlb
JWT_SECRET=your-secret-key-min-32-chars-long-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
FRONTEND_ORIGIN=http://localhost:5173
ADMIN_EMAIL=you@example.com
```

### `.env` для Web:
```
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

---

## 🚀 Production Deploy

### Собрать фронтенд:
```bash
cd apps/web
npm run build
# Создает папку dist/
```

### Запустить API:
```bash
cd apps/api
npm start
# Запускает на порту 3000
```

---

## 🐛 Отладка

### Консоль браузера (F12):
- Откройте DevTools → Console
- Смотрите ошибки при запросах к API

### Логи API:
```bash
tail -f /var/log/gamlb-api.log
```

### База данных:
```bash
psql postgresql://user:pass@localhost:5432/gamlb
\dt  # список таблиц
SELECT * FROM users;
```

---

## 📞 Контакты / Поддержка

Если что-то не работает:
1. Проверь все переменные окружения в `.env`
2. Убедись, что оба сервера запущены
3. Очисти кэш браузера (Ctrl+Shift+Delete)
4. Проверь консоль браузера и логи API

---

## 📚 Дальнейшее развитие

- [ ] Редактирование персон через модальные окна
- [ ] Добавление событий (рождение, смерть, брак)
- [ ] Загрузка и привязка фотографий
- [ ] Полнотекстовый поиск по дереву
- [ ] Печать генеалогических графиков
- [ ] Синхронизация с Ancestry.com
- [ ] Мобильное приложение

---

**Версия:** 1.0.0
**Последнее обновление:** 8 августа 2026
**Готово к использованию!** 🎉
