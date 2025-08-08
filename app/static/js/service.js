// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    const stepItems = document.querySelectorAll('.step-item');
    const pipelineContent = document.getElementById('pipeline-content');
    
    // 각 단계 아이템에 클릭 이벤트 리스너 추가
    stepItems.forEach(item => {
        item.addEventListener('click', function() {
            // 모든 아이템에서 active 클래스 제거
            stepItems.forEach(step => step.classList.remove('active'));
            // 클릭된 아이템에 active 클래스 추가
            this.classList.add('active');
            
            // 해당 단계의 콘텐츠 로드
            const stepName = this.getAttribute('data-step');
            loadStepContent(stepName);
        });
    });
    
    // 초기 폼 유효성 검사
    validateForm();
});

// AJAX를 통해 단계별 콘텐츠를 동적으로 로드
function loadStepContent(stepName) {
    const contentUrl = `/api/step/${stepName}`;
    
    fetch(contentUrl)
        .then(response => response.text())
        .then(html => {
            // 파이프라인 콘텐츠 영역에 HTML 삽입
            document.getElementById('pipeline-content').innerHTML = html;
            
            // 새로 로드된 콘텐츠에 이벤트 리스너 재연결
            attachFormListeners();
            validateForm();
        })
        .catch(error => {
            console.error('단계 콘텐츠 로드 중 오류 발생:', error);
        });
}

// 디렉토리 선택 기능
function selectDirectory(inputId) {
    // 숨겨진 파일 입력 요소 생성
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.webkitdirectory = true; // 디렉토리 선택 허용
    fileInput.style.display = 'none';
    
    // 파일 선택 이벤트 리스너 추가
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            // 첫 번째 파일에서 디렉토리 경로 추출
            const filePath = e.target.files[0].webkitRelativePath;
            const directoryPath = filePath.split('/')[0];
            
            // 입력 필드에 디렉토리 경로 업데이트
            document.getElementById(inputId).value = directoryPath;
            validateForm();
        }
    });
    
    // 파일 다이얼로그 트리거
    document.body.appendChild(fileInput);
    fileInput.click();
    
    // 정리 작업
    setTimeout(() => {
        document.body.removeChild(fileInput);
    }, 1000);
}

// 파일 선택 기능
function selectFile(inputId) {
    // 숨겨진 파일 입력 요소 생성
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
    
    // 파일 선택 이벤트 리스너 추가
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            // 파일 경로 가져오기
            const filePath = e.target.files[0].name;
            
            // 입력 필드에 파일 경로 업데이트
            document.getElementById(inputId).value = filePath;
            validateForm();
        }
    });
    
    // 파일 다이얼로그 트리거
    document.body.appendChild(fileInput);
    fileInput.click();
    
    // 정리 작업
    setTimeout(() => {
        document.body.removeChild(fileInput);
    }, 1000);
}

// 폼 유효성 검사 - 모든 필수 필드가 채워졌는지 확인
function validateForm() {
    const inputDir = document.getElementById('input-dir')?.value.trim();
    const outputDir = document.getElementById('output-dir')?.value.trim();
    const startBtn = document.getElementById('start-btn');
    
    if (!startBtn) return;
    
    // 현재 폼의 모든 입력 필드 가져오기
    const inputFields = document.querySelectorAll('.input-form input[type="text"], .input-form select');
    let allFieldsFilled = true;
    
    // 각 필드가 비어있지 않은지 확인
    inputFields.forEach(field => {
        if (field.value.trim() === '') {
            allFieldsFilled = false;
        }
    });
    
    // 모든 필수 필드가 채워졌는지 확인하고 시작 버튼 활성화/비활성화
    if (allFieldsFilled) {
        startBtn.disabled = false;
    } else {
        startBtn.disabled = true;
    }
}

// 동적으로 로드된 콘텐츠에 이벤트 리스너 연결
function attachFormListeners() {
    const inputFields = document.querySelectorAll('.input-form input[type="text"], .input-form select');
    
    // 각 입력 필드에 입력 및 변경 이벤트 리스너 추가
    inputFields.forEach(field => {
        field.addEventListener('input', validateForm);
        field.addEventListener('change', validateForm);
    });
} 