# Assumes flask server already running at 127.0.0.1:5000
import requests
import json
import pytest
import os
import subprocess

def example_post():
    data = {'game': 1, 'score': 10, 'level': 5, 'gametime': 283}

    json_data = json.dumps(data)

    response = requests.post("http://127.0.0.1:5000/hiscores/submit", headers = {'Content-Type': "application/json"}, data = json_data)

    assert response.status_code == 200
    return

example_post()
