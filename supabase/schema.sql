-- Person ID Mapping Table
DROP TABLE IF EXISTS person_ids;

CREATE TABLE person_ids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- external_id VARCHAR(50) NOT NULL UNIQUE,  -- Bib number or other external ID
  name VARCHAR(255) NOT NULL,
  team_name VARCHAR(255),
  city VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE person_ids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON person_ids FOR SELECT USING (true);
CREATE POLICY "Deny public insert" ON person_ids FOR INSERT WITH CHECK (false);
CREATE POLICY "Deny public update" ON person_ids FOR UPDATE USING (false);
CREATE POLICY "Deny public delete" ON person_ids FOR DELETE USING (false);

-- Race Results Table
-- Supports Running, Duoathlon, and Triathlon events
-- All time fields are in milliseconds (integer)

DROP TABLE IF EXISTS race_results;

CREATE TABLE race_results (
  id UUID NOT NULL PRIMARY KEY REFERENCES person_ids(id),
  bib_number INTEGER NOT NULL,

  -- TODO: move this to pivot table
  race_type VARCHAR(50) NOT NULL,  -- 'running', 'duoathlon', 'triathlon'
  race_name VARCHAR(255) NOT NULL,
  
  -- Common fields
  distance VARCHAR(50),
  time_ms INTEGER NOT NULL,  -- total time in milliseconds
  -- TODO: move to pivot table
  event_date DATE NOT NULL,
  
  -- Demographics
  age_group VARCHAR(20),
  gender VARCHAR(10),
  
  -- Segment distances (in km, stored as string for flexibility)
  swim_distance VARCHAR(50),
  bike_distance VARCHAR(50),
  run_distance VARCHAR(50),
  
  -- Segment times in milliseconds
  swim_time_ms INTEGER,
  transition1_time_ms INTEGER,
  bike_time_ms INTEGER,
  transition2_time_ms INTEGER,
  run_time_ms INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE race_results ENABLE ROW LEVEL SECURITY;

-- Policies for public access
CREATE POLICY "Allow public read" ON race_results FOR SELECT USING (true);
CREATE POLICY "Deny public insert" ON race_results FOR INSERT WITH CHECK (false);
CREATE POLICY "Deny public update" ON race_results FOR UPDATE USING (false);
CREATE POLICY "Deny public delete" ON race_results FOR DELETE USING (false);
