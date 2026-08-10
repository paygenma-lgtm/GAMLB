import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, useNavigate, NavLink } from 'react-router-dom';
import {
  Archive, BookOpen, CalendarDays, ChevronDown, FileText, GitBranch,
  Globe2, LayoutDashboard, Menu, Plus, Search, Settings, ShieldCheck,
  Sparkles, Upload, Users, X, Download, Map, Settings2, CheckSquare,
  Clock, MapPin, Link2, FileJson, Dna, MessageCircle, Bell, LogOut,
  User, Lock, RefreshCw, Image, FolderOpen, Layers, Share2, Activity,
  ChevronRight, Eye, EyeOff
} from 'lucide-react';
import { people, events, sources } from './domain/sampleData';
import SearchPage from './SearchPage.jsx';
import LandingPage from './LandingPage.jsx';
import AdminApp from './admin.jsx';
import { AdminAuthGate } from './google-auth.jsx';
import './styles.css';

const nav = [
  ['overview',  'Обзор',           LayoutDashboard],
  ['my-tree',   'Мое древо',       GitBranch],
  ['photos',    'Медиаархив',      Image],
  ['import',    'Экспорт/Импорт',  FileJson],
  ['manage',    'Управление',      Settings2],
  ['sources',   'Источники',       BookOpen],
  ['research',  'Исследования',    Search],
  ['messages',  'Сообщения',       MessageCircle],
];

