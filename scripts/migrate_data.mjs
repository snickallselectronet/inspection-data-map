// Migration script to move data from JSON file to Supabase
// Run this once to migrate your existing data

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = 'https://ngeoaqkonqhlfpxcvsuh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nZW9hcWtvbnFobGZweGN2c3VoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk0Njk4NCwiZXhwIjoyMDY3NTIyOTg0fQ.zFepNkR4MJxtilvM1madF0WmfHKZ8GZAHLRe65Gq_tQ'
const supabase = createClient(supabaseUrl, supabaseKey)

// Function to transform JSON data to match table schema
function transformDataForSupabase(jsonData) {
  return jsonData.map(item => ({
    objectid: item.OBJECTID,
    progress: item.PROGRESS,
    assetnum: item.ASSETNUM,
    wonum: item.WONUM,
    date_of_inspection: item.DATE_OF_INSPECTION,
    reason_for_inspection: item.REASON_FOR_INSPECTION,
    inspection_possible: item.INSPECTION_POSSIBLE,
    field_label: item.FIELD_LABEL,
    model: item.MODEL,
    pest_control: item.PEST_CONTROL,
    rubbish_clearance: item.RUBBISH_CLEARANCE,
    vegetation_clearance: item.VEGETATION_CLEARANCE,
    graffiti: item.GRAFFITI,
    public_safety_location_issue: item.PUBLIC_SAFETY_LOCATION_ISSUE,
    operator_access_satisfactory: item.OPERATOR_ACCESS_SATISFACTORY,
    foundation_issues: item.FOUNDATION_ISSUES,
    enclosure_external_labels: item.ENCLOSURE_EXTERNAL_LABELS,
    enclosure_lid_secure: item.ENCLOSURE_LID_SECURE,
    if_p160_is_lid_plastic: item.IF_P160_IS_LID_PLASTIC,
    enclosure_external_condition: item.ENCLOSURE_EXTERNAL_CONDITION,
    fault_response_raised: item.FAULT_RESPONSE_RAISED,
    signoff: item.SIGNOFF,
    globalid: item.GlobalID,
    x: item.x,
    y: item.y,
    colour: item.colour
  }))
}

async function migrateData() {
  try {
    console.log('Starting migration...')
    
    // Load your existing JSON data from file system
    const jsonData = JSON.parse(fs.readFileSync('./public/assets/points.json', 'utf8'))
    
    console.log(`Found ${jsonData.length} points to migrate`)
    
    // Transform data to match table schema
    const transformedData = transformDataForSupabase(jsonData)
    
    // Insert data in batches to avoid timeout
    const batchSize = 100
    for (let i = 0; i < transformedData.length; i += batchSize) {
      const batch = transformedData.slice(i, i + batchSize)
      
      const { data, error } = await supabase
        .from('inspection_points')
        .insert(batch)
      
      if (error) {
        console.error(`Error in batch ${i / batchSize + 1}:`, error)
        continue
      }
      
      console.log(`Migrated batch ${i / batchSize + 1}/${Math.ceil(transformedData.length / batchSize)}`)
    }
    
    console.log('Migration completed successfully!')
    
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

// Actually call the function!
migrateData()