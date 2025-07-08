<template>
  <div id="mapContainer" style="height: 100vh; width: 100%;">
    <ClientOnly>
      <div v-if="loading" class="loading-overlay">
        <div class="loading-spinner">Loading inspection points...</div>
      </div>
      
      <LMap 
        ref="mapRef"
        :zoom="10" 
        :center="[defaultLat, defaultLng]" 
        style="height: 100%; width: 100%;"
        :use-global-leaflet="false"
        @ready="onMapReady"
      >
        <LTileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; <a href='https://www.openstreetmap.org/'>OpenStreetMap</a> contributors"
          layer-type="base"
          name="OpenStreetMap"
        />
        <LMarker
          v-for="(point, index) in points"
          :key="`${point.id}-${point.colour}`"
          :lat-lng="[point.y, point.x]"
          :icon="getMarkerIcon(point)"
        >
          <LPopup>
            <div style="max-width: 300px;">
              <div class="popup-header">
                <div class="field-label">{{ point.FIELD_LABEL }}</div>
                <div class="sign-off">Sign Off: {{ point.SIGNOFF }}</div>
              </div>
              <hr style="margin: 10px 0;">
              <div v-for="key in getOrderedFields(point)" :key="key">
                <strong>{{ formatFieldName(key) }}:</strong> {{ formatFieldValue(key, point[key]) }}<br />
              </div>
              <hr style="margin: 10px 0;">
              <button @click="toggleDone(point)" class="done-btn">
                {{ point.colour === 'green' ? 'Mark as Not Done' : 'Mark as Done' }}
              </button>
            </div>
          </LPopup>
        </LMarker>
      </LMap>

      <!-- Map Controls -->
      <div class="map-controls">
        <button @click="refreshData" class="refresh-btn">Refresh Data</button>
      </div>

      <template #fallback>
        <div class="loading-overlay">
          <div class="loading-spinner">Loading map...</div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup>
const supabase = useSupabaseClient()
const points = ref([])
const loading = ref(true)
const defaultLat = -44.88407839
const defaultLng = 169.0024628404
const mapRef = ref(null)

// Icons - will be initialized on client side
const blueIcon = ref(null)
const greenIcon = ref(null)
const leafletLoaded = ref(false)

// Initialize icons on client side only
const initializeIcons = async () => {
  if (process.client && !leafletLoaded.value) {
    try {
      // Dynamically import Leaflet only on client side
      const L = await import('leaflet')
      
      blueIcon.value = L.default.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })

      greenIcon.value = L.default.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })
      
      leafletLoaded.value = true
      console.log('Icons initialized successfully')
    } catch (error) {
      console.error('Failed to load Leaflet:', error)
    }
  }
}

// Get the appropriate marker icon
const getMarkerIcon = (point) => {
  if (!process.client || !leafletLoaded.value) return null
  
  const icon = point.colour === 'green' ? greenIcon.value : blueIcon.value
  console.log(`Getting icon for point ${point.id}: ${point.colour}`, icon)
  return icon
}

// Map ready handler
const onMapReady = () => {
  console.log('Map is ready')
  // Fit map to show all points after a short delay
  setTimeout(() => {
    fitMapToPoints()
  }, 100)
}

// Toggle DONE status
const toggleDone = async (point) => {
  const newColour = point.colour === 'green' ? 'blue' : 'green'

  try {
    console.log('Updating point:', point.id, 'from', point.colour, 'to', newColour)

    // Update in Supabase
    const { data, error } = await supabase
      .from('inspection_points')
      .update({ colour: newColour })
      .eq('id', point.id)
      .select()

    if (error) {
      console.error('Supabase update error:', error.message)
      alert(`Supabase update error: ${error.message}`)
      return
    }

    // Update local state - this will trigger reactivity
    const pointIndex = points.value.findIndex(p => p.id === point.id)
    if (pointIndex !== -1) {
      points.value[pointIndex] = {
        ...points.value[pointIndex],
        colour: newColour
      }
      console.log('Local state updated successfully')
    }

    if (data && data.length) {
      console.log('Database update succeeded:', data)
    } else {
      console.warn('No rows updated. Check ID:', point.id)
    }

  } catch (err) {
    console.error('Unexpected error:', err)
    // Fallback: update locally even if database update fails
    const pointIndex = points.value.findIndex(p => p.id === point.id)
    if (pointIndex !== -1) {
      points.value[pointIndex] = {
        ...points.value[pointIndex],
        colour: newColour
      }
    }
  }
}

