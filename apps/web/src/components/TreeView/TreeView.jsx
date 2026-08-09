import React, { useState, useCallback, useMemo } from 'react';
import { Upload, Plus, GitBranch } from 'lucide-react';
import TreeCanvas from './TreeCanvas';
import TreeToolbar from './TreeToolbar';
import PersonDetailCard from './PersonDetailCard';
import PageTitle from '../PageTitle';
import Button from '../Button';
import { treeData } from '../../data/treeData';
import './TreeView.css';

export default function TreeView({ onAdd }) {
  const [zoom, setZoom] = useState(100);
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [viewMode, setViewMode] = useState('generations'); // generations | list

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(200, prev + 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(50, prev - 10));
  }, []);

  const handlePersonSelect = useCallback((personId) => {
    setSelectedPersonId(prev => prev === personId ? null : personId);
  }, []);

  const selectedPerson = useMemo(() => {
    return treeData.find(p => p.id === selectedPersonId);
  }, [selectedPersonId]);

  return (
    <>
      <PageTitle
        eyebrow="МОЕ ДРЕВО"
        title="Семья Мартенс"
        description="Редактируйте связи, события и источники в одном пространстве."
        action={
          <>
            <Button secondary>
              <Upload size={17} /> Импорт GEDCOM
            </Button>
            <Button onClick={onAdd}>
              <Plus size={17} /> Добавить
            </Button>
          </>
        }
      />

      <TreeToolbar
        zoom={zoom}
        viewMode={viewMode}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onViewModeChange={setViewMode}
      />

      <section className="panel large-tree">
        <TreeCanvas
          persons={treeData}
          zoom={zoom}
          selectedPersonId={selectedPersonId}
          onPersonSelect={handlePersonSelect}
          viewMode={viewMode}
        />
        <div className="tree-hint">
          <GitBranch size={18} />
          <span>Нажми на человека, чтобы открыть профиль</span>
        </div>
      </section>

      {selectedPerson && (
        <PersonDetailCard
          person={selectedPerson}
          onClose={() => setSelectedPersonId(null)}
        />
      )}
    </>
  );
}
