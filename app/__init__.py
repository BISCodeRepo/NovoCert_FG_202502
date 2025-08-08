from flask import Flask
from config import Config

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    from extensions import db
    db.init_app(app)
    
    from app.routes import index, service, get_step_content
    app.add_url_rule('/', 'index', index)
    app.add_url_rule('/service', 'service', service)
    app.add_url_rule('/api/step/<step_name>', 'get_step_content', get_step_content)
    
    return app 