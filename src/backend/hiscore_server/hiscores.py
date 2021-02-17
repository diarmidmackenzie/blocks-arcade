import functools
import time
import json
from flask import (
    Blueprint, request
)
from hiscore_server.db import (get_db, db_add_row, db_get_hiscore_data)

bp = Blueprint('hiscores', __name__, url_prefix='/hiscores')

@bp.route('/')
def hello_world():
    return 'Hello, this is the Hi Scores Server!'

@bp.route('/list')
def hiscores_list():
# Request of form: /scores?game=1&count=5
    print("GET: /list")
    game = request.args.get('game')
    count = request.args.get('count')

    try:
        # game ID is an arbitrary string - no checks.
        assert(int(count) >= 0)
        pass
    except:
        # Invalid or missing parameter
        print("Invalid parameters: " + game + ", " + count)
        return("{}")

    last_day = hiscore_data(game, "DATETIME('now','-1 day')", count)
    last_month = hiscore_data(game, "DATETIME('now','-30 day')", count)
    all_time = hiscore_data(game, "0", count)

    dictionary = {'today': last_day,
                  'month': last_month,
                  'alltime': all_time}

    json_text = json.dumps(dictionary)

    return (json_text)

def hiscore_data(game, timeframe_string, count):
    (plays, hiscores) = db_get_hiscore_data(game, timeframe_string, count)
    dictionary = {'plays': plays, 'hiscores': hiscores}
    return (dictionary)

@bp.route('/submit', methods = ['GET', 'POST'])
def needs_submission():
    print("GET or POST: /submit")
    if request.method == 'POST':
        print("POST: /submit")
        json_data = request.json
        text = process_submission(json_data)
        return text

# JSON to process should be of the following form.
# {
#      "game": 1,
#      "score": 10,
#      "level": 5,
#      "gametime": 283,
# }

def process_submission(data):
    print(data)
    game = data['game']
    score = data['score']
    level = data['level']
    gametime = data['gametime']
    vr = data['vr']

    # Run some checks on the data.

    try:
        assert(int(score) >= 0)
        assert(int(level) > 0)
        assert(int(gametime) > 0)
        assert(int(vr) >= 0)
    except:
        print ("Invalid JSON data")
        return False

    db_add_row(game, score, level, gametime, vr)

    text = "OK"
    return text
