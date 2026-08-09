import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, BarChart3, ChevronDown, Database, FileClock, LayoutDashboard,
  LogOut, Menu, Search, Settings, Shield, TreePine, UserCheck, Users, X
} from 'lucide-react';
import './admin.css';

async function api(path, options = {}) {
  const response = await fetch(`/api/admin${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const body = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || `HTTP_${response.status}`);
  return body;
}

const nav = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['users', 'Пользователи', Users],
  ['trees', 'Семейные деревья', TreePine],
  ['moderation', 'Модерация', Shield],
  ['audit', 'Журнал действий', FileClock],
  ['settings', 'Настройки', Settings]
];

export default function AdminApp() {
  const [active, setActive] = useState('dashboard');
  const [mobile, setMobile] = useState(false);
  const [me, setMe] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/settings').then(() => setMe(true)).catch(e => setError(e.message)); }, []);
  if (error) return <AccessDenied error={error}/>;
  if (!me) return <div className="admin-loading">Проверка доступа…</div>;
  return <div className="admin-shell">
    <aside className={mobile ? 'admin-sidebar open' : 'admin-sidebar'}>
      <div className="admin-brand"><span className="admin-logo">G</span><div><strong>GAMLB</strong><small>ADMINISTRATION</small></div></div>
      <div className="admin-context"><span>РАБОЧАЯ ОБЛАСТЬ</span><strong>Панель управления</strong><small><i/> Тестовая среда</small></div>
      <nav className="admin-nav">{nav.map(([id, label, Icon]) => <button key={id} className={active === id ? 'admin-nav-item active' : 'admin-nav-item'} onClick={() => { setActive(id); setMobile(false); }}><Icon size={17}/><span>{label}</span></button>)}</nav>
      <div className="admin-side-footer"><div className="admin-security"><Shield size={16}/><span><strong>Защита включена</strong><small>Доступ по роли admin</small></span></div><button className="admin-nav-item" onClick={() => { window.location.href = '/'; }}><LogOut size={17}/><span>Вернуться на сайт</span></button></div>
    </aside>
    <main className="admin-main">
      <header className="admin-topbar"><button className="admin-mobile-menu" onClick={() => setMobile(!mobile)}>{mobile ? <X/> : <Menu/>}</button><div><span className="admin-breadcrumb">GAMLB / ADMIN</span><h1>{nav.find(item => item[0] === active)?.[1]}</h1></div><div className="admin-user"><span className="admin-avatar">A</span><span><strong>Administrator</strong><small>Системный доступ</small></span><ChevronDown size={15}/></div></header>
      <div className="admin-content">
        {active === 'dashboard' && <Dashboard onNavigate={setActive}/>} 
        {active === 'users' && <UsersPage/>}
        {active === 'trees' && <TreesPage/>}
        {active === 'moderation' && <ModerationPage/>}
        {active === 'audit' && <AuditPage/>}
        {active === 'settings' && <SettingsPage/>}
      </div>
    </main>
  </div>;
}

function AccessDenied({ error }) { return <div className="admin-denied"><Shield size={44}/><h1>Доступ ограничен</h1><p>Для открытия административной панели необходима роль администратора.</p><code>{error}</code><a href="/">Вернуться на сайт</a></div>; }
function Metric({ icon: Icon, label, value, tone, note }) { return <article className="metric"><span className={`metric-icon ${tone}`}><Icon size={19}/></span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></article>; }
function Dashboard({ onNavigate }) {
  const [data, setData] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api('/overview').then(setData).catch(e => setError(e.message)); }, []);
  if (error) return <InlineError text={error}/>;
  if (!data) return <Loading/>;
  const s = data.stats || {};
  return <><PageIntro eyebrow="ОБЗОР СИСТЕМЫ" title="Добро пожаловать в GAMLB Admin" description="Контроль пользователей, данных и активности платформы."/><div className="metrics-grid"><Metric icon={Users} label="Пользователи" value={s.fileUsers ?? s.users ?? 0} tone="blue" note="в системе"/><Metric icon={TreePine} label="Семейные деревья" value={s.trees ?? 0} tone="gold" note="в базе данных"/><Metric icon={UserCheck} label="Персоны" value={s.persons ?? 0} tone="green" note="сохранено"/><Metric icon={Activity} label="События" value={s.events ?? 0} tone="violet" note="в деревьях"/></div><div className="admin-grid-two"><section className="admin-card"><CardHead title="Последние пользователи" action={<button onClick={() => onNavigate('users')}>Все пользователи →</button>}/>{data.recentUsers?.length ? <div className="admin-list">{data.recentUsers.map(user => <div className="admin-list-row" key={user.id}><span className="user-dot">{(user.name || '?').slice(0,1).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div><Status status={user.status}/></div>)}</div> : <EmptyState text="Пользователи пока не найдены"/>}</section><section className="admin-card system-card"><CardHead title="Состояние системы"/><SystemRow icon={Database} label="PostgreSQL" value={s.database === 'connected' ? 'Подключена' : 'Не проверена'} ok={s.database === 'connected'}/><SystemRow icon={Shield} label="Окружение" value={data.environment}/><SystemRow icon={BarChart3} label="Админ-маршруты" value="Активны" ok/></section></div></>;
}
function UsersPage() {
  const [users, setUsers] = useState([]); const [query, setQuery] = useState(''); const [status, setStatus] = useState(''); const [error, setError] = useState('');
  const load = async (nextQuery = query, nextStatus = status) => {
    setError('');
    try {
      const data = await api(`/users?q=${encodeURIComponent(nextQuery)}&status=${encodeURIComponent(nextStatus)}`);
      setUsers(data.users || []);
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, []);
  const visible = useMemo(() => users, [users]);
  async function patch(user, patch) {
    setError('');
    try {
      const data = await api(`/users/${user.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
      setUsers(items => items.map(item => item.id === user.id ? data.user : item));
    } catch (e) { setError(e.message); }
  }
  return <><PageIntro eyebrow="УПРАВЛЕНИЕ АККАУНТАМИ" title="Пользователи" description="Поиск, статусы и роли пользователей платформы."/><div className="toolbar"><div className="admin-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Поиск по имени или email"/></div><select value={status} onChange={e => { const nextStatus = e.target.value; setStatus(nextStatus); load(query, nextStatus); }}><option value="">Все статусы</option><option value="active">Активные</option><option value="blocked">Заблокированные</option></select><button className="primary-button" onClick={() => load()}>Обновить</button></div>{error && <InlineError text={error}/>}<section className="admin-card table-card"><div className="table-caption"><strong>{visible.length} пользователей</strong><span>Действия записываются в журнал</span></div><div className="table-scroll"><table><thead><tr><th>Пользователь</th><th>Дата регистрации</th><th>Роль</th><th>Статус</th><th>Действие</th></tr></thead><tbody>{visible.map(user => <tr key={user.id}><td><div className="table-user"><span className="user-dot">{(user.name || '?').slice(0,1).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div></td><td>{formatDate(user.createdAt)}</td><td><select className="inline-select" value={user.role || 'user'} onChange={e => patch(user, { role: e.target.value })}><option value="user">user</option><option value="moderator">moderator</option><option value="support">support</option><option value="content">content</option><option value="admin">admin</option></select></td><td><Status status={user.status}/></td><td><button className="table-action" onClick={() => patch(user, { status: user.status === 'blocked' ? 'active' : 'blocked' })}>{user.status === 'blocked' ? 'Разблокировать' : 'Заблокировать'}</button></td></tr>)}</tbody></table></div>{!visible.length && <EmptyState text="Пользователи не найдены"/>}</section></>;
}
function TreesPage() {
  const [trees, setTrees] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api('/trees').then(data => setTrees(data.trees || [])).catch(e => setError(e.message)); }, []);
  async function changeVisibility(tree, visibility) {
    setError('');
    try { const { tree: updated } = await api(`/trees/${tree.id}`, { method: 'PATCH', body: JSON.stringify({ visibility }) }); setTrees(items => items.map(item => item.id === tree.id ? { ...item, ...updated } : item)); }
    catch (e) { setError(e.message); }
  }
  return <><PageIntro eyebrow="ДАННЫЕ ПЛАТФОРМЫ" title="Семейные деревья" description="Все деревья, владельцы, количество персон и уровень видимости."/>{error && <InlineError text={error}/>}<section className="admin-card table-card"><div className="table-caption"><strong>{trees?.length ?? '—'} деревьев</strong><span>Изменения фиксируются в журнале</span></div>{trees === null ? <Loading/> : <><div className="table-scroll"><table><thead><tr><th>Дерево</th><th>Владелец</th><th>Персон</th><th>Создано</th><th>Видимость</th></tr></thead><tbody>{trees.map(tree => <tr key={tree.id}><td><strong>{tree.name}</strong><br/><small>{tree.description || 'Без описания'}</small></td><td>{tree.owner?.name || tree.ownerId}</td><td>{tree.personsCount}</td><td>{formatDate(tree.createdAt)}</td><td><select className="inline-select" value={tree.visibility || 'private'} onChange={e => changeVisibility(tree, e.target.value)}><option value="private">private</option><option value="tree_members">tree_members</option><option value="public">public</option></select></td></tr>)}</tbody></table></div>{!trees.length && <EmptyState text="Семейные деревья пока не созданы"/>}</>}</section></>;
}
function ModerationPage() {
  const [reports, setReports] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api('/moderation/reports').then(data => setReports(data.reports || [])).catch(e => setError(e.message)); }, []);
  async function changeStatus(report, status) {
    setError('');
    try { const { report: updated } = await api(`/moderation/reports/${report.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); setReports(items => items.map(item => item.id === report.id ? updated : item)); }
    catch (e) { setError(e.message); }
  }
  return <><PageIntro eyebrow="БЕЗОПАСНОСТЬ" title="Модерация" description="Жалобы и решения модераторов по материалам платформы."/>{error && <InlineError text={error}/>}<section className="admin-card table-card"><div className="table-caption"><strong>{reports?.length ?? '—'} обращений</strong><span>Решения фиксируются в журнале</span></div>{reports === null ? <Loading/> : <><div className="table-scroll"><table><thead><tr><th>Причина</th><th>Объект</th><th>Автор жалобы</th><th>Дата</th><th>Статус</th></tr></thead><tbody>{reports.map(report => <tr key={report.id}><td>{report.reason || 'Не указана'}</td><td>{report.targetType || '—'}: {report.targetId || '—'}</td><td>{report.reporterName || report.reporterId || '—'}</td><td>{formatDate(report.createdAt)}</td><td><select className="inline-select" value={report.status || 'new'} onChange={e => changeStatus(report, e.target.value)}><option value="new">new</option><option value="reviewing">reviewing</option><option value="resolved">resolved</option><option value="rejected">rejected</option></select></td></tr>)}</tbody></table></div>{!reports.length && <EmptyState text="Новых обращений нет"/>}</>}</section></>;
}
function AuditPage() {
  const [entries, setEntries] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api('/audit').then(data => setEntries(data.entries || [])).catch(e => setError(e.message)); }, []);
  return <><PageIntro eyebrow="БЕЗОПАСНОСТЬ" title="Журнал действий" description="История изменений, выполненных администраторами."/>{error && <InlineError text={error}/>}<section className="admin-card table-card"><div className="table-caption"><strong>Последние операции</strong><span>Хранится до 500 записей</span></div>{entries === null ? <Loading/> : entries.length ? <div className="audit-list">{entries.map(item => <div className="audit-row" key={item.id}><span className="audit-icon"><FileClock size={16}/></span><div><strong>{item.action}</strong><small>Цель: {item.targetId}</small></div><time>{formatDate(item.createdAt)}</time></div>)}</div> : <EmptyState text="Действий пока нет"/>}</section></>;
}
function SettingsPage() {
  const [data, setData] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api('/settings').then(setData).catch(e => setError(e.message)); }, []);
  return <><PageIntro eyebrow="КОНФИГУРАЦИЯ" title="Настройки системы" description="Техническое состояние и параметры административного доступа."/>{error && <InlineError text={error}/>} {data && <section className="admin-card settings-list">{Object.entries(data.settings).map(([key, value]) => <div key={key}><span>{key}</span><strong>{value}</strong></div>)}</section>}</>;
}
function EmptyPage({ icon: Icon, title, description }) { return <><PageIntro eyebrow="МОДУЛЬ" title={title} description={description}/><section className="admin-empty"><Icon size={42}/><h2>Модуль подготовлен</h2><p>Структура раздела создана. Подключение реальных данных добавляется следующим этапом.</p></section></>; }
function PageIntro({ eyebrow, title, description }) { return <div className="admin-page-intro"><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>; }
function CardHead({ title, action }) { return <div className="card-head"><h3>{title}</h3>{action}</div>; }
function SystemRow({ icon: Icon, label, value, ok }) { return <div className="system-row"><Icon size={17}/><span>{label}</span><strong className={ok ? 'ok' : ''}>{value}</strong></div>; }
function Status({ status = 'active' }) { return <span className={`status-pill ${status === 'blocked' ? 'blocked' : 'active'}`}><i/> {status === 'blocked' ? 'Заблокирован' : 'Активен'}</span>; }
function EmptyState({ text }) { return <div className="admin-empty-state">{text}</div>; }
function InlineError({ text }) { return <div className="admin-error">Ошибка: {text}</div>; }
function Loading() { return <div className="admin-loading small">Загрузка…</div>; }
function formatDate(value) { if (!value) return '—'; return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(new Date(value)); }
