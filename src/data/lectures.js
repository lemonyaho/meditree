const lectureModules = import.meta.glob('../../_lectures_/**/*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const SYSTEM_LABELS = {
  cardiovascular: '심혈관계',
  respiratory: '호흡기계',
  endocrine: '내분비계',
  reproductive: '생식기계',
  urinary: '요로기계',
  urology: '요로기계',
  digestive: '소화기계',
  gastrointestinal: '소화기계',
  nervous: '신경계',
  neurology: '신경계',
  musculoskeletal: '근골격계',
  'hematology-oncology': '혈액종양',
  hematology: '혈액계',
  oncology: '종양학',
  infection: '감염',
  immunology: '면역계',
  dermatology: '피부계',
  psychiatry: '정신건강의학',
  pediatrics: '소아청소년',
  general: 'General',
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\.txt$/i, '')
    .replace(/[^a-z0-9가-힣]+/gi, '-')
    .replace(/^-+|-+$/g, '')
}

function splitPrefixName(value) {
  const cleanValue = String(value || '').replace(/\.txt$/i, '')
  const match = cleanValue.match(/^(\d+)[-_\s]*(.*)$/)

  if (!match) {
    return {
      prefix: '',
      name: cleanValue,
      sortValue: Number.MAX_SAFE_INTEGER,
    }
  }

  return {
    prefix: match[1],
    name: match[2] || cleanValue,
    sortValue: Number(match[1]),
  }
}

function humanize(value) {
  return String(value || 'General')
    .replace(/\.txt$/i, '')
    .replace(/^\d+[-_\s]*/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getSubjectLabel(systemName) {
  const key = slugify(systemName)
  return SYSTEM_LABELS[key] || humanize(systemName)
}

function getAcademicLabel(prefix) {
  const digits = String(prefix || '').match(/^(\d{2})(\d{2})/)
  if (!digits) return ''

  const grade = Number(digits[1])
  const semester = Number(digits[2])

  if (!grade || !semester) return ''
  return `본${grade}-${semester}`
}

function getSystemDisplayLabel(prefix, systemName) {
  const academic = getAcademicLabel(prefix)
  const subject = getSubjectLabel(systemName)
  return academic ? `${subject} (${academic})` : subject
}

function parsePath(path) {
  const cleanPath = path.replace(/^\.\.\/\.\.\/_lectures_\//, '')
  const parts = cleanPath.split('/')
  const fileName = parts.pop() || 'untitled.txt'
  const systemFolderName = parts[0] || 'general'

  const systemParts = splitPrefixName(systemFolderName)
  const lectureParts = splitPrefixName(fileName)
  const systemSubjectKey = slugify(systemParts.name || systemFolderName)
  const lectureNameKey = slugify(lectureParts.name || fileName)
  const systemKey = slugify(systemFolderName)
  const lectureKey = slugify(fileName)
  const systemSubjectLabel = getSubjectLabel(systemParts.name || systemFolderName)
  const systemAcademicLabel = getAcademicLabel(systemParts.prefix)

  return {
    path,
    fileName,
    systemFolderName,
    systemKey,
    systemNameKey: systemSubjectKey,
    systemPrefix: systemParts.prefix,
    systemSortValue: systemParts.sortValue,
    systemAcademicLabel,
    systemSubjectLabel,
    systemLabel: getSystemDisplayLabel(systemParts.prefix, systemParts.name || systemFolderName),
    lectureKey,
    lectureNameKey,
    lecturePrefix: lectureParts.prefix,
    lectureSortValue: lectureParts.sortValue,
    slug: `${systemKey}/${lectureKey}`,
  }
}

function titleFromFileName(fileName) {
  return humanize(fileName)
}

export const rawLectures = Object.entries(lectureModules)
  .map(([path, raw]) => {
    const parsed = parsePath(path)

    return {
      ...parsed,
      raw,
      fallbackTitle: titleFromFileName(parsed.fileName),
    }
  })
  .sort((a, b) => {
    if (a.systemSortValue !== b.systemSortValue) return a.systemSortValue - b.systemSortValue
    if (a.systemLabel !== b.systemLabel) return a.systemLabel.localeCompare(b.systemLabel, 'ko')
    if (a.lectureSortValue !== b.lectureSortValue) return a.lectureSortValue - b.lectureSortValue
    return a.fileName.localeCompare(b.fileName, 'ko', { numeric: true })
  })

export const SYSTEM_ORDER = [
  ...new Set(rawLectures.map((lecture) => lecture.systemKey)),
].sort((a, b) => {
  const lectureA = rawLectures.find((lecture) => lecture.systemKey === a)
  const lectureB = rawLectures.find((lecture) => lecture.systemKey === b)

  const sortA = lectureA?.systemSortValue ?? Number.MAX_SAFE_INTEGER
  const sortB = lectureB?.systemSortValue ?? Number.MAX_SAFE_INTEGER
  if (sortA !== sortB) return sortA - sortB

  return a.localeCompare(b, 'ko', { numeric: true })
})

export { SYSTEM_LABELS, getAcademicLabel }
