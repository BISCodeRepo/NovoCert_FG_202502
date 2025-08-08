# PIF (Peptide Identification Framework)

## 개요
PIF 계산을 위한 파이프라인입니다.

## 입력
- **파일 형식**: .csv
- **내용**: 이전 단계 결과 파일들

## 출력
- **파일 형식**: .csv
- **내용**: PIF 계산 결과

## 사용법
```bash
python run.py --input-dir /path/to/input --output-dir /path/to/output
```

## 매개변수
- `--input-dir`: 입력 디렉토리 (필수)
- `--output-dir`: 출력 디렉토리 (필수)

## 예시
```bash
python run.py \
  --input-dir /data/previous_results \
  --output-dir /data/pif_results
``` 