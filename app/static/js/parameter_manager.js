// 파라미터 관리자
class ParameterManager {
    constructor() {
        this.parameters = {};
        this.currentStep = null;
    }
    
    // 모든 파라미터 불러오기
    async loadAllParameters() {
        try {
            const response = await fetch('/api/parameters');
            const data = await response.json();
            
            if (data.success) {
                this.parameters = data.parameters;
                console.log('Loaded parameters:', this.parameters);
                return this.parameters;
            } else {
                console.error('Failed to load parameters:', data.message);
                return {};
            }
        } catch (error) {
            console.error('Error loading parameters:', error);
            return {};
        }
    }
    
    // 특정 단계의 파라미터 불러오기
    getStepParameters(stepName) {
        return this.parameters[stepName] || {};
    }
    
    // 특정 단계의 파라미터 저장하기
    async saveStepParameters(stepName, parameters) {
        try {
            const response = await fetch('/api/parameters', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    step_name: stepName,
                    parameters: parameters
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // 로컬 캐시 업데이트
                this.parameters[stepName] = parameters;
                console.log(`Saved parameters for ${stepName}:`, parameters);
                return true;
            } else {
                console.error('Failed to save parameters:', data.message);
                return false;
            }
        } catch (error) {
            console.error('Error saving parameters:', error);
            return false;
        }
    }
    
    // 폼 필드에 파라미터 적용하기
    applyParametersToForm(stepName) {
        const stepParameters = this.getStepParameters(stepName);
        
        if (Object.keys(stepParameters).length === 0) {
            console.log(`No saved parameters for ${stepName}`);
            return;
        }
        
        console.log(`Applying parameters for ${stepName}:`, stepParameters);
        
        // 각 파라미터를 해당 입력 필드에 적용
        Object.keys(stepParameters).forEach(paramName => {
            const inputId = this.getInputIdForParameter(paramName);
            const inputElement = document.getElementById(inputId);
            
            if (inputElement) {
                inputElement.value = stepParameters[paramName];
                console.log(`Applied ${paramName} = ${stepParameters[paramName]} to ${inputId}`);
            } else {
                console.warn(`Input field not found: ${inputId}`);
            }
        });
    }
    
    // 파라미터 이름을 입력 필드 ID로 변환
    getInputIdForParameter(paramName) {
        // 파라미터 이름을 입력 필드 ID로 매핑
        const paramMapping = {
            'input_dir': 'input-dir',
            'output_dir': 'output-dir',
            'precursor_tolerance': 'precursor-tolerance',
            'memory': 'memory',
            'random_seed': 'random-seed'
        };
        
        return paramMapping[paramName] || paramName;
    }
    
    // 입력 필드 ID를 파라미터 이름으로 변환
    getParameterNameForInputId(inputId) {
        // 입력 필드 ID를 파라미터 이름으로 매핑
        const inputMapping = {
            'input-dir': 'input_dir',
            'output-dir': 'output_dir',
            'precursor-tolerance': 'precursor_tolerance',
            'memory': 'memory',
            'random-seed': 'random_seed'
        };
        
        return inputMapping[inputId] || inputId;
    }
    
    // 현재 폼의 파라미터 수집하기
    collectFormParameters(stepName) {
        const parameters = {};
        
        // 해당 단계의 모든 입력 필드 수집
        const inputFields = document.querySelectorAll('input[type="text"], input[type="number"]');
        
        inputFields.forEach(input => {
            const paramName = this.getParameterNameForInputId(input.id);
            if (paramName && input.value.trim()) {
                parameters[paramName] = input.value.trim();
            }
        });
        
        console.log(`Collected parameters for ${stepName}:`, parameters);
        return parameters;
    }
    
    // 폼 제출 시 파라미터 자동 저장
    async saveFormParameters(stepName) {
        const parameters = this.collectFormParameters(stepName);
        
        if (Object.keys(parameters).length > 0) {
            const success = await this.saveStepParameters(stepName, parameters);
            if (success) {
                console.log(`Auto-saved parameters for ${stepName}`);
            }
        }
    }
}

// 전역 파라미터 매니저 인스턴스
window.parameterManager = new ParameterManager();

// 페이지 로드 시 파라미터 불러오기 및 초기 적용
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Loading parameters on page load...');
    await window.parameterManager.loadAllParameters();
    
    // 서비스 페이지인 경우 초기 파라미터 적용
    if (window.location.pathname === '/service') {
        console.log('Service page detected, applying initial parameters for decoy...');
        // DOM이 완전히 로드된 후 파라미터 적용
        setTimeout(() => {
            window.parameterManager.applyParametersToForm('decoy');
        }, 200);
    }
}); 