/**
 * SearchPage — full-featured genealogy search UI
 *
 * Communicates with GET /api/search (see apps/api/src/search.js).
 * Uses an AbortController to cancel in-flight requests on every keystroke.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useReducer,
} from 'react';
import { Search, Calendar, MapPin, User, ArrowRight, Bookmark } from 'lucide-react';
import './SearchPage.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
const DEFAULT_LIMIT = 20;

const CATEGORIES = [
  { id: 'all',         label: 'Все записи',                  labelDe: 'Alle Einträge',               labelEn: 'All Records',               count: '8.4M' },
  { id: 'vitals',      label: 'Рождение, браки и смерть',     labelDe: 'Geburts-, Heirats-Register',  labelEn: 'Birth, Marriage & Death',    count: '2.1M' },
  { id: 'census',      label: 'Перепись населения',           labelDe: 'Volkszählungen',              labelEn: 'Census Records',             count: '1.8M' },
  { id: 'trees',       label: 'Генеалогические деревья',      labelDe: 'Stammbäume',                  labelEn: 'Family Trees',               count: '3.2M' },
  { id: 'news',        label: 'Газеты',                       labelDe: 'Zeitungen',                   labelEn: 'Newspapers',                 count: '640K' },
  { id: 'immigration', label: 'Иммиграция',                   labelDe: 'Einwanderung',                labelEn: 'Immigration',                count: '420K' },
  { id: 'military',    label: 'Военные записи',               labelDe: 'Militär',                     labelEn: 'Military Records',           count: '310K' },
];

const COLLECTIONS = [
  { id: 'vitals',     icon: '📜', label: 'Реестры рождений, браков и смерти', count: '2.1M' },
  { id: 'census',     icon: '📋', label: 'Переписи',           count: '1.8M' },
  { id: 'trees',      icon: '🌳', label: 'Деревья',            count: '3.2M' },
  { id: 'immigration',icon: '🚢', label: 'Иммиграция',         count: '420K' },
  { id: 'news',       icon: '📰', label: 'Газеты',             count: '640K' },
  { id: 'military',   icon: '🎖️', label: 'Военные записи',     count: '310K' },
  { id: 'vitals',     icon: '⛪', label: 'Церковные книги',    count: '1.2M' },
  { id: 'all',        icon: '🗂️', label: 'Все коллекции',      count: '8.4M' },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'По релевантности' },
  { value: 'year_asc',  label: 'По году (возр.)' },
  { value: 'year_desc', label: 'По году (убыв.)' },
  { value: 'name_asc',  label: 'По имени' },
];

const TYPE_ICONS = {
  vitals:      '📜',
  census:      '📋',
  trees:       '🌳',
  immigration: '🚢',
  news:        '📰',
  military:    '🎖️',
  default:     '👤',
};

// ── Filter state reducer ──────────────────────────────────────────────────────

const INITIAL_FILTERS = {
  q:          '',
  type:       'all',
  firstName:  '',
  lastName:   '',
  birthYear:  '',
  birthPlace: '',
  deathYear:  '',
  deathPlace: '',
  immYear:    '',
  immPlace:   '',
  gender:     'any',
  period:     'all',    // maps to yearFrom / yearTo
  exact:      false,
  withPhoto:  false,
  withDocs:   false,
  sort:       'relevance',
  page:       1,
};

const PERIOD_MAP = {
  all:    { yearFrom: undefined, yearTo: undefined },
  '1500': { yearFrom: 1500,      yearTo: 1700 },
  '1700': { yearFrom: 1700,      yearTo: 1850 },
  '1850': { yearFrom: 1850,      yearTo: 1950 },
  '1950': { yearFrom: 1950,      yearTo: undefined },
};

function filterReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value, page: 1 };
    case 'SET_PAGE':
      return { ...state, page: action.page };
    case 'RESET':
      return { ...INITIAL_FILTERS };
    default:
      return state;
  }
}

// ── API hook ──────────────────────────────────────────────────────────────────

function useSearch(filters) {
  const [state, setState] = useState({ loading: false, data: null, error: null });
  const abortRef = useRef(null);

  const hasQuery = Boolean(
    filters.q || filters.firstName || filters.lastName ||
    filters.birthPlace || filters.deathPlace || filters.immPlace ||
    filters.birthYear || filters.deathYear || filters.immYear ||
    (filters.type !== 'all')
  );

  const run = useCallback(async () => {
    if (!hasQuery) {
      setState({ loading: false, data: null, error: null });
      return;
    }

    // Cancel previous request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setState(s => ({ ...s, loading: true, error: null }));

    try {
      const period   = PERIOD_MAP[filters.period] ?? {};
      const params   = new URLSearchParams();

      const add = (key, val) => { if (val !== '' && val !== undefined && val !== null) params.set(key, val); };

      add('q',          filters.q);
      add('type',       filters.type);
      add('firstName',  filters.firstName);
      add('lastName',   filters.lastName);
      add('birthYear',  filters.birthYear);
      add('birthPlace', filters.birthPlace);
      add('deathYear',  filters.deathYear);
      add('deathPlace', filters.deathPlace);
      add('immYear',    filters.immYear);
      add('immPlace',   filters.immPlace);
      add('gender',     filters.gender !== 'any' ? filters.gender : undefined);
      add('yearFrom',   period.yearFrom);
      add('yearTo',     period.yearTo);
      add('exact',      filters.exact ? 'true' : undefined);
      add('sort',       filters.sort);
      add('page',       filters.page);
      add('limit',      DEFAULT_LIMIT);

      const res = await fetch(`${API_BASE}/search?${params}`, {
        credentials: 'include',
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      setState({ loading: false, data, error: null });

    } catch (err) {
      if (err.name === 'AbortError') return; // intentionally cancelled
      setState({ loading: false, data: null, error: err.message });
    }
  }, [filters, hasQuery]);

  useEffect(() => { run(); }, [run]);

  return { ...state, hasQuery };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ResultCard({ result, query }) {
  const fullName = [result.given_name, result.surname].filter(Boolean).join(' ');
  const icon     = TYPE_ICONS.default;

  /** Highlight query terms in a string */
  const highlight = (text) => {
    if (!query || !text) return text;
    const words = query.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return text;
    const pattern = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = text.split(pattern);
    return parts.map((p, i) =>
      pattern.test(p) ? <mark key={i}>{p}</mark> : p
    );
  };

  const tags = [
    result.birth_date && 'Рождение',
    result.death_date && 'Смерть',
    result.imm_date   && 'Иммиграция',
  ].filter(Boolean);

  return (
    <article className="sp__card">
      <div className="sp__card__icon">{icon}</div>

      <div>
        <h3 className="sp__card__name">{highlight(fullName) || '—'}</h3>
        <div className="sp__card__meta">
          {(result.birth_year || result.birth_date) && (
            <span className="sp__card__meta-item">
              <Calendar size={12} />
              {result.birth_year ?? result.birth_date}
              {result.death_year ? ` — ${result.death_year}` : ''}
            </span>
          )}
          {result.birth_place && (
            <span className="sp__card__meta-item">
              <MapPin size={12} />
              {highlight(result.birth_place)}
            </span>
          )}
          {result.imm_place && (
            <span className="sp__card__meta-item">
              <ArrowRight size={12} />
              {highlight(result.imm_place)}
            </span>
          )}
        </div>
        {tags.length > 0 && (
          <div className="sp__card__tags">
            {tags.map(t => <span key={t} className="sp__card__tag">{t}</span>)}
          </div>
        )}
      </div>

      <div className="sp__card__actions">
        <button className="sp__card__btn sp__card__btn--primary">Открыть</button>
        <button className="sp__card__btn sp__card__btn--secondary">
          <Bookmark size={12} /> Сохранить
        </button>
      </div>
    </article>
  );
}

