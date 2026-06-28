import { useMemo, useRef, useState } from 'react'
import { rawLectures, SYSTEM_ORDER } from './data/lectures'
import logoMark from './assets/meditree-mark.png'
import './styles.css'

const COLOR_THEMES = {
  blue: {
    name: 'blue',
    accent: '#2563eb',
    soft: '#dbeafe',
    softer: '#f8fbff',
    border: '#93c5fd',
  },
  red: {
    name: 'red',
    accent: '#dc2626',
    soft: '#fee2e2',
    softer: '#fffafa',
    border: '#fca5a5',
  },
  green: {
    name: 'green',
    accent: '#16a34a',
    soft: '#dcfce7',
    softer: '#f8fff9',
    border: '#86efac',
  },
  yellow: {
    name: 'yellow',
    accent: '#ca8a04',
    soft: '#fef3c7',
    softer: '#fffdf4',
    border: '#fcd34d',
  },
}

const DEFAULT_THEME = COLOR_THEMES.blue

function normalizeColor(value) {
  const key = String(value || '').trim().toLowerCase()
  return COLOR_THEMES[key] ? key : DEFAULT_THEME.name
}

function getThemeVars(colorName) {
  const theme = COLOR_THEMES[normalizeColor(colorName)] || DEFAULT_THEME
  return {
    '--accent': theme.accent,
    '--accent-soft': theme.soft,
    '--accent-softer': theme.softer,
    '--accent-border': theme.border,
  }
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

function formatPeriod(rawValue) {
  const value = String(rawValue || '').trim()
  if (!value) return ''

  const explicit = value.match(/교시/)
  if (explicit) return value

  const digits = value.replace(/[^0-9]/g, '')
  if (!digits) return value

  if (digits.length === 1) return `${digits}교시`
  return `${digits.split('').join(',')}교시`
}

function splitDateAndPeriod(rawValue) {
  const value = String(rawValue || '').trim()
  if (!value) return { date: '', period: '' }

  // Supports:
  // @date 26.06.28
  // @date 26.06.28.4
  // @date 26.06.28.4교시
  // @date 26.06.28.23
  const compact = value.match(/^(\d{2}\.\d{2}\.\d{2})(?:[\s.\-]+(.+))?$/)
  if (compact) {
    return { date: compact[1], period: compact[2] ? formatPeriod(compact[2]) : '' }
  }

  const spaced = value.match(/^(.*?)(?:[\s.\-]+)(\d+(?:\s*,\s*\d+)*\s*교시|\d{1,4})$/)
  if (!spaced) return { date: value, period: '' }

  const datePart = spaced[1].replace(/[\s.]+$/g, '').trim()
  const periodPart = spaced[2].trim()

  if (!datePart) return { date: value, period: '' }
  return { date: datePart, period: formatPeriod(periodPart) }
}

function combineSystemLabel(rawLecture, systemValue) {
  const subject = String(systemValue || '').trim()
  if (!subject) return rawLecture.systemLabel

  if (!rawLecture.systemAcademicLabel) return subject
  if (subject.includes(rawLecture.systemAcademicLabel)) return subject
  return `${subject} (${rawLecture.systemAcademicLabel})`
}

function parseLecture(rawLecture) {
  const lines = rawLecture.raw.replace(/\r\n/g, '\n').split('\n')
  const meta = {
    title: rawLecture.fallbackTitle || 'Untitled Lecture',
    date: '',
    professor: '',
    period: '',
    system: rawLecture.systemLabel,
    color: DEFAULT_THEME.name,
  }
  const references = []
  const tree = []
  const stack = []

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

    const systemMatch = line.match(/^@system\s+(.+)$/i)
    if (systemMatch) {
      meta.system = combineSystemLabel(rawLecture, systemMatch[1])
      continue
    }

    const dateMatch = line.match(/^@date\s+(.+)$/i)
    if (dateMatch) {
      const parsedDate = splitDateAndPeriod(dateMatch[1])
      meta.date = parsedDate.date
      if (parsedDate.period) meta.period = parsedDate.period
      continue
    }

    const professorMatch = line.match(/^@(prof|professor)\s+(.+)$/i)
    if (professorMatch) {
      meta.professor = professorMatch[2].trim()
      continue
    }

    const periodMatch = line.match(/^@(period|periods|class|classes|교시)\s+(.+)$/i)
    if (periodMatch) {
      meta.period = formatPeriod(periodMatch[2])
      continue
    }

    const colorMatch = line.match(/^@(color|colour)\s+(red|blue|green|yellow)\s*$/i)
    if (colorMatch) {
      meta.color = normalizeColor(colorMatch[2])
      continue
    }

    const refMatch = line.match(/^@(ref|reference)\s+(\d+)\s*:\s*(.+)$/i)
    if (refMatch) {
      references.push({ id: Number(refMatch[2]), text: refMatch[3].trim() })
      continue
    }

    // v10.2부터는 내용 박스 대신 모든 정보를 node로 정리한다.
    // 기존 파일에 남아 있는 -> 문장은 무시한다.
    if (/^(?:->|→|=>)\s*(.+)$/.test(line)) {
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
        id: `${rawLecture.slug}-${code.replace(/\./g, '-')}`,
        code,
        title,
        referenceIds,
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
    }
  }

  return {
    ...rawLecture,
    lectureTitle: meta.title,
    systemLabel: meta.system || rawLecture.systemLabel,
    date: meta.date,
    professor: meta.professor,
    period: meta.period,
    color: normalizeColor(meta.color),
    tree,
    references: references.sort((a, b) => a.id - b.id),
  }
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

function normalizeSearch(value) {
  return value.trim().toLowerCase()
}

function splitAcademicSystemLabel(label = '') {
  const text = String(label || '').trim()
  const parenthesized = text.match(/^(.+?)\s*\((본\d+-\d+)\)$/)
  if (parenthesized) {
    return { academic: parenthesized[2], subject: parenthesized[1].trim() }
  }

  const legacy = text.match(/^(본\d+-\d+)\s+(.+)$/)
  if (legacy) {
    return { academic: legacy[1], subject: legacy[2].trim() }
  }

  return { academic: '', subject: text }
}

function getHumanSystemLabel(label = '') {
  const display = splitAcademicSystemLabel(label)
  if (!display.academic) return display.subject
  return `${display.subject} (${display.academic})`
}

function searchTree(tree, query) {
  const normalized = normalizeSearch(query)
  const matchedIds = new Set()
  const ancestorIds = new Set()

  if (!normalized) return { matchedIds, ancestorIds }

  function walk(nodes, ancestors = []) {
    nodes.forEach((node) => {
      const matches = node.title.toLowerCase().includes(normalized)
      if (matches) {
        matchedIds.add(node.id)
        ancestors.forEach((id) => ancestorIds.add(id))
      }

      walk(node.children, [...ancestors, node.id])
    })
  }

  walk(tree)
  return { matchedIds, ancestorIds }
}

function getInitialView(lectures) {
  const params = new URLSearchParams(window.location.search)
  const systemFromUrl = params.get('system')
  const lectureFromUrl = params.get('lecture')

  if (systemFromUrl && lectureFromUrl) {
    const lecture = lectures.find(
      (item) => item.systemKey === systemFromUrl && item.lectureKey === lectureFromUrl
    )
    if (lecture) return { mode: 'lecture', systemKey: lecture.systemKey, lectureSlug: lecture.slug }
  }

  if (systemFromUrl && lectures.some((item) => item.systemKey === systemFromUrl)) {
    return { mode: 'system', systemKey: systemFromUrl, lectureSlug: '' }
  }

  const legacyLecture = params.get('lecture')
  if (legacyLecture) {
    const lecture = lectures.find((item) => item.slug === legacyLecture || item.lectureKey === legacyLecture)
    if (lecture) return { mode: 'lecture', systemKey: lecture.systemKey, lectureSlug: lecture.slug }
  }

  return { mode: 'library', systemKey: '', lectureSlug: '' }
}

function updateUrl(view) {
  const url = new URL(window.location.href)
  url.search = ''

  if (view.mode === 'system') {
    url.searchParams.set('system', view.systemKey)
  }

  if (view.mode === 'lecture') {
    url.searchParams.set('system', view.systemKey)
    const lectureKey = view.lectureSlug.split('/').pop()
    url.searchParams.set('lecture', lectureKey)
  }

  window.history.pushState(null, '', url.toString())
}

function getSearchHaystack(lecture) {
  return [
    lecture.lectureTitle,
    lecture.systemLabel,
    lecture.systemSubjectLabel,
    lecture.professor,
    lecture.date,
    lecture.period,
    lecture.fileName,
    lecture.systemFolderName,
    lecture.lecturePrefix,
    lecture.systemPrefix,
  ]
    .join(' ')
    .toLowerCase()
}

function Icon({ name }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  }

  if (name === 'library') {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="7" height="7" rx="2" />
        <rect x="13" y="4" width="7" height="7" rx="2" />
        <rect x="4" y="13" width="7" height="7" rx="2" />
        <rect x="13" y="13" width="7" height="7" rx="2" />
      </svg>
    )
  }

  if (name === 'search') {
    return (
      <svg {...common}>
        <circle cx="10.5" cy="10.5" r="5.5" />
        <path d="M15 15l4.2 4.2" />
      </svg>
    )
  }

  if (name === 'parent') {
    return (
      <svg {...common}>
        <path d="M10 6l-6 6 6 6" />
        <path d="M5 12h15" />
      </svg>
    )
  }

  if (name === 'undo') {
    return (
      <svg {...common}>
        <path d="M8 7H4v4" />
        <path d="M4 11c2.2-3.2 5.6-4.8 9-4.1 4.2.8 7 4.4 6.4 8.4-.5 3.5-3.6 6-7.1 5.7-2.1-.2-4-1.2-5.2-2.8" />
      </svg>
    )
  }

  if (name === 'reset') {
    return (
      <svg {...common}>
        <path d="M19 8v5h-5" />
        <path d="M18.2 13A6.8 6.8 0 1 1 16 7.9" />
      </svg>
    )
  }

  return null
}

