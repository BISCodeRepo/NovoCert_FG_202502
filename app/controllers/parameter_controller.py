import os
import json
from flask import request, jsonify, current_app


class ParameterController:
    """파라미터 관리 컨트롤러"""
    
    def __init__(self):
        # 현재 파일 위치: app/controllers/parameter_controller.py
        # 프로젝트 루트로 이동: app/controllers/ -> app/ -> 프로젝트 루트
        current_dir = os.path.dirname(__file__)  # app/controllers/
        app_dir = os.path.dirname(current_dir)    # app/
        project_root = os.path.dirname(app_dir)   # 프로젝트 루트
        self.config_dir = os.path.join(project_root, 'pipelines', 'config')
        self.paths_file = os.path.join(self.config_dir, 'paths.json')
        
        # config 디렉토리가 없으면 생성
        os.makedirs(self.config_dir, exist_ok=True)
        
        # JSON 파일이 없으면 기본 구조 생성
        if not os.path.exists(self.paths_file):
            self._create_default_config()
        
        current_app.logger.info(f"ParameterController initialized")
        current_app.logger.info(f"Config file: {self.paths_file}")
    
    def _create_default_config(self):
        """기본 설정 파일 생성"""
        default_config = {
            "decoy": {},
            "denovo": {},
            "fdr": {},
            "percolator": {},
            "pif": {},
            "post": {},
            "sa": {}
        }
        
        with open(self.paths_file, 'w', encoding='utf-8') as f:
            json.dump(default_config, f, indent=2, ensure_ascii=False)
        
        current_app.logger.info(f"Created default config file: {self.paths_file}")
    
    def load_parameters(self, step_name):
        """특정 단계의 파라미터 불러오기"""
        try:
            with open(self.paths_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            parameters = config.get(step_name, {})
            current_app.logger.info(f"Loaded parameters for {step_name}: {parameters}")
            
            return True, parameters
            
        except Exception as e:
            current_app.logger.error(f"Error loading parameters for {step_name}: {e}")
            return False, {}
    
    def save_parameters(self, step_name, parameters):
        """특정 단계의 파라미터 저장하기"""
        try:
            # 기존 설정 불러오기
            with open(self.paths_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # 해당 단계 파라미터 업데이트
            config[step_name] = parameters
            
            # 파일에 저장
            with open(self.paths_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            
            current_app.logger.info(f"Saved parameters for {step_name}: {parameters}")
            return True, "Parameters saved successfully"
            
        except Exception as e:
            current_app.logger.error(f"Error saving parameters for {step_name}: {e}")
            return False, f"Error saving parameters: {str(e)}"
    
    def get_all_parameters(self):
        """모든 단계의 파라미터 불러오기"""
        try:
            with open(self.paths_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            current_app.logger.info(f"Loaded all parameters: {config}")
            return True, config
            
        except Exception as e:
            current_app.logger.error(f"Error loading all parameters: {e}")
            return False, {}
    
    def process_get_request(self):
        """GET 요청 처리 - 모든 파라미터 반환"""
        try:
            success, parameters = self.get_all_parameters()
            
            if success:
                return jsonify({
                    'success': True,
                    'parameters': parameters
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'message': 'Failed to load parameters'
                }), 500
                
        except Exception as e:
            current_app.logger.error(f"Error in GET request: {e}")
            return jsonify({
                'success': False,
                'message': 'Invalid request'
            }), 400
    
    def process_post_request(self):
        """POST 요청 처리 - 파라미터 저장"""
        try:
            data = request.get_json()
            
            if not data or 'step_name' not in data or 'parameters' not in data:
                return jsonify({
                    'success': False,
                    'message': 'Missing step_name or parameters'
                }), 400
            
            step_name = data['step_name']
            parameters = data['parameters']
            
            current_app.logger.info(f"Saving parameters for {step_name}: {parameters}")
            
            success, message = self.save_parameters(step_name, parameters)
            
            if success:
                return jsonify({
                    'success': True,
                    'message': message
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'message': message
                }), 500
                
        except Exception as e:
            current_app.logger.error(f"Error in POST request: {e}")
            return jsonify({
                'success': False,
                'message': 'Invalid request format'
            }), 400 