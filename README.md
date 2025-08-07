# NovoCert_FG_202502

## 작성자 정보
- **이름**: Youngjin Noh (노영진)
- **학번**: 2021097474
- **소속**: Hanyang University
- **전공**: Computer Science

## 기술 스택
- **Backend**: Flask (Python)
- **Frontend**: HTML, CSS, JavaScript
- **패키지 관리**: uv
- **아키텍처**: Factory Pattern + MVC

## 프로젝트 구조
```
NovoCertProject/
├── app/
│   ├── __init__.py          # 앱 팩토리
│   ├── routes.py            # 라우트 정의
│   ├── models/              # MVC Model
│   ├── controllers/         # MVC Controller
│   ├── templates/
│   │   └── index.html       # HTML 템플릿
│   └── static/              # 정적 파일들
│       ├── css/
│       │   └── style.css    # 메인 스타일
│       ├── js/
│       │   └── main.js      # 메인 스크립트
│       └── images/          # 이미지 파일들
├── config.py                # 설정 관리
├── extensions.py            # Flask 확장
├── pyproject.toml          # uv 의존성 관리
└── run.py                  # 실행 파일
```

## 설치 및 실행 방법

### 1. 프로젝트 클론
```bash
git clone https://github.com/BISCodeRepo/NovoCert_FG_202502.git
cd NovoCert_FG_202502
```

### 2. uv 설치 (macOS)
```bash
# Homebrew를 사용한 설치
brew install uv
```

### 3. 의존성 설치 및 가상환경 생성
```bash
# 프로젝트 초기화 (처음 한 번만)
uv init

# 의존성 설치 및 가상환경 생성
uv sync
```

### 4. 애플리케이션 실행
```bash
# 개발 모드로 실행
uv run python run.py
```

### 5. 브라우저에서 확인
웹 브라우저에서 `http://localhost:5000`으로 접속하여 애플리케이션을 확인할 수 있습니다.