<template>
  <div id="mapContainer" style="height: 100vh; width: 100%;">
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
        :key="index"
        :lat-lng="[point.y, point.x]"
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
          </div>
        </LPopup>
      </LMarker>
    </LMap>
  </div>
</template>

<script setup>
const points = ref([])
const defaultLat = -44.88407839  // Updated to match your data area
const defaultLng = 169.0024628404  // Updated to match your data area
const mapRef = ref(null)

// Helper function to determine which fields to show in popup
const shouldShowField = (key, value) => {
  // Skip coordinate fields, null values, and the field label (already shown as title)
  const skipFields = ['x', 'y', 'FIELD_LABEL', 'GlobalID', 'OBJECTID']
  return !skipFields.includes(key) && value !== null && value !== ''
}

// Helper function to format field names for display
const formatFieldName = (key) => {
  return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Helper function to format field values for display
const formatFieldValue = (key, value) => {
  // Format date fields
  if (key === 'DATE_OF_INSPECTION' && typeof value === 'number') {
    return new Date(value).toLocaleDateString()
  }
  return value
}

// Function to fit map to show all points
const fitMapToPoints = () => {
  if (points.value.length > 0 && mapRef.value) {
    const bounds = points.value.map(point => [point.y, point.x])
    mapRef.value.leafletObject.fitBounds(bounds, { padding: [20, 20] })
  }
}

onMounted(async () => {
  try {
    const res = await fetch('/assets/points.json')
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }
    points.value = await res.json()
    console.log(`Loaded ${points.value.length} inspection points`)
    
    // Fit map to show all points after a short delay to ensure map is ready
    setTimeout(() => {
      fitMapToPoints()
    }, 100)
    
  } catch (error) {
    console.error('Failed to load points:', error)
    // Fallback data for testing using your data structure
    points.value = [
      {
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
        y: -44.88407839
      }
    ]
  }
})
</script>

<style>
/* Ensure full-screen rendering */
html, body, #__nuxt, #app {
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>