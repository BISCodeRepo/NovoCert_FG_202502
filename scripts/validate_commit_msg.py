#!/usr/bin/env python3
"""
커밋 메시지 형식 검증 스크립트
형식: "yj: [#이슈번호] 설명" 또는 "hw: [#이슈번호] 설명"
"""

import sys
import re
import os

def validate_commit_message(commit_msg):
    """커밋 메시지 형식을 검증합니다."""
    # 형식 패턴: "yj: [#숫자] 설명" 또는 "hw: [#숫자] 설명"
    pattern = r'^(yj|hw):\s*\[#\d+\]\s+.+'
    
    if not re.match(pattern, commit_msg.strip()):
        print("❌ 커밋 메시지 형식이 올바르지 않습니다!")
        print()
        print("올바른 형식: yj: [#이슈번호] 설명 또는 hw: [#이슈번호] 설명")
        print()
        print("예시:")
        print("  yj: [#3] 이슈 템플릿 자동화")
        print("  hw: [#5] 로그인 기능 추가")
        print("  yj: [#12] 버그 수정")
        print("  hw: [#8] 문서 업데이트")
        print()
        print(f"현재 커밋 메시지: {commit_msg.strip()}")
        return False
    
    print("✅ 커밋 메시지 형식이 올바릅니다!")
    return True

if __name__ == "__main__":
    # pre-commit에서 전달되는 인수 확인
    if len(sys.argv) < 2:
        print("사용법: python validate_commit_msg.py <커밋_메시지_파일>")
        sys.exit(1)
    
    commit_msg_file = sys.argv[1]
    
    try:
        # 파일을 읽기 전용으로 열어서 내용만 읽기
        with open(commit_msg_file, 'r', encoding='utf-8') as f:
            commit_msg = f.read().strip()
    except FileNotFoundError:
        print(f"오류: 파일을 찾을 수 없습니다: {commit_msg_file}")
        sys.exit(1)
    except Exception as e:
        print(f"오류: 파일을 읽을 수 없습니다: {e}")
        sys.exit(1)
    
    if not validate_commit_message(commit_msg):
        sys.exit(1) 