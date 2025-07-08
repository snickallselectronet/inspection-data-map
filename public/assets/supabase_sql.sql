-- Create the inspection_points table
CREATE TABLE inspection_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Coordinate fields
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    
    -- Basic identification fields
    COLOUR TEXT,
    FIELD_LABEL TEXT,
    OBJECTID INTEGER,
    ASSETNUM TEXT,
    WONUM TEXT,
    GlobalID TEXT,
    
    -- Inspection details
    PROGRESS TEXT,
    DATE_OF_INSPECTION BIGINT,
    REASON_FOR_INSPECTION TEXT,
    INSPECTION_POSSIBLE TEXT,
    SIGNOFF TEXT,
    
    -- Equipment details
    MODEL TEXT,
    
    -- Maintenance requirements
    PEST_CONTROL TEXT,
    RUBBISH_CLEARANCE TEXT,
    VEGETATION_CLEARANCE TEXT,
    GRAFFITI TEXT,
    
    -- Safety and access
    PUBLIC_SAFETY_LOCATION_ISSUE TEXT,
    OPERATOR_ACCESS_SATISFACTORY TEXT,
    
    -- Structural conditions
    FOUNDATION_ISSUES TEXT,
    ENCLOSURE_EXTERNAL_LABELS TEXT,
    ENCLOSURE_LID_SECURE TEXT,
    IF_P160_IS_LID_PLASTIC TEXT,
    ENCLOSURE_EXTERNAL_CONDITION TEXT,
    
    -- Response tracking
    FAULT_RESPONSE_RAISED TEXT
);

-- Create an index on coordinates for spatial queries
CREATE INDEX idx_inspection_points_coordinates ON inspection_points (x, y);

-- Create an index on common query fields
CREATE INDEX idx_inspection_points_field_label ON inspection_points (FIELD_LABEL);
CREATE INDEX idx_inspection_points_progress ON inspection_points (PROGRESS);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inspection_points_updated_at
    BEFORE UPDATE ON inspection_points
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE inspection_points ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to view inspection points" ON inspection_points
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert inspection points" ON inspection_points
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update inspection points" ON inspection_points
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete inspection points" ON inspection_points
    FOR DELETE USING (auth.role() = 'authenticated');

-- If you want to allow anonymous access (public read-only), uncomment this:
-- CREATE POLICY "Allow anonymous users to view inspection points" ON inspection_points
--     FOR SELECT USING (true);