DROP TABLE IF EXISTS results, athletes, races;

CREATE TABLE races (
  id SERIAL PRIMARY KEY,
  race_name TEXT NOT NULL,               -- "Aggieathlon 2025"
  race_type TEXT NOT NULL,               -- "Sprint", "Olympic", etc.
  race_location TEXT,
  race_date DATE,
  meters_swim INT,
  meters_bike INT,
  meters_run  INT
);

CREATE TABLE athletes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  team TEXT,                   -- "Santa Clara University", etc.
  city TEXT,
  gender TEXT
);

CREATE TABLE results (
  result_id         SERIAL PRIMARY KEY,
  race_id           INT REFERENCES races(id),
  athlete_id        INT REFERENCES athletes(id),
  athlete_bib       INT NOT NULL,
  athlete_division  TEXT NOT NULL,                -- 'Collegiate', 'Draft Legal', 'Age Group'
  athlete_age       INT,

  time_swim INTERVAL,
  rank_swim INT,
  time_t1   INTERVAL,
  rank_t1   INT,
  time_bike INTERVAL,
  rank_bike INT,
  time_t2   INTERVAL,
  rank_t2   INT,
  time_run  INTERVAL,
  rank_run  INT,

  time_chip INTERVAL,          -- If null then DNF
  rank_chip INT,

  UNIQUE(race_id, bib)         -- composite key 
);

