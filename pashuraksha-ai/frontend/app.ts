// PashuRaksha AI Frontend TypeScript App

export interface LocationState {
  status: 'detecting' | 'detected' | 'unavailable' | 'permission_denied' | 'timeout';
  latitude: number | null;
  longitude: number | null;
  district: string | null;
  village: string | null;
  geocodingStatus: 'pending' | 'success' | 'failed';
}

export interface WeatherState {
  status: 'loading' | 'available' | 'unavailable' | 'source_error';
  temperature: number | null;
  humidity: number | null;
  rainfall: number | null;
  windSpeed: number | null;
  condition: string | null;
  source: string | null;
  timestamp: string | null;
}

export interface DiagnosisPayload {
  cattle_type: string;
  fever_status: string;
  symptoms: string[];
  additional_notes?: string;
  latitude?: number | null;
  longitude?: number | null;
  district?: string | null;
  village?: string | null;
  animal_body_temperature?: number | null;
  environmental_temperature?: number | null;
  relative_humidity?: number | null;
  rainfall?: number | null;
  wind_speed?: number | null;
  weather_condition?: string | null;
  weather_source?: string | null;
}

const API_BASE_URL = 'http://127.0.0.1:8000';
let isBackendAvailable = false;

// Application State
export const state: {
  location: LocationState;
  weather: WeatherState;
  offlineQueue: DiagnosisPayload[];
} = {
  location: {
    status: 'unavailable',
    latitude: null,
    longitude: null,
    district: null,
    village: null,
    geocodingStatus: 'pending'
  },
  weather: {
    status: 'unavailable',
    temperature: null,
    humidity: null,
    rainfall: null,
    windSpeed: null,
    condition: null,
    source: null,
    timestamp: null
  },
  offlineQueue: []
};

// Fallback database for client-side evaluation
const fallbackDiseases = [
  {
    id: "lsd",
    name: "Lumpy Skin Disease (LSD)",
    type: "new",
    category: "viral",
    severity: "CRITICAL",
    pathogen: "Capripoxvirus (Vector transmitted via flies, ticks, mosquitoes)",
    symptoms: ["skin_nodules", "high_fever", "drooling", "leg_swelling", "milk_drop"],
    precautions: [
      "Immediate quarantine of affected animal in insect-proof stall at least 50m from herd",
      "Goat Pox Vaccination for all healthy cattle above 4 months",
      "Spray shed twice daily with Neem oil (5%) or Pyrethrin solution"
    ],
    evm_remedy: "Betel leaves (10 nos) + Black pepper (10g) + Salt (10g) + Jaggery (100g) paste given orally 3x daily"
  },
  {
    id: "fmd",
    name: "Foot & Mouth Disease (FMD / Khurpaka-Muhpaka)",
    type: "old",
    category: "viral",
    severity: "CRITICAL",
    pathogen: "Aphthovirus (Highly contagious aerosol & contact)",
    symptoms: ["mouth_blisters", "hoof_lesions", "drooling", "high_fever", "milk_drop"],
    precautions: [
      "Strict quarantine; restrict human & animal movement",
      "Rinse mouth with 1% Potassium Permanganate solution",
      "Apply copper sulphate / disinfectant paste on hoof wounds",
      "Ensure bi-annual FMD vaccination under NADCP program"
    ],
    evm_remedy: "Rinse mouth with mild baking soda or salt solution; apply Turmeric + Neem oil + Camphor paste on foot lesions"
  },
  {
    id: "hs",
    name: "Hemorrhagic Septicemia (HS / Gal Ghotu)",
    type: "old",
    category: "bacterial",
    severity: "EMERGENCY",
    pathogen: "Pasteurella multocida (Bacterial, stress-induced in monsoon)",
    symptoms: ["throat_swelling", "high_fever", "respiratory_distress", "drooling", "sudden_collapse"],
    precautions: [
      "EMERGENCY: Immediate veterinary administration of Oxytetracycline/Sulpha antibiotics",
      "Keep animal dry and warm, away from waterlogged soils",
      "Annual pre-monsoon vaccination in May-June"
    ],
    evm_remedy: "Warm compress on throat swelling; oral administration of dry ginger and turmeric paste with warm water"
  },
  {
    id: "mastitis",
    name: "Bovine Mastitis (Udder Inflammation)",
    type: "old",
    category: "bacterial",
    severity: "MODERATE",
    pathogen: "Staphylococcus aureus / Streptococcus agalactiae",
    symptoms: ["udder_swelling", "milk_drop", "moderate_fever"],
    precautions: [
      "Teat dipping in 0.5% Iodine solution post-milking",
      "Apply Aloe Vera + Turmeric + Lime EVM paste on udder 5x daily",
      "Complete dry-cow antibiotic therapy under vet consultation"
    ],
    evm_remedy: "Aloe Vera gel (250g) + Turmeric powder (50g) + Lime/Chunnam (15g) blended paste applied on udder"
  }
];

const fallbackVaccines = [
  { disease: "Foot & Mouth Disease (FMD)", primary_dose: "4 months of age", booster: "Bi-annually", recommended_time: "Pre-monsoon (May & Nov)", program: "NADCP" },
  { disease: "Lumpy Skin Disease (LSD)", primary_dose: "4 months of age", booster: "Annual Booster", recommended_time: "Before Vector Season (March)", program: "State Drive" },
  { disease: "Hemorrhagic Septicemia (HS)", primary_dose: "6 months of age", booster: "Annual Booster", recommended_time: "Pre-monsoon (May-June)", program: "State Veterinary Services" },
  { disease: "Brucellosis (Calfhood)", primary_dose: "Female Calves (4-8 mos)", booster: "Single Lifetime Dose", recommended_time: "Calfhood window", program: "NADCP" }
];

// Check API Health on load
export async function checkBackendHealth(): Promise<boolean> {
  const badge = document.getElementById('backend-status-badge');
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      isBackendAvailable = true;
      if (badge) {
        badge.className = "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
        badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> Backend API: Connected (${API_BASE_URL})`;
      }
      return true;
    }
  } catch (err) {
    isBackendAvailable = false;
    if (badge) {
      badge.className = "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30";
      badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span> Standalone / Offline Mode`;
    }
  }
  return false;
}

