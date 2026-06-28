# MediTree

MediTree is an infinite-depth interactive study note built with React + Vite.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Lecture text files

Put lecture `.txt` files in:

```txt
src/lectures/
```

Register lecture files in:

```txt
src/data/lectures.js
```

## Text format

```txt
# Embryology
@date 26.02.06
@prof 김원규P
@ref 1: Kim et al. (2024), Cancers, pp.204-208.
@ref 2: FIGO Committee Report (2023).

01 Disease 1
01.1 Dx.
01.2 Tx.
01.2.1 Medical @ref1
-> Triptan or propranolol
01.2.2 Surgical
01.2.2.1 simple hysterectomy
01.2.2.2 Radical hysterectomy

02 Disease 2
02.1 Etiology
02.1.1 Risk factors (8) @ref2
-> Smoking, DM, HTN, PCOS, nulliparity, early menarche, late menopause, family history
```

## Reference rules

```txt
@ref 1: ...   References list에 표시되는 문헌 정의
@ref1         node 옆 위첨자 ¹ 표시
@ref1,2       node 옆 위첨자 ¹,² 표시
```

Numbers such as `01.2.1` are used only to determine tree hierarchy. They are not displayed in the rendered note.
