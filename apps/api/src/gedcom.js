function clean(value = '') { return value.replace(/^@[^@]+@ /, '').trim(); }
function parseDate(value = '') { const match = value.match(/(\d{4})/); return match ? `${match[1]}-01-01` : null; }

export function parseGedcom(input) {
  const lines = input.toString('utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  const people = []; const families = []; let current; let lastTag;
  for (const line of lines) {
    const match = line.match(/^(\d+)\s+(@[^@]+@\s+)?([A-Z0-9_]+)(?:\s+(.*))?$/);
    if (!match) continue;
    const [, level, pointer, tag, raw] = match; const value = (raw || '').trim();
    if (level === '0' && pointer && tag === 'INDI') { current = { gedcomId: pointer.replaceAll('@',''), name: '', events: [] }; people.push(current); lastTag = null; continue; }
    if (level === '0' && pointer && tag === 'FAM') { current = { gedcomId: pointer.replaceAll('@',''), husband: null, wife: null, children: [] }; families.push(current); lastTag = null; continue; }
    if (tag === 'NAME' && current?.name !== undefined) current.name = clean(value);
    else if ((tag === 'BIRT' || tag === 'DEAT' || tag === 'MARR') && current?.events) { current.events.push({ type: tag === 'BIRT' ? 'birth' : tag === 'DEAT' ? 'death' : 'marriage', date: null, place: null }); lastTag = tag; }
    else if (tag === 'DATE' && current?.events?.length) current.events.at(-1).date = value;
    else if (tag === 'PLAC' && current?.events?.length) current.events.at(-1).place = value;
    else if (tag === 'HUSB' && current?.husband !== undefined) current.husband = value.replaceAll('@','');
    else if (tag === 'WIFE' && current?.wife !== undefined) current.wife = value.replaceAll('@','');
    else if (tag === 'CHIL' && current?.children) current.children.push(value.replaceAll('@',''));
    else if (tag === 'CONT' && lastTag === 'NAME' && current?.name !== undefined) current.name += ` ${value}`;
  }
  return { people, families };
}

export function exportGedcom({ people, relationships }) {
  const lines = ['0 HEAD', '1 GEDC', '2 VERS 7.0', '1 CHAR UTF-8'];
  for (const person of people) {
    lines.push(`0 @${person.id}@ INDI`, `1 NAME ${person.given_name || ''} /${person.surname || ''}/`);
    if (person.birth_date || person.birth_place) { lines.push('1 BIRT'); if (person.birth_date) lines.push(`2 DATE ${person.birth_date}`); if (person.birth_place) lines.push(`2 PLAC ${person.birth_place}`); }
    if (person.death_date || person.death_place) { lines.push('1 DEAT'); if (person.death_date) lines.push(`2 DATE ${person.death_date}`); if (person.death_place) lines.push(`2 PLAC ${person.death_place}`); }
  }
  for (const r of relationships) lines.push(`0 @${r.id}@ FAM`, `1 HUSB @${r.from_person_id}@`, `1 WIFE @${r.to_person_id}@`, ...(r.child_person_id ? [`1 CHIL @${r.child_person_id}@`] : []));
  lines.push('0 TRLR'); return `${lines.join('\r\n')}\r\n`;
}
