-- Person ID Mapping Table
DROP TABLE IF EXISTS person_ids;

CREATE TABLE person_ids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(50) NOT NULL UNIQUE,  -- Bib number or other external ID
  name VARCHAR(255) NOT NULL,
  team_name VARCHAR(255),
  city VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE person_ids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON person_ids FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON person_ids FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON person_ids FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON person_ids FOR DELETE USING (false);

-- Race Results Table
-- Supports Running, Duoathlon, and Triathlon events
-- All time fields are in milliseconds (integer)

DROP TABLE IF EXISTS race_results;

CREATE TABLE race_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id VARCHAR(50) NOT NULL REFERENCES person_ids(external_id),
  race_type VARCHAR(50) NOT NULL,  -- 'running', 'duoathlon', 'triathlon'
  race_name VARCHAR(255) NOT NULL,
  
  -- Common fields
  distance VARCHAR(50),
  time_ms INTEGER NOT NULL,  -- total time in milliseconds
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

-- Insert sample data
-- Running (times in milliseconds)
INSERT INTO race_results (person_id, race_type, race_name, distance, time_ms, event_date, age_group, gender, run_time_ms) VALUES
  ('P001', 'running', 'Boston Marathon', '42.2km', 10800000, '2024-04-15', 'M30-34', 'M', 10800000),
  ('P002', 'running', 'Boston Marathon', '42.2km', 11520000, '2024-04-15', 'M35-39', 'M', 11520000),
  ('P003', 'running', 'Boston Marathon', '42.2km', 12300000, '2024-04-15', 'M40-44', 'M', 12300000),
  ('P001', 'running', 'NYC Half Marathon', '21.1km', 5400000, '2024-03-17', 'M30-34', 'M', 5400000),
  ('P002', 'running', 'NYC Half Marathon', '21.1km', 5580000, '2024-03-17', 'M35-39', 'M', 5580000),
  ('P004', 'running', 'Chicago Marathon', '42.2km', 10200000, '2024-10-13', 'M25-29', 'M', 10200000),
  ('P005', 'running', 'Chicago Marathon', '42.2km', 11100000, '2024-10-13', 'M30-34', 'F', 11100000),
  ('P003', 'running', 'NYC Half Marathon', '21.1km', 5700000, '2024-03-17', 'M40-44', 'M', 5700000),
  ('P006', 'running', 'Boston 5K', '5km', 1500000, '2024-04-14', 'M20-24', 'M', 1500000),
  ('P007', 'running', 'Boston 5K', '5km', 1620000, '2024-04-14', 'M25-29', 'F', 1620000),
  ('P001', 'running', 'Chicago Marathon', '42.2km', 10500000, '2024-10-13', 'M30-34', 'M', 10500000),
  ('P002', 'running', 'Chicago Marathon', '42.2km', 11340000, '2024-10-13', 'M35-39', 'M', 11340000),
  ('P008', 'running', 'London Marathon', '42.2km', 11880000, '2024-04-21', 'M35-39', 'M', 11880000),
  ('P009', 'running', 'London Marathon', '42.2km', 12600000, '2024-04-21', 'M40-44', 'F', 12600000),
  ('P010', 'running', 'Berlin Marathon', '42.2km', 9900000, '2024-09-24', 'M25-29', 'M', 9900000);

-- Duoathlon (bike-run) - times in milliseconds
INSERT INTO race_results (person_id, race_type, race_name, distance, time_ms, event_date, age_group, gender, bike_distance, run_time_ms) VALUES
  ('P011', 'duoathlon', 'World Championships', '51km', 9000000, '2024-09-08', 'M25-29', 'M', '31km', 3000000),
  ('P012', 'duoathlon', 'World Championships', '51km', 9600000, '2024-09-08', 'M30-34', 'M', '31km', 3300000),
  ('P013', 'duoathlon', 'European Championships', '38km', 6600000, '2024-06-15', 'M20-24', 'M', '22km', 2400000),
  ('P014', 'duoathlon', 'European Championships', '38km', 6900000, '2024-06-15', 'M35-39', 'F', '22km', 2500000),
  ('P011', 'duoathlon', 'National Qualifier', '25km', 4200000, '2024-04-22', 'M25-29', 'M', '15km', 1500000),
  ('P015', 'duoathlon', 'World Championships', '51km', 10200000, '2024-09-08', 'M40-44', 'M', '31km', 3600000);

-- Triathlon (swim-bike-run) - times in milliseconds
INSERT INTO race_results (person_id, race_type, race_name, distance, time_ms, event_date, age_group, gender, swim_distance, bike_distance, run_distance, swim_time_ms, bike_time_ms, run_time_ms, transition1_time_ms, transition2_time_ms) VALUES
  ('P016', 'triathlon', 'Ironman World Championship', '226.2km', 32400000, '2024-10-14', 'M30-34', 'M', '3.8km', '180km', '42.2km', 5400000, 18000000, 8400000, 300000, 300000),
  ('P017', 'triathlon', 'Ironman World Championship', '226.2km', 34200000, '2024-10-14', 'M35-39', 'M', '3.8km', '180km', '42.2km', 5700000, 19200000, 8700000, 360000, 360000),
  ('P018', 'triathlon', 'Olympic Distance', '51.5km', 7200000, '2024-07-30', 'M25-29', 'M', '1.5km', '40km', '10km', 1200000, 2400000, 3300000, 150000, 150000),
  ('P019', 'triathlon', 'Olympic Distance', '51.5km', 7500000, '2024-07-30', 'M30-34', 'F', '1.5km', '40km', '10km', 1250000, 2500000, 3450000, 160000, 140000),
  ('P016', 'triathlon', 'Half Ironman', '113km', 18000000, '2024-05-20', 'M30-34', 'M', '1.9km', '90km', '21.1km', 2100000, 9000000, 6300000, 270000, 230000),
  ('P020', 'triathlon', 'Sprint Triathlon', '25.75km', 4200000, '2024-06-15', 'M20-24', 'M', '750m', '20km', '5km', 600000, 1200000, 2100000, 150000, 150000),
  ('P017', 'triathlon', 'Olympic Distance', '51.5km', 6900000, '2024-07-30', 'M35-39', 'M', '1.5km', '40km', '10km', 1100000, 2300000, 3200000, 140000, 160000),
  ('P021', 'triathlon', 'Ironman World Championship', '226.2km', 36000000, '2024-10-14', 'M40-44', 'F', '3.8km', '180km', '42.2km', 6000000, 20400000, 9000000, 420000, 420000);
