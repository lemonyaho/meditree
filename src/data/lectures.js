const lectureModules = import.meta.glob('../lectures/*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
})

function fileNameToSlug(path) {
  return path
    .split('/')
    .pop()
    .replace(/\.txt$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gi, '-')
    .replace(/^-+|-+$/g, '')
}

export const rawLectures = Object.entries(lectureModules)
  .map(([path, raw]) => ({
    path,
    fileName: path.split('/').pop(),
    slug: fileNameToSlug(path),
    raw,
  }))
  .sort((a, b) => a.fileName.localeCompare(b.fileName, 'ko'))
