-- Stories table for Practice Empathy Needs Database.
-- From: https://flask.palletsprojects.com/en/1.1.x/tutorial/database/

DROP TABLE IF EXISTS scores;

-- Main stories table: tracks needs recorded against each story
-- Notes:
-- AUTO_INCREMENT not needed, per notes here: https://sqlite.org/autoinc.html
CREATE TABLE scores (
  row_index INTEGER PRIMARY KEY,
  game_id VARCHAR(20) NOT NULL,
  time_stamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  score INTEGER CHECK (score >= 0),
  level INTEGER CHECK (level >= 0),
  gametime INTEGER CHECK (gametime >= 0),
  vr INTEGER CHECK (vr >= 0),
  playername VARCHAR(20),
  platformname VARCHAR(20),
  spare1 INTEGER,
  spare2 INTEGER,
  spare3 INTEGER,
  spare4 VARCHAR(20)
);

-- Index used to accelerate searches for needs recorded against a particular game.
CREATE INDEX idx_game_index
ON scores (game_id);

-- Index used to accelerate searches based on time played.
CREATE INDEX idx_time_stamp
ON scores (time_stamp);
