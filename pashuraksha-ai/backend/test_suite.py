import unittest
from app.models import DiagnosisRequest, WorkflowReportCreate, DiagnosisResponse
from app.ai_engine import analyze_livestock_health
from app.main import app, health_check, list_diseases, diagnose_cattle, create_workflow_report, geocode_by_ip

class TestPashuRakshaAI(unittest.TestCase):

    def test_health_check(self):
        res = health_check()
        self.assertEqual(res.get("status"), "healthy")
        self.assertIn("engine", res)

    def test_diseases_catalog(self):
        res = list_diseases(None, None)
        self.assertGreaterEqual(res["total"], 6)
        ids = [d["id"] for d in res["diseases"]]
        self.assertIn("lsd", ids)
        self.assertIn("fmd", ids)
        self.assertIn("hs", ids)

    def test_risk_engine_lsd(self):
        req = DiagnosisRequest(
            cattle_type="cow",
            fever_status="high",
            symptoms=["skin_nodules", "high_fever", "drooling"],
            environmental_temperature=33.0,
            relative_humidity=80.0
        )
        res = analyze_livestock_health(req)
        self.assertEqual(res.status, "success")
        self.assertIn("CRITICAL", res.overall_risk_level)
        self.assertGreater(len(res.matched_candidates), 0)
        self.assertEqual(res.matched_candidates[0].id, "lsd")
        self.assertGreater(len(res.containment_protocol), 0)
        self.assertIsNotNone(res.disclaimer)

    def test_risk_engine_fmd(self):
        req = DiagnosisRequest(
            cattle_type="buffalo",
            fever_status="high",
            symptoms=["mouth_blisters", "hoof_lesions", "drooling"]
        )
        res = analyze_livestock_health(req)
        self.assertEqual(res.status, "success")
        self.assertIn("HIGH", res.overall_risk_level)
        self.assertEqual(res.matched_candidates[0].id, "fmd")

    def test_risk_engine_measured_body_temperature(self):
        req = DiagnosisRequest(
            cattle_type="cow",
            fever_status="normal", # Farmer selected normal, but thermometer shows 40.2°C
            symptoms=["skin_nodules"],
            animal_body_temperature=40.2
        )
        res = analyze_livestock_health(req)
        self.assertEqual(res.animal_body_temperature, 40.2)
        self.assertEqual(res.matched_candidates[0].id, "lsd")
        # Ensure thermometer high fever increased the score above 30
        self.assertGreaterEqual(res.matched_candidates[0].confidence_score, 34.0)

    def test_risk_engine_no_symptoms_low_risk(self):
        req = DiagnosisRequest(
            cattle_type="cow",
            fever_status="normal",
            symptoms=[]
        )
        res = analyze_livestock_health(req)
        self.assertEqual(res.status, "success")
        self.assertIn("LOW", res.overall_risk_level)
        self.assertEqual(len(res.matched_candidates), 0)

    def test_missing_optional_values_no_crash(self):
        req = DiagnosisRequest(
            cattle_type="bull",
            fever_status="moderate",
            symptoms=["udder_swelling"],
            latitude=None,
            longitude=None,
            district=None,
            village=None,
            environmental_temperature=None,
            relative_humidity=None,
            rainfall=None,
            wind_speed=None,
            weather_condition=None,
            weather_source=None
        )
        res = analyze_livestock_health(req)
        self.assertEqual(res.status, "success")
        self.assertIsNone(res.location)
        self.assertIsNone(res.environmental_conditions)

    def test_workflow_report_creation(self):
        req = WorkflowReportCreate(
            cattle_type="calf",
            fever_status="high",
            symptoms=["throat_swelling", "respiratory_distress"],
            farmer_id="farmer_test_1"
        )
        report = create_workflow_report(req)
        self.assertTrue(report.id.startswith("RPT-"))
        self.assertEqual(report.status, "submitted")
        self.assertEqual(report.farmer_id, "farmer_test_1")
        self.assertIn("HS", report.diagnosis.matched_candidates[0].name)

    def test_ip_location_fallback(self):
        res = geocode_by_ip()
        self.assertIn("status", res)
        # Should be success or failed without throwing unhandled exception
        self.assertIn(res["status"], ["success", "failed"])

if __name__ == "__main__":
    unittest.main()