// ==================== USER MENU ====================
function UserMenu({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const sections = [
    {
      title: 'Моё древо и данные',
      items: [
        { id: 'my-tree',  icon: GitBranch,   label: 'Древо',          desc: 'Интерактивная схема рода' },
        { id: 'persons',  icon: Users,        label: 'Список персон',  desc: 'Все добавленные родственники' },
        { id: 'photos',   icon: Image,        label: 'Медиаархив',     desc: 'Фото, документы, аудио' },
        { id: 'sources',  icon: BookOpen,     label: 'Источники',      desc: 'Архивные справки и ссылки' },
      ]
    },
    {
      title: 'Исследования и поиск',
      items: [
        { id: 'research',  icon: Search,      label: 'Мои запросы',    desc: 'История поисковых запросов' },
        { id: 'matches',   icon: Layers,      label: 'Совпадения',     desc: 'Родственники в других древах' },
        { id: 'dna',       icon: Dna,         label: 'ДНК-тесты',      desc: 'Генетические совпадения' },
      ]
    },
    {
      title: 'Совместная работа',
      items: [
        { id: 'messages',  icon: MessageCircle, label: 'Сообщения',      desc: 'Чат с исследователями' },
        { id: 'access',    icon: Share2,         label: 'Доступ',         desc: 'Приглашение родственников' },
        { id: 'activity',  icon: Activity,       label: 'Лента обновлений', desc: 'История изменений' },
      ]
    },
    {
      title: 'Настройки и профиль',
      items: [
        { id: 'profile',   icon: User,        label: 'Личные данные',  desc: 'Имя, контакты, подписка' },
        { id: 'privacy',   icon: Lock,        label: 'Приватность',    desc: 'Видимость родственников' },
        { id: 'notifications', icon: Bell,    label: 'Уведомления',    desc: 'Дни рождения и совпадения' },
        { id: 'import',    icon: RefreshCw,   label: 'Экспорт/Импорт', desc: 'Формат GEDCOM' },
      ]
    },
  ];

  return (
    <div className="user-menu-wrap" ref={ref}>
      <button className="user-menu-btn" onClick={() => setOpen(!open)}>
        <div className="avatar small">ГМ</div>
        <span className="user-menu-name">Геннадий Мартенс</span>
        <ChevronDown size={14} className={open ? 'rotated' : ''} />
      </button>

      {open && (
        <div className="user-dropdown">
          <div className="user-dropdown-header">
            <div className="avatar medium">ГМ</div>
            <div>
              <strong>Геннадий Мартенс</strong>
              <small>Личный аккаунт · Семья Мартенс</small>
            </div>
          </div>

          <div className="user-dropdown-body">
            {sections.map(section => (
              <div key={section.title} className="dropdown-section">
                <div className="dropdown-section-title">{section.title}</div>
                {section.items.map(item => (
                  <button
                    key={item.id}
                    className="dropdown-item"
                    onClick={() => { onNavigate(item.id); setOpen(false); }}
                  >
                    <item.icon size={16} className="dropdown-item-icon" />
                    <div className="dropdown-item-text">
                      <span>{item.label}</span>
                      <small>{item.desc}</small>
                    </div>
                    <ChevronRight size={13} className="dropdown-item-arrow" />
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className="user-dropdown-footer">
            <button className="dropdown-logout">
              <LogOut size={15} />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [active, setActive] = useState('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState('');
  const filteredPeople = useMemo(() => people.filter(p => p.name.toLowerCase().includes(query.toLowerCase())), [query]);

  return <div className="app-shell">
    <aside className={mobileOpen ? 'sidebar open' : 'sidebar'}>
      <Link to="/" className="brand" style={{ textDecoration: 'none' }}>
        <span className="brand-mark">G</span><span>GAMLB</span><small>Семейная история</small>
      </Link>
      <div className="tree-switcher"><div><span className="eyebrow">ТЕКУЩЕЕ ДЕРЕВО</span><strong>Семья Мартенс</strong></div><ChevronDown size={16}/></div>
      <nav className="side-nav" aria-label="Основная навигация">
        {nav.map(([id, label, Icon]) => <button key={id} className={active === id ? 'nav-item active' : 'nav-item'} onClick={() => { setActive(id); setMobileOpen(false); }}><Icon size={18}/><span>{label}</span></button>)}
      </nav>
      <div className="sidebar-bottom">
        <button className="nav-item"><Sparkles size={18}/><span>ИИ-ассистент</span><b className="new-badge">NEW</b></button>
        <button className="nav-item"><Settings size={18}/><span>Настройки</span></button>
        <div className="storage"><div className="storage-line"><span>Хранилище</span><span>1.2 / 5 ГБ</span></div><div className="progress"><i style={{width: '24%'}}/></div></div>
        <div className="profile-mini"><div className="avatar">ГМ</div><div><strong>Геннадий Мартенс</strong><small>Личный аккаунт</small></div><ChevronDown size={15}/></div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <button className="mobile-menu" aria-label="Открыть меню" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X/> : <Menu/>}</button>
        <div className="breadcrumbs"><span>Моё дерево</span><b>/</b><strong>{nav.find(n => n[0] === active)?.[1] || 'Обзор'}</strong></div>
        <div className="top-actions">
          <div className="global-search"><Search size={16}/><input aria-label="Поиск по дереву" placeholder="Поиск по дереву…" value={query} onChange={e => setQuery(e.target.value)}/><kbd>⌘ K</kbd></div>
          <button className="icon-button" title="Язык"><Globe2 size={18}/></button>
          <UserMenu onNavigate={setActive} />
        </div>
      </header>
      <div className="content">
        {active === 'overview'  && <Overview onAdd={() => setShowAdd(true)} onNavigate={setActive}/>}
        {active === 'my-tree'   && <MyTreeView onAdd={() => setShowAdd(true)}/>}
        {active === 'persons'   && <PersonsView/>}
        {active === 'photos'    && <PhotosView onAdd={() => setShowAdd(true)}/>}
        {active === 'import'    && <ImportGedcomView/>}
        {active === 'manage'    && <ManageView/>}
        {active === 'sources'   && <SourcesView/>}
        {active === 'research'  && <ResearchView/>}
        {active === 'matches'   && <MatchesView/>}
        {active === 'dna'       && <DnaView/>}
        {active === 'messages'  && <MessagesView/>}
        {active === 'access'    && <AccessView/>}
        {active === 'activity'  && <ActivityView/>}
        {active === 'profile'   && <ProfileView/>}
        {active === 'privacy'   && <PrivacyView/>}
        {active === 'notifications' && <NotificationsView/>}
      </div>
    </main>
    {showAdd && <AddPersonModal onClose={() => setShowAdd(false)}/>}
  </div>;
}

function PageTitle({ eyebrow, title, description, action }) { return <div className="page-title"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>; }
function Button({ children, secondary = false, onClick }) { return <button className={secondary ? 'button secondary' : 'button'} onClick={onClick}>{children}</button>; }
function EmptyState({ icon: Icon, title, text, action }) { return <div className="empty-state-large"><Icon size={48}/><h3>{title}</h3><p>{text}</p>{action}</div>; }

// ==================== OVERVIEW ====================
function Overview({ onAdd, onNavigate }) { return <>
  <PageTitle eyebrow="ОБЗОР ДЕРЕВА" title="Добро пожаловать, Геннадий" description="Продолжайте исследование семьи Мартенс с того места, где остановились." action={<Button onClick={onAdd}><Plus size={17}/> Добавить человека</Button>}/>
  <div className="stats-grid"><Stat icon={Users} value="248" label="Человек в дереве" tone="blue"/><Stat icon={GitBranch} value="86" label="Семейных связей" tone="gold"/><Stat icon={FileText} value="37" label="Источников" tone="green"/><Stat icon={ShieldCheck} value="72%" label="Данных подтверждено" tone="violet"/></div>
  <div className="dashboard-grid"><section className="panel tree-preview"><div className="panel-head"><div><span className="eyebrow">ВИЗУАЛИЗАЦИЯ</span><h2>Семейное дерево</h2></div><button className="text-button" onClick={() => onNavigate('my-tree')}>Открыть дерево →</button></div><MiniTree/></section><section className="panel activity"><div className="panel-head"><div><span className="eyebrow">ИССЛЕДОВАНИЕ</span><h2>Последние события</h2></div><button className="text-button" onClick={() => onNavigate('sources')}>Все события →</button></div><div className="activity-list">{events.map((e, i) => <div className="activity-item" key={e.id}><span className={'event-dot dot-' + i}/><div><strong>{e.type}</strong><p>{e.place} · {e.date}</p><small><BookOpen size={13}/> {e.source}</small></div></div>)}</div></section></div>
  <section className="panel getting-started"><div><span className="eyebrow">СЛЕДУЮЩИЙ ШАГ</span><h2>Добавьте доказательства к фактам</h2><p>У вас есть 12 фактов без источников. Свяжите документы и цитаты, чтобы сделать историю надёжнее.</p></div><Button secondary onClick={() => onNavigate('sources')}>Открыть источники</Button></section>
</>; }
function Stat({ icon: Icon, value, label, tone }) { return <div className="stat-card"><span className={'stat-icon ' + tone}><Icon size={19}/></span><div><strong>{value}</strong><span>{label}</span></div></div>; }
function MiniTree() { return <div className="mini-tree"><div className="tree-line line-a"/><div className="tree-line line-b"/><div className="tree-node node-grand"><span className="avatar portrait">ИМ</span><small>Иван Мартенс</small></div><div className="tree-node node-grand second"><span className="avatar portrait">ММ</span><small>Мария Мартенс</small></div><div className="tree-node node-parent"><span className="avatar portrait">АМ</span><small>Александр Мартенс</small></div><div className="tree-node node-parent second"><span className="avatar portrait">ЕМ</span><small>Елена Мартенс</small></div><div className="tree-node node-me"><span className="avatar portrait selected">ГМ</span><small>Геннадий Мартенс</small></div></div>; }

// ==================== МОЕ ДРЕВО ====================
function MyTreeView({ onAdd }) {
  const [zoom, setZoom] = useState(100);
  const [selected, setSelected] = useState(null);
  return <><PageTitle eyebrow="МОЕ ДРЕВО" title="Семья Мартенс" description="Редактируйте связи, события и источники в одном пространстве." action={<><Button secondary><Upload size={17}/> Импорт GEDCOM</Button><Button onClick={onAdd}><Plus size={17}/> Добавить</Button></>}/><div className="tree-toolbar"><button className="tool active">Поколения</button><button className="tool">Список</button><span className="toolbar-spacer"/><button className="tool" onClick={() => setZoom(Math.max(50, zoom - 10))}>−</button><span>{zoom}%</span><button className="tool" onClick={() => setZoom(Math.min(200, zoom + 10))}>+</button></div><section className="panel large-tree"><div style={{transform: `scale(${zoom/100})`, transformOrigin: 'center top', transition: 'transform 0.2s'}}><div className="detailed-tree">
    <div className="gen-row gen-1">
      <TreePerson name="Иван Мартенс" years="1850-1920" role="дед" selected={selected === 'ivan'} onClick={() => setSelected('ivan')}/>
      <TreePerson name="Мария Кольман" years="1855-1925" role="бабушка" selected={selected === 'maria'} onClick={() => setSelected('maria')}/>
    </div>
    <div className="tree-connection gen-connection-1"/>
    <div className="gen-row gen-2">
      <TreePerson name="Александр Мартенс" years="1880-1955" role="отец" selected={selected === 'alex'} onClick={() => setSelected('alex')}/>
      <TreePerson name="Елена Петрова" years="1885-1970" role="мать" selected={selected === 'elena'} onClick={() => setSelected('elena')}/>
    </div>
    <div className="tree-connection gen-connection-2"/>
    <div className="gen-row gen-3">
      <TreePerson name="Геннадий Мартенс" years="1920-" role="я" selected={selected === 'gennady'} onClick={() => setSelected('gennady')} highlight/>
      <TreePerson name="Лилия Мартенс" years="1922-2000" role="сестра" selected={selected === 'liliya'} onClick={() => setSelected('liliya')}/>
    </div>
  </div></div><div className="tree-hint"><GitBranch size={18}/><span>Нажми на человека, чтобы открыть профиль</span></div></section>{selected && <TreePersonCard person={selected} onClose={() => setSelected(null)}/>}</>; }

function TreePerson({ name, years, role, selected, onClick, highlight }) {
  return <button className={`tree-person ${selected ? 'selected' : ''} ${highlight ? 'highlight' : ''}`} onClick={onClick}>
    <div className="person-avatar">{name.split(' ').map(w => w[0]).join('').slice(0,2)}</div>
    <strong>{name.split(' ')[0]}</strong>
    <small>{role}</small>
    <em>{years}</em>
  </button>;
}

function TreePersonCard({ person, onClose }) {
  const details = {
    'ivan':    { name: 'Иван Мартенс',      birth: '1850, Кёнигсберг',      death: '1920', info: 'Прусский купец. Владелец текстильного предприятия.' },
    'maria':   { name: 'Мария Кольман',      birth: '1855, Кёнигсберг',      death: '1925', info: 'Дочь банкира. Известна благотворительностью.' },
    'alex':    { name: 'Александр Мартенс',  birth: '1880, Кёнигсберг',      death: '1955', info: 'Инженер. Работал на железной дороге.' },
    'elena':   { name: 'Елена Петрова',       birth: '1885, Санкт-Петербург', death: '1970', info: 'Учительница музыки. Три языка.' },
    'gennady': { name: 'Геннадий Мартенс',   birth: '1920, Кёнигсберг',      death: null,   info: 'Исследователь семейной истории. Живёт в Берлине.' },
    'liliya':  { name: 'Лилия Мартенс',      birth: '1922, Кёнигсберг',      death: '2000', info: 'Врач-невролог. Эмигрировала в США в 1947.' }
  };
  const d = details[person] || {};
  return <div className="person-detail-card">
    <button className="card-close" onClick={onClose}><X size={18}/></button>
    <h3>{d.name}</h3>
    <div className="detail-row"><span>Рождение:</span><strong>{d.birth}</strong></div>
    {d.death && <div className="detail-row"><span>Смерть:</span><strong>{d.death}</strong></div>}
    <p className="detail-bio">{d.info}</p>
    <div className="detail-actions">
      <button className="detail-btn">Редактировать</button>
      <button className="detail-btn secondary">События</button>
      <button className="detail-btn secondary">Источники</button>
    </div>
  </div>;
}

// ==================== СПИСОК ПЕРСОН ====================
function PersonsView() {
  const [search, setSearch] = useState('');
  const persons = [
    { id: 1, name: 'Александр Мартенс', birth: '1880', place: 'Кёнигсберг', relation: 'Отец' },
    { id: 2, name: 'Геннадий Мартенс',  birth: '1920', place: 'Кёнигсберг', relation: 'Я' },
    { id: 3, name: 'Елена Петрова',      birth: '1885', place: 'С.-Петербург', relation: 'Мать' },
    { id: 4, name: 'Иван Мартенс',       birth: '1850', place: 'Кёнигсберг', relation: 'Дед' },
    { id: 5, name: 'Лилия Мартенс',      birth: '1922', place: 'Кёнигсберг', relation: 'Сестра' },
    { id: 6, name: 'Мария Кольман',       birth: '1855', place: 'Кёнигсберг', relation: 'Бабушка' },
  ];
  const filtered = persons.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  return <>
    <PageTitle eyebrow="СПИСОК ПЕРСОН" title="Все родственники" description="Алфавитный перечень всех добавленных людей." action={<Button><Plus size={17}/> Добавить</Button>}/>
    <section className="panel">
      <div className="search-bar" style={{marginBottom: 20}}>
        <Search size={16}/><input placeholder="Поиск по имени…" value={search} onChange={e => setSearch(e.target.value)}/>
      </div>
      <table className="persons-table">
        <thead><tr><th>Имя</th><th>Год рожд.</th><th>Место</th><th>Степень родства</th><th></th></tr></thead>
        <tbody>{filtered.map(p => (
          <tr key={p.id}>
            <td><strong>{p.name}</strong></td>
            <td>{p.birth}</td>
            <td>{p.place}</td>
            <td><span className="badge">{p.relation}</span></td>
            <td><button className="text-button">Открыть →</button></td>
          </tr>
        ))}</tbody>
      </table>
    </section>
  </>;
}

// ==================== МЕДИААРХИВ ====================
function PhotosView({ onAdd }) { return <>
  <PageTitle eyebrow="МЕДИААРХИВ" title="Галерея семьи" description="Фотографии, сканы документов, аудиозаписи интервью." action={<Button onClick={onAdd}><Upload size={17}/> Загрузить</Button>}/>
  <div className="media-tabs">
    <button className="tool active">Фотографии</button>
    <button className="tool">Документы</button>
    <button className="tool">Аудио</button>
  </div>
  <section className="panel"><EmptyState icon={Image} title="Медиафайлы не загружены" text="Загрузите фотографии, сканы документов или аудиозаписи. Вы сможете связать их с людьми и событиями." action={<Button onClick={onAdd}><Upload size={17}/> Загрузить первый файл</Button>}/></section>
</>; }

// ==================== ЭКСПОРТ/ИМПОРТ ====================
function ImportGedcomView() { return <>
  <PageTitle eyebrow="ЭКСПОРТ / ИМПОРТ" title="Работа с GEDCOM" description="Импортируйте или экспортируйте родословную в международном формате."/>
  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:24}}>
    <section className="panel">
      <h3 style={{marginBottom:16}}><Upload size={18} style={{verticalAlign:'middle', marginRight:8}}/>Импорт GEDCOM</h3>
      <div className="import-area"><FileJson size={52}/><h3>Перетащите файл сюда</h3><p>или <button className="text-button-inline">нажмите, чтобы выбрать</button></p><small>Форматы: .ged, .gedx</small></div>
    </section>
    <section className="panel">
      <h3 style={{marginBottom:16}}><Download size={18} style={{verticalAlign:'middle', marginRight:8}}/>Экспорт GEDCOM</h3>
      <p style={{color:'var(--text-muted)', marginBottom:20, fontSize:'0.9rem'}}>Скачайте всё ваше дерево в формате GEDCOM для использования в других программах.</p>
      <Button><Download size={17}/> Скачать GEDCOM</Button>
      <div className="import-history" style={{marginTop:20}}>
        <div className="history-item"><span className="history-icon">✓</span><div><strong>family_tree_2024.ged</strong><small>247 человек · 5 мая 2024</small></div></div>
      </div>
    </section>
  </div>
</>; }

// ==================== УПРАВЛЕНИЕ ====================
function ManageView() { return <>
  <PageTitle eyebrow="УПРАВЛЕНИЕ" title="Параметры дерева" description="Настройки видимости, членов и прав доступа."/>
  <section className="panel settings-card"><h3>Основные параметры</h3><label><span>Название дерева</span><input value="Семья Мартенс" readOnly/></label><label><span>Описание</span><textarea defaultValue="История семьи Мартенс с XVIII века" rows="3"/></label><h3 style={{marginTop: '24px'}}>Видимость</h3><div className="radio-group"><label><input type="radio" name="visibility" value="private" defaultChecked/><span>Приватное (только я)</span></label><label><input type="radio" name="visibility" value="members"/><span>Для членов (по приглашению)</span></label><label><input type="radio" name="visibility" value="public"/><span>Публичное</span></label></div><Button style={{marginTop: '20px'}}>Сохранить</Button></section>
  <section className="panel settings-card"><h3>Члены дерева</h3><div className="members-list"><div className="member-row"><span className="avatar" style={{backgroundColor: '#d1a762'}}>ГМ</span><div><strong>Геннадий Мартенс</strong><small>Владелец</small></div></div><div className="member-row"><span className="avatar" style={{backgroundColor: '#b7ced4'}}>ЛМ</span><div><strong>Лилия Мартенс</strong><small>Редактор</small></div><button className="member-action">Удалить доступ</button></div></div></section>
</>; }

// ==================== ИСТОЧНИКИ ====================
function SourcesView() { return <>
  <PageTitle eyebrow="ДОКАЗАТЕЛЬСТВА" title="Источники и цитаты" description="Документы, архивы и ссылки, подтверждающие факты дерева." action={<Button><Plus size={17}/> Добавить источник</Button>}/>
  <section className="panel"><div className="source-grid">{sources.map(s => <article className="source-card" key={s.id}><div className="source-icon"><FileText size={20}/></div><div><span className="source-type">{s.type} · {s.year}</span><h3>{s.title}</h3><span className={s.status === 'Подтверждён' ? 'status good' : 'status warning'}>{s.status}</span></div><ChevronDown size={16}/></article>)}</div></section>
</>; }

// ==================== ИССЛЕДОВАНИЯ ====================
function ResearchView() {
  const queries = [
    { id: 1, query: 'Мартенс Кёнигсберг 1850', date: '08.08.2026', results: 12, status: 'active' },
    { id: 2, query: 'Кольман Пруссия архив',   date: '07.08.2026', results: 5,  status: 'done'   },
    { id: 3, query: 'Петрова Санкт-Петербург',  date: '05.08.2026', results: 8,  status: 'done'   },
  ];
  return <>
    <PageTitle eyebrow="ИССЛЕДОВАНИЯ" title="Мои запросы" description="История поисковых запросов в архивных базах." action={<Button><Plus size={17}/> Новый запрос</Button>}/>
    <section className="panel">
      {queries.map(q => (
        <div key={q.id} className="research-item">
          <Search size={18} className="research-icon"/>
          <div className="research-info">
            <strong>{q.query}</strong>
            <small>{q.date} · {q.results} результатов</small>
          </div>
          <span className={`status ${q.status === 'active' ? 'good' : ''}`}>{q.status === 'active' ? 'Активный' : 'Завершён'}</span>
          <button className="text-button">Открыть →</button>
        </div>
      ))}
    </section>
  </>;
}

// ==================== СОВПАДЕНИЯ ====================
function MatchesView() {
  const matches = [
    { id: 1, name: 'Klaus Martens',    tree: 'Familie Martens (DE)', common: 'Иван Мартенс', date: '09.08.2026' },
    { id: 2, name: 'Anna Kolmann',      tree: 'Kolmann Family Tree', common: 'Мария Кольман', date: '07.08.2026' },
  ];
  return <>
    <PageTitle eyebrow="СОВПАДЕНИЯ" title="Matches" description="Родственники, найденные в деревьях других пользователей."/>
    <section className="panel">
      {matches.length === 0
        ? <EmptyState icon={Layers} title="Совпадений пока нет" text="Система автоматически уведомит вас, когда найдёт общих предков с другими пользователями."/>
        : matches.map(m => (
          <div key={m.id} className="match-item">
            <div className="avatar" style={{background:'#2e7d5b'}}>?</div>
            <div className="match-info">
              <strong>{m.name}</strong>
              <small>{m.tree}</small>
              <small>Общий предок: <b>{m.common}</b></small>
            </div>
            <div className="match-date">{m.date}</div>
            <Button secondary>Связаться</Button>
          </div>
        ))
      }
    </section>
  </>;
}

// ==================== ДНК ====================
function DnaView() { return <>
  <PageTitle eyebrow="ДНК-ТЕСТЫ" title="Генетические данные" description="Результаты ДНК-тестов и список совпадений." action={<Button><Plus size={17}/> Добавить тест</Button>}/>
  <section className="panel"><EmptyState icon={Dna} title="ДНК-тесты не добавлены" text="Добавьте результаты генетического теста (23andMe, AncestryDNA, MyHeritage) для поиска родственников по ДНК."/></section>
</>; }

// ==================== СООБЩЕНИЯ ====================
function MessagesView() {
  const [selected, setSelected] = useState(null);
  const convs = [
    { id: 1, name: 'Klaus Martens',  last: 'Добрый день! Я нашёл общего предка…', time: '10:32', unread: 2 },
    { id: 2, name: 'Anna Kolmann',   last: 'Спасибо за информацию о Марии.', time: 'Вчера', unread: 0 },
  ];
  return <>
    <PageTitle eyebrow="СООБЩЕНИЯ" title="Чат" description="Общайтесь с другими исследователями и возможными родственниками."/>
    <div className="messages-layout">
      <section className="panel messages-list">
        {convs.map(c => (
          <div key={c.id} className={`conv-item ${selected === c.id ? 'active' : ''}`} onClick={() => setSelected(c.id)}>
            <div className="avatar small">{c.name.split(' ').map(w=>w[0]).join('')}</div>
            <div className="conv-info">
              <strong>{c.name}</strong>
              <small>{c.last}</small>
            </div>
            <div className="conv-meta">
              <span>{c.time}</span>
              {c.unread > 0 && <b className="unread-badge">{c.unread}</b>}
            </div>
          </div>
        ))}
      </section>
      <section className="panel messages-chat">
        {selected
          ? <div className="chat-empty"><MessageCircle size={32}/><p>Выберите переписку слева</p></div>
          : <div className="chat-empty"><MessageCircle size={32}/><p>Выберите переписку слева</p></div>
        }
      </section>
    </div>
  </>;
}

// ==================== ДОСТУП ====================
function AccessView() { return <>
  <PageTitle eyebrow="СОВМЕСТНАЯ РАБОТА" title="Управление доступом" description="Приглашайте родственников для совместного редактирования дерева." action={<Button><Plus size={17}/> Пригласить</Button>}/>
  <section className="panel settings-card">
    <h3>Участники</h3>
    <div className="members-list">
      <div className="member-row"><span className="avatar" style={{background:'#d1a762'}}>ГМ</span><div><strong>Геннадий Мартенс</strong><small>Владелец · полный доступ</small></div></div>
    </div>
    <div style={{marginTop:20, padding:20, background:'var(--bg)', borderRadius:8, textAlign:'center', color:'var(--text-muted)'}}>
      <Share2 size={32} style={{marginBottom:8, opacity:0.4}}/><br/>
      <small>Пригласите родственников по email — они смогут просматривать или редактировать дерево.</small>
    </div>
  </section>
</>; }

// ==================== ЛЕНТА ОБНОВЛЕНИЙ ====================
function ActivityView() {
  const items = [
    { id: 1, user: 'Геннадий', action: 'добавил источник', target: 'Метрическая книга 1880', time: '10 авг, 10:15' },
    { id: 2, user: 'Геннадий', action: 'создал запись', target: 'Александр Мартенс',       time: '09 авг, 18:42' },
    { id: 3, user: 'Геннадий', action: 'загрузил фото',   target: 'Семья Мартенс 1900',    time: '08 авг, 14:10' },
  ];
  return <>
    <PageTitle eyebrow="ЛЕНТА ОБНОВЛЕНИЙ" title="История изменений" description="Все действия, совершённые в дереве."/>
    <section className="panel">
      {items.map(i => (
        <div key={i.id} className="activity-item" style={{padding:'14px 0', borderBottom:'1px solid var(--border)'}}>
          <span className="event-dot dot-0"/>
          <div>
            <strong>{i.user}</strong> {i.action}: <em>{i.target}</em>
            <p style={{fontSize:'0.8rem', color:'var(--text-muted)', marginTop:2}}><Clock size={12} style={{verticalAlign:'middle'}}/> {i.time}</p>
          </div>
        </div>
      ))}
    </section>
  </>;
}

// ==================== ПРОФИЛЬ ====================
function ProfileView() { return <>
  <PageTitle eyebrow="ПРОФИЛЬ" title="Личные данные" description="Управляйте своим аккаунтом и подпиской."/>
  <section className="panel settings-card">
    <div style={{display:'flex', gap:20, alignItems:'center', marginBottom:24}}>
      <div className="avatar" style={{width:64, height:64, fontSize:'1.4rem', background:'#1a3a5c'}}>ГМ</div>
      <div><strong style={{fontSize:'1.1rem'}}>Геннадий Мартенс</strong><br/><small style={{color:'var(--text-muted)'}}>paygenma@gmail.com</small></div>
    </div>
    <label><span>Имя</span><input defaultValue="Геннадий Мартенс"/></label>
    <label><span>Email</span><input defaultValue="paygenma@gmail.com" type="email"/></label>
    <label><span>Телефон</span><input placeholder="+49 ..."/></label>
    <h3 style={{marginTop:24}}>Подписка</h3>
    <div className="stat-card" style={{marginBottom:16}}><span className="stat-icon gold"><ShieldCheck size={19}/></span><div><strong>Базовый план</strong><span>Бесплатно · до 500 персон</span></div></div>
    <Button>Сохранить изменения</Button>
  </section>
</>; }

// ==================== ПРИВАТНОСТЬ ====================
function PrivacyView() {
  const [showLiving, setShowLiving] = useState(false);
  return <>
    <PageTitle eyebrow="ПРИВАТНОСТЬ" title="Настройки видимости" description="Управляйте тем, что видят другие пользователи."/>
    <section className="panel settings-card">
      <h3>Живые родственники</h3>
      <div className="privacy-row">
        <div>
          <strong>Скрыть данные живых людей</strong>
          <small>Имена и данные живых родственников будут скрыты от других пользователей</small>
        </div>
        <button className={`toggle ${showLiving ? 'on' : ''}`} onClick={() => setShowLiving(!showLiving)}>
          {showLiving ? <Eye size={14}/> : <EyeOff size={14}/>}
        </button>
      </div>
      <hr style={{margin:'16px 0', border:'none', borderTop:'1px solid var(--border)'}}/>
      <h3>Видимость дерева</h3>
      <div className="radio-group">
        <label><input type="radio" name="tree-vis" defaultChecked/><span>Только я</span></label>
        <label><input type="radio" name="tree-vis"/><span>Участники дерева</span></label>
        <label><input type="radio" name="tree-vis"/><span>Все зарегистрированные</span></label>
      </div>
      <Button style={{marginTop:20}}>Сохранить</Button>
    </section>
  </>;
}

// ==================== УВЕДОМЛЕНИЯ ====================
function NotificationsView() {
  const [settings, setSettings] = useState({ birthdays: true, matches: true, updates: false, dna: true });
  const toggle = k => setSettings(s => ({...s, [k]: !s[k]}));
  const items = [
    { key: 'birthdays', label: 'Дни рождения',         desc: 'Напоминания о днях рождения родственников' },
    { key: 'matches',   label: 'Новые совпадения',      desc: 'Когда найден общий предок с другим пользователем' },
    { key: 'updates',   label: 'Обновления дерева',     desc: 'Когда участник вносит изменения' },
    { key: 'dna',       label: 'ДНК-совпадения',        desc: 'Новые совпадения по генетическим данным' },
  ];
  return <>
    <PageTitle eyebrow="УВЕДОМЛЕНИЯ" title="Настройка алертов" description="Выберите, о чём вы хотите получать уведомления."/>
    <section className="panel settings-card">
      {items.map(item => (
        <div key={item.key} className="privacy-row" style={{marginBottom:16}}>
          <div>
            <strong>{item.label}</strong>
            <small>{item.desc}</small>
          </div>
          <button className={`toggle ${settings[item.key] ? 'on' : ''}`} onClick={() => toggle(item.key)}>
            <Bell size={14}/>
          </button>
        </div>
      ))}
      <Button style={{marginTop:8}}>Сохранить</Button>
    </section>
  </>;
}

// ==================== МОДАЛЬНЫЕ ОКНА ====================
function AddPersonModal({ onClose }) { return <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="add-title"><button className="modal-close" onClick={onClose}><X/></button><span className="eyebrow">НОВАЯ ЗАПИСЬ</span><h2 id="add-title">Добавить человека</h2><p>Сначала создайте профиль, затем добавьте события и источники.</p><label>Имя и фамилия<input autoFocus placeholder="Например: Иван Мартенс"/></label><div className="form-grid"><label>Год рождения<input placeholder="1890"/></label><label>Место рождения<input placeholder="Город, страна"/></label></div><label>Связь с деревом<select><option>Родитель</option><option>Ребёнок</option><option>Супруг(а)</option></select></label><div className="modal-actions"><Button secondary onClick={onClose}>Отмена</Button><Button onClick={onClose}>Создать профиль</Button></div></div></div>; }

function Root() {
  if (window.location.pathname.startsWith('/admin')) {
    return <AdminAuthGate><AdminApp/></AdminAuthGate>;
  }
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/search" element={<AppShellSearch />} />
        <Route path="/app/*" element={<App />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  );
}

function AppShellSearch() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="app-shell">
      <aside className={mobileOpen ? 'sidebar open' : 'sidebar'}>
        <Link to="/" className="brand" style={{ textDecoration: 'none' }}>
          <span className="brand-mark">G</span><span>GAMLB</span><small>Семейная история</small>
        </Link>
        <nav className="side-nav" aria-label="Основная навигация">
          {nav.map(([id, label, Icon]) => (
            <Link key={id} to={`/app`} className="nav-item" style={{ textDecoration: 'none' }}>
              <Icon size={18}/><span>{label}</span>
            </Link>
          ))}
          <Link to="/search" className="nav-item active" style={{ textDecoration: 'none' }}>
            <Search size={18}/><span>Исследование</span>
          </Link>
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)}><Menu/></button>
          <div className="breadcrumbs"><span>Исследование</span><b>/</b><strong>Поиск по всем записям</strong></div>
          <div className="top-actions">
            <Link to="/" className="icon-button" title="Главная" style={{ textDecoration: 'none' }}>
              <Globe2 size={18}/>
            </Link>
            <button className="avatar small">ГМ</button>
          </div>
        </header>
        <div className="content" style={{ padding: 0, maxWidth: '100%' }}>
          <SearchPage />
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Root />);
