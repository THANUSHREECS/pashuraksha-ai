import urllib.request
import urllib.parse
import json
import logging
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger("pashuraksha.weather")

def get_weather_data(lat: float, lon: float) -> Dict[str, Any]:
    """
    Retrieves real environmental and weather data using detected latitude and longitude.
    Tries NASA POWER API first. If NASA POWER fails or times out, tries Open-Meteo API.
    If both fail, returns status='unavailable' without fabricating fake values.
    """
    # 1. Try NASA POWER API
    nasa_result = _fetch_nasa_power(lat, lon)
    if nasa_result and nasa_result.get("status") == "available":
        return nasa_result

    # 2. Fallback to Open-Meteo API
    open_meteo_result = _fetch_open_meteo(lat, lon)
    if open_meteo_result and open_meteo_result.get("status") == "available":
        return open_meteo_result

    # 3. If both fail, return unavailable status (NO FABRICATION)
    return {
        "status": "unavailable",
        "temperature": None,
        "humidity": None,
        "rainfall": None,
        "wind_speed": None,
        "weather_condition": None,
        "source": "Unavailable",
        "observation_time": None
    }

def _fetch_nasa_power(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """
    Fetches agro-climatology environmental data from NASA POWER API.
    """
    try:
        url = f"https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,RH2M,PRECTOTCORR,WS2M&community=AG&longitude={lon}&latitude={lat}&format=JSON"
        req = urllib.request.Request(url, headers={"User-Agent": "PashuRakshaAI/2.4.0"})
        with urllib.request.urlopen(req, timeout=4) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode('utf-8'))
                properties = data.get("properties", {}).get("parameter", {})
                
                # Extract latest available daily entry
                t2m_dict = properties.get("T2M", {})
                rh2m_dict = properties.get("RH2M", {})
                prec_dict = properties.get("PRECTOTCORR", {})
                ws2m_dict = properties.get("WS2M", {})

                if t2m_dict:
                    latest_date = sorted(t2m_dict.keys())[-1]
                    t2m = t2m_dict.get(latest_date)
                    rh2m = rh2m_dict.get(latest_date)
                    prec = prec_dict.get(latest_date)
                    ws2m = ws2m_dict.get(latest_date)

                    # Check for NASA fill values (-999)
                    temp = float(t2m) if t2m is not None and t2m > -900 else None
                    hum = float(rh2m) if rh2m is not None and rh2m >= 0 else None
                    rain = float(prec) if prec is not None and prec >= 0 else None
                    wind = float(ws2m) if ws2m is not None and ws2m >= 0 else None

                    condition = "Clear / Fair"
                    if rain and rain > 5.0:
                        condition = "Heavy Rainfall"
                    elif rain and rain > 0.1:
                        condition = "Light Rain / Drizzle"
                    elif hum and hum > 80:
                        condition = "Humid / Overcast"

                    return {
                        "status": "available",
                        "temperature": round(temp, 1) if temp is not None else None,
                        "humidity": round(hum, 1) if hum is not None else None,
                        "rainfall": round(rain, 1) if rain is not None else None,
                        "wind_speed": round(wind, 1) if wind is not None else None,
                        "weather_condition": condition,
                        "source": "NASA POWER API",
                        "observation_time": latest_date
                    }
    except Exception as e:
        logger.warning(f"NASA POWER API request failed: {e}")
    return None

def _fetch_open_meteo(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """
    Fetches real-time environmental data from Open-Meteo API as fallback.
    """
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code"
        req = urllib.request.Request(url, headers={"User-Agent": "PashuRakshaAI/2.4.0"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode('utf-8'))
                current = data.get("current", {})
                
                temp = current.get("temperature_2m")
                hum = current.get("relative_humidity_2m")
                rain = current.get("precipitation")
                wind = current.get("wind_speed_10m")
                code = current.get("weather_code", 0)

                # Interpret WMO weather code
                condition = "Clear Sky"
                if code in [1, 2, 3]:
                    condition = "Partly Cloudy"
                elif code in [45, 48]:
                    condition = "Foggy"
                elif code in [51, 53, 55, 61, 63, 65]:
                    condition = "Rainy"
                elif code in [80, 81, 82, 95]:
                    condition = "Thunderstorm / Heavy Rain"

                return {
                    "status": "available",
                    "temperature": round(float(temp), 1) if temp is not None else None,
                    "humidity": round(float(hum), 1) if hum is not None else None,
                    "rainfall": round(float(rain), 1) if rain is not None else None,
                    "wind_speed": round(float(wind), 1) if wind is not None else None,
                    "weather_condition": condition,
                    "source": "Open-Meteo API",
                    "observation_time": current.get("time")
                }
    except Exception as e:
        logger.warning(f"Open-Meteo API request failed: {e}")
    return None

def reverse_geocode(lat: float, lon: float) -> Dict[str, Any]:
    """
    Reverse geocodes latitude and longitude to obtain District and Village/Locality.
    If geocoding fails, returns status='failed' and District/Village as None (NO FABRICATION).
    """
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&addressdetails=1"
        req = urllib.request.Request(url, headers={"User-Agent": "PashuRakshaAI/2.4.0 (contact@pashuraksha.org)"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode('utf-8'))
                address = data.get("address", {})
                
                # Extract District
                district = (
                    address.get("state_district") or 
                    address.get("district") or 
                    address.get("county") or 
                    address.get("city")
                )
                
                # Extract Village/Locality
                village = (
                    address.get("village") or 
                    address.get("town") or 
                    address.get("suburb") or 
                    address.get("neighbourhood") or 
                    address.get("hamlet") or 
                    address.get("locality")
                )

                if district or village:
                    return {
                        "status": "success",
                        "district": district if district else "District Detected",
                        "village": village if village else "Village/Locality Detected"
                    }
    except Exception as e:
        logger.warning(f"Reverse geocoding failed: {e}")

    return {
        "status": "failed",
        "district": None,
        "village": None,
        "message": "District/Village could not be detected"
    }
