import os
from flask import current_app


class DecoyService:
    """Decoy 파이프라인 서비스 클래스"""
    
    def __init__(self):
        # 현재 파일 위치: app/services/decoy_service.py
        # 프로젝트 루트로 이동: app/services/ -> app/ -> 프로젝트 루트
        current_dir = os.path.dirname(__file__)  # app/services/
        app_dir = os.path.dirname(current_dir)    # app/
        project_root = os.path.dirname(app_dir)   # 프로젝트 루트
        self.pipeline_path = os.path.join(project_root, 'pipelines', 'decoy')
        
        current_app.logger.info(f"DecoyService initialized")
        current_app.logger.info(f"Pipeline path: {self.pipeline_path}")
    
    def validate_file_system(self, data):
        """파일 시스템 관련 검증"""
        current_app.logger.info("Starting file system validation...")
        
        # 1. 입력 디렉토리 존재 확인
        if not os.path.exists(data['input_dir']):
            current_app.logger.error(f"Input directory does not exist: {data['input_dir']}")
            return False, f"입력 디렉토리가 존재하지 않습니다: {data['input_dir']}"
        
        # 2. 입력 디렉토리가 실제 디렉토리인지 확인
        if not os.path.isdir(data['input_dir']):
            current_app.logger.error(f"Input path is not a directory: {data['input_dir']}")
            return False, f"입력 경로가 디렉토리가 아닙니다: {data['input_dir']}"
        
        # 3. 출력 디렉토리 생성 가능한지 확인
        output_dir = data['output_dir']
        output_parent = os.path.dirname(output_dir)
        
        if output_parent and not os.path.exists(output_parent):
            current_app.logger.error(f"Output parent directory does not exist: {output_parent}")
            return False, f"출력 디렉토리의 상위 경로가 존재하지 않습니다: {output_parent}"
        
        # 4. 파이프라인 스크립트 존재 확인
        run_script_path = os.path.join(self.pipeline_path, 'run.py')
        if not os.path.exists(run_script_path):
            current_app.logger.error(f"Pipeline script does not exist: {run_script_path}")
            return False, f"파이프라인 스크립트가 존재하지 않습니다: {run_script_path}"
        
        # 5. JAR 파일 존재 확인
        jar_path = os.path.join(self.pipeline_path, 'PrecursorSwap.jar')
        if not os.path.exists(jar_path):
            current_app.logger.error(f"JAR file does not exist: {jar_path}")
            return False, f"JAR 파일이 존재하지 않습니다: {jar_path}"
        
        # 6. unimod.csv 파일 존재 확인
        csv_path = os.path.join(self.pipeline_path, 'unimod.csv')
        if not os.path.exists(csv_path):
            current_app.logger.error(f"unimod.csv does not exist: {csv_path}")
            return False, f"unimod.csv 파일이 존재하지 않습니다: {csv_path}"
        
        current_app.logger.info("File system validation passed")
        return True, "File system validation passed"
    
    def validate_business_rules(self, data):
        """비즈니스 규칙 검증"""
        current_app.logger.info("Starting business rules validation...")
        
        # 1. precursor_tolerance 범위 검증 (0.1 ~ 1000 ppm)
        precursor_tolerance = float(data['precursor_tolerance'])
        if precursor_tolerance < 0.1 or precursor_tolerance > 1000:
            current_app.logger.error(f"Precursor tolerance out of range: {precursor_tolerance}")
            return False, f"Precursor tolerance는 0.1 ~ 1000 ppm 범위여야 합니다. 현재값: {precursor_tolerance}"
        
        # 2. memory 범위 검증 (1 ~ 64 GB)
        memory = int(data['memory'])
        if memory < 1 or memory > 64:
            current_app.logger.error(f"Memory out of range: {memory}")
            return False, f"Memory는 1 ~ 64 GB 범위여야 합니다. 현재값: {memory}"
        
        # 3. random_seed 범위 검증 (1 ~ 999999)
        random_seed = int(data['random_seed'])
        if random_seed < 1 or random_seed > 999999:
            current_app.logger.error(f"Random seed out of range: {random_seed}")
            return False, f"Random seed는 1 ~ 999999 범위여야 합니다. 현재값: {random_seed}"
        
        current_app.logger.info("Business rules validation passed")
        return True, "Business rules validation passed"
    
    def execute_pipeline(self, data):
        """파이프라인 실행"""
        try:
            # 출력 디렉토리 생성
            os.makedirs(data['output_dir'], exist_ok=True)
            
            # 실행할 명령어 구성
            run_script_path = os.path.join(self.pipeline_path, 'run.py')
            current_app.logger.info(f"Executing pipeline: {run_script_path}")
            
            import subprocess
            cmd = [
                'python',
                run_script_path,
                '--input-dir', data['input_dir'],
                '--output-dir', data['output_dir'],
                '--precursor-tolerance', str(data['precursor_tolerance']),
                '--memory', str(data['memory']),
                '--random-seed', str(data['random_seed'])
            ]
            
            current_app.logger.info(f"Command: {' '.join(cmd)}")
            
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            
            current_app.logger.info(f"Pipeline stdout: {result.stdout}")
            current_app.logger.info(f"Pipeline stderr: {result.stderr}")
            
            return True, {
                'success': True,
                'message': 'Decoy spectra generation completed successfully',
                'output': result.stdout
            }
            
        except subprocess.CalledProcessError as e:
            current_app.logger.error(f"Pipeline execution failed: {e}")
            current_app.logger.error(f"Pipeline stderr: {e.stderr}")
            
            # Java 버전 오류 감지
            error_message = e.stderr if e.stderr else str(e)
            if "UnsupportedClassVersionError" in error_message or "class file version" in error_message:
                return False, {
                    'success': False,
                    'message': 'Java 버전 호환성 문제가 발생했습니다.',
                    'error': 'PrecursorSwap.jar가 Java 18 이상으로 컴파일되었습니다. Java 21을 설치해주세요.\n\n설치 방법:\n1. Homebrew로 설치: brew install openjdk@21\n2. 환경변수 설정: export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"\n3. ~/.zshrc에 추가하여 영구 설정',
                    'java_version_error': True
                }
            
            return False, {
                'success': False,
                'message': 'Pipeline execution failed',
                'error': e.stderr
            }
        except Exception as e:
            current_app.logger.error(f"Unexpected error in pipeline: {e}")
            import traceback
            current_app.logger.error(f"Traceback: {traceback.format_exc()}")
            return False, {
                'success': False,
                'message': 'Unexpected error',
                'error': str(e)
            } 