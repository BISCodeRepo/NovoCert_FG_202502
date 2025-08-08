# De novo Peptide Sequencing

## 개요
Casanovo(v4.1)를 사용한 De novo 펩타이드 시퀀싱 파이프라인입니다.

## 입력
- **파일 형식**: .mgf
- **내용**: Target + Decoy 스펙트라 파일들

## 출력
- **파일 형식**: .csv
- **내용**: 펩타이드 시퀀스 결과

## 사용법
```bash
python run.py --target-spectra-dir /path/to/target --decoy-spectra-dir /path/to/decoy --casanovo-yaml-path /path/to/config.yaml --casanovo-model-path /path/to/model
```

## 매개변수
- `--target-spectra-dir`: Target 스펙트라 디렉토리 (필수)
- `--decoy-spectra-dir`: Decoy 스펙트라 디렉토리 (필수)
- `--casanovo-yaml-path`: Casanovo 설정 파일 경로 (필수)
- `--casanovo-model-path`: Casanovo 모델 파일 경로 (필수)

## 예시
```bash
python run.py \
  --target-spectra-dir /data/target_spectra \
  --decoy-spectra-dir /data/decoy_spectra \
  --casanovo-yaml-path /tools/casanovo/config.yaml \
  --casanovo-model-path /tools/casanovo/model.pt
```

## 의존성
- Casanovo v4.1
- Python 3.8+ 