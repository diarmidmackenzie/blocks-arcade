# Some basic smoke tests so far for the Hi Scores HTTP API.
# Lots missing including negative testcases (e.g. illegal parameters)
# Some design work needed to think how best to structure as we add more test cases...
# To run:
# In tetrisland/src/backend/test directory.
# Run: python -m pytest test_hiscore_server.py

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

def example_get():
    response = requests.get("http://127.0.0.1:5000/hiscores/list?game=1")

    assert response.status_code == 200
    json_text = response.text
    dict = json.loads(json_text)
    plays = dict['plays']
    hiscores = dict['hiscores']

    assert plays == 1
    return


def initialize_environment():
    # Initialize (clear) database (flask server started separately)
    os.putenv('FLASK_APP', "hiscore_server")
    # Flask server must be run from "backend" directory, one level up from "test".
    os.chdir("..")
    subprocess.run(['python', '-m', 'flask', 'init-db'])

    # Now start flask process.
    flask_process = subprocess.Popen(['python', '-m', 'flask', 'run'])

    # Move back to "test" directory, so that we are in the same state that
    # we started in.
    os.chdir("test")

    return flask_process

def test_1():
    flask_process = initialize_environment()
    example_post()
    example_get()
    flask_process.terminate()