function RemoteControl({ items = [] }) {
  const visibleItems = items.filter(Boolean)
  if (!visibleItems.length) return null

  return (
    <nav className="remote-control" aria-label="remote controls">
      {visibleItems.map((item) => (
        <button
          className={`remote-button ${item.active ? 'is-active' : ''}`}
          key={item.label}
          onClick={item.onClick}
          type="button"
          disabled={item.disabled}
          aria-label={item.label}
          title={item.label}
        >
          <Icon name={item.icon} />
        </button>
      ))}
    </nav>
  )
}

function SearchBox({ value, onChange, placeholder, inputRef }) {
  return (
    <label className="search-box">
      <span className="search-icon"><Icon name="search" /></span>
      <input ref={inputRef} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  )
}

function BrandHeader() {
  return (
    <header className="brand-header">
      <button className="brand-word" type="button" aria-label="MediTree">
        <img className="brand-logo" src={logoMark} alt="" />
        <span>MEDITREE</span>
      </button>
    </header>
  )
}

function LibraryView({ systems, lectures, onSelectSystem, onSelectLecture, onGoHome }) {
  const [query, setQuery] = useState('')
  const searchInputRef = useRef(null)
  const normalizedQuery = normalizeSearch(query)

  const filteredLectures = normalizedQuery
    ? lectures.filter((lecture) => getSearchHaystack(lecture).includes(normalizedQuery))
    : []

  return (
    <section className="note-page library-page">
      <RemoteControl
        items={[
          { icon: 'library', label: 'Library', onClick: onGoHome, active: true },
          { icon: 'search', label: 'Search', onClick: () => searchInputRef.current?.focus() },
        ]}
      />

      <BrandHeader />
      <div className="library-hero">
        <p className="eyebrow">Lecture Library</p>
        <h1>MediTree</h1>
        <p>계통을 고르고, 강의를 열고, 필요한 node를 제한없이 펼쳐보세요.</p>
      </div>

      <SearchBox inputRef={searchInputRef} value={query} onChange={setQuery} placeholder="강의명 · 계통 · 교수명 검색" />

      {normalizedQuery ? (
        <section className="lecture-list-panel">
          <div className="section-title-row">
            <h2>Search</h2>
            <span>{filteredLectures.length}</span>
          </div>
          <LectureList lectures={filteredLectures} onSelectLecture={onSelectLecture} emptyText="검색 결과가 없습니다." />
        </section>
      ) : (
        <section className="system-grid" aria-label="systems">
          {systems.map((system) => {
            const display = splitAcademicSystemLabel(system.systemLabel)
            return (
              <button className="system-card" key={system.systemKey} type="button" onClick={() => onSelectSystem(system.systemKey)}>
                <span className="system-main">
                  <strong>{getHumanSystemLabel(system.systemLabel)}</strong>
                  <small>강의수: {system.count}개</small>
                </span>
                <span className="system-arrow" aria-hidden="true">›</span>
              </button>
            )
          })}
        </section>
      )}
    </section>
  )
}

