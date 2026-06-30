# MediTree v14.9

계통을 고르고, 강의를 열고, 필요한 node를 제한없이 펼쳐보는 개인 학습 지도입니다.

## txt 폴더 구조

```txt
_lectures_/
├─ 020104-내분비계 1차/
├─ 020104-내분비계 2차/
├─ 020106-요로기계 1차/
└─ 020106-요로기계 2차/
```

## 기본 강의 txt 작성

```txt
# Urological Embryology
@system 요로기계 1차
@date 26.06.29.2
@prof 김원규P
@color red
@ref 1: Moore Clinically Oriented Anatomy.

01 Early Kidney Development
01.1 Pronephros
01.2 Mesonephros

02 Late Kidney Development
02.1 Ureteric bud
02.2 Metanephric mesoderm @ref1
```

## Summary box 작성

같은 txt 파일 안에 `@sum 번호: 제목`을 쓰고, 바로 아래를 삼중 따옴표로 감싸면 Summary box에 별도 목차로 표시됩니다.

```txt
@sum 1: Urological-Only Embryology
'''
1 Endoderm
1.1 Cloaca
1.1.1 Primitive urogenital sinus
1.1.1.1 Vesical part
1.1.1.1.1 Urinary bladder

2 Mesoderm
2.1 Intermediate mesoderm
2.1.1 Urogenital ridge
2.1.1.1 Nephrogenic ridge
2.1.1.1.1 Pronephros
'''
```

`(=start)`, `(=end)`, `(=memo)`처럼 괄호 안에 `=`로 시작하는 줄은 주석으로 무시됩니다.

## v14.4 변경점

- main tree panel에 `Contents` 소제목 추가
- `@sum` block 지원
- Reference box와 비슷한 Summary box 추가

## v14.7 변경점

- Summary block 안의 `→`, `->`, `=>` 줄을 terminal node로 만들지 않고, 바로 위 node의 note box로 표시합니다.
- 예: `1.1.1.1.1 Urinary bladder` 다음 줄의 `→ trigone...`은 Urinary bladder를 펼쳤을 때 설명 box로 나타납니다.

```txt
@sum 1: Origin-based Urological Embryology
'''
1 Endoderm
1.1 Cloaca
1.1.1 Primitive urogenital sinus
1.1.1.1 Vesical part
1.1.1.1.1 Urinary bladder
→ trigone의 final epithelium은 endodermal epithelium이다.
'''
```

## 실행

```bash
npm install
npm run dev
```

## 배포

```bash
npm run build
git add .
git commit -m "Update MediTree v14.9"
git push
```


## v14.4

- Summary blocks are rendered before Contents.
- Each `@sum` block becomes a separate panel titled `Summary: <title>`.
- Contents heading is visually strengthened.


## v14.7
- Summary의 `→` 설명 box는 별도 클릭 없이 해당 node가 보일 때 같이 표시됩니다.
- 설명 box의 x-position을 해당 node title과 맞추었습니다.


## v14.8

- Contents에서도 `→`, `->`, `=>` 줄을 바로 위 node의 answer box로 파싱합니다.
- Contents의 answer box는 해당 node를 클릭해 펼쳤을 때만 보입니다.
- Summary의 note box 동작은 기존처럼 node가 보일 때 함께 표시됩니다.


## Summary block 작성

Summary는 여러 개 넣을 수 있습니다. 아래 두 형식을 모두 지원합니다.

```txt
@sum 1: Epithelium
'''
01 Bowman’s Capsule
→ Simple Squamous epi.
'''

@sum2: Components by Location
'''
01 Medullary Ray
01.1 Collecting Tubule & Duct
→ eosinophilic (연한 색)
'''
```

- `@sum 2:`와 `@sum2:` 모두 가능
- Summary 안의 `→` 줄은 바로 위 node의 설명 box로 표시됩니다.
