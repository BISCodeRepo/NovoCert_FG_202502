# Decoy Spectra Generation

## 개요
PrecursorSwap.jar를 사용한 Decoy 스펙트라 생성을 위한 파이프라인입니다.

## 입력
- **파일 형식**: .mgf
- **내용**: Target 스펙트라 파일들

## 출력
- **파일 형식**: .mgf
- **내용**: Target + Decoy 스펙트라 파일들

## 사용법
```bash
python run.py --input-dir /path/to/input --output-dir /path/to/output --precursor-tolerance 10.0 --memory 4 --random-seed 42
```

## 매개변수 (모두 필수)
- `--input-dir`: 입력 mgf 파일 디렉토리
- `--output-dir`: 출력 디렉토리
- `--precursor-tolerance`: Precursor tolerance (ppm)
- `--memory`: 메모리 사용량 (GB)
- `--random-seed`: 랜덤 시드

## 예시
```bash
python run.py \
  --input-dir /data/target_spectra \
  --output-dir /data/decoy_spectra \
  --precursor-tolerance 5.0 \
  --memory 8 \
  --random-seed 123
```

## 실행되는 Java 명령어
```bash
java -Xmx{memory}G -jar PrecursorSwap.jar -i {input-dir} -o {output-dir} -d {precursor-tolerance} -r {random-seed}
```

## 의존성
- Java Runtime Environment (JRE)
- PrecursorSwap.jar (포함됨)
- Python 3.8+ 