# MediTree v14.5

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

## 실행

```bash
npm install
npm run dev
```

## 배포

```bash
npm run build
git add .
git commit -m "Update MediTree v14.4"
git push
```


## v14.4

- Summary blocks are rendered before Contents.
- Each `@sum` block becomes a separate panel titled `Summary: <title>`.
- Contents heading is visually strengthened.
