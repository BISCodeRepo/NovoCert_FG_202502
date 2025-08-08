from flask import render_template, request, jsonify

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