// Define the order of fields in the popup
const fieldOrder = [
  'ASSETNUM',
  'WONUM', 
  'PROGRESS',
  'DATE_OF_INSPECTION',
  'REASON_FOR_INSPECTION',
  'INSPECTION_POSSIBLE',
  'MODEL',
  'PEST_CONTROL',
  'RUBBISH_CLEARANCE',
  'VEGETATION_CLEARANCE',
  'GRAFFITI',
  'PUBLIC_SAFETY_LOCATION_ISSUE',
  'OPERATOR_ACCESS_SATISFACTORY',
  'FOUNDATION_ISSUES',
  'ENCLOSURE_EXTERNAL_LABELS',
  'ENCLOSURE_LID_SECURE',
  'IF_P160_IS_LID_PLASTIC',
  'ENCLOSURE_EXTERNAL_CONDITION',
  'FAULT_RESPONSE_RAISED'
]

// Helper function to determine which fields to show in popup
const shouldShowField = (key, value) => {
  const skipFields = ['id', 'x', 'y', 'FIELD_LABEL', 'GlobalID', 'OBJECTID', 'created_at', 'updated_at', 'colour']
  return !skipFields.includes(key) && value !== null && value !== ''
}

// Get ordered fields for display
const getOrderedFields = (point) => {
  return fieldOrder.filter(key => shouldShowField(key, point[key]))
}

