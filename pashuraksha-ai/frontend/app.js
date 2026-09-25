// PashuRaksha AI Frontend JavaScript App

const API_BASE_URL = 'http://127.0.0.1:8000';
let isBackendAvailable = false;

// Local fallback database if backend API is offline
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
async function checkBackendHealth() {
  const badge = document.getElementById('backend-status-badge');
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      isBackendAvailable = true;
      badge.className = "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
      badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span> Backend API: Connected (${API_BASE_URL})`;
    } else {
      throw new Error("Backend offline");
    }
  } catch (err) {
    isBackendAvailable = false;
    badge.className = "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30";
    badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span> Standalone Mode (Run uvicorn backend for API)`;
  }
}

// Submit Diagnosis Request
async function submitDiagnosis() {
  const selectedSymptoms = Array.from(document.querySelectorAll('#symptom-checkboxes input:checked')).map(cb => cb.value);
  const fever = document.getElementById('fever-status').value;
  const cattleType = document.getElementById('cattle-type').value;

  const outputBody = document.getElementById('output-body');
  const riskBadge = document.getElementById('output-risk-badge');

  if (selectedSymptoms.length === 0 && fever === 'normal') {
    outputBody.innerHTML = `
      <div class="p-6 text-center border border-amber-500/30 bg-amber-500/10 rounded-xl space-y-2 text-amber-400">
        <span class="text-3xl">⚠️</span>
        <h4 class="font-semibold text-white">Please Select Observed Symptoms</h4>
        <p class="text-xs">Check at least one symptom box on the left panel to execute PashuRaksha AI diagnosis.</p>
      </div>
    `;
    riskBadge.className = 'px-3 py-1 rounded-full text-xs font-bold badge-warning';
    riskBadge.textContent = 'Input Required';
    return;
  }

  outputBody.innerHTML = `
    <div class="p-8 text-center space-y-3">
      <div class="inline-block animate-spin text-3xl">⚙️</div>
      <p class="text-xs text-emerald-400">Running PashuRaksha AI Diagnostic Evaluation...</p>
    </div>
  `;

  if (isBackendAvailable) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/diagnose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cattle_type: cattleType,
          fever_status: fever,
          symptoms: selectedSymptoms
        })
      });

      if (response.ok) {
        const data = await response.json();
        renderBackendDiagnosisResult(data);
        return;
      }
    } catch (err) {
      console.warn("Backend API call failed, using client engine fallback.", err);
    }
  }

  // Client-side Fallback Evaluation
  renderClientDiagnosisResult(cattleType, fever, selectedSymptoms);
}

