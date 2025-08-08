#!/usr/bin/env python3
"""
Decoy spectra generation controller
"""

import os
import subprocess
import json
from flask import request, jsonify, current_app
from app.services.decoy_service import DecoyService

class DecoyController:
    def __init__(self):
        # Service 초기화
        self.decoy_service = DecoyService()
        current_app.logger.info("DecoyController initialized with DecoyService")
    
    def validate_parameters(self, data):
        """데이터 타입 검증 (Controller 레벨)"""
        required_fields = ['input_dir', 'output_dir', 'precursor_tolerance', 'memory', 'random_seed']
        
        current_app.logger.info("Starting controller-level validation...")
        
        # 1. 필수 필드 검사
        for field in required_fields:
            if field not in data:
                current_app.logger.error(f"Missing field: {field}")
                return False, f"필수 필드가 누락되었습니다: {field}"
            if not data[field].strip():
                current_app.logger.error(f"Empty field: {field}")
                return False, f"필수 필드가 비어있습니다: {field}"
        
        current_app.logger.info("All required fields present")
        
        # 2. 데이터 타입 검증
        try:
            precursor_tolerance = float(data['precursor_tolerance'])
            memory = int(data['memory'])
            random_seed = int(data['random_seed'])
            current_app.logger.info(f"Data type validation passed: precursor_tolerance={precursor_tolerance}, memory={memory}, random_seed={random_seed}")
        except ValueError as e:
            current_app.logger.error(f"Invalid data types: {e}")
            return False, "숫자 필드에 잘못된 값이 입력되었습니다"
        
        current_app.logger.info("Controller validation passed")
        return True, "Controller validation passed"
    
    def run_pipeline(self, data):
        """Service를 통한 파이프라인 실행"""
        current_app.logger.info("Starting pipeline execution via Service...")
        
        # Service를 통한 파일 시스템 검증
        is_valid, message = self.decoy_service.validate_file_system(data)
        if not is_valid:
            current_app.logger.error(f"File system validation failed: {message}")
            return False, {
                'success': False,
                'message': message
            }
        
        # Service를 통한 비즈니스 규칙 검증
        is_valid, message = self.decoy_service.validate_business_rules(data)
        if not is_valid:
            current_app.logger.error(f"Business rules validation failed: {message}")
            return False, {
                'success': False,
                'message': message
            }
        
        # Service를 통한 파이프라인 실행
        return self.decoy_service.execute_pipeline(data)
    
    def process_request(self):
        """HTTP 요청 처리"""
        try:
            data = request.get_json()
            
            # 받은 파라미터 로깅
            current_app.logger.info("=== Decoy Pipeline Request ===")
            current_app.logger.info(f"Received data: {data}")
            current_app.logger.info(f"Input directory: {data.get('input_dir', 'N/A')}")
            current_app.logger.info(f"Output directory: {data.get('output_dir', 'N/A')}")
            current_app.logger.info(f"Precursor tolerance: {data.get('precursor_tolerance', 'N/A')}")
            current_app.logger.info(f"Memory: {data.get('memory', 'N/A')}")
            current_app.logger.info(f"Random seed: {data.get('random_seed', 'N/A')}")
            current_app.logger.info("===============================")
            
            # 유효성 검사
            is_valid, message = self.validate_parameters(data)
            if not is_valid:
                current_app.logger.error(f"Validation failed: {message}")
                return jsonify({
                    'success': False,
                    'message': message
                }), 400
            
            current_app.logger.info("Validation passed, starting pipeline...")
            
            # 파이프라인 실행
            success, result = self.run_pipeline(data)
            
            if success:
                current_app.logger.info("Pipeline completed successfully")
                return jsonify(result), 200
            else:
                current_app.logger.error(f"Pipeline failed: {result.get('error', 'Unknown error')}")
                return jsonify(result), 500
                
        except Exception as e:
            current_app.logger.error(f"Unexpected error in process_request: {str(e)}")
            return jsonify({
                'success': False,
                'message': 'Invalid request format',
                'error': str(e)
            }), 400 