function SystemView({ system, lectures, onBackToLibrary, onSelectLecture }) {
  const [query, setQuery] = useState('')
  const searchInputRef = useRef(null)
  const normalizedQuery = normalizeSearch(query)
  const filteredLectures = normalizedQuery
    ? lectures.filter((lecture) => getSearchHaystack(lecture).includes(normalizedQuery))
    : lectures
  const display = splitAcademicSystemLabel(system.systemLabel)

  return (
    <section className="note-page library-page">
      <RemoteControl
        items={[
          { icon: 'library', label: 'Library', onClick: onBackToLibrary },
          { icon: 'search', label: 'Search', onClick: () => searchInputRef.current?.focus() },
        ]}
      />

      <BrandHeader />
      <div className="system-hero">
        <p className="eyebrow">System</p>
        <h1>{getHumanSystemLabel(system.systemLabel)}</h1>
        <p>강의를 열고, 필요한 node를 제한없이 펼쳐보세요.</p>
      </div>

      <SearchBox inputRef={searchInputRef} value={query} onChange={setQuery} placeholder={`${getHumanSystemLabel(system.systemLabel)} 강의 검색`} />

      <section className="lecture-list-panel">
        <LectureList lectures={filteredLectures} onSelectLecture={onSelectLecture} emptyText="강의가 없습니다." />
      </section>
    </section>
  )
}

