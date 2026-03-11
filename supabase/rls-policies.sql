-- RLS Policies for Tribeca Race Results
-- This file contains the Row Level Security policies for authentication

-- Enable RLS on results, athletes, and races tables
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE races ENABLE ROW LEVEL SECURITY;

-- Public read access for results, athletes, and races
CREATE POLICY "Allow public read results" ON results FOR SELECT USING (true);
CREATE POLICY "Allow public read athletes" ON athletes FOR SELECT USING (true);
CREATE POLICY "Allow public read races" ON races FOR SELECT USING (true);