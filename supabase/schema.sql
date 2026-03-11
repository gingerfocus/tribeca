DROP TABLE IF EXISTS results, athletes, races;

CREATE TABLE races (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,          -- "Aggieathlon 2025"
  date DATE,
  type TEXT,                   -- "Sprint", "Olympic", etc.
  location TEXT
);

CREATE TABLE athletes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  team TEXT,                   -- "Santa Clara University", etc.
  city TEXT,
  gender TEXT
);

CREATE TABLE results (
  result_id SERIAL PRIMARY KEY,
  race_id INT REFERENCES races(id),
  athlete_id INT REFERENCES athletes(id),
  age_at_race INT,
  bib INT,
  swim INTERVAL,
  t1 INTERVAL,
  bike INTERVAL,
  t2 INTERVAL,
  run INTERVAL,
  chip_elapsed INTERVAL,
  overall_rank INT,
  UNIQUE(race_id, bib)         -- your composite key from earlier
);
