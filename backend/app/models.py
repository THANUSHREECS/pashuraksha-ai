from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class EnvironmentalData(BaseModel):
    temperature: Optional[float] = Field(default=None, description="Environmental temperature °C")
    humidity: Optional[float] = Field(default=None, description="Relative humidity %")
    rainfall: Optional[float] = Field(default=None, description="Rainfall / precipitation mm")
    wind_speed: Optional[float] = Field(default=None, description="Wind speed km/h")
    weather_condition: Optional[str] = Field(default=None, description="Weather condition description")
    source: Optional[str] = Field(default=None, description="Weather data source, e.g. NASA POWER")
    observation_time: Optional[str] = Field(default=None, description="Observation timestamp")

class LocationData(BaseModel):
    latitude: Optional[float] = Field(default=None)
    longitude: Optional[float] = Field(default=None)
    district: Optional[str] = Field(default=None)
    village: Optional[str] = Field(default=None)
    status: Optional[str] = Field(default="unavailable")

class DiagnosisRequest(BaseModel):
    cattle_type: str = Field(..., json_schema_extra={"example": "cow"}, description="Cow, Buffalo, Calf, or Bull")
    fever_status: str = Field(..., json_schema_extra={"example": "high"}, description="normal, moderate, or high")
    symptoms: List[str] = Field(default=[], description="List of symptom keys observed")
    additional_notes: Optional[str] = Field(default="", description="Optional farmer notes or observations")
    
    # Location fields
    latitude: Optional[float] = Field(default=None, description="GPS Latitude")
    longitude: Optional[float] = Field(default=None, description="GPS Longitude")
    district: Optional[str] = Field(default=None, description="Detected or entered District")
    village: Optional[str] = Field(default=None, description="Detected or entered Village/locality")
    
    # Strictly separate Animal Body Temperature
    animal_body_temperature: Optional[float] = Field(
        default=None,
        description="Animal body temperature in °C measured via thermometer. NEVER auto-populated from weather."
    )
    
    # Environmental & Weather fields
    environmental_temperature: Optional[float] = Field(default=None, description="Environmental temperature in °C")
    relative_humidity: Optional[float] = Field(default=None, description="Relative humidity in %")
    rainfall: Optional[float] = Field(default=None, description="Rainfall/Precipitation in mm")
    wind_speed: Optional[float] = Field(default=None, description="Wind speed in km/h")
    weather_condition: Optional[str] = Field(default=None, description="Weather condition description")
    weather_source: Optional[str] = Field(default=None, description="Source of weather data (e.g. NASA POWER)")
    
    # Comprehensive report payload fields
    vaccination: Optional[str] = Field(default=None, description="Vaccination history")
    history_treatment_movement: Optional[str] = Field(default=None, description="Treatment and animal movement history")
    affected_animals: Optional[int] = Field(default=1, description="Number of affected animals")
    herd_information: Optional[str] = Field(default=None, description="Herd size and details")
    image_evidence: Optional[str] = Field(default=None, description="Base64 or URL image evidence")

class DiagnosticCandidate(BaseModel):
    id: str
    name: str
    type: str
    category: str
    confidence_score: float
    severity: str
    pathogen: str
    precautions: List[str]
    treatment: str
    evm_remedy: str

class DiagnosisResponse(BaseModel):
    status: str
    cattle_type: str
    fever_status: str
    overall_risk_level: str
    matched_candidates: List[DiagnosticCandidate]
    containment_protocol: List[str]
    disclaimer: str
    
    # Location & Environmental audit / signals
    location: Optional[LocationData] = Field(default=None)
    environmental_conditions: Optional[EnvironmentalData] = Field(default=None)
    environmental_signals_used: List[str] = Field(
        default=[],
        description="Environmental signals influencing the risk engine, strictly separate from animal symptoms"
    )
    animal_body_temperature: Optional[float] = Field(
        default=None,
        description="Farmer-provided measured animal body temperature °C"
    )

class WorkflowReportCreate(DiagnosisRequest):
    farmer_id: str = Field(default="farmer_default")

class WorkflowReport(BaseModel):
    id: str
    farmer_id: str
    status: str = Field(default="submitted") # submitted -> vet_reviewed -> lab_submitted -> lab_verified
    created_at: str
    request: DiagnosisRequest
    diagnosis: DiagnosisResponse
    vet_notes: Optional[str] = None
    lab_results: Optional[str] = None
