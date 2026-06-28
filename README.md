# MediTree v13.2

계통을 고르고, 강의를 열고, 필요한 node를 제한없이 펼쳐보는 개인 학습 지도입니다.

## txt 폴더 구조

```txt
src/lectures/
├─ 020104-내분비계 1차/
├─ 020104-내분비계 2차/
├─ 020106-요로기계 1차/
└─ 020106-요로기계 2차/
```

폴더명 앞 6자리 숫자는 정렬 및 학년/학기 표시용입니다. 예를 들어 `020104-내분비계 1차`는 화면에서 `내분비계 1차 (본2-1)`로 표시됩니다.

## 강의 파일명

```txt
062801-thyroid-disease.txt
070302-urinary-incontinence.txt
```

앞 숫자는 정렬용이며 01부터 시작하지 않아도 됩니다.

## txt 작성 예시

```txt
# Thyroid Disease
@date 26.06.28.1
@prof 김원규P
@color red
@ref 1: ATA Guidelines.

01 Hyperthyroidism
01.1 Graves disease @ref1
01.1.1 Pathophysiology
01.1.2 Diagnosis

02 Hypothyroidism
02.1 Hashimoto thyroiditis
```

`@date 26.06.28.1`은 `26.06.28-1교시`로 표시됩니다. `@date 26.06.28.23`은 `26.06.28-2,3교시`로 표시됩니다.

## 실행

```bash
npm install
npm run dev
```

## 배포

```bash
npm run build
git add .
git commit -m "Update MediTree v13.2"
git push
```