function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;

  const items = [];
  const pushPage = (n) => items.push(
    <button
      key={n}
      className={`sp__page-btn${page === n ? ' sp__page-btn--active' : ''}`}
      onClick={() => onPage(n)}
    >{n}</button>
  );

  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) pushPage(i);
  } else {
    pushPage(1);
    if (page > 3) items.push(<span key="s1" className="sp__page-btn sp__page-btn--dots">…</span>);
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) pushPage(i);
    if (page < pages - 2) items.push(<span key="s2" className="sp__page-btn sp__page-btn--dots">…</span>);
    pushPage(pages);
  }

  return <nav className="sp__pagination" aria-label="Страницы результатов">{items}</nav>;
}

function SkeletonList() {
  return (
    <div className="sp__skeleton">
      {[1, 2, 3, 4, 5].map(i => <div key={i} className="sp__skeleton__row" />)}
    </div>
  );
}

function TagGroup({ options, value, onChange }) {
  return (
    <div className="sp__tags">
      {options.map(opt => (
        <button
          key={opt.value}
          className={`sp__tag${value === opt.value ? ' sp__tag--active' : ''}`}
          onClick={() => onChange(opt.value)}
          type="button"
        >{opt.label}</button>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [filters, dispatch] = useReducer(filterReducer, INITIAL_FILTERS);
  const { loading, data, error, hasQuery } = useSearch(filters);

  const set = (field) => (value) => dispatch({ type: 'SET_FIELD', field, value });

  const handleInputChange = (field) => (e) => set(field)(e.target.value);
  const handleCheckChange = (field) => (e) => set(field)(e.target.checked);

  const handleGlobalSearch = useCallback((e) => {
    if (e.key === 'Enter') set('q')(e.target.value);
  }, []);

  const handleCategory = useCallback((id) => {
    dispatch({ type: 'SET_FIELD', field: 'type', value: id });
  }, []);

  const handleCollectionClick = useCallback((id) => {
    dispatch({ type: 'SET_FIELD', field: 'type', value: id });
  }, []);

  const handlePage = useCallback((page) => {
    dispatch({ type: 'SET_PAGE', page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Debounce global search input
  const debounceRef = useRef(null);
  const handleSearchInput = (e) => {
    const val = e.target.value;
    clearTimeout(debounceRef.current);
    if (val.length === 0) set('q')('');
    else debounceRef.current = setTimeout(() => set('q')(val), 400);
  };

  return (
    <div className="sp">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <header className="sp__hero">
        <span className="sp__badge">Поиск по всем записям</span>
        <h1 className="sp__title">Найди <mark>своих предков</mark></h1>
        <p className="sp__subtitle">Миллионы записей · Архивы · Реестры · Переписи · Деревья</p>

        <div className="sp__searchbar" role="search">
          <input
            className="sp__searchbar__input"
            type="search"
            placeholder="Введите имя, фамилию или ключевое слово…"
            defaultValue={filters.q}
            onChange={handleSearchInput}
            onKeyDown={handleGlobalSearch}
            aria-label="Глобальный поиск"
          />
          <button
            className="sp__searchbar__btn"
            onClick={() => set('q')(document.querySelector('.sp__searchbar__input').value)}
            type="button"
          >
            <Search size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Поиск
          </button>
        </div>
      </header>

      {/* ── Category tabs ─────────────────────────────────────── */}
      <nav className="sp__tabs" aria-label="Категории записей">
        <ul className="sp__tabs__list">
          {CATEGORIES.map(cat => (
            <li key={cat.id} className="sp__tabs__item">
              <button
                className={`sp__tabs__btn${filters.type === cat.id ? ' sp__tabs__btn--active' : ''}`}
                onClick={() => handleCategory(cat.id)}
                type="button"
              >
                {cat.label}
                <span className="sp__tabs__count">{cat.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div className="sp__body">

        {/* ── Filters ────────────────────────────────────────── */}
        <aside className="sp__filters" aria-label="Фильтры поиска">
          <div className="sp__filters__head">
            <span>Фильтры</span>
            <button
              className="sp__filters__clear"
              onClick={() => dispatch({ type: 'RESET' })}
              type="button"
            >Очистить</button>
          </div>

          {/* Имя */}
          <fieldset className="sp__fg" style={{ border: 'none', margin: 0, padding: '16px 18px', borderBottom: '1px solid #ede8e0' }}>
            <legend className="sp__fg__label">Имя</legend>
            <div className="sp__fg__row">
              <input
                className="sp__input"
                placeholder="Имя и отчество"
                value={filters.firstName}
                onChange={handleInputChange('firstName')}
                aria-label="Имя и отчество"
              />
              <input
                className="sp__input"
                placeholder="Фамилия"
                value={filters.lastName}
                onChange={handleInputChange('lastName')}
                aria-label="Фамилия"
              />
            </div>
          </fieldset>

          {/* Рождение */}
          <fieldset className="sp__fg" style={{ border: 'none', margin: 0, padding: '16px 18px', borderBottom: '1px solid #ede8e0' }}>
            <legend className="sp__fg__label">Рождение</legend>
            <div className="sp__fg__row">
              <input className="sp__input" type="number" placeholder="Год" value={filters.birthYear} onChange={handleInputChange('birthYear')} aria-label="Год рождения" />
              <input className="sp__input" placeholder="Населённый пункт" value={filters.birthPlace} onChange={handleInputChange('birthPlace')} aria-label="Место рождения" />
            </div>
          </fieldset>

          {/* Смерть */}
          <fieldset className="sp__fg" style={{ border: 'none', margin: 0, padding: '16px 18px', borderBottom: '1px solid #ede8e0' }}>
            <legend className="sp__fg__label">Смерть</legend>
            <div className="sp__fg__row">
              <input className="sp__input" type="number" placeholder="Год" value={filters.deathYear} onChange={handleInputChange('deathYear')} aria-label="Год смерти" />
              <input className="sp__input" placeholder="Населённый пункт" value={filters.deathPlace} onChange={handleInputChange('deathPlace')} aria-label="Место смерти" />
            </div>
          </fieldset>

          {/* Иммиграция */}
          <fieldset className="sp__fg" style={{ border: 'none', margin: 0, padding: '16px 18px', borderBottom: '1px solid #ede8e0' }}>
            <legend className="sp__fg__label">Иммиграция</legend>
            <div className="sp__fg__row">
              <input className="sp__input" type="number" placeholder="Год" value={filters.immYear} onChange={handleInputChange('immYear')} aria-label="Год иммиграции" />
              <input className="sp__input" placeholder="Населённый пункт" value={filters.immPlace} onChange={handleInputChange('immPlace')} aria-label="Место иммиграции" />
            </div>
          </fieldset>

          {/* Пол */}
          <div className="sp__fg">
            <span className="sp__fg__label">Пол</span>
            <TagGroup
              options={[{ value: 'any', label: 'Любой' }, { value: 'male', label: 'Мужской' }, { value: 'female', label: 'Женский' }]}
              value={filters.gender}
              onChange={set('gender')}
            />
          </div>

          {/* Период */}
          <div className="sp__fg">
            <span className="sp__fg__label">Период</span>
            <TagGroup
              options={[
                { value: 'all',  label: 'Все' },
                { value: '1500', label: '1500–1700' },
                { value: '1700', label: '1700–1850' },
                { value: '1850', label: '1850–1950' },
                { value: '1950', label: '1950+' },
              ]}
              value={filters.period}
              onChange={set('period')}
            />
          </div>

          {/* Доп. опции */}
          <div className="sp__fg">
            <span className="sp__fg__label">Дополнительно</span>
            <label className="sp__check">
              <input type="checkbox" checked={filters.exact} onChange={handleCheckChange('exact')} />
              Точное совпадение
            </label>
            <label className="sp__check">
              <input type="checkbox" checked={filters.withPhoto} onChange={handleCheckChange('withPhoto')} />
              Только с фото
            </label>
            <label className="sp__check">
              <input type="checkbox" checked={filters.withDocs} onChange={handleCheckChange('withDocs')} />
              С документами
            </label>
          </div>

          <div className="sp__fg">
            <button
              className="sp__filters__submit"
              type="button"
              onClick={() => set('page')(1)}
            >
              <Search size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Искать
            </button>
          </div>
        </aside>

        {/* ── Results ────────────────────────────────────────── */}
        <main>
          {/* Start screen — collections */}
          {!hasQuery && (
            <section className="sp__collections" aria-label="Популярные коллекции">
              <p className="sp__collections__title">Популярные коллекции</p>
              <div className="sp__collections__grid">
                {COLLECTIONS.map((col, i) => (
                  <button
                    key={i}
                    className="sp__coll-card"
                    onClick={() => handleCollectionClick(col.id)}
                    type="button"
                  >
                    <div className="sp__coll-card__icon">{col.icon}</div>
                    <div className="sp__coll-card__name">{col.label}</div>
                    <div className="sp__coll-card__count">{col.count} записей</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Loading skeleton */}
          {loading && <SkeletonList />}

          {/* Error */}
          {error && (
            <div className="sp__state" role="alert">
              <div className="sp__state__icon">⚠️</div>
              <h3>Ошибка поиска</h3>
              <p>{error}</p>
            </div>
          )}

          {/* Results */}
          {!loading && data && (
            <>
              <div className="sp__toolbar">
                <p className="sp__toolbar__count">
                  Найдено: <strong>{data.total.toLocaleString()}</strong> записей
                </p>
                <div className="sp__toolbar__sort">
                  <label htmlFor="sort-select">Сортировка:</label>
                  <select
                    id="sort-select"
                    value={filters.sort}
                    onChange={(e) => set('sort')(e.target.value)}
                  >
                    {SORT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {data.results.length === 0 ? (
                <div className="sp__state">
                  <div className="sp__state__icon">🔍</div>
                  <h3>Записей не найдено</h3>
                  <p>Попробуйте изменить параметры или очистить фильтры.</p>
                </div>
              ) : (
                <>
                  {data.results.map(r => (
                    <ResultCard key={r.id} result={r} query={filters.q} />
                  ))}
                  <Pagination
                    page={data.page}
                    pages={data.pages}
                    onPage={handlePage}
                  />
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
