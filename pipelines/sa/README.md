# SA (Spectral Angle) Calculation

## 개요
Prosit를 사용한 예측 스펙트라와 실제 스펙트라 간의 SA 계산 파이프라인입니다.

## 입력
- **파일 형식**: .csv
- **내용**: DNPS 결과 파일들

## 출력
- **파일 형식**: .msp, .csv
- **내용**: SA 계산 결과

## 사용법
```bash
python run.py --target-dnps-results-path /path/to/target --decoy-dnps-results-path /path/to/decoy --peptide-length-min 6 --peptide-length-max 30
```

## 매개변수
- `--target-dnps-results-path`: Target DNPS 결과 경로 (필수)
- `--decoy-dnps-results-path`: Decoy DNPS 결과 경로 (필수)
- `--peptide-length-min`: 최소 펩타이드 길이 (기본값: 6)
- `--peptide-length-max`: 최대 펩타이드 길이 (기본값: 30)
- `--normalized-collision-energy`: 정규화된 충돌 에너지

## 예시
```bash
python run.py \
  --target-dnps-results-path /data/target_dnps_results \
  --decoy-dnps-results-path /data/decoy_dnps_results \
  --peptide-length-min 8 \
  --peptide-length-max 25 \
  --normalized-collision-energy 28.0
```

## 의존성
- Prosit
- Python 3.8+ 