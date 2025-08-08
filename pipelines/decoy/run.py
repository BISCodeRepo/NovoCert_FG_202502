#!/usr/bin/env python3
"""
Decoy spectra generation pipeline
입력: .mgf 파일들
출력: .mgf 파일들 (decoy 스펙트라 포함)
"""

import argparse
import os
import sys
import subprocess

def main():
    parser = argparse.ArgumentParser(description='Decoy spectra generation')
    parser.add_argument('--input-dir', required=True, help='Input mgf file directory')
    parser.add_argument('--output-dir', required=True, help='Output directory')
    parser.add_argument('--precursor-tolerance', type=float, required=True, help='Precursor tolerance (ppm)')
    parser.add_argument('--memory', type=int, required=True, help='Memory usage (GB)')
    parser.add_argument('--random-seed', type=int, required=True, help='Random seed')
    
    args = parser.parse_args()
    
    # 입력 디렉토리 확인
    if not os.path.exists(args.input_dir):
        print(f"Error: Input directory {args.input_dir} does not exist")
        sys.exit(1)
    
    # 출력 디렉토리 생성
    os.makedirs(args.output_dir, exist_ok=True)
    
    # 현재 스크립트 디렉토리 경로
    script_dir = os.path.dirname(os.path.abspath(__file__))
    jar_file = os.path.join(script_dir, "PrecursorSwap.jar")
    
    # JAR 파일 존재 확인
    if not os.path.exists(jar_file):
        print(f"Error: JAR file {jar_file} does not exist")
        sys.exit(1)
    
    print(f"Starting Decoy spectra generation...")
    print(f"Input directory: {args.input_dir}")
    print(f"Output directory: {args.output_dir}")
    print(f"Precursor tolerance: {args.precursor_tolerance} ppm")
    print(f"Memory: {args.memory} GB")
    print(f"Random seed: {args.random_seed}")
    print(f"Working directory: {script_dir}")
    
    # Java 명령어 구성
    java_cmd = [
        "java",
        f"-Xmx{args.memory}G",
        "-jar",
        "PrecursorSwap.jar",  # 상대 경로로 변경
        "-i", args.input_dir,
        "-o", args.output_dir,
        "-d", str(int(args.precursor_tolerance)),
        "-r", str(args.random_seed)
    ]
    
    print(f"Executing: {' '.join(java_cmd)}")
    
    try:
        # JAR 파일이 있는 디렉토리로 이동하여 Java 명령어 실행
        result = subprocess.run(java_cmd, check=True, capture_output=True, text=True, cwd=script_dir)
        print("Decoy spectra generation completed successfully!")
        if result.stdout:
            print("Output:", result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error executing Java command: {e}")
        if e.stderr:
            print("Error output:", e.stderr)
        sys.exit(1)
    except FileNotFoundError:
        print("Error: Java is not installed or not in PATH")
        sys.exit(1)

if __name__ == "__main__":
    main() 