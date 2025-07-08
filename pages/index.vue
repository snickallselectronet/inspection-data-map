<template>
  <div id="mapContainer" style="height: 100vh; width: 100%;">
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">Loading inspection points...</div>
    </div>

    <LMap
      ref="mapRef"
      :zoom="10"
      :center="[defaultLat, defaultLng]"
      style="height: 100%; width: 100%;"
      :use-global-leaflet="false"
    >
      <LTileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; <a href='https://www.openstreetmap.org/'>OpenStreetMap</a> contributors"
        layer-type="base"
        name="OpenStreetMap"
      />

      <LMarker
        v-for="(point, index) in points"
        :key="point.id || index"
        :lat-lng="[point.y, point.x]"
        :icon="point.colour === 'green' ? greenIcon : blueIcon"
      >
        <LPopup>
          <div style="max-width: 300px;">
            <strong>{{ point.FIELD_LABEL }}</strong><br />
            <hr style="margin: 5px 0;">
            <div v-for="(value, key) in point" :key="key">
              <template v-if="shouldShowField(key, value)">
                <strong>{{ formatFieldName(key) }}:</strong> {{ formatFieldValue(key, value) }}<br />
              </template>
            </div>
            <hr style="margin: 5px 0;">
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
  </div>
</template>

<script setup>
import L from 'leaflet'

const supabase = useSupabaseClient()
const points = ref([])
const loading = ref(true)
const defaultLat = -44.88407839
const defaultLng = 169.0024628404
const mapRef = ref(null)

// Icons
const blueIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})


// Toggle DONE status
const toggleDone = async (point) => {
  const newColour = point.colour === 'green' ? 'blue' : 'green'

  try {
    const { data, error } = await supabase
      .from('inspection_points')
      .update({ colour: newColour })
      .eq('id', point.id)
      .select() // <-- include this to return updated row

    if (error) {
      console.error('Supabase update error:', error)
      alert('Failed to update Supabase.')
      return
    }

    console.log('Updated row:', data)
    point.colour = newColour
  } catch (err) {
    console.error('Unexpected error:', err)
  }
}


// Helper function to determine which fields to show in popup
const shouldShowField = (key, value) => {
  const skipFields = ['id', 'x', 'y', 'FIELD_LABEL', 'GlobalID', 'OBJECTID', 'created_at', 'updated_at']
  return !skipFields.includes(key) && value !== null && value !== ''
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

// Fit map to all points
const fitMapToPoints = () => {
  if (points.value.length > 0 && mapRef.value) {
    const bounds = points.value.map(point => [point.y, point.x])
    mapRef.value.leafletObject.fitBounds(bounds, { padding: [20, 20] })
  }
}

// Load points from Supabase
const loadPoints = async () => {
  try {
    loading.value = true
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

    if (error) throw error

    points.value = (data || []).filter(p => typeof p.x === 'number' && typeof p.y === 'number')
    console.log(`Loaded ${points.value.length} inspection points from Supabase`)

    setTimeout(() => {
      fitMapToPoints()
    }, 100)
  } catch (error) {
    console.error('Failed to load points from Supabase:', error)
    await loadFallbackData()
  } finally {
    loading.value = false
  }
}

// Fallback loader
const loadFallbackData = async () => {
  try {
    const res = await fetch('/assets/points.json')
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
    const jsonData = await res.json()

    points.value = jsonData.map((point, index) => ({
      ...point,
      id: `fallback_${index}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))
  } catch (error) {
    console.error('Failed to load fallback data:', error)
  }
}

// Refresh data
const refreshData = async () => {
  await loadPoints()
}

// Setup realtime Supabase updates
const setupRealtimeSubscription = () => {
  const subscription = supabase
    .channel('inspection_points_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'inspection_points' }, (payload) => {
      switch (payload.eventType) {
        case 'INSERT':
          points.value.unshift(payload.new)
          break
        case 'UPDATE':
          const i = points.value.findIndex(p => p.id === payload.new.id)
          if (i !== -1) points.value[i] = payload.new
          break
        case 'DELETE':
          points.value = points.value.filter(p => p.id !== payload.old.id)
          break
      }
    })
    .subscribe()

  onUnmounted(() => {
    supabase.removeChannel(subscription)
  })
}

onMounted(async () => {
  await loadPoints()
  setupRealtimeSubscription()
})
</script>

<style>
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

.done-btn {
  padding: 5px 10px;
  background: #17a2b8;
  color: white;
  border: none;
  border-radius: 3px;
  font-size: 12px;
  cursor: pointer;
  margin-top: 5px;
}
.done-btn:hover {
  background: #138496;
}
</style>
