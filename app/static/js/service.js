// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOMContentLoaded event fired');
    
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
    
    // 초기 로드 시 decoy.js 로드 (현재 decoy.html이 로드되어 있음)
    console.log('Loading initial decoy.js');
    loadPipelineSpecificJS('decoy');
    
    // 초기 파라미터 적용 (decoy가 기본 단계)
    if (window.parameterManager) {
        console.log('Applying initial parameters for decoy...');
        // 파라미터 매니저가 준비될 때까지 잠시 대기
        setTimeout(() => {
            window.parameterManager.applyParametersToForm('decoy');
        }, 100);
    }
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
            
            // 파이프라인별 전용 JavaScript 로드
            loadPipelineSpecificJS(stepName);
            
            // 저장된 파라미터 적용
            if (window.parameterManager) {
                window.parameterManager.applyParametersToForm(stepName);
            }
        })
        .catch(error => {
            console.error('단계 콘텐츠 로드 중 오류 발생:', error);
        });
}

// 파이프라인별 전용 JavaScript 로드
function loadPipelineSpecificJS(stepName) {
    console.log(`Loading pipeline-specific JS for: ${stepName}`);
    
    // 기존 파이프라인별 스크립트 제거
    const existingScript = document.querySelector(`script[data-pipeline="${stepName}"]`);
    if (existingScript) {
        existingScript.remove();
        console.log(`Removed existing script for: ${stepName}`);
    }
    
    // 새로운 스크립트 로드
    const script = document.createElement('script');
    script.src = `/static/js/${stepName}.js`;
    script.setAttribute('data-pipeline', stepName);
    
    script.onload = function() {
        console.log(`Script loaded successfully: ${stepName}.js`);
        // 파이프라인별 초기화 함수 호출
        const initFunction = window[`setup${stepName.charAt(0).toUpperCase() + stepName.slice(1)}Form`];
        console.log(`Looking for init function: setup${stepName.charAt(0).toUpperCase() + stepName.slice(1)}Form`);
        console.log(`Init function found:`, initFunction);
        
        if (initFunction && typeof initFunction === 'function') {
            console.log(`Calling init function for: ${stepName}`);
            initFunction();
        } else {
            console.warn(`Init function not found for: ${stepName}`);
        }
    };
    
    script.onerror = function() {
        console.error(`Failed to load script: ${stepName}.js`);
    };
    
    console.log(`Adding script to DOM: ${script.src}`);
    document.head.appendChild(script);
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
    const startBtn = document.getElementById('start-btn');
    
    if (!startBtn) return;
    
    // 버튼을 항상 활성화
    startBtn.disabled = false;
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