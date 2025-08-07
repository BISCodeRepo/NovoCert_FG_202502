from flask import Flask
from config import Config

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions
    from extensions import db
    db.init_app(app)
    
    # Register routes directly
    from app.routes import index
    app.add_url_rule('/', 'index', index)
    
    return app 