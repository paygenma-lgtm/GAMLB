import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, useNavigate, NavLink } from 'react-router-dom';
import {
  Archive, BookOpen, CalendarDays, ChevronDown, FileText, GitBranch,
  Globe2, LayoutDashboard, Menu, Plus, Search, Settings, ShieldCheck,
  Sparkles, Upload, Users, X, Download, Map, Settings2, CheckSquare,
  Clock, MapPin, Link2, FileJson
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
  ['photos',    'Мои фото',        FileText],
  ['import',    'Импорт GEDCOM',   Upload],
  ['manage',    'Управление',      Settings2],
  ['sources',   'Источники',       BookOpen],
];

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
        <div className="profile-mini"><div className="avatar">GM</div><div><strong>Геннадий Мартенс</strong><small>Личный аккаунт</small></div><ChevronDown size={15}/></div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <button className="mobile-menu" aria-label="Открыть меню" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X/> : <Menu/>}</button>
        <div className="breadcrumbs"><span>Моё дерево</span><b>/</b><strong>{nav.find(n => n[0] === active)?.[1] || 'Обзор'}</strong></div>
        <div className="top-actions"><div className="global-search"><Search size={16}/><input aria-label="Поиск по дереву" placeholder="Поиск по дереву…" value={query} onChange={e => setQuery(e.target.value)}/><kbd>⌘ K</kbd></div><button className="icon-button" title="Язык"><Globe2 size={18}/></button><button className="avatar small">GM</button></div>
      </header>
      <div className="content">
        {active === 'overview' && <Overview onAdd={() => setShowAdd(true)} onNavigate={setActive}/>} 
        {active === 'my-tree' && <MyTreeView onAdd={() => setShowAdd(true)}/>}
        {active === 'photos' && <PhotosView onAdd={() => setShowAdd(true)}/>}
        {active === 'import' && <ImportGedcomView/>}
        {active === 'manage' && <ManageView/>}
        {active === 'sources' && <SourcesView/>}
      </div>
    </main>
    {showAdd && <AddPersonModal onClose={() => setShowAdd(false)}/>} 
  </div>;
}

function PageTitle({ eyebrow, title, description, action }) { return <div className="page-title"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>; }
function Button({ children, secondary = false, onClick }) { return <button className={secondary ? 'button secondary' : 'button'} onClick={onClick}>{children}</button>; }

// ==================== OVERVIEW ====================
function Overview({ onAdd, onNavigate }) { return <>
  <PageTitle eyebrow="ОБЗОР ДЕРЕВА" title="Добро пожаловать, Геннадий" description="Продолжайте исследование семьи Мартенс с того места, где остановились." action={<Button onClick={onAdd}><Plus size={17}/> Добавить человека</Button>}/>
  <div className="stats-grid"><Stat icon={Users} value="248" label="Человек в дереве" tone="blue"/><Stat icon={GitBranch} value="86" label="Семейных связей" tone="gold"/><Stat icon={FileText} value="37" label="Источников" tone="green"/><Stat icon={ShieldCheck} value="72%" label="Данных подтверждено" tone="violet"/></div>
  <div className="dashboard-grid"><section className="panel tree-preview"><div className="panel-head"><div><span className="eyebrow">ВИЗУАЛИЗАЦИЯ</span><h2>Семейное дерево</h2></div><button className="text-button" onClick={() => onNavigate('my-tree')}>Открыть дерево →</button></div><MiniTree/></section><section className="panel activity"><div className="panel-head"><div><span className="eyebrow">ИССЛЕДОВАНИЕ</span><h2>Последние события</h2></div><button className="text-button" onClick={() => onNavigate('sources')}>Все события →</button></div><div className="activity-list">{events.map((e, i) => <div className="activity-item" key={e.id}><span className={'event-dot dot-' + i}/><div><strong>{e.type}</strong><p>{e.place} · {e.date}</p><small><BookOpen size={13}/> {e.source}</small></div></div>)}</div></section></div>
  <section className="panel getting-started"><div><span className="eyebrow">СЛЕДУЮЩИЙ ШАГ</span><h2>Добавьте доказательства к фактам</h2><p>У вас есть 12 фактов без источников. Свяжите документы и цитаты, чтобы сделать историю надёжнее.</p></div><Button secondary onClick={() => onNavigate('sources')}>Открыть источники</Button></section>
</>; }
function Stat({ icon: Icon, value, label, tone }) { return <div className="stat-card"><span className={'stat-icon ' + tone}><Icon size={19}/></span><div><strong>{value}</strong><span>{label}</span></div></div>; }
function MiniTree() { return <div className="mini-tree"><div className="tree-line line-a"/><div className="tree-line line-b"/><div className="tree-node node-grand"><span className="avatar portrait">ИМ</span><small>Иван Мартенс</small></div><div className="tree-node node-grand second"><span className="avatar portrait">ММ</span><small>Мария Мартенс</small></div><div className="tree-node node-parent"><span className="avatar portrait">АМ</span><small>Александр Мартенс</small></div><div className="tree-node node-parent second"><span className="avatar portrait">ЕМ</span><small>Елена Мартенс</small></div><div className="tree-node node-me"><span className="avatar portrait selected">GM</span><small>Геннадий Мартенс</small></div></div>; }

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
    'ivan': { name: 'Иван Мартенс', birth: '1850, Кёнигсберг', death: '1920', info: 'Прусский купец. Владелец текстильного предприятия.' },
    'maria': { name: 'Мария Кольман', birth: '1855, Кёнигсберг', death: '1925', info: 'Дочь банкира. Известна благотворительностью.' },
    'alex': { name: 'Александр Мартенс', birth: '1880, Кёнигсберг', death: '1955', info: 'Инженер. Работал на железной дороге.' },
    'elena': { name: 'Елена Петрова', birth: '1885, Санкт-Петербург', death: '1970', info: 'Учительница музыки. Три языка.' },
    'gennady': { name: 'Геннадий Мартенс', birth: '1920, Кёнигсберг', death: null, info: 'Исследователь семейной истории. Живёт в Берлине.' },
    'liliya': { name: 'Лилия Мартенс', birth: '1922, Кёнигсберг', death: '2000', info: 'Врач-невролог. Эмигрировала в США в 1947.' }
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

