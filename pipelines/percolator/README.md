# Percolator

## 개요
Percolator를 사용한 결과 재점수화 파이프라인입니다.

## 입력
- **파일 형식**: .csv
- **내용**: Target + Decoy 결과 파일들

## 출력
- **파일 형식**: .csv
- **내용**: Percolator 재점수화 결과

## 사용법
```bash
python run.py --target-results-dir /path/to/target --decoy-results-dir /path/to/decoy --percolator-fdr 0.01 --percolator-iterations 3
```

## 매개변수
- `--target-results-dir`: Target 결과 디렉토리 (필수)
- `--decoy-results-dir`: Decoy 결과 디렉토리 (필수)
- `--percolator-fdr`: FDR 임계값 (기본값: 0.01)
- `--percolator-iterations`: 반복 횟수 (기본값: 3)

## 예시
```bash
python run.py \
  --target-results-dir /data/target_results \
  --decoy-results-dir /data/decoy_results \
  --percolator-fdr 0.05 \
  --percolator-iterations 5
```

## 의존성
- Percolator
- Python 3.8+ 