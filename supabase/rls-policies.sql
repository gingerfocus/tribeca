-- RLS Policies for Tribeca Race Results
-- This file contains the Row Level Security policies for authentication

-- Enable RLS on race_results table
ALTER TABLE race_results ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view results)
CREATE POLICY "Allow public read" ON race_results 
    FOR SELECT USING (true);

-- Admin insert policy (only authenticated admins can insert)
CREATE POLICY "Allow admin insert" ON race_results 
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND email IN (
                SELECT value::text FROM jsonb_array_elements_text(
                    to_jsonb(string_to_array(current_setting('app.settings.admin_emails', true), ','))
                )
            )
        )
    );

-- Admin update policy (only authenticated admins can update)
CREATE POLICY "Allow admin update" ON race_results 
    FOR UPDATE USING (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND email IN (
                SELECT value::text FROM jsonb_array_elements_text(
                    to_jsonb(string_to_array(current_setting('app.settings.admin_emails', true), ','))
                )
            )
        )
    );

-- Admin delete policy (only authenticated admins can delete)
CREATE POLICY "Allow admin delete" ON race_results 
    FOR DELETE USING (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND email IN (
                SELECT value::text FROM jsonb_array_elements_text(
                    to_jsonb(string_to_array(current_setting('app.settings.admin_emails', true), ','))
                )
            )
        )
    );

-- RLS for person_ids table (same pattern)
ALTER TABLE person_ids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read persons" ON person_ids 
    FOR SELECT USING (true);

CREATE POLICY "Allow admin insert persons" ON person_ids 
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND email IN (
                SELECT value::text FROM jsonb_array_elements_text(
                    to_jsonb(string_to_array(current_setting('app.settings.admin_emails', true), ','))
                )
            )
        )
    );

CREATE POLICY "Allow admin update persons" ON person_ids 
    FOR UPDATE USING (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND email IN (
                SELECT value::text FROM jsonb_array_elements_text(
                    to_jsonb(string_to_array(current_setting('app.settings.admin_emails', true), ','))
                )
            )
        )
    );
