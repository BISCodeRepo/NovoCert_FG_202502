from flask import Flask
from config import Config
import logging

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # 로깅 설정
    if app.debug:
        app.logger.setLevel(logging.INFO)
        # 콘솔 핸들러 추가
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        console_handler.setFormatter(formatter)
        app.logger.addHandler(console_handler)
    
    from extensions import db
    db.init_app(app)
    
    from app.routes import index, service, get_step_content, run_decoy_pipeline, get_parameters, save_parameters
    app.add_url_rule('/', 'index', index)
    app.add_url_rule('/service', 'service', service)
    app.add_url_rule('/api/step/<step_name>', 'get_step_content', get_step_content)
    app.add_url_rule('/api/decoy/run', 'run_decoy_pipeline', run_decoy_pipeline, methods=['POST'])
    app.add_url_rule('/api/parameters', 'get_parameters', get_parameters, methods=['GET'])
    app.add_url_rule('/api/parameters', 'save_parameters', save_parameters, methods=['POST'])
    
    return app 