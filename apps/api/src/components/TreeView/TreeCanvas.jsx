import React, { useMemo } from 'react';
import TreePerson from './TreePerson';
import { groupPersonsByGeneration } from '../../utils/treeUtils';
import './TreeCanvas.css';

export default function TreeCanvas({
  persons,
  zoom,
  selectedPersonId,
  onPersonSelect,
  viewMode
}) {
  const generations = useMemo(() => {
    return groupPersonsByGeneration(persons);
  }, [persons]);

  if (viewMode === 'list') {
    return (
      <div className="tree-list-view">
        {persons.map(person => (
          <TreePersonRow
            key={person.id}
            person={person}
            isSelected={selectedPersonId === person.id}
            onSelect={() => onPersonSelect(person.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="tree-canvas"
      style={{
        transform: `scale(${zoom / 100})`,
        transformOrigin: 'center top',
        transition: 'transform 0.2s ease-out'
      }}
    >
      {generations.map((generation, genIndex) => (
        <div key={`gen-${genIndex}`} className="generation-row">
          <div className="generation-number">Поколение {genIndex + 1}</div>
          <div className="persons-container">
            {generation.map(person => (
              <TreePerson
                key={person.id}
                person={person}
                isSelected={selectedPersonId === person.id}
                isHighlight={person.isMainPerson}
                onSelect={() => onPersonSelect(person.id)}
              />
            ))}
          </div>
          {genIndex < generations.length - 1 && (
            <div className="generation-connector" />
          )}
        </div>
      ))}
    </div>
  );
}

function TreePersonRow({ person, isSelected, onSelect }) {
  return (
    <div
      className={`tree-person-row ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="person-avatar">
        {person.name
          .split(' ')
          .map(n => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()}
      </div>
      <div className="person-info">
        <strong>{person.name}</strong>
        <small>{person.role}</small>
      </div>
      <div className="person-dates">
        <span>{person.birthYear}</span>
        {person.deathYear && <span> – {person.deathYear}</span>}
      </div>
    </div>
  );
}
