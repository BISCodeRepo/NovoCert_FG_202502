from flask import render_template, request, jsonify
from app.controllers.decoy_controller import DecoyController
from app.controllers.parameter_controller import ParameterController

def index():
    return render_template('index.html')

def service():
    return render_template('service.html')

def get_step_content(step_name):
    """Get step content for AJAX requests"""
    try:
        return render_template(f'services/{step_name}.html')
    except:
        return "Step content not found", 404

def run_decoy_pipeline():
    """Decoy 파이프라인 실행"""
    controller = DecoyController()
    return controller.process_request()

def get_parameters():
    """파라미터 불러오기"""
    controller = ParameterController()
    return controller.process_get_request()

def save_parameters():
    """파라미터 저장하기"""
    controller = ParameterController()
    return controller.process_post_request() 