function renderBackendDiagnosisResult(data) {
  const outputBody = document.getElementById('output-body');
  const riskBadge = document.getElementById('output-risk-badge');

  if (data.overall_risk_level.includes("CRITICAL") || data.overall_risk_level.includes("EMERGENCY")) {
    riskBadge.className = 'px-3 py-1 rounded-full text-xs font-bold badge-danger animate-pulse';
    riskBadge.textContent = `🚨 ${data.overall_risk_level}`;
  } else {
    riskBadge.className = 'px-3 py-1 rounded-full text-xs font-bold badge-warning';
    riskBadge.textContent = `⚠️ ${data.overall_risk_level}`;
  }

  let candidatesHTML = data.matched_candidates.map((c, idx) => `
    <div class="p-4 rounded-xl border ${idx === 0 ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-slate-700 bg-slate-900/60'} space-y-2">
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold ${idx === 0 ? 'text-emerald-400' : 'text-slate-400'}">Candidate #${idx + 1}:</span>
          <span class="font-bold text-sm text-white">${c.name}</span>
        </div>
        <span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Confidence: ${c.confidence_score}%</span>
      </div>
      <p class="text-xs text-slate-400"><strong>Pathogen:</strong> ${c.pathogen}</p>
      <div class="mt-2 space-y-1">
        <strong class="text-xs text-emerald-400 block">🛡️ PashuRaksha Immediate Precautions:</strong>
        <ul class="list-disc list-inside text-xs text-slate-200 space-y-1">
          ${c.precautions.map(p => `<li>${p}</li>`).join('')}
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
        ${data.containment_protocol.map(step => `<li>${step}</li>`).join('')}
      </ol>
    </div>
  `;

  outputBody.innerHTML = `
    <div class="space-y-4">
      <div class="p-3 bg-slate-900 rounded-lg text-xs flex justify-between items-center text-slate-300">
        <span>Cattle Profile: <strong class="capitalize text-white">${data.cattle_type}</strong> | Fever: <strong class="capitalize text-white">${data.fever_status}</strong></span>
        <span>Candidate Matches: <strong>${data.matched_candidates.length}</strong></span>
      </div>
      ${candidatesHTML}
      ${containmentHTML}
    </div>
  `;
}

function renderClientDiagnosisResult(cattleType, fever, selectedSymptoms) {
  const outputBody = document.getElementById('output-body');
  const riskBadge = document.getElementById('output-risk-badge');

  let matched = fallbackDiseases.map(d => {
    let score = 0;
    d.symptoms.forEach(s => { if (selectedSymptoms.includes(s)) score += 2; });
    if (fever === 'high') score += 1;
    return { ...d, confidence: Math.min(96, score * 22) };
  }).filter(d => d.confidence > 0).sort((a, b) => b.confidence - a.confidence);

  if (matched.length === 0) {
    riskBadge.className = 'px-3 py-1 rounded-full text-xs font-bold badge-info';
    riskBadge.textContent = 'Non-Specific Symptom';
    outputBody.innerHTML = `
      <div class="p-5 bg-slate-900 border border-slate-700 rounded-xl space-y-2">
        <h4 class="font-bold text-white text-base">General Non-Specific Indigestion / Heat Stress</h4>
        <p class="text-xs text-slate-400">Symptoms do not definitively match major infectious epizootics.</p>
        <div class="pt-2 text-xs text-emerald-400">
          <strong>Recommended Action:</strong> Offer clean drinking water with electrolytes; keep animal in shaded, ventilated pen.
        </div>
      </div>
    `;
    return;
  }

  const topMatch = matched[0];
  riskBadge.className = 'px-3 py-1 rounded-full text-xs font-bold badge-danger animate-pulse';
  riskBadge.textContent = `🚨 High Risk: ${topMatch.name}`;

  renderBackendDiagnosisResult({
    cattle_type: cattleType,
    fever_status: fever,
    overall_risk_level: `HIGH RISK: ${topMatch.name}`,
    matched_candidates: matched.map(m => ({ ...m, confidence_score: m.confidence })),
    containment_protocol: [
      "Isolate affected cattle immediately 50m away from healthy herd.",
      "Spray shed daily with neem oil or disinfectant.",
      "Notify local veterinary health center."
    ]
  });
}

// Preset Case Launcher
function presetCase(type) {
  document.querySelectorAll('#symptom-checkboxes input').forEach(cb => cb.checked = false);
  const feverSelect = document.getElementById('fever-status');

  if (type === 'lsd') {
    feverSelect.value = 'high';
    ['skin_nodules', 'drooling', 'leg_swelling', 'milk_drop'].forEach(v => {
      const el = document.querySelector(`#symptom-checkboxes input[value="${v}"]`);
      if (el) el.checked = true;
    });
  } else if (type === 'fmd') {
    feverSelect.value = 'high';
    ['mouth_blisters', 'hoof_lesions', 'drooling', 'milk_drop'].forEach(v => {
      const el = document.querySelector(`#symptom-checkboxes input[value="${v}"]`);
      if (el) el.checked = true;
    });
  } else if (type === 'hs') {
    feverSelect.value = 'high';
    ['throat_swelling', 'respiratory_distress', 'drooling', 'sudden_collapse'].forEach(v => {
      const el = document.querySelector(`#symptom-checkboxes input[value="${v}"]`);
      if (el) el.checked = true;
    });
  } else if (type === 'mastitis') {
    feverSelect.value = 'moderate';
    ['udder_swelling', 'milk_drop'].forEach(v => {
      const el = document.querySelector(`#symptom-checkboxes input[value="${v}"]`);
      if (el) el.checked = true;
    });
  }
  submitDiagnosis();
}

// Fetch Diseases for Tab 2
async function fetchDiseases(filter = 'all') {
  const container = document.getElementById('disease-cards-container');
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
      console.warn("Using fallback disease data");
    }
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
          ${(d.symptoms || []).map(s => `<span class="bg-slate-800 border border-slate-700 text-[10px] px-2 py-0.5 rounded text-slate-300">${s.replace('_', ' ')}</span>`).join('')}
        </div>
      </div>
      <div>
        <strong class="text-xs text-emerald-400 block mb-1">PashuRaksha Precaution:</strong>
        <ul class="list-disc list-inside text-xs text-slate-300 space-y-1">
          ${(d.precautions || []).map(p => `<li>${p}</li>`).join('')}
        </ul>
      </div>
    </div>
  `).join('');
}

// Fetch EVM Remedies for Tab 3
async function fetchEVM() {
  const container = document.getElementById('evm-cards-container');
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
async function fetchVaccines() {
  const tbody = document.getElementById('vaccine-table-body');
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

// Tab switcher
function switchTab(tab) {
  ['checker', 'diseases', 'evm', 'vaccine'].forEach(t => {
    document.getElementById(`section-${t}`).classList.add('hidden');
    document.getElementById(`tab-${t}`).className = 'px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:bg-slate-800 transition-all flex items-center gap-2';
  });

  document.getElementById(`section-${tab}`).classList.remove('hidden');
  document.getElementById(`tab-${tab}`).className = 'px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white transition-all flex items-center gap-2';

  if (tab === 'diseases') fetchDiseases();
  if (tab === 'evm') fetchEVM();
  if (tab === 'vaccine') fetchVaccines();
}

// Initialize on load
window.addEventListener('DOMContentLoaded', async () => {
  await checkBackendHealth();
  fetchDiseases();
});