// 1. Geolocation & Reverse Geocoding
export function requestAutomaticLocation(): void {
  updateLocationUI('detecting', 'Detecting location...');

  if (!navigator.geolocation) {
    updateLocationUI('unavailable', 'Geolocation not supported by browser');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = parseFloat(position.coords.latitude.toFixed(6));
      const lon = parseFloat(position.coords.longitude.toFixed(6));

      state.location.status = 'detected';
      state.location.latitude = lat;
      state.location.longitude = lon;

      updateLocationUI('detected', 'Location detected', lat, lon);

      // Perform Reverse Geocoding & Weather Fetching concurrently
      await Promise.all([
        fetchReverseGeocode(lat, lon),
        fetchEnvironmentalWeather(lat, lon)
      ]);
    },
    (error) => {
      let status: LocationState['status'] = 'unavailable';
      let msg = 'Location unavailable';

      if (error.code === error.PERMISSION_DENIED) {
        status = 'permission_denied';
        msg = 'Permission denied';
      } else if (error.code === error.TIMEOUT) {
        status = 'timeout';
        msg = 'Location request timed out';
      }

      state.location.status = status;
      state.location.latitude = null;
      state.location.longitude = null;
      state.location.district = null;
      state.location.village = null;

      updateLocationUI(status, msg);
      updateWeatherUI('unavailable');
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

async function fetchReverseGeocode(lat: number, lon: number): Promise<void> {
  const districtEl = document.getElementById('location-district') as HTMLInputElement | null;
  const villageEl = document.getElementById('location-village') as HTMLInputElement | null;
  const geoStatusEl = document.getElementById('geocoding-status-badge');

  if (geoStatusEl) geoStatusEl.textContent = 'Detecting District/Village...';

  try {
    let district: string | null = null;
    let village: string | null = null;

    if (isBackendAvailable) {
      const res = await fetch(`${API_BASE_URL}/api/geocode/reverse?lat=${lat}&lon=${lon}`);
      if (res.ok) {
        const data = await res.json();
        district = data.district;
        village = data.village;
      }
    } else {
      // Direct OSM Nominatim client call
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`);
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        district = addr.state_district || addr.district || addr.county || addr.city || null;
        village = addr.village || addr.town || addr.suburb || addr.neighbourhood || addr.locality || null;
      }
    }

    if (district || village) {
      state.location.district = district;
      state.location.village = village;
      state.location.geocodingStatus = 'success';

      if (districtEl && district) districtEl.value = district;
      if (villageEl && village) villageEl.value = village;
      if (geoStatusEl) {
        geoStatusEl.className = 'text-xs text-emerald-400 font-semibold';
        geoStatusEl.textContent = '✓ Automatically detected';
      }
    } else {
      throw new Error('Reverse geocoding returned no address details');
    }
  } catch (err) {
    state.location.district = null;
    state.location.village = null;
    state.location.geocodingStatus = 'failed';

    if (geoStatusEl) {
      geoStatusEl.className = 'text-xs text-amber-400 font-semibold';
      geoStatusEl.textContent = 'District/Village could not be detected (enter below)';
    }
  }
}

// 2. Weather & Environmental Data Fetching
async function fetchEnvironmentalWeather(lat: number, lon: number): Promise<void> {
  updateWeatherUI('loading');

  try {
    if (isBackendAvailable) {
      const res = await fetch(`${API_BASE_URL}/api/weather?lat=${lat}&lon=${lon}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'available') {
          state.weather = {
            status: 'available',
            temperature: data.temperature,
            humidity: data.humidity,
            rainfall: data.rainfall,
            windSpeed: data.wind_speed,
            condition: data.weather_condition,
            source: data.source,
            timestamp: data.observation_time
          };
          updateWeatherUI('available');
          return;
        }
      }
    }

    // Direct fallback to Open-Meteo if backend API is not available
    const omRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code`);
    if (omRes.ok) {
      const data = await omRes.json();
      const current = data.current || {};

      let condition = 'Clear Sky';
      const code = current.weather_code || 0;
      if ([1, 2, 3].includes(code)) condition = 'Partly Cloudy';
      else if ([45, 48].includes(code)) condition = 'Foggy';
      else if ([51, 53, 55, 61, 63, 65].includes(code)) condition = 'Rainy';
      else if ([80, 81, 82, 95].includes(code)) condition = 'Thunderstorm';

      state.weather = {
        status: 'available',
        temperature: current.temperature_2m ?? null,
        humidity: current.relative_humidity_2m ?? null,
        rainfall: current.precipitation ?? null,
        windSpeed: current.wind_speed_10m ?? null,
        condition: condition,
        source: 'Open-Meteo API (Client Direct)',
        timestamp: current.time ?? new Date().toISOString()
      };
      updateWeatherUI('available');
      return;
    }
  } catch (err) {
    console.warn('Weather fetch failed:', err);
  }

  // Weather unavailable — NO FABRICATION
  state.weather = {
    status: 'unavailable',
    temperature: null,
    humidity: null,
    rainfall: null,
    windSpeed: null,
    condition: null,
    source: 'Unavailable',
    timestamp: null
  };
  updateWeatherUI('unavailable');
}

// UI Update Helpers
function updateLocationUI(status: LocationState['status'], message: string, lat: number | null = null, lon: number | null = null): void {
  const badge = document.getElementById('location-status-badge');
  const latEl = document.getElementById('location-lat');
  const lonEl = document.getElementById('location-lon');

  if (badge) {
    if (status === 'detected') {
      badge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      badge.textContent = '✓ Location detected';
    } else if (status === 'detecting') {
      badge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse';
      badge.textContent = '📡 Detecting location...';
    } else if (status === 'permission_denied') {
      badge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30';
      badge.textContent = '🚫 Permission denied';
    } else {
      badge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30';
      badge.textContent = `⚠️ ${message}`;
    }
  }

  if (latEl) latEl.textContent = lat !== null ? lat.toFixed(6) : 'Unavailable';
  if (lonEl) lonEl.textContent = lon !== null ? lon.toFixed(6) : 'Unavailable';
}

function updateWeatherUI(status: 'loading' | 'available' | 'unavailable'): void {
  const tempEl = document.getElementById('env-temp');
  const humEl = document.getElementById('env-humidity');
  const rainEl = document.getElementById('env-rainfall');
  const windEl = document.getElementById('env-wind');
  const condEl = document.getElementById('env-condition');
  const srcEl = document.getElementById('env-source');

  if (status === 'loading') {
    if (tempEl) tempEl.textContent = 'Loading...';
    if (humEl) humEl.textContent = 'Loading...';
    if (rainEl) rainEl.textContent = 'Loading...';
    if (windEl) windEl.textContent = 'Loading...';
    if (condEl) condEl.textContent = 'Loading...';
    if (srcEl) srcEl.textContent = 'Connecting to weather service...';
    return;
  }

  if (status === 'available' && state.weather.status === 'available') {
    if (tempEl) tempEl.textContent = state.weather.temperature !== null ? `${state.weather.temperature} °C` : 'Unavailable';
    if (humEl) humEl.textContent = state.weather.humidity !== null ? `${state.weather.humidity} %` : 'Unavailable';
    if (rainEl) rainEl.textContent = state.weather.rainfall !== null ? `${state.weather.rainfall} mm` : 'Unavailable';
    if (windEl) windEl.textContent = state.weather.windSpeed !== null ? `${state.weather.windSpeed} km/h` : 'Unavailable';
    if (condEl) condEl.textContent = state.weather.condition || 'Unavailable';
    if (srcEl) srcEl.textContent = `Source: ${state.weather.source || 'Weather API'} (${state.weather.timestamp || 'Latest'})`;
  } else {
    if (tempEl) tempEl.textContent = 'Unavailable';
    if (humEl) humEl.textContent = 'Unavailable';
    if (rainEl) rainEl.textContent = 'Unavailable';
    if (windEl) windEl.textContent = 'Unavailable';
    if (condEl) condEl.textContent = 'Unavailable';
    if (srcEl) srcEl.textContent = 'Source: Unavailable';
  }
}

// 3. Submit Health Report with Location + Environmental + Animal Temp
export async function submitDiagnosis(): Promise<void> {
  const selectedSymptoms = Array.from(document.querySelectorAll('#symptom-checkboxes input:checked')).map(cb => (cb as HTMLInputElement).value);
  const fever = (document.getElementById('fever-status') as HTMLSelectElement).value;
  const cattleType = (document.getElementById('cattle-type') as HTMLSelectElement).value;
  
  // Animal body temperature (STRICTLY SEPARATE)
  const bodyTempInput = (document.getElementById('animal-body-temp') as HTMLInputElement | null)?.value;
  const animalBodyTemp = bodyTempInput && !isNaN(parseFloat(bodyTempInput)) ? parseFloat(bodyTempInput) : null;

  if (animalBodyTemp !== null && (animalBodyTemp < 30 || animalBodyTemp > 45)) {
    alert("Invalid Animal Body Temperature. Please enter the measured animal body temperature in °C (between 30 and 45).");
    return;
  }

  // District / Village overrides
  const districtInput = (document.getElementById('location-district') as HTMLInputElement | null)?.value || state.location.district;
  const villageInput = (document.getElementById('location-village') as HTMLInputElement | null)?.value || state.location.village;

  const outputBody = document.getElementById('output-body');
  const riskBadge = document.getElementById('output-risk-badge');

  if (selectedSymptoms.length === 0 && fever === 'normal' && animalBodyTemp === null) {
    if (outputBody) {
      outputBody.innerHTML = `
        <div class="p-6 text-center border border-amber-500/30 bg-amber-500/10 rounded-xl space-y-2 text-amber-400">
          <span class="text-3xl">⚠️</span>
          <h4 class="font-semibold text-white">Please Select Observed Symptoms or Enter Measured Body Temperature</h4>
          <p class="text-xs">Select symptom boxes or enter thermometer temperature to run PashuRaksha AI evaluation.</p>
        </div>
      `;
    }
    if (riskBadge) {
      riskBadge.className = 'px-3 py-1 rounded-full text-xs font-bold badge-warning';
      riskBadge.textContent = 'Input Required';
    }
    return;
  }

  if (outputBody) {
    outputBody.innerHTML = `
      <div class="p-8 text-center space-y-3">
        <div class="inline-block animate-spin text-3xl">⚙️</div>
        <p class="text-xs text-emerald-400">Evaluating health report with PashuRaksha AI Neural Diagnostics...</p>
      </div>
    `;
  }

  const payload: DiagnosisPayload = {
    cattle_type: cattleType,
    fever_status: fever,
    symptoms: selectedSymptoms,
    latitude: state.location.latitude,
    longitude: state.location.longitude,
    district: districtInput,
    village: villageInput,
    animal_body_temperature: animalBodyTemp,
    environmental_temperature: state.weather.temperature,
    relative_humidity: state.weather.humidity,
    rainfall: state.weather.rainfall,
    wind_speed: state.weather.windSpeed,
    weather_condition: state.weather.condition,
    weather_source: state.weather.source
  };

  if (isBackendAvailable) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/workflow/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({...payload, farmer_id: "farmer_default"})
      });

      if (response.ok) {
        const report = await response.json();
        renderDiagnosisResult(report.diagnosis);
        return;
      }
    } catch (err) {
      console.warn("Backend API request failed, saving to offline queue & running standalone engine.", err);
    }
  }

  // Save to Offline Queue in localStorage
  saveToOfflineQueue(payload);
  renderClientDiagnosisResult(payload);
}

function saveToOfflineQueue(payload: DiagnosisPayload): void {
  try {
    state.offlineQueue.push(payload);
    localStorage.setItem('pashuraksha_offline_queue', JSON.stringify(state.offlineQueue));
  } catch (e) {
    console.warn("Could not save to localStorage offline queue", e);
  }
}

function renderDiagnosisResult(data: any): void {
  const outputBody = document.getElementById('output-body');
  const riskBadge = document.getElementById('output-risk-badge');

  if (!outputBody || !riskBadge) return;

  if (data.overall_risk_level.includes("CRITICAL") || data.overall_risk_level.includes("EMERGENCY")) {
    riskBadge.className = 'px-3 py-1 rounded-full text-xs font-bold badge-danger animate-pulse';
    riskBadge.textContent = `🚨 ${data.overall_risk_level}`;
  } else {
    riskBadge.className = 'px-3 py-1 rounded-full text-xs font-bold badge-warning';
    riskBadge.textContent = `⚠️ ${data.overall_risk_level}`;
  }

  // Environmental signals section (STRICTLY SEPARATE FROM ANIMAL SYMPTOMS)
  let envSignalsHTML = '';
  if (data.environmental_signals_used && data.environmental_signals_used.length > 0) {
    envSignalsHTML = `
      <div class="p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl space-y-1.5 text-xs text-blue-300">
        <strong class="text-blue-400 font-bold block flex items-center gap-1.5">
          🌦 Environmental signals used by the risk engine:
        </strong>
        <ul class="list-disc list-inside space-y-1 text-slate-300">
          ${data.environmental_signals_used.map((sig: string) => `<li>${sig}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  // Animal Body Temperature summary badge
  let animalTempHTML = '';
  if (data.animal_body_temperature !== null && data.animal_body_temperature !== undefined) {
    animalTempHTML = `<span class="bg-amber-900/40 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono">Thermometer Body Temp: ${data.animal_body_temperature} °C</span>`;
  }

  let candidatesHTML = data.matched_candidates.map((c: any, idx: number) => `
    <div class="p-4 rounded-xl border ${idx === 0 ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-slate-700 bg-slate-900/60'} space-y-2">
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold ${idx === 0 ? 'text-emerald-400' : 'text-slate-400'}">Candidate #${idx + 1}:</span>
          <span class="font-bold text-sm text-white">${c.name}</span>
        </div>
        <span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Risk Indication: ${Math.round(c.confidence_score)}/100</span>
      </div>
      <p class="text-xs text-slate-400"><strong>Possible Risk Signal:</strong> ${c.pathogen}</p>
      <div class="mt-2 space-y-1">
        <strong class="text-xs text-emerald-400 block">🛡️ PashuRaksha Prevention Guidance:</strong>
        <ul class="list-disc list-inside text-xs text-slate-200 space-y-1">
          ${c.precautions.map((p: string) => `<li>${p}</li>`).join('')}
        </ul>
      </div>
      <div class="pt-2 text-xs text-amber-300">
        <strong>🌿 Ethno-Veterinary Remedy:</strong> ${c.evm_remedy}
      </div>
    </div>
  `).join('');

  let containmentHTML = `
    <div class="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-2 text-amber-300">
      <strong class="block font-bold">📢 Emergency Containment Protocol:</strong>
      <ol class="list-decimal list-inside space-y-1">
        ${data.containment_protocol.map((step: string) => `<li>${step}</li>`).join('')}
      </ol>
    </div>
  `;

  outputBody.innerHTML = `
    <div class="space-y-4">
      <div class="p-3 bg-slate-900 rounded-lg text-xs flex flex-wrap justify-between items-center gap-2 text-slate-300">
        <span>Cattle: <strong class="capitalize text-white">${data.cattle_type}</strong> | Fever: <strong class="capitalize text-white">${data.fever_status}</strong></span>
        ${animalTempHTML}
        <span>Location: <strong class="text-emerald-400">${data.location?.district || state.location.district || 'Detected'}, ${data.location?.village || state.location.village || 'Locality'}</strong></span>
      </div>
      ${envSignalsHTML}
      ${candidatesHTML}
      ${containmentHTML}
      <div class="mt-4 pt-4 border-t border-slate-700 text-xs text-slate-400 text-center">
        Prototype risk indication based on available health, environmental and surveillance signals.
        <br><strong>Risk indication is not a diagnosis. Veterinary verification is recommended.</strong>
      </div>
    </div>
  `;
}

function renderClientDiagnosisResult(payload: DiagnosisPayload): void {
  const outputBody = document.getElementById('output-body');
  const riskBadge = document.getElementById('output-risk-badge');

  let envSignals: string[] = [];
  if (payload.environmental_temperature && payload.relative_humidity && payload.environmental_temperature > 30 && payload.relative_humidity > 75) {
    envSignals.push("High ambient temperature & high humidity -> Vector proliferation risk (LSD)");
  }
  if (payload.rainfall && payload.rainfall > 10) {
    envSignals.push("Heavy rainfall -> Increased monsoon bacterial epizootic risk (HS)");
  }

  let matched = fallbackDiseases.map(d => {
    let score = 0;
    d.symptoms.forEach(s => { if (payload.symptoms.includes(s)) score += 2; });
    if (payload.fever_status === 'high' || (payload.animal_body_temperature && payload.animal_body_temperature >= 39.5)) score += 1.5;
    if (d.id === 'lsd' && envSignals.some(s => s.includes('Vector'))) score += 1;
    if (d.id === 'hs' && envSignals.some(s => s.includes('rainfall'))) score += 1;
    return { ...d, confidence: Math.min(96, score * 20) };
  }).filter(d => d.confidence > 0).sort((a, b) => b.confidence - a.confidence);

  if (matched.length === 0) {
    if (riskBadge) {
      riskBadge.className = 'px-3 py-1 rounded-full text-xs font-bold badge-info';
      riskBadge.textContent = 'Non-Specific Symptom';
    }
    if (outputBody) {
      outputBody.innerHTML = `
        <div class="p-5 bg-slate-900 border border-slate-700 rounded-xl space-y-2">
          <h4 class="font-bold text-white text-base">General Non-Specific Indigestion / Heat Stress</h4>
          <p class="text-xs text-slate-400">Symptoms do not definitively match major infectious epizootics.</p>
          <div class="pt-2 text-xs text-emerald-400">
            <strong>Recommended Action:</strong> Offer clean drinking water with electrolytes; keep animal in shaded, ventilated pen.
          </div>
        </div>
      `;
    }
    return;
  }

  const topMatch = matched[0];
  const maxScore = topMatch.confidence;
  let overallRisk = `LOW — ${Math.round(maxScore)}/100`;
  if (maxScore >= 80) overallRisk = `CRITICAL — ${Math.round(maxScore)}/100`;
  else if (maxScore >= 60) overallRisk = `HIGH — ${Math.round(maxScore)}/100`;
  else if (maxScore >= 30) overallRisk = `MODERATE — ${Math.round(maxScore)}/100`;

  if (riskBadge) {
    riskBadge.className = maxScore >= 80 ? 'px-3 py-1 rounded-full text-xs font-bold badge-danger animate-pulse' : 'px-3 py-1 rounded-full text-xs font-bold badge-warning';
    riskBadge.textContent = `🚨 ${overallRisk}`;
  }

  renderDiagnosisResult({
    cattle_type: payload.cattle_type,
    fever_status: payload.fever_status,
    overall_risk_level: overallRisk,
    matched_candidates: matched.map(m => ({ ...m, confidence_score: m.confidence })),
    environmental_signals_used: envSignals,
    animal_body_temperature: payload.animal_body_temperature,
    location: {
      district: payload.district || state.location.district || 'Local Area',
      village: payload.village || state.location.village || 'Locality'
    },
    containment_protocol: [
      "Isolate affected cattle immediately 50m away from healthy herd.",
      "Spray shed daily with neem oil or disinfectant.",
      "Notify local veterinary health center."
    ]
  });
}

// Preset Case Launcher
export function presetCase(type: string): void {
  document.querySelectorAll('#symptom-checkboxes input').forEach(cb => (cb as HTMLInputElement).checked = false);
  const feverSelect = document.getElementById('fever-status') as HTMLSelectElement | null;

  if (type === 'lsd') {
    if (feverSelect) feverSelect.value = 'high';
    ['skin_nodules', 'drooling', 'leg_swelling', 'milk_drop'].forEach(v => {
      const el = document.querySelector(`#symptom-checkboxes input[value="${v}"]`) as HTMLInputElement | null;
      if (el) el.checked = true;
    });
  } else if (type === 'fmd') {
    if (feverSelect) feverSelect.value = 'high';
    ['mouth_blisters', 'hoof_lesions', 'drooling', 'milk_drop'].forEach(v => {
      const el = document.querySelector(`#symptom-checkboxes input[value="${v}"]`) as HTMLInputElement | null;
      if (el) el.checked = true;
    });
  } else if (type === 'hs') {
    if (feverSelect) feverSelect.value = 'high';
    ['throat_swelling', 'respiratory_distress', 'drooling', 'sudden_collapse'].forEach(v => {
      const el = document.querySelector(`#symptom-checkboxes input[value="${v}"]`) as HTMLInputElement | null;
      if (el) el.checked = true;
    });
  } else if (type === 'mastitis') {
    if (feverSelect) feverSelect.value = 'moderate';
    ['udder_swelling', 'milk_drop'].forEach(v => {
      const el = document.querySelector(`#symptom-checkboxes input[value="${v}"]`) as HTMLInputElement | null;
      if (el) el.checked = true;
    });
  }
  submitDiagnosis();
}

