# Post-processing

## 개요
결과 후처리를 위한 파이프라인입니다.

## 입력
- **파일 형식**: .csv
- **내용**: 이전 단계 결과 파일들
- **참조 파일**: .fasta

## 출력
- **파일 형식**: .csv
- **내용**: 후처리된 결과

## 사용법
```bash
python run.py --reference-fasta-file /path/to/reference.fasta
```

## 매개변수
- `--reference-fasta-file`: 참조 fasta 파일 (필수)

## 예시
```bash
python run.py \
  --reference-fasta-file /data/reference.fasta
```

## 결과
- matched with Ref. protein sequence
- Novel peptide candidates
- Immunopeptidome 예측 (NetMHCPan) 