# False Discovery Rate (FDR) Calculation

## 개요
Target과 Decoy 결과를 비교하여 FDR을 계산하는 파이프라인입니다.

## 입력
- **파일 형식**: .csv
- **내용**: Target + Decoy 결과 파일들

## 출력
- **파일 형식**: .csv
- **내용**: FDR 필터링된 결과

## 사용법
```bash
python run.py --target-results-dir /path/to/target --decoy-results-dir /path/to/decoy --fdr-threshold 0.01
```

## 매개변수
- `--target-results-dir`: Target 결과 디렉토리 (필수)
- `--decoy-results-dir`: Decoy 결과 디렉토리 (필수)
- `--fdr-threshold`: FDR 임계값 (기본값: 0.01)

## 예시
```bash
python run.py \
  --target-results-dir /data/target_results \
  --decoy-results-dir /data/decoy_results \
  --fdr-threshold 0.05
``` 