// Fetch Diseases for Tab 2
export async function fetchDiseases(filter = 'all'): Promise<void> {
  const container = document.getElementById('disease-cards-container');
  if (!container) return;
  container.innerHTML = '<p class="text-xs text-slate-400 p-4">Loading disease catalog...</p>';

  let diseases: any[] = fallbackDiseases;

  if (isBackendAvailable) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/diseases`);
      if (res.ok) {
        const data = await res.json();
        diseases = data.diseases;
      }
    } catch (e) {}
  }

  const filtered = diseases.filter(d => {
    if (filter === 'all') return true;
    if (filter === 'new') return d.type === 'new';
    return d.category === filter;
  });

  container.innerHTML = filtered.map(d => `
    <div class="p-5 bg-slate-900 border border-slate-700 rounded-xl space-y-3">
      <div class="flex justify-between items-start">
        <div>
          <h3 class="font-bold text-base text-white">${d.name}</h3>
          <p class="text-xs text-slate-400">Pathogen: ${d.pathogen || d.cause}</p>
        </div>
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${d.severity === 'CRITICAL' || d.severity === 'EMERGENCY' ? 'badge-danger' : 'badge-warning'}">${d.severity || 'HIGH'}</span>
      </div>
      <div>
        <strong class="text-xs text-slate-300 block mb-1">Key Warning Symptoms:</strong>
        <div class="flex flex-wrap gap-1">
          ${(d.symptoms || []).map((s: string) => `<span class="bg-slate-800 border border-slate-700 text-[10px] px-2 py-0.5 rounded text-slate-300">${s.replace('_', ' ')}</span>`).join('')}
        </div>
      </div>
      <div>
        <strong class="text-xs text-emerald-400 block mb-1">PashuRaksha Precaution:</strong>
        <ul class="list-disc list-inside text-xs text-slate-300 space-y-1">
          ${(d.precautions || []).map((p: string) => `<li>${p}</li>`).join('')}
        </ul>
      </div>
    </div>
  `).join('');
}

// Fetch EVM Remedies for Tab 3
export async function fetchEVM(): Promise<void> {
  const container = document.getElementById('evm-cards-container');
  if (!container) return;
  container.innerHTML = '<p class="text-xs text-slate-400 p-4">Loading remedies...</p>';

  let remedies = fallbackDiseases.map(d => ({ disease: d.name, remedy: d.evm_remedy }));

  if (isBackendAvailable) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/evm-remedies`);
      if (res.ok) {
        const data = await res.json();
        remedies = data.remedies;
      }
    } catch (e) {}
  }

  container.innerHTML = remedies.map(r => `
    <div class="p-5 bg-slate-900 border border-slate-700 rounded-xl space-y-2">
      <h3 class="font-bold text-sm text-emerald-400">${r.disease}</h3>
      <p class="text-xs text-slate-300">${r.remedy}</p>
    </div>
  `).join('');
}

