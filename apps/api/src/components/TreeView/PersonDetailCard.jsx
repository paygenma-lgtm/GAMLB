import React from 'react';
import { X } from 'lucide-react';
import Button from '../Button';
import './PersonDetailCard.css';

export default function PersonDetailCard({ person, onClose }) {
  return (
    <div className="person-detail-card-overlay" onClick={onClose}>
      <div className="person-detail-card" onClick={e => e.stopPropagation()}>
        <button className="card-close" onClick={onClose} type="button">
          <X size={18} />
        </button>

        <div className="card-avatar">
          {person.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()}
        </div>

        <h3>{person.name}</h3>
        <p className="card-role">{person.role}</p>

        <div className="card-details">
          <DetailRow label="Рождение" value={person.birthInfo} />
          {person.deathInfo && (
            <DetailRow label="Смерть" value={person.deathInfo} />
          )}
          {person.birthPlace && (
            <DetailRow label="Место" value={person.birthPlace} />
          )}
        </div>

        <p className="card-bio">{person.bio}</p>

        <div className="card-actions">
          <Button secondary size="sm">
            Редактировать
          </Button>
          <Button secondary size="sm">
            События
          </Button>
          <Button secondary size="sm">
            Источники
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <strong className="detail-value">{value}</strong>
    </div>
  );
}
