# PashuRaksha AI - Full-Stack Cattle Disease Protection & Precaution Agent

PashuRaksha AI is an intelligent livestock healthcare system designed to protect cattle from emerging new threats (such as Lumpy Skin Disease, Avian Influenza in dairy) and major endemic diseases (FMD, Hemorrhagic Septicemia, Black Quarter, Mastitis).

## Project Structure

```
pashuraksha-ai/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI server & REST API routes
│   │   ├── models.py        # Pydantic data models & request/response schemas
│   │   ├── ai_engine.py     # AI Diagnostic scoring & containment protocol engine
│   │   └── data.py          # Disease database, EVM remedies & vaccination schedule
│   ├── requirements.txt     # Python dependencies
│   └── README.md
└── frontend/
    ├── index.html           # Main web dashboard interface
    ├── app.js               # Frontend API integration & UI state manager
    ├── styles.css           # Styling rules & badge highlights
    └── README.md
```

## How to Run

### 1. Start the Backend API Server
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
The FastAPI backend will be active at:
- API Base URL: `http://localhost:8000`
- Interactive API Docs: `http://localhost:8000/docs`

### 2. Launch the Frontend UI
Open `frontend/index.html` directly in your browser or run a lightweight local server:
```bash
cd frontend
python -m http.server 3000
```
Open `http://localhost:3000` in your web browser.

## Key API Endpoints
- `POST /api/diagnose` - Submits cattle type, fever level, and symptoms; returns AI risk confidence, precautions, and containment protocols.
- `GET /api/diseases` - Returns catalog of emerging & existing cattle diseases.
- `GET /api/evm-remedies` - Returns NDDB/ICAR tested Ethno-Veterinary Herbal Formulations.
- `GET /api/vaccination-schedule` - Returns National Animal Disease Control Programme (NADCP) vaccination calendar.
