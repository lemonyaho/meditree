# Tree Study Note MVP

의학 공부용 인터랙티브 트리형 노트 웹앱입니다.

## 기능

- React + Vite 기반 정적 웹앱
- 무한 깊이 recursive tree 구조
- node 클릭 시 접기/펼치기
- 여러 node 동시 펼치기
- Back 버튼: 직전 펼침 상태로 복귀
- Reset 버튼: 전체 접기
- References 항상 전체 표시
- 모바일/태블릿/노트북 반응형 UI

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 표시되는 local URL로 접속합니다.

## 빌드

```bash
npm run build
```

`dist` 폴더가 생성됩니다.

## 노트 수정 방법

`src/data/noteData.js` 파일을 수정하면 됩니다.

각 node는 다음 구조를 가질 수 있습니다.

```js
{
  id: 'unique-id',
  title: 'Node Title',
  content: '선택 사항: 펼쳤을 때 보일 설명',
  referenceIds: [1, 2],
  children: []
}
```

참고문헌은 `references` 배열에 추가합니다.

```js
references: [
  { id: 1, text: 'Kim et al. (2024), Cancers, pp.204-208.' }
]
```
