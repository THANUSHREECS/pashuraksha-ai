from typing import List, Dict, Any
from .data import DISEASES_DB
from .models import (
    DiagnosisRequest, DiagnosisResponse, DiagnosticCandidate,
    LocationData, EnvironmentalData
)

CONTAINMENT_STEPS = [
    "Isolate the affected cattle immediately in a separate shed at least 50m away from healthy animals.",
    "Restrict farm visitors, equipment sharing, and vehicle movement.",
    "Disinfect farm entryways using 2% Sodium Hydroxide footbaths and spray shed perimeter with Virkon-S.",
    "Notify the local Veterinary Assistant Surgeon (VAS) or National Animal Disease Helpline.",
    "Do NOT transport or sell milk/livestock from the affected unit until cleared by a licensed veterinarian."
]

def analyze_livestock_health(request: DiagnosisRequest) -> DiagnosisResponse:
    symptoms = request.symptoms
    fever = request.fever_status.lower()
    
    # Extract environmental features & animal body temp
    env_temp = request.environmental_temperature
    env_humidity = request.relative_humidity
    env_rain = request.rainfall
    env_wind = request.wind_speed
    animal_body_temp = request.animal_body_temperature

    environmental_signals: List[str] = []

    # Evaluate Environmental Signals (STRICTLY SEPARATE FROM ANIMAL SYMPTOMS)
    if env_temp is not None and env_humidity is not None:
        if env_temp > 30.0 and env_humidity > 75.0:
            environmental_signals.append("High ambient temperature & high humidity detected -> High vector proliferation risk (flies/mosquitoes for LSD)")
        elif env_temp > 35.0:
            environmental_signals.append("Severe heat stress risk (>35°C ambient)")

    if env_rain is not None and env_rain > 10.0:
        environmental_signals.append("Heavy rainfall / waterlogging detected -> Increased risk of monsoon bacterial epizootics (HS / Black Quarter)")

    if env_wind is not None and env_wind > 25.0:
        environmental_signals.append("High wind speed -> Airborne spore / aerosol transmission risk")

    candidates: List[DiagnosticCandidate] = []

    for d in DISEASES_DB:
        score = 0.0
        disease_symptoms = d["symptoms"]

        # Match animal-reported symptoms
        matched_count = 0
        for s in symptoms:
            if s in disease_symptoms:
                matched_count += 1

        if matched_count > 0:
            # Base score calculation
            match_ratio = matched_count / len(disease_symptoms)
            score = match_ratio * 70.0 + (matched_count * 5.0)

            # Adjust score based on fever status or measured animal body temp
            if (fever == "high" or (animal_body_temp is not None and animal_body_temp >= 39.5)) and "high_fever" in disease_symptoms:
                score += 15.0
            elif (fever == "moderate" or (animal_body_temp is not None and 38.8 <= animal_body_temp < 39.5)) and "moderate_fever" in disease_symptoms:
                score += 10.0

            # Adjust score based on real environmental risk factors
            if d["id"] == "lsd" and any("vector" in sig.lower() for sig in environmental_signals):
                score += 8.0
            elif d["id"] in ["hs", "bq"] and any("rainfall" in sig.lower() for sig in environmental_signals):
                score += 8.0

            # Cap confidence at 96%
            confidence = round(min(96.0, score), 1)

            candidates.append(DiagnosticCandidate(
                id=d["id"],
                name=d["name"],
                type=d["type"],
                category=d["category"],
                confidence_score=confidence,
                severity=d["severity"],
                pathogen=d["pathogen"],
                precautions=d["precautions"],
                treatment=d["treatment"],
                evm_remedy=d["evm_remedy"]
            ))

    # Sort candidates by confidence score
    candidates.sort(key=lambda x: x.confidence_score, reverse=True)

    # Determine overall risk level
    if not candidates:
        overall_risk = "LOW — 0/100"
    else:
        max_score = candidates[0].confidence_score
        if max_score >= 80:
            overall_risk = f"CRITICAL — {int(max_score)}/100"
        elif max_score >= 60:
            overall_risk = f"HIGH — {int(max_score)}/100"
        elif max_score >= 30:
            overall_risk = f"MODERATE — {int(max_score)}/100"
        else:
            overall_risk = f"LOW — {int(max_score)}/100"

    # Construct LocationData summary
    location_summary = None
    if request.latitude is not None or request.longitude is not None or request.district or request.village:
        loc_status = "detected" if (request.latitude and request.longitude) else ("manual" if (request.district or request.village) else "unavailable")
        location_summary = LocationData(
            latitude=request.latitude,
            longitude=request.longitude,
            district=request.district,
            village=request.village,
            status=loc_status
        )

    # Construct EnvironmentalData summary
    env_summary = None
    if env_temp is not None or env_humidity is not None or env_rain is not None or request.weather_source:
        env_summary = EnvironmentalData(
            temperature=env_temp,
            humidity=env_humidity,
            rainfall=env_rain,
            wind_speed=env_wind,
            weather_condition=request.weather_condition,
            source=request.weather_source or "Environmental Sensor / API",
            observation_time=None
        )

    return DiagnosisResponse(
        status="success",
        cattle_type=request.cattle_type,
        fever_status=request.fever_status,
        overall_risk_level=overall_risk,
        matched_candidates=candidates[:3],
        containment_protocol=CONTAINMENT_STEPS,
        disclaimer="Prototype risk indication based on available health, environmental and surveillance signals. Risk indication is not a diagnosis. Veterinary examination and laboratory confirmation remain authoritative.",
        location=location_summary,
        environmental_conditions=env_summary,
        environmental_signals_used=environmental_signals,
        animal_body_temperature=animal_body_temp
    )
