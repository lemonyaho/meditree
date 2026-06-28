import { useMemo, useState } from 'react'
import { rawLectures } from './data/lectures'
import './styles.css'

function titleFromFileName(fileName) {
  return fileName
    .replace(/\.txt$/i, '')
    .replace(/^\d+[-_\s]*/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
}

function extractInlineReferenceIds(text) {
  const ids = []
  const matches = text.matchAll(/@refs?\s*([0-9]+(?:\s*,\s*[0-9]+)*)/gi)

  for (const match of matches) {
    match[1]
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value))
      .forEach((value) => ids.push(value))
  }

  return [...new Set(ids)]
}

function removeInlineReferences(text) {
  return text.replace(/\s*@refs?\s*[0-9]+(?:\s*,\s*[0-9]+)*\s*/gi, ' ').replace(/\s+/g, ' ').trim()
}

function parseLecture(raw, fileName, slug) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  const meta = {
    title: titleFromFileName(fileName) || 'Untitled Lecture',
    date: '',
    professor: '',
  }
  const references = []
  const tree = []
  const stack = []
  let lastNode = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    if (line.startsWith('# ')) {
      meta.title = line.replace(/^#\s+/, '').trim()
      continue
    }

    const titleMatch = line.match(/^@title\s+(.+)$/i)
    if (titleMatch) {
      meta.title = titleMatch[1].trim()
      continue
    }

    const dateMatch = line.match(/^@date\s+(.+)$/i)
    if (dateMatch) {
      meta.date = dateMatch[1].trim()
      continue
    }

    const professorMatch = line.match(/^@(prof|professor)\s+(.+)$/i)
    if (professorMatch) {
      meta.professor = professorMatch[2].trim()
      continue
    }

    const refMatch = line.match(/^@(ref|reference)\s+(\d+)\s*:\s*(.+)$/i)
    if (refMatch) {
      references.push({ id: Number(refMatch[2]), text: refMatch[3].trim() })
      continue
    }

    const contentMatch = line.match(/^(?:->|→|=>)\s*(.+)$/)
    if (contentMatch && lastNode) {
      lastNode.content.push(contentMatch[1].trim())
      continue
    }

    const nodeMatch = line.match(/^(\d+(?:\.\d+)*)\s+(.+)$/)
    if (nodeMatch) {
      const code = nodeMatch[1]
      const rawTitle = nodeMatch[2].trim()
      const referenceIds = extractInlineReferenceIds(rawTitle)
      const title = removeInlineReferences(rawTitle)
      const level = code.split('.').length
      const node = {
        id: `${slug}-${code.replace(/\./g, '-')}`,
        code,
        title,
        referenceIds,
        content: [],
        children: [],
      }

      if (level === 1) {
        tree.push(node)
      } else {
        const parent = stack[level - 2]
        if (parent) parent.children.push(node)
        else tree.push(node)
      }

      stack[level - 1] = node
      stack.length = level
      lastNode = node
    }
  }

  return {
    slug,
    fileName,
    lectureTitle: meta.title,
    date: meta.date,
    professor: meta.professor,
    tree,
    references: references.sort((a, b) => a.id - b.id),
  }
}

function getInitialSlug(lectures) {
  const params = new URLSearchParams(window.location.search)
  const lectureFromUrl = params.get('lecture')
  if (lectureFromUrl && lectures.some((lecture) => lecture.slug === lectureFromUrl)) {
    return lectureFromUrl
  }
  return lectures[0]?.slug ?? ''
}

function makeSuperscript(referenceIds = []) {
  const superscriptMap = {
    0: '⁰',
    1: '¹',
    2: '²',
    3: '³',
    4: '⁴',
    5: '⁵',
    6: '⁶',
    7: '⁷',
    8: '⁸',
    9: '⁹',
  }

  return referenceIds
    .join(',')
    .split('')
    .map((char) => superscriptMap[char] ?? char)
    .join('')
}

function getDescendantIds(node) {
  const ids = []

  function walk(currentNode) {
    currentNode.children.forEach((child) => {
      ids.push(child.id)
      walk(child)
    })
  }

  walk(node)
  return ids
}

