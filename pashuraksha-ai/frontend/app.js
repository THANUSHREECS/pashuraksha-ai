"use strict";
(() => {
  function detectApiBaseUrl() {
    const host = window.location.hostname || "127.0.0.1";
    return `http://${host}:8000`;
  }
  let API_BASE_URL = detectApiBaseUrl();
  let isBackendAvailable = false;
  function fetchWithTimeout(url, options = {}, timeoutMs = 3e3) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
  }
  const state = {
    location: {
      status: "unavailable",
      latitude: null,
      longitude: null,
      district: null,
      village: null,
      geocodingStatus: "pending"
    },
    weather: {
      status: "unavailable",
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
  async function checkBackendHealth() {
    const badge = document.getElementById("backend-status-badge");
    const urlsToCheck = Array.from(/* @__PURE__ */ new Set([
      API_BASE_URL,
      "http://127.0.0.1:8000",
      "http://localhost:8000"
    ]));
    for (const url of urlsToCheck) {
      try {
        const res = await fetchWithTimeout(`${url}/api/health`, {}, 2500);
        if (res.ok) {
          API_BASE_URL = url;
          isBackendAvailable = true;
          if (badge) {
            badge.className = "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
            badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> Backend API: Connected (${url})`;
          }
          return true;
        }
      } catch (err) {
      }
    }
    isBackendAvailable = false;
    if (badge) {
      badge.className = "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 cursor-pointer";
      badge.title = "Click to reconnect to backend API";
      badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span> Standalone / Offline Mode (Click to Retry)`;
      badge.onclick = () => {
        checkBackendHealth();
      };
    }
    return false;
  }
  function requestAutomaticLocation() {
    updateLocationUI("detecting", "Detecting location...");
    if (!navigator.geolocation) {
      fallbackIpLocation("Geolocation not supported by browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lon = parseFloat(position.coords.longitude.toFixed(6));
        state.location.status = "detected";
        state.location.latitude = lat;
        state.location.longitude = lon;
        updateLocationUI("detected", "Location detected (GPS)", lat, lon);
        await Promise.all([
          fetchReverseGeocode(lat, lon),
          fetchEnvironmentalWeather(lat, lon)
        ]);
      },
      async (error) => {
        let reason = "GPS unavailable";
        if (error.code === error.PERMISSION_DENIED) {
          reason = "GPS permission denied";
        } else if (error.code === error.TIMEOUT) {
          reason = "GPS timed out";
        }
        console.warn(`Browser GPS failed (${reason}), attempting Network IP Geolocation fallback...`);
        await fallbackIpLocation(reason);
      },
      { timeout: 6e3, enableHighAccuracy: false }
    );
  }
  async function fallbackIpLocation(priorReason) {
    updateLocationUI("detecting", "Detecting via Network IP...");
    if (isBackendAvailable) {
      try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/api/geocode/ip`, {}, 3e3);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "success" && data.latitude && data.longitude) {
            applyLocationSuccess(data.latitude, data.longitude, data.district, data.village, "Network IP");
            return;
          }
        }
      } catch (e) {
        console.warn("Backend IP geocoding failed:", e);
      }
    }
    for (const ipUrl of ["https://ipapi.co/json/", "https://ipwho.is/"]) {
      try {
        const res = await fetchWithTimeout(ipUrl, {}, 3e3);
        if (res.ok) {
          const data = await res.json();
          const lat = data.latitude ? parseFloat(data.latitude) : null;
          const lon = data.longitude ? parseFloat(data.longitude) : null;
          const district = data.city || data.region || null;
          const village = data.city || null;
          if (lat && lon) {
            applyLocationSuccess(lat, lon, district, village, "Network IP");
            return;
          }
        }
      } catch (e) {
        console.warn(`Direct IP service ${ipUrl} failed:`, e);
      }
    }
    state.location.status = "unavailable";
    state.location.latitude = null;
    state.location.longitude = null;
    state.location.district = null;
    state.location.village = null;
    updateLocationUI("unavailable", `${priorReason} (enter manually)`);
    updateWeatherUI("unavailable");
  }
  async function applyLocationSuccess(lat, lon, district, village, source) {
    state.location.status = "detected";
    state.location.latitude = lat;
    state.location.longitude = lon;
    state.location.district = district;
    state.location.village = village;
    updateLocationUI("detected", `Location detected (${source})`, lat, lon);
    const districtEl = document.getElementById("location-district");
    const villageEl = document.getElementById("location-village");
    const geoStatusEl = document.getElementById("geocoding-status-badge");
    if (districtEl && district) districtEl.value = district;
    if (villageEl && village) villageEl.value = village;
    if (geoStatusEl && district) {
      geoStatusEl.className = "text-xs text-emerald-400 font-semibold";
      geoStatusEl.textContent = `\u2713 Automatically detected (${source})`;
    }
    await Promise.all([
      fetchReverseGeocode(lat, lon),
      fetchEnvironmentalWeather(lat, lon)
    ]);
  }
  async function fetchReverseGeocode(lat, lon) {
    const districtEl = document.getElementById("location-district");
    const villageEl = document.getElementById("location-village");
    const geoStatusEl = document.getElementById("geocoding-status-badge");
    if (geoStatusEl) geoStatusEl.textContent = "Detecting District/Village...";
    try {
      let district = null;
      let village = null;
      if (isBackendAvailable) {
        const res = await fetch(`${API_BASE_URL}/api/geocode/reverse?lat=${lat}&lon=${lon}`);
        if (res.ok) {
          const data = await res.json();
          district = data.district;
          village = data.village;
        }
      } else {
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
        state.location.geocodingStatus = "success";
        if (districtEl && district) districtEl.value = district;
        if (villageEl && village) villageEl.value = village;
        if (geoStatusEl) {
          geoStatusEl.className = "text-xs text-emerald-400 font-semibold";
          geoStatusEl.textContent = "\u2713 Automatically detected";
        }
      } else {
        throw new Error("Reverse geocoding returned no address details");
      }
    } catch (err) {
      state.location.district = null;
      state.location.village = null;
      state.location.geocodingStatus = "failed";
      if (geoStatusEl) {
        geoStatusEl.className = "text-xs text-amber-400 font-semibold";
        geoStatusEl.textContent = "District/Village could not be detected (enter below)";
      }
    }
  }
  async function fetchEnvironmentalWeather(lat, lon) {
    updateWeatherUI("loading");
    try {
      if (isBackendAvailable) {
        const res = await fetch(`${API_BASE_URL}/api/weather?lat=${lat}&lon=${lon}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "available") {
            state.weather = {
              status: "available",
              temperature: data.temperature,
              humidity: data.humidity,
              rainfall: data.rainfall,
              windSpeed: data.wind_speed,
              condition: data.weather_condition,
              source: data.source,
              timestamp: data.observation_time
            };
            updateWeatherUI("available");
            return;
          }
        }
      }
      const omRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code`);
      if (omRes.ok) {
        const data = await omRes.json();
        const current = data.current || {};
        let condition = "Clear Sky";
        const code = current.weather_code || 0;
        if ([1, 2, 3].includes(code)) condition = "Partly Cloudy";
        else if ([45, 48].includes(code)) condition = "Foggy";
        else if ([51, 53, 55, 61, 63, 65].includes(code)) condition = "Rainy";
        else if ([80, 81, 82, 95].includes(code)) condition = "Thunderstorm";
        state.weather = {
          status: "available",
          temperature: current.temperature_2m ?? null,
          humidity: current.relative_humidity_2m ?? null,
          rainfall: current.precipitation ?? null,
          windSpeed: current.wind_speed_10m ?? null,
          condition,
          source: "Open-Meteo API (Client Direct)",
          timestamp: current.time ?? (/* @__PURE__ */ new Date()).toISOString()
        };
        updateWeatherUI("available");
        return;
      }
    } catch (err) {
      console.warn("Weather fetch failed:", err);
    }
    state.weather = {
      status: "unavailable",
      temperature: null,
      humidity: null,
      rainfall: null,
      windSpeed: null,
      condition: null,
      source: "Unavailable",
      timestamp: null
    };
    updateWeatherUI("unavailable");
  }
  function updateLocationUI(status, message, lat = null, lon = null) {
    const badge = document.getElementById("location-status-badge");
    const latEl = document.getElementById("location-lat");
    const lonEl = document.getElementById("location-lon");
    if (badge) {
      if (status === "detected") {
        badge.className = "px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
        badge.textContent = "\u2713 Location detected";
      } else if (status === "detecting") {
        badge.className = "px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse";
        badge.textContent = "\u{1F4E1} Detecting location...";
      } else if (status === "permission_denied") {
        badge.className = "px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30";
        badge.textContent = "\u{1F6AB} Permission denied";
      } else {
        badge.className = "px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30";
        badge.textContent = `\u26A0\uFE0F ${message}`;
      }
    }
    if (latEl) latEl.textContent = lat !== null ? lat.toFixed(6) : "Unavailable";
    if (lonEl) lonEl.textContent = lon !== null ? lon.toFixed(6) : "Unavailable";
  }
  function updateWeatherUI(status) {
    const tempEl = document.getElementById("env-temp");
    const humEl = document.getElementById("env-humidity");
    const rainEl = document.getElementById("env-rainfall");
    const windEl = document.getElementById("env-wind");
    const condEl = document.getElementById("env-condition");
    const srcEl = document.getElementById("env-source");
    if (status === "loading") {
      if (tempEl) tempEl.textContent = "Loading...";
      if (humEl) humEl.textContent = "Loading...";
      if (rainEl) rainEl.textContent = "Loading...";
      if (windEl) windEl.textContent = "Loading...";
      if (condEl) condEl.textContent = "Loading...";
      if (srcEl) srcEl.textContent = "Connecting to weather service...";
      return;
    }
    if (status === "available" && state.weather.status === "available") {
      if (tempEl) tempEl.textContent = state.weather.temperature !== null ? `${state.weather.temperature} \xB0C` : "Unavailable";
      if (humEl) humEl.textContent = state.weather.humidity !== null ? `${state.weather.humidity} %` : "Unavailable";
      if (rainEl) rainEl.textContent = state.weather.rainfall !== null ? `${state.weather.rainfall} mm` : "Unavailable";
      if (windEl) windEl.textContent = state.weather.windSpeed !== null ? `${state.weather.windSpeed} km/h` : "Unavailable";
      if (condEl) condEl.textContent = state.weather.condition || "Unavailable";
      if (srcEl) srcEl.textContent = `Source: ${state.weather.source || "Weather API"} (${state.weather.timestamp || "Latest"})`;
    } else {
      if (tempEl) tempEl.textContent = "Unavailable";
      if (humEl) humEl.textContent = "Unavailable";
      if (rainEl) rainEl.textContent = "Unavailable";
      if (windEl) windEl.textContent = "Unavailable";
      if (condEl) condEl.textContent = "Unavailable";
      if (srcEl) srcEl.textContent = "Source: Unavailable";
    }
  }
  async function submitDiagnosis() {
    const btnSubmit = document.getElementById("btn-submit");
    const originalBtnHTML = btnSubmit ? btnSubmit.innerHTML : "<span>\u{1F916} Calculate Risk Indication</span>";
    try {
      const selectedSymptoms = Array.from(document.querySelectorAll("#symptom-checkboxes input:checked")).map((cb) => cb.value);
      const fever = document.getElementById("fever-status")?.value || "normal";
      const cattleType = document.getElementById("cattle-type")?.value || "cow";
      const bodyTempInput = document.getElementById("animal-body-temp")?.value?.trim();
      const animalBodyTemp = bodyTempInput && !isNaN(parseFloat(bodyTempInput)) ? parseFloat(bodyTempInput) : null;
      if (animalBodyTemp !== null && (animalBodyTemp < 30 || animalBodyTemp > 45)) {
        alert("Invalid Animal Body Temperature. Please enter the measured animal body temperature in \xB0C (between 30 and 45).");
        return;
      }
      const districtInput = document.getElementById("location-district")?.value?.trim() || state.location.district;
      const villageInput = document.getElementById("location-village")?.value?.trim() || state.location.village;
      const outputBody = document.getElementById("output-body");
      const riskBadge = document.getElementById("output-risk-badge");
      if (selectedSymptoms.length === 0 && fever === "normal" && animalBodyTemp === null) {
        if (outputBody) {
          outputBody.innerHTML = `
          <div class="p-6 text-center border border-amber-500/30 bg-amber-500/10 rounded-xl space-y-2 text-amber-400">
            <span class="text-3xl">\u26A0\uFE0F</span>
            <h4 class="font-semibold text-white">Please Select Observed Symptoms or Enter Measured Body Temperature</h4>
            <p class="text-xs">Check at least one symptom box (e.g. Skin Nodules, Mouth Blisters) or select fever level to evaluate risk.</p>
          </div>
        `;
        }
        if (riskBadge) {
          riskBadge.className = "px-3 py-1 rounded-full text-xs font-bold badge-warning";
          riskBadge.textContent = "Input Required";
        }
        return;
      }
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.classList.add("opacity-75", "cursor-not-allowed");
        btnSubmit.innerHTML = `
        <span class="inline-block animate-spin mr-2">\u2699\uFE0F</span>
        <span>Evaluating Livestock Health Risk...</span>
      `;
      }
      if (outputBody) {
        outputBody.innerHTML = `
        <div class="p-8 text-center space-y-3">
          <div class="inline-block animate-spin text-3xl">\u2699\uFE0F</div>
          <p class="text-sm text-emerald-400 font-semibold">Evaluating health report with PashuRaksha AI Neural Diagnostics...</p>
          <p class="text-xs text-slate-400">Matching symptoms and cross-referencing environmental surveillance context...</p>
        </div>
      `;
      }
      if (riskBadge) {
        riskBadge.className = "px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse";
        riskBadge.textContent = "Analyzing...";
      }
      const payload = {
        cattle_type: cattleType,
        fever_status: fever,
        symptoms: selectedSymptoms,
        latitude: state.location.latitude,
        longitude: state.location.longitude,
        district: districtInput || null,
        village: villageInput || null,
        animal_body_temperature: animalBodyTemp,
        environmental_temperature: state.weather.temperature,
        relative_humidity: state.weather.humidity,
        rainfall: state.weather.rainfall,
        wind_speed: state.weather.windSpeed,
        weather_condition: state.weather.condition,
        weather_source: state.weather.source
      };
      let diagnosisData = null;
      if (!isBackendAvailable) {
        await checkBackendHealth();
      }
      if (isBackendAvailable) {
        try {
          const res = await fetchWithTimeout(`${API_BASE_URL}/api/diagnose`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          }, 4e3);
          if (res.ok) {
            diagnosisData = await res.json();
            fetchWithTimeout(`${API_BASE_URL}/api/workflow/reports`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...payload, farmer_id: "farmer_default" })
            }, 3e3).catch((e) => console.warn("Workflow record error:", e));
          }
        } catch (err) {
          console.warn("Backend API request failed, falling back to client-side engine.", err);
        }
      }
      if (diagnosisData) {
        renderDiagnosisResult(diagnosisData);
        return;
      }
      saveToOfflineQueue(payload);
      renderClientDiagnosisResult(payload);
    } catch (err) {
      console.error("Critical error in submitDiagnosis:", err);
      const outputBody = document.getElementById("output-body");
      const riskBadge = document.getElementById("output-risk-badge");
      if (outputBody) {
        outputBody.innerHTML = `
        <div class="p-6 bg-red-950/40 border border-red-500/30 rounded-xl space-y-2 text-red-400">
          <strong class="text-sm font-bold block">\u274C Evaluation Error</strong>
          <p class="text-xs text-slate-300">An error occurred while evaluating health risk: ${String(err)}</p>
          <button onclick="submitDiagnosis()" class="mt-2 px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold">Retry</button>
        </div>
      `;
      }
      if (riskBadge) {
        riskBadge.className = "px-3 py-1 rounded-full text-xs font-bold badge-danger";
        riskBadge.textContent = "Error";
      }
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.classList.remove("opacity-75", "cursor-not-allowed");
        btnSubmit.innerHTML = originalBtnHTML;
      }
    }
  }
  function saveToOfflineQueue(payload) {
    try {
      state.offlineQueue.push(payload);
      localStorage.setItem("pashuraksha_offline_queue", JSON.stringify(state.offlineQueue));
    } catch (e) {
      console.warn("Could not save to localStorage offline queue", e);
    }
  }
  function renderDiagnosisResult(data) {
    const outputBody = document.getElementById("output-body");
    const riskBadge = document.getElementById("output-risk-badge");
    if (!outputBody || !riskBadge) return;
    const riskLevel = data.overall_risk_level || "LOW \u2014 0/100";
    if (riskLevel.includes("CRITICAL") || riskLevel.includes("EMERGENCY")) {
      riskBadge.className = "px-3 py-1 rounded-full text-xs font-bold badge-danger animate-pulse";
      riskBadge.textContent = `\u{1F6A8} ${riskLevel}`;
    } else if (riskLevel.includes("HIGH")) {
      riskBadge.className = "px-3 py-1 rounded-full text-xs font-bold badge-danger";
      riskBadge.textContent = `\u26A0\uFE0F ${riskLevel}`;
    } else if (riskLevel.includes("MODERATE")) {
      riskBadge.className = "px-3 py-1 rounded-full text-xs font-bold badge-warning";
      riskBadge.textContent = `\u26A0\uFE0F ${riskLevel}`;
    } else {
      riskBadge.className = "px-3 py-1 rounded-full text-xs font-bold badge-success";
      riskBadge.textContent = `\u2713 ${riskLevel}`;
    }
    let envSignalsHTML = "";
    if (data.environmental_signals_used && data.environmental_signals_used.length > 0) {
      envSignalsHTML = `
      <div class="p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl space-y-1.5 text-xs text-blue-300">
        <strong class="text-blue-400 font-bold block flex items-center gap-1.5">
          \u{1F326} Environmental Surveillance Signals Influencing Risk:
        </strong>
        <ul class="list-disc list-inside space-y-1 text-slate-300">
          ${data.environmental_signals_used.map((sig) => `<li>${sig}</li>`).join("")}
        </ul>
      </div>
    `;
    }
    let animalTempHTML = "";
    if (data.animal_body_temperature !== null && data.animal_body_temperature !== void 0) {
      animalTempHTML = `<span class="bg-amber-900/40 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono">Measured Animal Temp: ${data.animal_body_temperature} \xB0C</span>`;
    }
    let candidatesHTML = "";
    if (data.matched_candidates && data.matched_candidates.length > 0) {
      candidatesHTML = data.matched_candidates.map((c, idx) => `
      <div class="p-4 rounded-xl border ${idx === 0 ? "border-emerald-500/50 bg-emerald-950/20" : "border-slate-700 bg-slate-900/60"} space-y-2">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold ${idx === 0 ? "text-emerald-400" : "text-slate-400"}">Suspected Signal #${idx + 1}:</span>
            <span class="font-bold text-sm text-white">${c.name}</span>
          </div>
          <span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Confidence: ${Math.round(c.confidence_score)}/100</span>
        </div>
        <p class="text-xs text-slate-400"><strong>Pathogen / Vector:</strong> ${c.pathogen}</p>
        <div class="mt-2 space-y-1">
          <strong class="text-xs text-emerald-400 block">\u{1F6E1}\uFE0F Recommended Next Steps & Prevention:</strong>
          <ul class="list-disc list-inside text-xs text-slate-200 space-y-1">
            ${c.precautions.map((p) => `<li>${p}</li>`).join("")}
          </ul>
        </div>
        <div class="pt-2 text-xs text-amber-300">
          <strong>\u{1F33F} Ethno-Veterinary Remedy:</strong> ${c.evm_remedy}
        </div>
      </div>
    `).join("");
    } else {
      candidatesHTML = `
      <div class="p-4 rounded-xl border border-slate-700 bg-slate-900/60 space-y-2">
        <h4 class="font-bold text-sm text-emerald-400">Low Specific Epizootic Risk</h4>
        <p class="text-xs text-slate-300">The reported indicators do not exhibit high confidence for major surveyed epizootics (LSD, FMD, HS, BQ, Mastitis).</p>
        <div class="text-xs text-slate-400">
          <strong>Recommended Action:</strong> Provide clean drinking water, protect from heat/stress, isolate if fever increases, and consult local veterinary personnel if condition persists.
        </div>
      </div>
    `;
    }
    let containmentHTML = "";
    if (data.containment_protocol && data.containment_protocol.length > 0) {
      containmentHTML = `
      <div class="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-2 text-amber-300">
        <strong class="block font-bold">\u{1F4E2} Containment & Bio-Security Protocol:</strong>
        <ol class="list-decimal list-inside space-y-1">
          ${data.containment_protocol.map((step) => `<li>${step}</li>`).join("")}
        </ol>
      </div>
    `;
    }
    const districtDisplay = data.location?.district || state.location.district || "Not detected (Optional)";
    const villageDisplay = data.location?.village || state.location.village || "Locality";
    outputBody.innerHTML = `
    <div class="space-y-4">
      <div class="p-3 bg-slate-900 rounded-lg text-xs flex flex-wrap justify-between items-center gap-2 text-slate-300">
        <span>Cattle: <strong class="capitalize text-white">${data.cattle_type}</strong> | Fever: <strong class="capitalize text-white">${data.fever_status}</strong></span>
        ${animalTempHTML}
        <span>Location: <strong class="text-emerald-400">${districtDisplay}, ${villageDisplay}</strong></span>
      </div>
      ${envSignalsHTML}
      ${candidatesHTML}
      ${containmentHTML}
      <div class="mt-4 pt-4 border-t border-slate-700 text-xs text-slate-400 text-center">
        Prototype risk indication based on available health, environmental and surveillance signals.
        <br><strong class="text-amber-400">\u26A0\uFE0F Risk indication is not a clinical diagnosis. Veterinary examination and laboratory confirmation remain authoritative.</strong>
      </div>
    </div>
  `;
  }
  function renderClientDiagnosisResult(payload) {
    const outputBody = document.getElementById("output-body");
    const riskBadge = document.getElementById("output-risk-badge");
    let envSignals = [];
    if (payload.environmental_temperature && payload.relative_humidity && payload.environmental_temperature > 30 && payload.relative_humidity > 75) {
      envSignals.push("High ambient temperature & high humidity -> Vector proliferation risk (LSD)");
    }
    if (payload.rainfall && payload.rainfall > 10) {
      envSignals.push("Heavy rainfall -> Increased monsoon bacterial epizootic risk (HS)");
    }
    let matched = fallbackDiseases.map((d) => {
      let score = 0;
      d.symptoms.forEach((s) => {
        if (payload.symptoms.includes(s)) score += 2;
      });
      if (payload.fever_status === "high" || payload.animal_body_temperature && payload.animal_body_temperature >= 39.5) score += 1.5;
      if (d.id === "lsd" && envSignals.some((s) => s.includes("Vector"))) score += 1;
      if (d.id === "hs" && envSignals.some((s) => s.includes("rainfall"))) score += 1;
      return { ...d, confidence: Math.min(96, score * 20) };
    }).filter((d) => d.confidence > 0).sort((a, b) => b.confidence - a.confidence);
    if (matched.length === 0) {
      if (riskBadge) {
        riskBadge.className = "px-3 py-1 rounded-full text-xs font-bold badge-info";
        riskBadge.textContent = "Non-Specific Symptom";
      }
      if (outputBody) {
        outputBody.innerHTML = `
        <div class="p-5 bg-slate-900 border border-slate-700 rounded-xl space-y-2">
          <h4 class="font-bold text-white text-base">General Non-Specific Indigestion / Heat Stress</h4>
          <p class="text-xs text-slate-400">Symptoms do not definitively match major infectious epizootics.</p>
          <div class="pt-2 text-xs text-emerald-400">
            <strong>Recommended Action:</strong> Offer clean drinking water with electrolytes; keep animal in shaded, ventilated pen.
          </div>
          <div class="mt-4 pt-4 border-t border-slate-700 text-xs text-slate-400 text-center">
            <strong>\u26A0\uFE0F Risk indication is not a clinical diagnosis. Veterinary verification is recommended.</strong>
          </div>
        </div>
      `;
      }
      return;
    }
    const topMatch = matched[0];
    const maxScore = topMatch.confidence;
    let overallRisk = `LOW \u2014 ${Math.round(maxScore)}/100`;
    if (maxScore >= 80) overallRisk = `CRITICAL \u2014 ${Math.round(maxScore)}/100`;
    else if (maxScore >= 60) overallRisk = `HIGH \u2014 ${Math.round(maxScore)}/100`;
    else if (maxScore >= 30) overallRisk = `MODERATE \u2014 ${Math.round(maxScore)}/100`;
    renderDiagnosisResult({
      cattle_type: payload.cattle_type,
      fever_status: payload.fever_status,
      overall_risk_level: overallRisk,
      matched_candidates: matched.map((m) => ({ ...m, confidence_score: m.confidence })),
      environmental_signals_used: envSignals,
      animal_body_temperature: payload.animal_body_temperature,
      location: {
        district: payload.district || state.location.district || "Not detected (Optional)",
        village: payload.village || state.location.village || "Locality"
      },
      containment_protocol: [
        "Isolate affected cattle immediately 50m away from healthy herd.",
        "Spray shed daily with neem oil or disinfectant.",
        "Notify local veterinary health center."
      ]
    });
  }
  function presetCase(type) {
    document.querySelectorAll("#symptom-checkboxes input").forEach((cb) => cb.checked = false);
    const feverSelect = document.getElementById("fever-status");
    if (type === "lsd") {
      if (feverSelect) feverSelect.value = "high";
      ["skin_nodules", "drooling", "leg_swelling", "milk_drop"].forEach((v) => {
        const el = document.querySelector(`#symptom-checkboxes input[value="${v}"]`);
        if (el) el.checked = true;
      });
    } else if (type === "fmd") {
      if (feverSelect) feverSelect.value = "high";
      ["mouth_blisters", "hoof_lesions", "drooling", "milk_drop"].forEach((v) => {
        const el = document.querySelector(`#symptom-checkboxes input[value="${v}"]`);
        if (el) el.checked = true;
      });
    } else if (type === "hs") {
      if (feverSelect) feverSelect.value = "high";
      ["throat_swelling", "respiratory_distress", "drooling", "sudden_collapse"].forEach((v) => {
        const el = document.querySelector(`#symptom-checkboxes input[value="${v}"]`);
        if (el) el.checked = true;
      });
    } else if (type === "mastitis") {
      if (feverSelect) feverSelect.value = "moderate";
      ["udder_swelling", "milk_drop"].forEach((v) => {
        const el = document.querySelector(`#symptom-checkboxes input[value="${v}"]`);
        if (el) el.checked = true;
      });
    }
    submitDiagnosis();
  }
  async function fetchDiseases(filter = "all") {
    const container = document.getElementById("disease-cards-container");
    if (!container) return;
    container.innerHTML = '<p class="text-xs text-slate-400 p-4">Loading disease catalog...</p>';
    let diseases = fallbackDiseases;
    if (isBackendAvailable) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/diseases`);
        if (res.ok) {
          const data = await res.json();
          diseases = data.diseases;
        }
      } catch (e) {
      }
    }
    const filtered = diseases.filter((d) => {
      if (filter === "all") return true;
      if (filter === "new") return d.type === "new";
      return d.category === filter;
    });
    container.innerHTML = filtered.map((d) => `
    <div class="p-5 bg-slate-900 border border-slate-700 rounded-xl space-y-3">
      <div class="flex justify-between items-start">
        <div>
          <h3 class="font-bold text-base text-white">${d.name}</h3>
          <p class="text-xs text-slate-400">Pathogen: ${d.pathogen || d.cause}</p>
        </div>
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${d.severity === "CRITICAL" || d.severity === "EMERGENCY" ? "badge-danger" : "badge-warning"}">${d.severity || "HIGH"}</span>
      </div>
      <div>
        <strong class="text-xs text-slate-300 block mb-1">Key Warning Symptoms:</strong>
        <div class="flex flex-wrap gap-1">
          ${(d.symptoms || []).map((s) => `<span class="bg-slate-800 border border-slate-700 text-[10px] px-2 py-0.5 rounded text-slate-300">${s.replace("_", " ")}</span>`).join("")}
        </div>
      </div>
      <div>
        <strong class="text-xs text-emerald-400 block mb-1">PashuRaksha Precaution:</strong>
        <ul class="list-disc list-inside text-xs text-slate-300 space-y-1">
          ${(d.precautions || []).map((p) => `<li>${p}</li>`).join("")}
        </ul>
      </div>
    </div>
  `).join("");
  }
  async function fetchEVM() {
    const container = document.getElementById("evm-cards-container");
    if (!container) return;
    container.innerHTML = '<p class="text-xs text-slate-400 p-4">Loading remedies...</p>';
    let remedies = fallbackDiseases.map((d) => ({ disease: d.name, remedy: d.evm_remedy }));
    if (isBackendAvailable) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/evm-remedies`);
        if (res.ok) {
          const data = await res.json();
          remedies = data.remedies;
        }
      } catch (e) {
      }
    }
    container.innerHTML = remedies.map((r) => `
    <div class="p-5 bg-slate-900 border border-slate-700 rounded-xl space-y-2">
      <h3 class="font-bold text-sm text-emerald-400">${r.disease}</h3>
      <p class="text-xs text-slate-300">${r.remedy}</p>
    </div>
  `).join("");
  }
  async function fetchVaccines() {
    const tbody = document.getElementById("vaccine-table-body");
    if (!tbody) return;
    let schedule = fallbackVaccines;
    if (isBackendAvailable) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/vaccination-schedule`);
        if (res.ok) {
          const data = await res.json();
          schedule = data.schedule;
        }
      } catch (e) {
      }
    }
    tbody.innerHTML = schedule.map((v) => `
    <tr class="hover:bg-slate-700/30">
      <td class="p-3 font-semibold text-white">${v.disease}</td>
      <td class="p-3">${v.primary_dose}</td>
      <td class="p-3">${v.booster}</td>
      <td class="p-3 text-emerald-400 font-medium">${v.recommended_time}</td>
      <td class="p-3"><span class="badge-info px-2 py-0.5 rounded text-[10px] font-bold">${v.program}</span></td>
    </tr>
  `).join("");
  }
  function switchTab(tab) {
    ["checker", "diseases", "evm", "vaccine", "vet", "lab", "gis", "offline"].forEach((t) => {
      const sec = document.getElementById(`section-${t}`);
      const tabBtn = document.getElementById(`tab-${t}`);
      if (sec) sec.classList.add("hidden");
      if (tabBtn) tabBtn.className = "px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:bg-slate-800 transition-all flex items-center gap-2";
    });
    const targetSec = document.getElementById(`section-${tab}`);
    const targetBtn = document.getElementById(`tab-${tab}`);
    if (targetSec) targetSec.classList.remove("hidden");
    if (targetBtn) targetBtn.className = "px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white transition-all flex items-center gap-2";
    if (tab === "diseases") fetchDiseases();
    if (tab === "evm") fetchEVM();
    if (tab === "vaccine") fetchVaccines();
    if (tab === "gis") {
      fetchGISReports();
      if (gisMap) setTimeout(() => gisMap.invalidateSize(), 100);
    }
    if (tab === "vet") fetchVetReports();
    if (tab === "lab") fetchLabReports();
    if (tab === "offline") renderOfflineQueue();
  }
  const translations = {
    "en": {
      "lbl-form-title": "\u{1F4DD} Livestock Health Report Form",
      "lbl-form-desc": "Submit animal profile and observed health signals for PashuRaksha AI risk evaluation.",
      "btn-submit": "\u{1F916} Calculate Risk Indication",
      "lbl-result-title": "\u26A0\uFE0F Livestock Health Risk Assessment",
      "tab-checker": "\u{1F4DD} Farmer Report",
      "tab-vet": "\u{1F468}\u200D\u2695\uFE0F Veterinary Verification",
      "tab-lab": "\u{1F52C} Laboratory",
      "tab-gis": "\u{1F5FA}\uFE0F GIS Surveillance & Alerts",
      "tab-diseases": "\u{1F4DA} Disease Matrix",
      "tab-evm": "\u{1F6E1}\uFE0F Prevention & Care",
      "tab-offline": "\u{1F4F6} Offline Queue"
    },
    "kn": {
      "lbl-form-title": "\u{1F4DD} \u0C9C\u0CBE\u0CA8\u0CC1\u0CB5\u0CBE\u0CB0\u0CC1 \u0C86\u0CB0\u0CCB\u0C97\u0CCD\u0CAF \u0CB5\u0CB0\u0CA6\u0CBF \u0CAB\u0CBE\u0CB0\u0CCD\u0CAE\u0CCD",
      "lbl-form-desc": "\u0CAA\u0CB6\u0CC1\u0CB0\u0C95\u0CCD\u0CB7\u0CBE \u0C8E\u0C90 \u0C85\u0CAA\u0CBE\u0CAF\u0CA6 \u0CAE\u0CCC\u0CB2\u0CCD\u0CAF\u0CAE\u0CBE\u0CAA\u0CA8\u0C95\u0CCD\u0C95\u0CBE\u0C97\u0CBF \u0CAA\u0CCD\u0CB0\u0CBE\u0CA3\u0CBF\u0C97\u0CB3 \u0CAA\u0CCD\u0CB0\u0CCA\u0CAB\u0CC8\u0CB2\u0CCD \u0C85\u0CA8\u0CCD\u0CA8\u0CC1 \u0CB8\u0CB2\u0CCD\u0CB2\u0CBF\u0CB8\u0CBF.",
      "btn-submit": "\u{1F916} \u0C85\u0CAA\u0CBE\u0CAF\u0CA6 \u0CB8\u0CC2\u0C9A\u0CA8\u0CC6\u0CAF\u0CA8\u0CCD\u0CA8\u0CC1 \u0CB2\u0CC6\u0C95\u0CCD\u0C95\u0CB9\u0CBE\u0C95\u0CBF",
      "lbl-result-title": "\u26A0\uFE0F \u0C9C\u0CBE\u0CA8\u0CC1\u0CB5\u0CBE\u0CB0\u0CC1 \u0C86\u0CB0\u0CCB\u0C97\u0CCD\u0CAF \u0C85\u0CAA\u0CBE\u0CAF\u0CA6 \u0CAE\u0CCC\u0CB2\u0CCD\u0CAF\u0CAE\u0CBE\u0CAA\u0CA8",
      "tab-checker": "\u{1F4DD} \u0CB0\u0CC8\u0CA4 \u0CB5\u0CB0\u0CA6\u0CBF",
      "tab-vet": "\u{1F468}\u200D\u2695\uFE0F \u0CAA\u0CB6\u0CC1\u0CB5\u0CC8\u0CA6\u0CCD\u0CAF \u0CAA\u0CB0\u0CBF\u0CB6\u0CC0\u0CB2\u0CA8\u0CC6",
      "tab-lab": "\u{1F52C} \u0CAA\u0CCD\u0CB0\u0CAF\u0CCB\u0C97\u0CBE\u0CB2\u0CAF",
      "tab-gis": "\u{1F5FA}\uFE0F \u0C9C\u0CBF\u0C90\u0C8E\u0CB8\u0CCD \u0C8E\u0C9A\u0CCD\u0C9A\u0CB0\u0CBF\u0C95\u0CC6\u0C97\u0CB3\u0CC1",
      "tab-diseases": "\u{1F4DA} \u0CB0\u0CCB\u0C97\u0CA6 \u0CAE\u0CCD\u0CAF\u0CBE\u0C9F\u0CCD\u0CB0\u0CBF\u0C95\u0CCD\u0CB8\u0CCD",
      "tab-evm": "\u{1F6E1}\uFE0F \u0CA4\u0CA1\u0CC6\u0C97\u0C9F\u0CCD\u0C9F\u0CC1\u0CB5\u0CBF\u0C95\u0CC6 \u0CAE\u0CA4\u0CCD\u0CA4\u0CC1 \u0C86\u0CB0\u0CC8\u0C95\u0CC6",
      "tab-offline": "\u{1F4F6} \u0C86\u0CAB\u0CCD\u200C\u0CB2\u0CC8\u0CA8\u0CCD \u0CB8\u0CB0\u0CA4\u0CBF"
    },
    "hi": {
      "lbl-form-title": "\u{1F4DD} \u092A\u0936\u0941 \u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F \u0930\u093F\u092A\u094B\u0930\u094D\u091F \u092B\u0949\u0930\u094D\u092E",
      "lbl-form-desc": "\u091C\u094B\u0916\u093F\u092E \u092E\u0942\u0932\u094D\u092F\u093E\u0902\u0915\u0928 \u0915\u0947 \u0932\u093F\u090F \u092A\u0936\u0941 \u092A\u094D\u0930\u094B\u092B\u093C\u093E\u0907\u0932 \u0914\u0930 \u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F \u0938\u0902\u0915\u0947\u0924 \u091C\u092E\u093E \u0915\u0930\u0947\u0902\u0964",
      "btn-submit": "\u{1F916} \u091C\u094B\u0916\u093F\u092E \u0938\u0902\u0915\u0947\u0924 \u0915\u0940 \u0917\u0923\u0928\u093E \u0915\u0930\u0947\u0902",
      "lbl-result-title": "\u26A0\uFE0F \u092A\u0936\u0941 \u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F \u091C\u094B\u0916\u093F\u092E \u092E\u0942\u0932\u094D\u092F\u093E\u0902\u0915\u0928",
      "tab-checker": "\u{1F4DD} \u0915\u093F\u0938\u093E\u0928 \u0930\u093F\u092A\u094B\u0930\u094D\u091F",
      "tab-vet": "\u{1F468}\u200D\u2695\uFE0F \u092A\u0936\u0941 \u091A\u093F\u0915\u093F\u0924\u094D\u0938\u093E \u0938\u0924\u094D\u092F\u093E\u092A\u0928",
      "tab-lab": "\u{1F52C} \u092A\u094D\u0930\u092F\u094B\u0917\u0936\u093E\u0932\u093E",
      "tab-gis": "\u{1F5FA}\uFE0F \u091C\u0940\u0906\u0908\u090F\u0938 \u0905\u0932\u0930\u094D\u091F",
      "tab-diseases": "\u{1F4DA} \u0930\u094B\u0917 \u092E\u0948\u091F\u094D\u0930\u093F\u0915\u094D\u0938",
      "tab-evm": "\u{1F6E1}\uFE0F \u0930\u094B\u0915\u0925\u093E\u092E \u0914\u0930 \u0926\u0947\u0916\u092D\u093E\u0932",
      "tab-offline": "\u{1F4F6} \u0911\u092B\u093C\u0932\u093E\u0907\u0928 \u0915\u0924\u093E\u0930"
    }
  };
  function changeLanguage(lang) {
    const dict = translations[lang];
    if (!dict) return;
    for (const [id, text] of Object.entries(dict)) {
      const el = document.getElementById(id);
      if (el) {
        if (el.tagName === "BUTTON") {
          el.innerHTML = text;
        } else {
          el.textContent = text;
        }
      }
    }
  }
  async function fetchVetReports() {
    const container = document.getElementById("vet-reports-container");
    if (!container) return;
    container.innerHTML = '<p class="text-xs text-slate-400">Loading cases...</p>';
    if (!isBackendAvailable) {
      container.innerHTML = '<p class="text-xs text-amber-400">Backend unavailable. Vet workflow requires backend.</p>';
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/workflow/reports`);
      const reports = await res.json();
      const vetReports = reports.filter((r) => r.status === "submitted" || r.status === "vet_reviewed");
      if (vetReports.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400">No pending veterinary cases.</p>';
        return;
      }
      container.innerHTML = vetReports.map((r) => `
      <div class="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-2">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="font-bold text-sm text-white">Case ID: ${r.id}</h3>
            <p class="text-xs text-slate-400">Location: ${r.request.district || "Unknown"}, ${r.request.village || "Unknown"}</p>
          </div>
          <span class="px-2 py-1 rounded-full text-[10px] font-bold ${r.status === "submitted" ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"}">${r.status === "submitted" ? "PENDING REVIEW" : "REVIEWED"}</span>
        </div>
        <p class="text-xs text-slate-300">Risk Indication: <strong class="text-emerald-400">${r.diagnosis.overall_risk_level}</strong></p>
        <p class="text-xs text-slate-300">Reported Symptoms: ${r.request.symptoms.join(", ") || "None"}</p>
        ${r.status === "submitted" ? `
        <div class="flex gap-2 mt-2">
          <button onclick="updateReportStatus('${r.id}', 'vet_reviewed', 'Verified by Vet')" class="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold">Verify Case</button>
          <button onclick="updateReportStatus('${r.id}', 'lab_submitted', 'Sample required for Lab')" class="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold">Request Sample</button>
        </div>` : `<p class="text-xs text-blue-400">Vet Notes: ${r.vet_notes || ""}</p>`}
      </div>
    `).join("");
    } catch (err) {
      container.innerHTML = '<p class="text-xs text-red-400">Error loading cases.</p>';
    }
  }
  async function fetchLabReports() {
    const container = document.getElementById("lab-reports-container");
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
      const labReports = [...reports, demoLabCase].filter((r) => r.status === "lab_submitted" || r.status === "lab_verified");
      if (labReports.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400">No pending lab samples.</p>';
        return;
      }
      container.innerHTML = labReports.map((r) => `
      <div class="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-2">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="font-bold text-sm text-white">${r.id.startsWith("DEMO") ? '<span class="text-red-500">[DEMO CASE]</span> ' : ""}Sample ID: SPL-${r.id}</h3>
            <p class="text-xs text-slate-400">Case ID: ${r.id}</p>
          </div>
          <span class="px-2 py-1 rounded-full text-[10px] font-bold ${r.status === "lab_submitted" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}">${r.status === "lab_submitted" ? "PENDING RESULT" : "RESULT AVAILABLE"}</span>
        </div>
        <p class="text-xs text-slate-300">Animal: ${r.request.cattle_type}</p>
        ${r.status === "lab_submitted" ? `
        <div class="flex gap-2 mt-2">
          <button onclick="updateReportStatus('${r.id}', 'lab_verified', '', 'Positive for Pathogen')" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold">Enter Result (Positive)</button>
        </div>` : `<p class="text-xs text-emerald-400">${r.id.startsWith("DEMO") ? "DEMO RESULT \u2014 NOT REAL SURVEILLANCE DATA" : `Lab Result: ${r.lab_results || ""}`}</p>`}
      </div>
    `).join("");
    } catch (err) {
      container.innerHTML = '<p class="text-xs text-red-400">Error loading samples.</p>';
    }
  }
  async function updateReportStatus(reportId, status, vetNotes = "", labResults = "") {
    if (reportId.startsWith("DEMO")) {
      alert("DEMO RESULT \u2014 NOT REAL SURVEILLANCE DATA");
      const labReportsContainer = document.getElementById("lab-reports-container");
      if (labReportsContainer && reportId === "DEMO-LAB-001" && status === "lab_verified") {
        labReportsContainer.innerHTML = `
        <div class="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-2">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-bold text-sm text-white"><span class="text-red-500">[DEMO CASE]</span> Sample ID: SPL-${reportId}</h3>
            </div>
            <span class="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">RESULT AVAILABLE</span>
          </div>
          <p class="text-xs text-emerald-400">DEMO RESULT \u2014 NOT REAL SURVEILLANCE DATA (Positive)</p>
        </div>
       `;
      }
      return;
    }
    try {
      const body = { status };
      if (vetNotes) body.vet_notes = vetNotes;
      if (labResults) body.lab_results = labResults;
      await fetch(`${API_BASE_URL}/api/workflow/reports/${reportId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      fetchVetReports();
      fetchLabReports();
      fetchGISReports();
    } catch (err) {
      alert("Failed to update status.");
    }
  }
  let gisMap = null;
  async function fetchGISReports() {
    const alertContainer = document.getElementById("gis-alerts-container");
    if (!alertContainer) return;
    alertContainer.innerHTML = "";
    if (!gisMap) {
      try {
        gisMap = window.L.map("map").setView([12.9716, 77.5946], 7);
        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "\xA9 OpenStreetMap contributors"
        }).addTo(gisMap);
      } catch (e) {
        console.warn("Leaflet map initialization failed", e);
      }
    }
    if (gisMap) {
      setTimeout(() => gisMap.invalidateSize(), 100);
      gisMap.eachLayer((layer) => {
        if (layer instanceof window.L.CircleMarker || layer instanceof window.L.Marker) {
          gisMap.removeLayer(layer);
        }
      });
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/workflow/reports`);
      let reports = await res.json();
      const demoCluster = [
        { id: "DEMO-001", request: { district: "Hemmigepura", village: "Hemmigepura", cattle_type: "cow", latitude: 12.89, longitude: 77.51 }, status: "vet_reviewed", diagnosis: { overall_risk_level: "HIGH - 75/100", matched_candidates: [{ name: "Foot & Mouth Disease" }] } },
        { id: "DEMO-002", request: { district: "Hemmigepura", village: "Hemmigepura", cattle_type: "buffalo", latitude: 12.891, longitude: 77.511 }, status: "submitted", diagnosis: { overall_risk_level: "HIGH - 72/100", matched_candidates: [{ name: "Foot & Mouth Disease" }] } },
        { id: "DEMO-003", request: { district: "Hemmigepura", village: "Hemmigepura", cattle_type: "calf", latitude: 12.892, longitude: 77.512 }, status: "lab_submitted", diagnosis: { overall_risk_level: "MODERATE - 55/100", matched_candidates: [{ name: "Lumpy Skin Disease" }] } }
      ];
      reports = [...reports, ...demoCluster];
      const districtCounts = {};
      const bounds = [];
      reports.forEach((r) => {
        const dist = r.request.district || "Unknown";
        districtCounts[dist] = (districtCounts[dist] || 0) + 1;
        if (r.request.latitude && r.request.longitude && gisMap) {
          bounds.push([r.request.latitude, r.request.longitude]);
          const markerColor = r.diagnosis.overall_risk_level.includes("CRITICAL") ? "red" : r.diagnosis.overall_risk_level.includes("HIGH") ? "orange" : r.diagnosis.overall_risk_level.includes("MODERATE") ? "yellow" : "blue";
          const circleMarker = window.L.circleMarker([r.request.latitude, r.request.longitude], {
            radius: 8,
            fillColor: markerColor,
            color: "#000",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
          }).addTo(gisMap);
          circleMarker.bindPopup(`
          <div class="text-xs text-slate-800">
            <strong>Case ID: ${r.id}</strong><br>
            ${r.id.startsWith("DEMO") ? "<strong class='text-red-500'>[DEMO DATA]</strong><br>" : ""}
            Location: ${dist}, ${r.request.village || "Unknown"}<br>
            Risk: ${r.diagnosis.overall_risk_level}<br>
            Signal: ${r.diagnosis.matched_candidates?.[0]?.name || "Unknown"}<br>
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
          <strong class="text-red-400 font-bold block text-sm">\u{1F6A8} Potential Health-Risk Cluster</strong>
          <p class="text-xs text-slate-300">Location: ${dist}</p>
          <p class="text-xs text-slate-300">Reports: ${count}</p>
          <p class="text-xs text-slate-300">Status: Veterinary investigation recommended</p>
        </div>
      `).join("");
      }
    } catch (err) {
      console.error(err);
    }
  }
  function renderOfflineQueue() {
    const container = document.getElementById("offline-queue-container");
    if (!container) return;
    try {
      const saved = localStorage.getItem("pashuraksha_offline_queue");
      if (saved) state.offlineQueue = JSON.parse(saved);
    } catch (e) {
    }
    if (state.offlineQueue.length === 0) {
      state.offlineQueue.push({
        cattle_type: "DEMO RECORD",
        fever_status: "normal",
        symptoms: []
      });
    }
    container.innerHTML = state.offlineQueue.map((req, idx) => `
    <div class="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-2 flex justify-between items-center">
      <div>
        <h3 class="font-bold text-sm text-white">Pending Sync: ${req.cattle_type}</h3>
        <p class="text-xs text-slate-400">Saved Locally. Status: OFFLINE</p>
      </div>
      <button onclick="retrySync(${idx})" class="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold">Retry sync</button>
    </div>
  `).join("");
  }
  async function retrySync(index) {
    if (!isBackendAvailable) {
      alert("You're offline. Your report has been saved locally and will be submitted when connectivity is available.");
      return;
    }
    const req = state.offlineQueue[index];
    try {
      const response = await fetch(`${API_BASE_URL}/api/workflow/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...req, farmer_id: "farmer_default" })
      });
      if (response.ok || req.cattle_type === "DEMO RECORD") {
        if (req.cattle_type === "DEMO RECORD") {
          alert("DEMO SYNCED SUCCESSFULLY");
        }
        state.offlineQueue.splice(index, 1);
        localStorage.setItem("pashuraksha_offline_queue", JSON.stringify(state.offlineQueue));
        renderOfflineQueue();
        if (req.cattle_type !== "DEMO RECORD") alert("Successfully synced.");
      }
    } catch (err) {
      alert("Still offline. Please try again later.");
    }
  }
  window.switchTab = switchTab;
  window.presetCase = presetCase;
  window.submitDiagnosis = submitDiagnosis;
  window.fetchDiseases = fetchDiseases;
  window.requestAutomaticLocation = requestAutomaticLocation;
  window.fetchVetReports = fetchVetReports;
  window.fetchLabReports = fetchLabReports;
  window.fetchGISReports = fetchGISReports;
  window.renderOfflineQueue = renderOfflineQueue;
  window.retrySync = retrySync;
  window.changeLanguage = changeLanguage;
  window.updateReportStatus = updateReportStatus;
  async function initApp() {
    console.log("[PashuRaksha AI] Initializing dashboard...");
    try {
      await checkBackendHealth();
    } catch (e) {
      console.warn("[PashuRaksha AI] Backend check failed:", e);
    }
    try {
      requestAutomaticLocation();
    } catch (e) {
      console.warn("[PashuRaksha AI] Location detection failed:", e);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initApp();
    });
  } else {
    initApp();
  }
})();