// Fetch Vaccination Schedule for Tab 4
export async function fetchVaccines(): Promise<void> {
  const tbody = document.getElementById('vaccine-table-body');
  if (!tbody) return;

  let schedule = fallbackVaccines;

  if (isBackendAvailable) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/vaccination-schedule`);
      if (res.ok) {
        const data = await res.json();
        schedule = data.schedule;
      }
    } catch (e) {}
  }

  tbody.innerHTML = schedule.map(v => `
    <tr class="hover:bg-slate-700/30">
      <td class="p-3 font-semibold text-white">${v.disease}</td>
      <td class="p-3">${v.primary_dose}</td>
      <td class="p-3">${v.booster}</td>
      <td class="p-3 text-emerald-400 font-medium">${v.recommended_time}</td>
      <td class="p-3"><span class="badge-info px-2 py-0.5 rounded text-[10px] font-bold">${v.program}</span></td>
    </tr>
  `).join('');
}

// Tab Switcher
export function switchTab(tab: string): void {
  ['checker', 'diseases', 'evm', 'vaccine', 'vet', 'lab', 'gis', 'offline'].forEach(t => {
    const sec = document.getElementById(`section-${t}`);
    const tabBtn = document.getElementById(`tab-${t}`);
    if (sec) sec.classList.add('hidden');
    if (tabBtn) tabBtn.className = 'px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:bg-slate-800 transition-all flex items-center gap-2';
  });

  const targetSec = document.getElementById(`section-${tab}`);
  const targetBtn = document.getElementById(`tab-${tab}`);
  if (targetSec) targetSec.classList.remove('hidden');
  if (targetBtn) targetBtn.className = 'px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white transition-all flex items-center gap-2';

  if (tab === 'diseases') fetchDiseases();
  if (tab === 'evm') fetchEVM();
  if (tab === 'vaccine') fetchVaccines();
  if (tab === 'gis') {
    fetchGISReports();
    if (gisMap) setTimeout(() => gisMap.invalidateSize(), 100);
  }
  if (tab === 'vet') fetchVetReports();
  if (tab === 'lab') fetchLabReports();
  if (tab === 'offline') renderOfflineQueue();
}

// Multilingual Dictionary
const translations: Record<string, Record<string, string>> = {
  'en': {
    'lbl-form-title': '📝 Livestock Health Report Form',
    'lbl-form-desc': 'Submit animal profile and observed health signals for PashuRaksha AI risk evaluation.',
    'btn-submit': '🤖 Calculate Risk Indication',
    'lbl-result-title': '⚠️ Livestock Health Risk Assessment',
    'tab-checker': '📝 Farmer Report',
    'tab-vet': '👨‍⚕️ Veterinary Verification',
    'tab-lab': '🔬 Laboratory',
    'tab-gis': '🗺️ GIS Surveillance & Alerts',
    'tab-diseases': '📚 Disease Matrix',
    'tab-evm': '🛡️ Prevention & Care',
    'tab-offline': '📶 Offline Queue'
  },
  'kn': {
    'lbl-form-title': '📝 ಜಾನುವಾರು ಆರೋಗ್ಯ ವರದಿ ಫಾರ್ಮ್',
    'lbl-form-desc': 'ಪಶುರಕ್ಷಾ ಎಐ ಅಪಾಯದ ಮೌಲ್ಯಮಾಪನಕ್ಕಾಗಿ ಪ್ರಾಣಿಗಳ ಪ್ರೊಫೈಲ್ ಅನ್ನು ಸಲ್ಲಿಸಿ.',
    'btn-submit': '🤖 ಅಪಾಯದ ಸೂಚನೆಯನ್ನು ಲೆಕ್ಕಹಾಕಿ',
    'lbl-result-title': '⚠️ ಜಾನುವಾರು ಆರೋಗ್ಯ ಅಪಾಯದ ಮೌಲ್ಯಮಾಪನ',
    'tab-checker': '📝 ರೈತ ವರದಿ',
    'tab-vet': '👨‍⚕️ ಪಶುವೈದ್ಯ ಪರಿಶೀಲನೆ',
    'tab-lab': '🔬 ಪ್ರಯೋಗಾಲಯ',
    'tab-gis': '🗺️ ಜಿಐಎಸ್ ಎಚ್ಚರಿಕೆಗಳು',
    'tab-diseases': '📚 ರೋಗದ ಮ್ಯಾಟ್ರಿಕ್ಸ್',
    'tab-evm': '🛡️ ತಡೆಗಟ್ಟುವಿಕೆ ಮತ್ತು ಆರೈಕೆ',
    'tab-offline': '📶 ಆಫ್‌ಲೈನ್ ಸರತಿ'
  },
  'hi': {
    'lbl-form-title': '📝 पशु स्वास्थ्य रिपोर्ट फॉर्म',
    'lbl-form-desc': 'जोखिम मूल्यांकन के लिए पशु प्रोफ़ाइल और स्वास्थ्य संकेत जमा करें।',
    'btn-submit': '🤖 जोखिम संकेत की गणना करें',
    'lbl-result-title': '⚠️ पशु स्वास्थ्य जोखिम मूल्यांकन',
    'tab-checker': '📝 किसान रिपोर्ट',
    'tab-vet': '👨‍⚕️ पशु चिकित्सा सत्यापन',
    'tab-lab': '🔬 प्रयोगशाला',
    'tab-gis': '🗺️ जीआईएस अलर्ट',
    'tab-diseases': '📚 रोग मैट्रिक्स',
    'tab-evm': '🛡️ रोकथाम और देखभाल',
    'tab-offline': '📶 ऑफ़लाइन कतार'
  }
};

export function changeLanguage(lang: string) {
  const dict = translations[lang];
  if (!dict) return;
  for (const [id, text] of Object.entries(dict)) {
    const el = document.getElementById(id);
    if (el) {
      if (el.tagName === 'BUTTON') {
        el.innerHTML = text; // Keep emoji if we used it in text
      } else {
        el.textContent = text;
      }
    }
  }
}

export async function fetchVetReports() {
  const container = document.getElementById('vet-reports-container');
  if (!container) return;
  container.innerHTML = '<p class="text-xs text-slate-400">Loading cases...</p>';
  if (!isBackendAvailable) {
    container.innerHTML = '<p class="text-xs text-amber-400">Backend unavailable. Vet workflow requires backend.</p>';
    return;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/workflow/reports`);
    const reports = await res.json();
    const vetReports = reports.filter((r: any) => r.status === 'submitted' || r.status === 'vet_reviewed');
    
    if (vetReports.length === 0) {
      container.innerHTML = '<p class="text-xs text-slate-400">No pending veterinary cases.</p>';
      return;
    }
    
    container.innerHTML = vetReports.map((r: any) => `
      <div class="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-2">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="font-bold text-sm text-white">Case ID: ${r.id}</h3>
            <p class="text-xs text-slate-400">Location: ${r.request.district || 'Unknown'}, ${r.request.village || 'Unknown'}</p>
          </div>
          <span class="px-2 py-1 rounded-full text-[10px] font-bold ${r.status === 'submitted' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}">${r.status === 'submitted' ? 'PENDING REVIEW' : 'REVIEWED'}</span>
        </div>
        <p class="text-xs text-slate-300">Risk Indication: <strong class="text-emerald-400">${r.diagnosis.overall_risk_level}</strong></p>
        <p class="text-xs text-slate-300">Reported Symptoms: ${r.request.symptoms.join(', ') || 'None'}</p>
        ${r.status === 'submitted' ? `
        <div class="flex gap-2 mt-2">
          <button onclick="updateReportStatus('${r.id}', 'vet_reviewed', 'Verified by Vet')" class="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold">Verify Case</button>
          <button onclick="updateReportStatus('${r.id}', 'lab_submitted', 'Sample required for Lab')" class="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold">Request Sample</button>
        </div>` : `<p class="text-xs text-blue-400">Vet Notes: ${r.vet_notes || ''}</p>`}
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<p class="text-xs text-red-400">Error loading cases.</p>';
  }
}

export async function fetchLabReports() {
  const container = document.getElementById('lab-reports-container');
  if (!container) return;
  container.innerHTML = '<p class="text-xs text-slate-400">Loading samples...</p>';
  if (!isBackendAvailable) {
    container.innerHTML = '<p class="text-xs text-amber-400">Backend unavailable. Lab workflow requires backend.</p>';
    return;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/workflow/reports`);
    const reports = await res.json();
    const demoLabCase = {
      id: "DEMO-LAB-001",
      request: { cattle_type: "cow" },
      status: "lab_submitted",
      diagnosis: { overall_risk_level: "HIGH - 75/100" }
    };
    const labReports = [...reports, demoLabCase].filter((r: any) => r.status === 'lab_submitted' || r.status === 'lab_verified');
    
    if (labReports.length === 0) {
      container.innerHTML = '<p class="text-xs text-slate-400">No pending lab samples.</p>';
      return;
    }
    
    container.innerHTML = labReports.map((r: any) => `
      <div class="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-2">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="font-bold text-sm text-white">${r.id.startsWith('DEMO') ? '<span class="text-red-500">[DEMO CASE]</span> ' : ''}Sample ID: SPL-${r.id}</h3>
            <p class="text-xs text-slate-400">Case ID: ${r.id}</p>
          </div>
          <span class="px-2 py-1 rounded-full text-[10px] font-bold ${r.status === 'lab_submitted' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}">${r.status === 'lab_submitted' ? 'PENDING RESULT' : 'RESULT AVAILABLE'}</span>
        </div>
        <p class="text-xs text-slate-300">Animal: ${r.request.cattle_type}</p>
        ${r.status === 'lab_submitted' ? `
        <div class="flex gap-2 mt-2">
          <button onclick="updateReportStatus('${r.id}', 'lab_verified', '', 'Positive for Pathogen')" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold">Enter Result (Positive)</button>
        </div>` : `<p class="text-xs text-emerald-400">${r.id.startsWith('DEMO') ? 'DEMO RESULT — NOT REAL SURVEILLANCE DATA' : `Lab Result: ${r.lab_results || ''}`}</p>`}
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<p class="text-xs text-red-400">Error loading samples.</p>';
  }
}

export async function updateReportStatus(reportId: string, status: string, vetNotes = '', labResults = '') {
  if (reportId.startsWith("DEMO")) {
    alert("DEMO RESULT — NOT REAL SURVEILLANCE DATA");
    // Just force a UI refresh to pretend it happened if needed, or mock it locally:
    const labReportsContainer = document.getElementById('lab-reports-container');
    if (labReportsContainer && reportId === "DEMO-LAB-001" && status === "lab_verified") {
       labReportsContainer.innerHTML = `
        <div class="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-2">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-bold text-sm text-white"><span class="text-red-500">[DEMO CASE]</span> Sample ID: SPL-${reportId}</h3>
            </div>
            <span class="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">RESULT AVAILABLE</span>
          </div>
          <p class="text-xs text-emerald-400">DEMO RESULT — NOT REAL SURVEILLANCE DATA (Positive)</p>
        </div>
       `;
    }
    return;
  }
  try {
    const body: any = { status };
    if (vetNotes) body.vet_notes = vetNotes;
    if (labResults) body.lab_results = labResults;
    await fetch(`${API_BASE_URL}/api/workflow/reports/${reportId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    fetchVetReports();
    fetchLabReports();
    fetchGISReports();
  } catch (err) {
    alert('Failed to update status.');
  }
}

