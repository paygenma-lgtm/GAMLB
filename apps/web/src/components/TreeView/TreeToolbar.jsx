import React from 'react';
import './TreeToolbar.css';

export default function TreeToolbar({
  zoom,
  viewMode,
  onZoomIn,
  onZoomOut,
  onViewModeChange
}) {
  return (
    <div className="tree-toolbar">
      <div className="toolbar-left">
        <button
          className={`toolbar-btn ${viewMode === 'generations' ? 'active' : ''}`}
          onClick={() => onViewModeChange('generations')}
          type="button"
        >
          Поколения
        </button>
        <button
          className={`toolbar-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => onViewModeChange('list')}
          type="button"
        >
          Список
        </button>
      </div>

      <div className="toolbar-spacer" />

      <div className="toolbar-zoom">
        <button
          className="toolbar-btn zoom-btn"
          onClick={onZoomOut}
          disabled={zoom <= 50}
          type="button"
          title="Уменьшить"
        >
          −
        </button>
        <span className="zoom-display">{zoom}%</span>
        <button
          className="toolbar-btn zoom-btn"
          onClick={onZoomIn}
          disabled={zoom >= 200}
          type="button"
          title="Увеличить"
        >
          +
        </button>
      </div>
    </div>
  );
}
