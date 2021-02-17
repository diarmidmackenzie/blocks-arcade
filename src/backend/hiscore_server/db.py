import sqlite3

import click
from flask import current_app, g
from flask.cli import with_appcontext


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(
            current_app.config['DATABASE'],
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row

    return g.db


def close_db(e=None):
    db = g.pop('db', None)

    if db is not None:
        db.close()

def init_db():
    db = get_db()

    with current_app.open_resource('db-schema.sql') as f:
        db.executescript(f.read().decode('utf8'))


@click.command('init-db')
@with_appcontext
def init_db_command():
    """Clear the existing data and create new tables."""
    init_db()
    click.echo('Initialized the database.')

def init_app(app):
    app.teardown_appcontext(close_db)
    app.cli.add_command(init_db_command)

# db is the SQL DATABASE
# game_id is the numerical id for the game mode played.
# time_played is the timestamp at which the game was finished.
# score is the points scored
# level is the level reached
# gametime is the duration of the game (in seconds).
def db_add_row(game_id, score, level, gametime):
    # Note that row_index & creation timestamp can be left as default
    # The SQL DB will set them correctly.

    values = (game_id, score, level, gametime)
    sql_command = """INSERT INTO SCORES
                     (game_id, score, level, gametime)
                     VALUES (?, ?, ?, ?);"""
    db = get_db()
    db.execute(sql_command, values)
    db.commit()

    return

# timefarme string: set to "1" for today, "30" for this month,
# "CURRENT_TIMESTAMP" for all time.
def db_get_hiscore_data(game_id, timeframe_string, count):
  db = get_db()
  cursor = db.cursor()

  # Count total number of games in the timeframe
  values = (game_id, )
  query = """SELECT COUNT(time_stamp) FROM scores
             WHERE game_id = ? AND
             time_stamp > %s;""" % timeframe_string
  cursor.execute(query, values)
  row = cursor.fetchone()
  print(row.keys())
  plays = row['COUNT(time_stamp)']
  print("Plays: {}".format(plays))

  # Now find the hi scores.
  values = (game_id, count)
  hiscores = []
  query = """SELECT * FROM scores
             WHERE game_id = ? AND
             time_stamp > %s
             ORDER BY score DESC, gametime DESC
             LIMIT ?;""" % timeframe_string
  cursor.execute(query, values)
  rows = cursor.fetchall()
  print(len(rows))

  print("Rows: {}".format(len(rows)))
  for row in rows:

      hiscore = {'score': row['score'],
                 'level': row['level'],
                 'gametime': row['gametime']}
      hiscores.append(hiscore)

  return (plays, hiscores)
