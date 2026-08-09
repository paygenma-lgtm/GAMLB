import React from 'react';
import { X } from 'lucide-react';
import './TreePerson.css';

export default function TreePerson({ person, isSelected, isHighlight, onSelect }) {
  return (
    <button
      className={`tree-person-card ${isSelected ? 'selected' : ''} ${
        isHighlight ? 'highlight' : ''
      }`}
      onClick={onSelect}
      type="button"
      title={person.name}
    >
      <div className="person-avatar-large">
        {person.name
          .split(' ')
          .map(n => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()}
      </div>
      <strong className="person-name">{person.name.split(' ')[0]}</strong>
      <small className="person-role">{person.role}</small>
      <em className="person-years">
        {person.birthYear}
        {person.deathYear ? `–${person.deathYear}` : '–'}
      </em>
    </button>
  );
}
