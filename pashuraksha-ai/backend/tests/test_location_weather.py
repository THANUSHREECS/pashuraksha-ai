import pytest
import subprocess
import os
import sys
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.main import app, REPORTS_DB
from app.weather_service import get_weather_data, reverse_geocode

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_db():
    REPORTS_DB.clear()
    yield

# 1. GPS coordinates accepted in report
def test_gps_coordinates_accepted_in_report():
    payload = {
        "cattle_type": "cow",
        "fever_status": "high",
        "symptoms": ["skin_nodules", "drooling"],
        "latitude": 12.971598,
        "longitude": 77.594566,
        "district": "Bengaluru Urban",
        "village": "Hebbal"
    }
    response = client.post("/api/diagnose", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["location"]["latitude"] == 12.971598
    assert data["location"]["longitude"] == 77.594566
    assert data["location"]["district"] == "Bengaluru Urban"
    assert data["location"]["village"] == "Hebbal"

# 2. District/village populated when reverse geocoding succeeds
def test_district_village_populated_on_reverse_geocoding_success():
    mock_nominatim_resp = {
        "address": {
            "state_district": "Mandya District",
            "village": "Koppa"
        }
    }
    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_response = mock_urlopen.return_value.__enter__.return_value
        mock_response.status = 200
        mock_response.read.return_value = json_bytes(mock_nominatim_resp)

        result = reverse_geocode(12.52, 76.90)
        assert result["status"] == "success"
        assert result["district"] == "Mandya District"
        assert result["village"] == "Koppa"

# 3. Reverse geocoding failure does not fabricate values
def test_reverse_geocoding_failure_does_not_fabricate_values():
    with patch("urllib.request.urlopen", side_effect=Exception("Network error")):
        result = reverse_geocode(0.0, 0.0)
        assert result["status"] == "failed"
        assert result["district"] is None
        assert result["village"] is None
        assert result["message"] == "District/Village could not be detected"

# 4. Weather values passed through when available
def test_weather_values_passed_through_when_available():
    payload = {
        "cattle_type": "buffalo",
        "fever_status": "moderate",
        "symptoms": ["udder_swelling", "milk_drop"],
        "environmental_temperature": 32.5,
        "relative_humidity": 78.0,
        "rainfall": 12.4,
        "wind_speed": 14.2,
        "weather_condition": "Heavy Rain",
        "weather_source": "NASA POWER API"
    }
    response = client.post("/api/diagnose", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["environmental_conditions"]["temperature"] == 32.5
    assert data["environmental_conditions"]["humidity"] == 78.0
    assert data["environmental_conditions"]["rainfall"] == 12.4
    assert data["environmental_conditions"]["wind_speed"] == 14.2
    assert data["environmental_conditions"]["weather_condition"] == "Heavy Rain"
    assert data["environmental_conditions"]["source"] == "NASA POWER API"
    assert len(data["environmental_signals_used"]) > 0

# 5. Weather failure does not fabricate values
def test_weather_failure_does_not_fabricate_values():
    with patch("urllib.request.urlopen", side_effect=Exception("API Unreachable")):
        result = get_weather_data(12.52, 76.90)
        assert result["status"] == "unavailable"
        assert result["temperature"] is None
        assert result["humidity"] is None
        assert result["rainfall"] is None
        assert result["wind_speed"] is None
        assert result["weather_condition"] is None
        assert result["source"] == "Unavailable"

# 6. Animal body temperature remains separate from environmental temperature
def test_animal_body_temp_remains_separate_from_environmental_temp():
    payload = {
        "cattle_type": "cow",
        "fever_status": "high",
        "symptoms": ["throat_swelling"],
        "animal_body_temperature": 40.2, # Measured with thermometer
        "environmental_temperature": 27.5 # Weather ambient temp
    }
    response = client.post("/api/diagnose", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["animal_body_temperature"] == 40.2
    assert data["environmental_conditions"]["temperature"] == 27.5
    assert data["animal_body_temperature"] != data["environmental_conditions"]["temperature"]

# 7. Existing Farmer → Vet → Lab workflow still passes
def test_farmer_vet_lab_workflow_passes():
    # 1. Farmer creates report
    create_payload = {
        "farmer_id": "farmer_99",
        "cattle_type": "cow",
        "fever_status": "high",
        "symptoms": ["mouth_blisters", "hoof_lesions"],
        "district": "Hassan",
        "village": "Channarayapatna"
    }
    res1 = client.post("/api/workflow/reports", json=create_payload)
    assert res1.status_code == 200
    report = res1.json()
    report_id = report["id"]
    assert report["status"] == "submitted"
    assert report["farmer_id"] == "farmer_99"

    # 2. Vet reviews report
    res2 = client.patch(f"/api/workflow/reports/{report_id}/status", json={"status": "vet_reviewed", "vet_notes": "Clinical symptoms indicative of FMD. Isolated."})
    assert res2.status_code == 200
    assert res2.json()["status"] == "vet_reviewed"

    # 3. Lab verifies sample
    res3 = client.patch(f"/api/workflow/reports/{report_id}/status", json={"status": "lab_verified", "lab_results": "PCR Positive for Aphthovirus O strain"})
    assert res3.status_code == 200
    assert res3.json()["status"] == "lab_verified"
    assert res3.json()["lab_results"] == "PCR Positive for Aphthovirus O strain"

# 8. Existing ownership/security tests still pass
def test_ownership_and_security_tests_pass():
    # Create report for farmer A
    client.post("/api/workflow/reports", json={"farmer_id": "farmer_A", "cattle_type": "cow", "fever_status": "normal"})
    # Create report for farmer B
    client.post("/api/workflow/reports", json={"farmer_id": "farmer_B", "cattle_type": "buffalo", "fever_status": "normal"})

    # Filter by farmer_A
    res = client.get("/api/workflow/reports?farmer_id=farmer_A")
    assert res.status_code == 200
    reports = res.json()
    assert len(reports) == 1
    assert reports[0]["farmer_id"] == "farmer_A"

    # Invalid status patch rejected
    res_bad = client.patch("/api/workflow/reports/NON_EXISTENT/status", json={"status": "vet_reviewed"})
    assert res_bad.status_code == 404

    res_invalid_status = client.patch(f"/api/workflow/reports/{reports[0]['id']}/status", json={"status": "unauthorized_status"})
    assert res_invalid_status.status_code == 400

# 9. Offline report behavior still works
def test_offline_report_payload_validation():
    # Verify that payload with missing online fields validates correctly for offline queuing
    payload = {
        "cattle_type": "calf",
        "fever_status": "normal",
        "symptoms": ["skin_nodules"],
        "additional_notes": "Queued offline report"
    }
    response = client.post("/api/diagnose", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"

def json_bytes(obj):
    import json
    return json.dumps(obj).encode("utf-8")