// ==================== МОИ ФОТО ====================
function PhotosView({ onAdd }) { return <><PageTitle eyebrow="МОИ ФОТО" title="Галерея семьи" description="Все фотографии, привязанные к членам семьи и событиям." action={<Button onClick={onAdd}><Upload size={17}/> Загрузить фото</Button>}/><section className="panel"><div className="empty-state-large"><Upload size={48}/><h3>Фото пока не загружены</h3><p>Начните с загрузки фотографий. Вы сможете связать их с людьми и событиями в дереве.</p><Button onClick={onAdd}><Plus size={17}/> Загрузить первую фотографию</Button></div></section></>; }

// ==================== ИМПОРТ GEDCOM ====================
function ImportGedcomView() { return <><PageTitle eyebrow="ИМПОРТ" title="Загрузить GEDCOM файл" description="Импортируйте родословную из других программ (Ancestry, FamilySearch, и т.д.)."/><section className="panel"><div className="import-area"><FileJson size={52}/><h3>Перетащите файл GEDCOM сюда</h3><p>или <button className="text-button-inline">нажмите, чтобы выбрать</button></p><small>Поддерживаются форматы: .ged, .gedx</small></div></section><section className="panel"><h3>Последние импорты</h3><div className="import-history"><div className="history-item"><span className="history-icon">✓</span><div><strong>family_tree_2024.ged</strong><small>247 человек · 5 мая 2024</small></div></div></div></section></>; }

// ==================== УПРАВЛЕНИЕ ====================
function ManageView() { return <><PageTitle eyebrow="УПРАВЛЕНИЕ" title="Параметры дерева" description="Настройки видимости, членов и прав доступа."/><section className="panel settings-card"><h3>Основные параметры</h3><label><span>Название дерева</span><input value="Семья Мартенс" readOnly/></label><label><span>Описание</span><textarea defaultValue="История семьи Мартенс с XVIII века" rows="3"/></label><h3 style={{marginTop: '24px'}}>Видимость</h3><div className="radio-group"><label><input type="radio" name="visibility" value="private" defaultChecked/><span>Приватное (только я)</span></label><label><input type="radio" name="visibility" value="members"/><span>Для членов (по приглашению)</span></label><label><input type="radio" name="visibility" value="public"/><span>Публичное</span></label></div><Button style={{marginTop: '20px'}}>Сохранить</Button></section><section className="panel settings-card"><h3>Члены дерева</h3><div className="members-list"><div className="member-row"><span className="avatar" style={{backgroundColor: '#d1a762'}}>ГМ</span><div><strong>Геннадий Мартенс</strong><small>Владелец</small></div></div><div className="member-row"><span className="avatar" style={{backgroundColor: '#b7ced4'}}>ЛМ</span><div><strong>Лилия Мартенс</strong><small>Редактор</small></div><button className="member-action">Удалить доступ</button></div></div></section></>; }

// ==================== ИСТОЧНИКИ ====================
function SourcesView() { return <><PageTitle eyebrow="ДОКАЗАТЕЛЬСТВА" title="Источники и цитаты" description="Документы, архивы и ссылки, подтверждающие факты дерева." action={<Button><Plus size={17}/> Добавить источник</Button>}/><section className="panel"><div className="source-grid">{sources.map(s => <article className="source-card" key={s.id}><div className="source-icon"><FileText size={20}/></div><div><span className="source-type">{s.type} · {s.year}</span><h3>{s.title}</h3><span className={s.status === 'Подтверждён' ? 'status good' : 'status warning'}>{s.status}</span></div><ChevronDown size={16}/></article>)}</div></section></>; }

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

// SearchPage внутри AppShell с сайдбаром
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
            <button className="avatar small">GM</button>
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
