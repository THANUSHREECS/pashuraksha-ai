import uuid
import datetime
from fastapi import FastAPI, HTTPException, Query, Body, Path
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any

from .models import (
    DiagnosisRequest, DiagnosisResponse, WorkflowReport, WorkflowReportCreate
)
from .ai_engine import analyze_livestock_health
from .data import DISEASES_DB, VACCINATION_SCHEDULE
from .weather_service import get_weather_data, reverse_geocode

app = FastAPI(
    title="PashuRaksha AI API",
    description="Cattle Disease Early Detection, Environmental Integration & Farmer-Vet-Lab Bio-Security System",
    version="2.4.0"
)

# Enable CORS for local and web frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for workflow reports (Farmer -> Vet -> Lab)
REPORTS_DB: Dict[str, WorkflowReport] = {}

@app.get("/")
def root():
    return {
        "service": "PashuRaksha AI Cattle Disease Agent API",
        "version": "2.4.0",
        "status": "online",
        "docs_url": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "engine": "PashuRaksha AI Neural Diagnostics"}

@app.get("/api/weather")
def fetch_weather(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    """
    Retrieves environmental conditions (temperature, humidity, rainfall, wind)
    for detected GPS coordinates via NASA POWER API with Open-Meteo fallback.
    Does NOT fabricate data if service is unavailable.
    """
    return get_weather_data(lat, lon)

@app.get("/api/geocode/reverse")
def reverse_geocode_location(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    """
    Reverse geocodes lat/lon into District and Village/locality.
    """
    return reverse_geocode(lat, lon)

@app.post("/api/diagnose", response_model=DiagnosisResponse)
def diagnose_cattle(request: DiagnosisRequest):
    """
    AI Diagnosis endpoint: accepts cattle type, fever level, symptoms, location,
    environmental factors, and optional measured animal body temperature.
    Returns matched disease candidates, confidence, precautions, and containment steps.
    """
    return analyze_livestock_health(request)

@app.get("/api/diseases")
def list_diseases(
    type: Optional[str] = Query(None, description="Filter by disease type ('new' or 'old')"),
    category: Optional[str] = Query(None, description="Filter by category ('viral' or 'bacterial')")
):
    """
    Retrieves the complete catalog of cattle diseases and precautions.
    """
    results = DISEASES_DB
    if type:
        results = [d for d in results if d["type"] == type.lower()]
    if category:
        results = [d for d in results if d["category"] == category.lower()]
    return {"total": len(results), "diseases": results}

@app.get("/api/diseases/{disease_id}")
def get_disease(disease_id: str):
    """
    Retrieve specific disease by ID (e.g. 'lsd', 'fmd', 'hs').
    """
    for d in DISEASES_DB:
        if d["id"] == disease_id.lower():
            return d
    raise HTTPException(status_code=404, detail="Disease record not found")

@app.get("/api/vaccination-schedule")
def get_vaccination_schedule():
    """
    Returns government recommended cattle vaccination calendar.
    """
    return {"total": len(VACCINATION_SCHEDULE), "schedule": VACCINATION_SCHEDULE}

@app.get("/api/evm-remedies")
def get_evm_remedies():
    """
    Returns NDDB tested Ethno-Veterinary Herbal Remedies for cattle diseases.
    """
    remedies = []
    for d in DISEASES_DB:
        if "evm_remedy" in d:
            remedies.append({
                "disease": d["name"],
                "disease_id": d["id"],
                "remedy": d["evm_remedy"]
            })
    return {"total": len(remedies), "remedies": remedies}

# --- Farmer -> Vet -> Lab Workflow Endpoints ---

@app.post("/api/workflow/reports", response_model=WorkflowReport)
def create_workflow_report(report_in: WorkflowReportCreate):
    """
    Farmer creates a official health report.
    """
    report_id = f"RPT-{uuid.uuid4().hex[:8].upper()}"
    diagnosis_res = analyze_livestock_health(report_in)
    
    report = WorkflowReport(
        id=report_id,
        farmer_id=report_in.farmer_id,
        status="submitted", # Initial Farmer state
        created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        request=report_in,
        diagnosis=diagnosis_res
    )
    REPORTS_DB[report_id] = report
    return report

@app.get("/api/workflow/reports", response_model=List[WorkflowReport])
def list_workflow_reports(farmer_id: Optional[str] = Query(None)):
    """
    List reports, optionally filtered by farmer_id.
    """
    if farmer_id:
        return [r for r in REPORTS_DB.values() if r.farmer_id == farmer_id]
    return list(REPORTS_DB.values())

@app.get("/api/workflow/reports/{report_id}", response_model=WorkflowReport)
def get_workflow_report(report_id: str):
    """
    Get report details.
    """
    if report_id not in REPORTS_DB:
        raise HTTPException(status_code=404, detail="Report not found")
    return REPORTS_DB[report_id]

@app.patch("/api/workflow/reports/{report_id}/status", response_model=WorkflowReport)
def update_workflow_status(
    report_id: str,
    status: str = Body(..., embed=True),
    vet_notes: Optional[str] = Body(None, embed=True),
    lab_results: Optional[str] = Body(None, embed=True)
):
    """
    Advances report through Farmer -> Vet -> Lab workflow:
    - 'vet_reviewed': Vet inspects & approves report.
    - 'lab_submitted': Sample submitted to Lab.
    - 'lab_verified': Lab confirms diagnosis.
    """
    if report_id not in REPORTS_DB:
        raise HTTPException(status_code=404, detail="Report not found")
    
    valid_statuses = ["submitted", "vet_reviewed", "lab_submitted", "lab_verified"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")
    
    report = REPORTS_DB[report_id]
    report.status = status
    if vet_notes:
        report.vet_notes = vet_notes
    if lab_results:
        report.lab_results = lab_results
        
    return report

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