let gisMap: any = null;

export async function fetchGISReports() {
  const alertContainer = document.getElementById('gis-alerts-container');
  if (!alertContainer) return;
  alertContainer.innerHTML = '';
  
  if (!gisMap) {
    try {
      gisMap = (window as any).L.map('map').setView([12.9716, 77.5946], 7);
      (window as any).L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(gisMap);
    } catch (e) {
      console.warn("Leaflet map initialization failed", e);
    }
  }
  
  if (gisMap) {
    setTimeout(() => gisMap.invalidateSize(), 100);
    gisMap.eachLayer((layer: any) => {
      if (layer instanceof (window as any).L.CircleMarker || layer instanceof (window as any).L.Marker) {
        gisMap.removeLayer(layer);
      }
    });
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/workflow/reports`);
    let reports = await res.json();
    
    // Inject Demo Cluster Data
    const demoCluster = [
      { id: "DEMO-001", request: { district: "Hemmigepura", village: "Hemmigepura", cattle_type: "cow", latitude: 12.890, longitude: 77.510 }, status: "vet_reviewed", diagnosis: { overall_risk_level: "HIGH - 75/100", matched_candidates: [{name: "Foot & Mouth Disease"}] } },
      { id: "DEMO-002", request: { district: "Hemmigepura", village: "Hemmigepura", cattle_type: "buffalo", latitude: 12.891, longitude: 77.511 }, status: "submitted", diagnosis: { overall_risk_level: "HIGH - 72/100", matched_candidates: [{name: "Foot & Mouth Disease"}] } },
      { id: "DEMO-003", request: { district: "Hemmigepura", village: "Hemmigepura", cattle_type: "calf", latitude: 12.892, longitude: 77.512 }, status: "lab_submitted", diagnosis: { overall_risk_level: "MODERATE - 55/100", matched_candidates: [{name: "Lumpy Skin Disease"}] } }
    ];
    reports = [...reports, ...demoCluster];
    
    const districtCounts: Record<string, number> = {};
    const bounds: any[] = [];
    
    reports.forEach((r: any) => {
      const dist = r.request.district || 'Unknown';
      districtCounts[dist] = (districtCounts[dist] || 0) + 1;
      
      if (r.request.latitude && r.request.longitude && gisMap) {
        bounds.push([r.request.latitude, r.request.longitude]);
        const markerColor = r.diagnosis.overall_risk_level.includes("CRITICAL") ? 'red' : r.diagnosis.overall_risk_level.includes("HIGH") ? 'orange' : r.diagnosis.overall_risk_level.includes("MODERATE") ? 'yellow' : 'blue';
        
        const circleMarker = (window as any).L.circleMarker([r.request.latitude, r.request.longitude], {
            radius: 8,
            fillColor: markerColor,
            color: '#000',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(gisMap);
        
        circleMarker.bindPopup(`
          <div class="text-xs text-slate-800">
            <strong>Case ID: ${r.id}</strong><br>
            ${r.id.startsWith("DEMO") ? "<strong class='text-red-500'>[DEMO DATA]</strong><br>" : ""}
            Location: ${dist}, ${r.request.village || 'Unknown'}<br>
            Risk: ${r.diagnosis.overall_risk_level}<br>
            Signal: ${r.diagnosis.matched_candidates?.[0]?.name || 'Unknown'}<br>
            Animal: ${r.request.cattle_type}<br>
            Status: ${r.status.toUpperCase()}
          </div>
        `);
      }
    });
    
    if (bounds.length > 0 && gisMap) {
      gisMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    }

    const clusters = Object.entries(districtCounts).filter(([_, count]) => count >= 2);
    if (clusters.length > 0) {
      alertContainer.innerHTML = clusters.map(([dist, count]) => `
        <div class="p-3 bg-red-950/40 border border-red-500/30 rounded-xl space-y-1">
          <strong class="text-red-400 font-bold block text-sm">🚨 Potential Health-Risk Cluster</strong>
          <p class="text-xs text-slate-300">Location: ${dist}</p>
          <p class="text-xs text-slate-300">Reports: ${count}</p>
          <p class="text-xs text-slate-300">Status: Veterinary investigation recommended</p>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

export function renderOfflineQueue() {
  const container = document.getElementById('offline-queue-container');
  if (!container) return;
  
  try {
    const saved = localStorage.getItem('pashuraksha_offline_queue');
    if (saved) state.offlineQueue = JSON.parse(saved);
  } catch (e) {}
  
  if (state.offlineQueue.length === 0) {
    state.offlineQueue.push({
      cattle_type: "DEMO RECORD",
      fever_status: "normal",
      symptoms: []
    } as any);
  }
  
  container.innerHTML = state.offlineQueue.map((req, idx) => `
    <div class="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-2 flex justify-between items-center">
      <div>
        <h3 class="font-bold text-sm text-white">Pending Sync: ${req.cattle_type}</h3>
        <p class="text-xs text-slate-400">Saved Locally. Status: OFFLINE</p>
      </div>
      <button onclick="retrySync(${idx})" class="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold">Retry sync</button>
    </div>
  `).join('');
}

export async function retrySync(index: number) {
  if (!isBackendAvailable) {
    alert("You're offline. Your report has been saved locally and will be submitted when connectivity is available.");
    return;
  }
  
  const req = state.offlineQueue[index];
  try {
    const response = await fetch(`${API_BASE_URL}/api/workflow/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({...req, farmer_id: "farmer_default"})
    });
    
    if (response.ok || req.cattle_type === "DEMO RECORD") {
      if (req.cattle_type === "DEMO RECORD") {
        alert("DEMO SYNCED SUCCESSFULLY");
      }
      state.offlineQueue.splice(index, 1);
      localStorage.setItem('pashuraksha_offline_queue', JSON.stringify(state.offlineQueue));
      renderOfflineQueue();
      if (req.cattle_type !== "DEMO RECORD") alert("Successfully synced.");
    }
  } catch (err) {
    alert("Still offline. Please try again later.");
  }
}

// Initialize on window load
window.addEventListener('DOMContentLoaded', async () => {
  // Expose global functions for inline HTML onclick handlers
  (window as any).switchTab = switchTab;
  (window as any).presetCase = presetCase;
  (window as any).submitDiagnosis = submitDiagnosis;
  (window as any).fetchDiseases = fetchDiseases;
  (window as any).requestAutomaticLocation = requestAutomaticLocation;
  (window as any).fetchVetReports = fetchVetReports;
  (window as any).fetchLabReports = fetchLabReports;
  (window as any).fetchGISReports = fetchGISReports;
  (window as any).renderOfflineQueue = renderOfflineQueue;
  (window as any).retrySync = retrySync;
  (window as any).changeLanguage = changeLanguage;
  (window as any).updateReportStatus = updateReportStatus;

  await checkBackendHealth();
  requestAutomaticLocation();
});