// Helper function to format field names for display
const formatFieldName = (key) => {
  return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Helper function to format field values for display
const formatFieldValue = (key, value) => {
  if (key === 'DATE_OF_INSPECTION' && typeof value === 'number') {
    return new Date(value).toLocaleDateString()
  }
  return value
}

// Function to fit map to show all points
const fitMapToPoints = () => {
  if (points.value.length > 0 && mapRef.value && mapRef.value.leafletObject) {
    const bounds = points.value.map(point => [point.y, point.x])
    mapRef.value.leafletObject.fitBounds(bounds, { padding: [20, 20] })
  }
}

// Load inspection points from Supabase
const loadPoints = async () => {
  try {
    loading.value = true
    
    // Check if Supabase is properly configured
    const config = useRuntimeConfig()
    if (!config.public.supabaseUrl || !config.public.supabaseAnonKey) {
      console.warn('Supabase not configured, falling back to JSON data')
      await loadFallbackData()
      return
    }

    const { data, error } = await supabase
      .from('inspection_points')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Filter out points without valid coordinates and add default colour
    points.value = (data || [])
      .filter(p => typeof p.x === 'number' && typeof p.y === 'number')
      .map(point => ({
        ...point,
        colour: point.colour || 'blue' // Default to blue if no colour specified
      }))
      
    console.log(`Loaded ${points.value.length} inspection points from Supabase`)
    
  } catch (error) {
    console.error('Failed to load points from Supabase:', error)
    // Fallback to your existing static data
    await loadFallbackData()
  } finally {
    loading.value = false
  }
}

// Fallback to load from JSON file (your existing approach)
const loadFallbackData = async () => {
  try {
    const res = await fetch('/assets/points.json')
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }
    const jsonData = await res.json()
    
    // Convert JSON data to include IDs, timestamps, and colour
    points.value = jsonData.map((point, index) => ({
      ...point,
      id: `fallback_${index}`,
      colour: point.colour || 'blue',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))
    
    console.log(`Loaded ${points.value.length} points from fallback JSON`)
    
  } catch (error) {
    console.error('Failed to load fallback data:', error)
    // Final fallback with your sample data
    points.value = [
      {
        id: 'sample_1',
        OBJECTID: 2019,
        PROGRESS: "COMP",
        ASSETNUM: "A2372206",
        WONUM: "8334",
        DATE_OF_INSPECTION: 1749427200000,
        REASON_FOR_INSPECTION: "Cyclic",
        INSPECTION_POSSIBLE: "Yes",
        FIELD_LABEL: "UCS011",
        MODEL: "Gyro E2300",
        PEST_CONTROL: "Not Required",
        RUBBISH_CLEARANCE: "Not Required",
        VEGETATION_CLEARANCE: "Not Required",
        GRAFFITI: "Not Required",
        PUBLIC_SAFETY_LOCATION_ISSUE: "No",
        OPERATOR_ACCESS_SATISFACTORY: "Yes",
        FOUNDATION_ISSUES: "No",
        ENCLOSURE_EXTERNAL_LABELS: "Yes OK",
        ENCLOSURE_LID_SECURE: "Yes ok",
        IF_P160_IS_LID_PLASTIC: "Yes",
        ENCLOSURE_EXTERNAL_CONDITION: "As new - over 20 years life expectancy  H5 grade",
        FAULT_RESPONSE_RAISED: "No",
        SIGNOFF: "Richard ward",
        x: 169.0024628404,
        y: -44.88407839,
        colour: 'blue',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  }
}

// Edit existing point (you can expand this to open a form)
const editPoint = (point) => {
  console.log('Edit point:', point)
  // Here you would typically open a modal or navigate to an edit form
  // For now, just log the action
  alert(`Edit functionality for ${point.FIELD_LABEL} would go here`)
}

// Delete inspection point
const deletePoint = async (pointId) => {
  if (!confirm('Are you sure you want to delete this inspection point?')) {
    return
  }

  try {
    const { error } = await supabase
      .from('inspection_points')
      .delete()
      .eq('id', pointId)

    if (error) throw error

    points.value = points.value.filter(point => point.id !== pointId)
    console.log('Point deleted successfully')
    
  } catch (error) {
    console.error('Failed to delete point:', error)
    // Remove from local state as fallback
    points.value = points.value.filter(point => point.id !== pointId)
  }
}

// Refresh data from Supabase
const refreshData = async () => {
  await loadPoints()
}

// Listen for real-time updates
const setupRealtimeSubscription = () => {
  const subscription = supabase
    .channel('inspection_points_changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'inspection_points' }, 
      (payload) => {
        console.log('Real-time update received:', payload)
        
        switch (payload.eventType) {
          case 'INSERT':
            points.value.unshift({
              ...payload.new,
              colour: payload.new.colour || 'blue'
            })
            break
          case 'UPDATE':
            const updateIndex = points.value.findIndex(p => p.id === payload.new.id)
            if (updateIndex !== -1) {
              points.value[updateIndex] = {
                ...payload.new,
                colour: payload.new.colour || 'blue'
              }
            }
            break
          case 'DELETE':
            points.value = points.value.filter(p => p.id !== payload.old.id)
            break
        }
      }
    )
    .subscribe()

  // Clean up subscription on unmount
  onUnmounted(() => {
    supabase.removeChannel(subscription)
  })
}

// Wait for client-side hydration
onMounted(async () => {
  await nextTick() // Wait for DOM to be ready
  await initializeIcons()
  await loadPoints()
  setupRealtimeSubscription()
})
</script>

<style>
/* Ensure full-screen rendering */
html, body, #__nuxt, #app {
  height: 100%;
  margin: 0;
  padding: 0;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.map-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 10px;
  z-index: 1000;
}

.refresh-btn {
  padding: 10px 15px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.refresh-btn:hover {
  background: #0056b3;
}

.done-btn, .edit-btn, .delete-btn {
  padding: 5px 10px;
  margin: 2px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

.done-btn {
  background: #17a2b8;
  color: white;
}

.done-btn:hover {
  background: #138496;
}

.edit-btn {
  background: #28a745;
  color: white;
}

.edit-btn:hover {
  background: #218838;
}

.delete-btn {
  background: #dc3545;
  color: white;
}

.delete-btn:hover {
  background: #c82333;
}

/* Popup Header Styles */
.popup-header {
  margin-bottom: 5px;
}

.field-label {
  font-size: 18px;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 8px;
  text-align: center;
  padding: 5px;
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  border-radius: 4px;
  border-left: 4px solid #2196f3;
}

.sign-off {
  font-size: 16px;
  font-weight: 600;
  color: #27ae60;
  text-align: center;
  padding: 4px;
  background: linear-gradient(135deg, #e8f5e8, #c8e6c9);
  border-radius: 4px;
  border-left: 4px solid #4caf50;
}
</style>