function getLectureDatePeriod(lecture) {
  if (lecture.date && lecture.period) return `${lecture.date}-${lecture.period}`
  return lecture.date || lecture.period || ''
}

function getLectureSubline(lecture) {
  return [getLectureDatePeriod(lecture), lecture.professor].filter(Boolean).join(' · ')
}

function LectureList({ lectures, onSelectLecture, emptyText }) {
  if (!lectures.length) return <p className="empty-list">{emptyText}</p>

  return (
    <div className="lecture-list">
      {lectures.map((lecture) => (
        <button
          className="lecture-card"
          key={lecture.slug}
          type="button"
          onClick={() => onSelectLecture(lecture)}
          style={getThemeVars(lecture.color)}
        >
          <span className="lecture-color" aria-hidden="true" />
          <span className="lecture-main">
            <strong>{lecture.lectureTitle}</strong>
            <small>{getLectureSubline(lecture) || lecture.systemLabel}</small>
          </span>
          <span className="lecture-arrow" aria-hidden="true">›</span>
        </button>
      ))}
    </div>
  )
}

function TreeNode({ node, depth, expandedIds, matchedIds, onToggle }) {
  const expanded = expandedIds.has(node.id)
  const hasChildren = node.children.length > 0
  const indicator = hasChildren ? (expanded ? '▼' : '▶') : '•'

  return (
    <div className={`tree-node depth-${depth}`} style={{ '--depth': depth }}>
      <button
        className={`node-row ${expanded ? 'is-expanded' : ''} ${matchedIds?.has(node.id) ? 'is-match' : ''} ${!hasChildren ? 'terminal-node' : ''}`}
        onClick={() => onToggle(node)}
        type="button"
      >
        <span className={`node-indicator ${hasChildren ? 'expandable-indicator' : 'terminal-indicator'}`} aria-hidden="true">
          {indicator}
        </span>
        <span className="node-title">
          {node.title}
          {node.referenceIds?.length ? <sup>{makeSuperscript(node.referenceIds)}</sup> : null}
        </span>
      </button>

      {expanded && hasChildren ? (
        <div className="node-body">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              matchedIds={matchedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function LectureView({ lecture, onBackToSystem, onBackToLibrary }) {
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [history, setHistory] = useState([])
  const [treeQuery, setTreeQuery] = useState('')
  const treeSearchRef = useRef(null)
  const treeSearch = useMemo(() => searchTree(lecture.tree, treeQuery), [lecture.tree, treeQuery])
  const visibleExpandedIds = useMemo(() => {
    if (!normalizeSearch(treeQuery)) return expandedIds
    return new Set([...expandedIds, ...treeSearch.ancestorIds])
  }, [expandedIds, treeQuery, treeSearch.ancestorIds])

  const toggleNode = (node) => {
    const canExpand = node.children.length > 0
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

  return (
    <section className="note-page lecture-page" style={getThemeVars(lecture.color)}>
      <RemoteControl
        items={[
          { icon: 'library', label: 'Library', onClick: onBackToLibrary },
          { icon: 'parent', label: lecture.systemLabel, onClick: onBackToSystem },
          { icon: 'undo', label: 'Back', onClick: goBack, disabled: history.length === 0 },
          { icon: 'reset', label: 'Reset', onClick: resetAll },
        ]}
      />

      <BrandHeader />

      <header className="lecture-title-area">
        <p className="eyebrow">Lecture Note</p>
        <div className="title-row">
          <h1>{lecture.lectureTitle}</h1>
        </div>
        <div className="lecture-meta-grid">
          <span className="lecture-system-label">{getHumanSystemLabel(lecture.systemLabel)}</span>
          {getLectureDatePeriod(lecture) ? <span>{getLectureDatePeriod(lecture)}</span> : null}
          {lecture.professor ? <span className="lecture-professor-label">{lecture.professor}</span> : null}
        </div>
        <SearchBox
          inputRef={treeSearchRef}
          value={treeQuery}
          onChange={setTreeQuery}
          placeholder="이 강의 안에서 node 검색"
        />
      </header>

      <section className="tree-panel" aria-label="lecture tree">
        {lecture.tree.length ? (
          lecture.tree.map((node) => (
            <TreeNode key={node.id} node={node} depth={0} expandedIds={visibleExpandedIds} matchedIds={treeSearch.matchedIds} onToggle={toggleNode} />
          ))
        ) : (
          <p className="empty-list">이 강의에는 아직 node가 없습니다.</p>
        )}
      </section>

      <section className="reference-panel">
        <h2>References</h2>
        {lecture.references.length ? (
          <ol>
            {lecture.references.map((reference) => (
              <li key={reference.id}>{reference.text}</li>
            ))}
          </ol>
        ) : (
          <p className="empty-reference">No references.</p>
        )}
      </section>
    </section>
  )
}

export default function App() {
  const lectures = useMemo(() => rawLectures.map(parseLecture), [])
  const systems = useMemo(() => {
    const map = new Map()

    lectures.forEach((lecture) => {
      if (!map.has(lecture.systemKey)) {
        map.set(lecture.systemKey, {
          systemKey: lecture.systemKey,
          systemLabel: lecture.systemLabel,
          count: 0,
          lectures: [],
        })
      }

      const system = map.get(lecture.systemKey)
      system.count += 1
      system.lectures.push(lecture)
    })

    return [...map.values()].sort((a, b) => {
      const indexA = SYSTEM_ORDER.indexOf(a.systemKey)
      const indexB = SYSTEM_ORDER.indexOf(b.systemKey)
      const safeA = indexA === -1 ? 999 : indexA
      const safeB = indexB === -1 ? 999 : indexB
      if (safeA !== safeB) return safeA - safeB
      return a.systemLabel.localeCompare(b.systemLabel, 'ko')
    })
  }, [lectures])

  const [view, setView] = useState(() => getInitialView(lectures))

  const selectedSystem = systems.find((system) => system.systemKey === view.systemKey)
  const selectedLecture = lectures.find((lecture) => lecture.slug === view.lectureSlug)

  const goToLibrary = () => {
    const nextView = { mode: 'library', systemKey: '', lectureSlug: '' }
    setView(nextView)
    updateUrl(nextView)
  }

  const goToSystem = (systemKey) => {
    const nextView = { mode: 'system', systemKey, lectureSlug: '' }
    setView(nextView)
    updateUrl(nextView)
  }

  const goToLecture = (lecture) => {
    const nextView = { mode: 'lecture', systemKey: lecture.systemKey, lectureSlug: lecture.slug }
    setView(nextView)
    updateUrl(nextView)
  }

  if (!lectures.length) {
    return (
      <main className="app-shell">
        <section className="note-page empty-page">src/lectures 폴더에 txt 파일을 추가해주세요.</section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      {view.mode === 'library' ? (
        <LibraryView systems={systems} lectures={lectures} onSelectSystem={goToSystem} onSelectLecture={goToLecture} onGoHome={goToLibrary} />
      ) : null}

      {view.mode === 'system' && selectedSystem ? (
        <SystemView
          system={selectedSystem}
          lectures={selectedSystem.lectures}
          onBackToLibrary={goToLibrary}
          onSelectLecture={goToLecture}
        />
      ) : null}

      {view.mode === 'lecture' && selectedLecture ? (
        <LectureView
          key={selectedLecture.slug}
          lecture={selectedLecture}
          onBackToSystem={() => goToSystem(selectedLecture.systemKey)}
          onBackToLibrary={goToLibrary}
        />
      ) : null}
    </main>
  )
}
