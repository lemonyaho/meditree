import { useMemo, useState } from 'react';
import noteData from './data/noteData.js';

function hasChildren(node) {
  return Array.isArray(node.children) && node.children.length > 0;
}

function toSnapshot(expandedSet) {
  return Array.from(expandedSet);
}

function fromSnapshot(snapshot) {
  return new Set(snapshot);
}

function ReferenceMarkers({ referenceIds = [] }) {
  if (!referenceIds.length) return null;

  return (
    <sup className="reference-marker">
      {referenceIds.map((id, index) => (
        <span key={id}>
          {index > 0 ? ',' : ''}
          {id}
        </span>
      ))}
    </sup>
  );
}

function TreeNode({ node, depth, expandedIds, onToggle }) {
  const expanded = expandedIds.has(node.id);
  const canExpand = hasChildren(node) || node.content;
  const childrenVisible = expanded && hasChildren(node);
  const contentVisible = expanded && node.content;

  return (
    <div className="tree-node" style={{ '--depth': depth }}>
      <button
        type="button"
        className={`node-row ${expanded ? 'is-expanded' : ''} ${canExpand ? '' : 'is-leaf'}`}
        onClick={() => canExpand && onToggle(node.id)}
        aria-expanded={canExpand ? expanded : undefined}
      >
        <span className="node-toggle" aria-hidden="true">
          {canExpand ? (expanded ? '▼' : '▶') : '•'}
        </span>
        <span className="node-title">
          {node.title}
          <ReferenceMarkers referenceIds={node.referenceIds} />
        </span>
      </button>

      {contentVisible && (
        <div className="node-content">
          {node.content}
        </div>
      )}

      {childrenVisible && (
        <div className="node-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [history, setHistory] = useState([]);

  const expandedCount = expandedIds.size;

  const references = useMemo(() => {
    return [...noteData.references].sort((a, b) => a.id - b.id);
  }, []);

  function pushHistory(currentSet) {
    setHistory((previous) => [...previous, toSnapshot(currentSet)]);
  }

  function handleToggle(nodeId) {
    setExpandedIds((current) => {
      pushHistory(current);
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }

  function handleBack() {
    setHistory((currentHistory) => {
      if (currentHistory.length === 0) return currentHistory;
      const previousSnapshot = currentHistory[currentHistory.length - 1];
      setExpandedIds(fromSnapshot(previousSnapshot));
      return currentHistory.slice(0, -1);
    });
  }

  function handleReset() {
    if (expandedIds.size === 0) return;
    pushHistory(expandedIds);
    setExpandedIds(new Set());
  }

  return (
    <main className="page-shell">
      <section className="note-card" aria-label="Interactive tree study note">
        <header className="note-header">
          <div>
            <p className="eyebrow">TREE STUDY NOTE</p>
            <h1>{noteData.lectureTitle}</h1>
            {noteData.subtitle && <p className="subtitle">{noteData.subtitle}</p>}
          </div>
          <time className="date-label">{noteData.date}</time>
        </header>

        <section className="tree-panel" aria-label="Study note tree">
          {noteData.tree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              expandedIds={expandedIds}
              onToggle={handleToggle}
            />
          ))}
        </section>

        <section className="references-panel" aria-label="References">
          <h2>References</h2>
          <ol>
            {references.map((reference) => (
              <li key={reference.id} value={reference.id}>
                {reference.text}
              </li>
            ))}
          </ol>
        </section>

        <footer className="action-bar">
          <button type="button" className="circle-button back-button" onClick={handleBack} disabled={history.length === 0}>
            ←
            <span>Back</span>
          </button>

          <p className="status-text">
            Expanded nodes: {expandedCount}
          </p>

          <button type="button" className="circle-button reset-button" onClick={handleReset} disabled={expandedIds.size === 0}>
            ↺
            <span>Reset</span>
          </button>
        </footer>
      </section>
    </main>
  );
}