function TreeNode({ node, depth, expandedIds, onToggle }) {
  const expanded = expandedIds.has(node.id)
  const hasChildren = node.children.length > 0
  const hasContent = node.content.length > 0
  const canExpand = hasChildren || hasContent
  const hasVisibleBody = expanded && canExpand
  const indicator = canExpand ? (expanded ? '▼' : '▶') : '•'

  return (
    <div className="tree-node" style={{ '--depth': depth }}>
      <button
        className={`node-row ${expanded ? 'is-expanded' : ''} ${!canExpand ? 'terminal-node' : ''}`}
        onClick={() => onToggle(node)}
        type="button"
      >
        <span className={`node-indicator ${canExpand ? 'expandable-indicator' : 'terminal-indicator'}`} aria-hidden="true">
          {indicator}
        </span>
        <span className="node-title">
          {node.title}
          {node.referenceIds?.length ? <sup>{makeSuperscript(node.referenceIds)}</sup> : null}
        </span>
      </button>

      {hasVisibleBody ? (
        <div className="node-body">
          {node.content.map((text, index) => (
            <div className="content-box" key={`${node.id}-content-${index}`}>
              {text}
            </div>
          ))}

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
      ) : null}
    </div>
  )
}

function LectureSelector({ lectures, selectedSlug, onSelect }) {
  if (lectures.length <= 1) return null

  return (
    <label className="lecture-selector">
      <span>Lecture</span>
      <select value={selectedSlug} onChange={(event) => onSelect(event.target.value)}>
        {lectures.map((lecture) => (
          <option key={lecture.slug} value={lecture.slug}>
            {lecture.lectureTitle}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function App() {
  const lectures = useMemo(
    () => rawLectures.map((lecture) => parseLecture(lecture.raw, lecture.fileName, lecture.slug)),
    []
  )

  const [selectedSlug, setSelectedSlug] = useState(() => getInitialSlug(lectures))
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [history, setHistory] = useState([])

  const selectedLecture = lectures.find((lecture) => lecture.slug === selectedSlug) ?? lectures[0]

  const selectLecture = (slug) => {
    setSelectedSlug(slug)
    setExpandedIds(new Set())
    setHistory([])
    const url = new URL(window.location.href)
    url.searchParams.set('lecture', slug)
    window.history.replaceState(null, '', url.toString())
  }

  const toggleNode = (node) => {
    const canExpand = node.children.length > 0 || node.content.length > 0
    if (!canExpand) return

    setExpandedIds((previous) => {
      setHistory((oldHistory) => [...oldHistory, new Set(previous)])
      const next = new Set(previous)

      if (next.has(node.id)) {
        next.delete(node.id)
        getDescendantIds(node).forEach((id) => next.delete(id))
      } else {
        next.add(node.id)
      }

      return next
    })
  }

  const goBack = () => {
    setHistory((previousHistory) => {
      if (previousHistory.length === 0) return previousHistory
      const nextHistory = [...previousHistory]
      const previousExpandedState = nextHistory.pop()
      setExpandedIds(previousExpandedState)
      return nextHistory
    })
  }

  const resetAll = () => {
    if (expandedIds.size === 0) return
    setHistory((oldHistory) => [...oldHistory, new Set(expandedIds)])
    setExpandedIds(new Set())
  }

  if (!selectedLecture) {
    return (
      <main className="app-shell">
        <section className="note-page empty-page">src/lectures 폴더에 txt 파일을 추가해주세요.</section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="note-page">
        <header className="note-header">
          <div className="brand-row">
            <div className="brand-name">MediTree</div>
            <LectureSelector lectures={lectures} selectedSlug={selectedSlug} onSelect={selectLecture} />
          </div>

          <div className="title-row">
            <h1>{selectedLecture.lectureTitle}</h1>
            <div className="lecture-meta">
              {selectedLecture.date ? <span>{selectedLecture.date}</span> : null}
              {selectedLecture.professor ? <span>{selectedLecture.professor}</span> : null}
            </div>
          </div>
        </header>

        <section className="tree-card" aria-label="lecture tree">
          {selectedLecture.tree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              expandedIds={expandedIds}
              onToggle={toggleNode}
            />
          ))}
        </section>

        <section className="reference-card">
          <h2>References</h2>
          {selectedLecture.references.length ? (
            <ol>
              {selectedLecture.references.map((reference) => (
                <li key={reference.id}>{reference.text}</li>
              ))}
            </ol>
          ) : (
            <p className="empty-reference">No references.</p>
          )}
        </section>

        <footer className="floating-controls" aria-label="tree controls">
          <button
            className="control-button back-button"
            onClick={goBack}
            type="button"
            disabled={history.length === 0}
            aria-label="Back"
            title="Back"
          >
            ←
          </button>
          <button className="control-button reset-button" onClick={resetAll} type="button" aria-label="Reset" title="Reset">
            ↻
          </button>
        </footer>
      </section>
    </main>
  )
}
