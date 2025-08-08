// Decoy 파이프라인 폼 제출
function submitDecoyForm() {
    
    const formData = {
        input_dir: document.getElementById('input-dir').value.trim(),
        output_dir: document.getElementById('output-dir').value.trim(),
        precursor_tolerance: document.getElementById('precursor-tolerance').value.trim(),
        memory: document.getElementById('memory').value.trim(),
        random_seed: document.getElementById('random-seed').value.trim()
    };
        
    // 상세한 유효성 검사
    const validationResult = validateDecoyForm(formData);
    
    if (!validationResult.isValid) {
        alert(`입력 오류:\n${validationResult.errors.join('\n')}`);
        return;
    }
    
    
    // 버튼 비활성화
    const startBtn = document.getElementById('start-btn');
    startBtn.disabled = true;
    startBtn.textContent = 'Running...';
    
    // 파라미터 자동 저장
    if (window.parameterManager) {
        window.parameterManager.saveFormParameters('decoy');
    }
    
    // API 호출
    fetch('/api/decoy/run', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Decoy spectra generation completed successfully!');
            console.log('Output:', data.output);
        } else {
            // Java 버전 오류 특별 처리
            if (data.java_version_error) {
                alert(`🚨 Java 버전 호환성 문제\n\n${data.message}\n\n${data.error}`);
            } else {
                alert(`Error: ${data.message}`);
                if (data.error) {
                    console.error('Error details:', data.error);
                }
            }
        }
    })
    .catch(error => {
        alert('An error occurred while running the pipeline.');
    })
    .finally(() => {
        // 버튼 복원
        startBtn.disabled = false;
        startBtn.textContent = 'Start';
    });
}

// Decoy 폼 유효성 검사 (상세한 오류 메시지 반환)
function validateDecoyForm(formData) {
    
    const errors = [];
    const requiredFields = [
        { name: 'input_dir', display: '입력 디렉토리' },
        { name: 'output_dir', display: '출력 디렉토리' },
        { name: 'precursor_tolerance', display: 'Precursor tolerance' },
        { name: 'memory', display: 'Memory' },
        { name: 'random_seed', display: 'Random seed' }
    ];
    
    // 1. 필수 필드 검사
    for (const field of requiredFields) {
        if (!formData[field.name] || formData[field.name] === '') {
            errors.push(`• ${field.display}을(를) 입력해주세요.`);
        }
    }
    
    // 2. 숫자 필드 검증
    const numericFields = [
        { name: 'precursor_tolerance', display: 'Precursor tolerance' },
        { name: 'memory', display: 'Memory' },
        { name: 'random_seed', display: 'Random seed' }
    ];
    
    for (const field of numericFields) {
        if (formData[field.name] && isNaN(parseFloat(formData[field.name]))) {
            errors.push(`• ${field.display}은(는) 숫자여야 합니다.`);
        }
    }
    
    const result = {
        isValid: errors.length === 0,
        errors: errors
    };
    
    return result;
}

// Decoy 폼 이벤트 리스너 설정
function setupDecoyForm() {
    const startBtn = document.getElementById('start-btn');
    
    if (startBtn) {
        startBtn.addEventListener('click', submitDecoyForm);
        // 버튼을 항상 활성화
        startBtn.disabled = false;
    } else {
        console.error('Start button not found!');
    }
}