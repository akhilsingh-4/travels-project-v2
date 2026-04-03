import logging
from urllib.parse import quote

import requests
from django.conf import settings


logger = logging.getLogger(__name__)


def tomtom_key_configured():
    return bool(getattr(settings, "TOMTOM_API_KEY", ""))


def build_location_queries(place_name):
    normalized = place_name.strip()
    queries = []

    if "," not in normalized:
        queries.append(f"{normalized}, India")
    queries.append(normalized)

    seen = set()
    unique_queries = []
    for query in queries:
        key = query.lower()
        if key not in seen:
            seen.add(key)
            unique_queries.append(query)

    return unique_queries


def geocode_location(place_name):
    for query in build_location_queries(place_name):
        response = requests.get(
            f"https://api.tomtom.com/search/2/geocode/{quote(query)}.json",
            params={
                "key": settings.TOMTOM_API_KEY,
                "limit": 1,
                "countrySet": "IN",
                "view": "IN",
                "language": "en-GB",
            },
            timeout=10,
        )
        response.raise_for_status()

        results = response.json().get("results", [])
        if not results:
            continue

        top_match = results[0]
        position = top_match.get("position") or {}
        if "lat" not in position or "lon" not in position:
            continue

        return {
            "label": top_match.get("address", {}).get("freeformAddress") or query,
            "position": {
                "lat": position["lat"],
                "lon": position["lon"],
            },
        }

    raise ValueError(f"No geocoding result found for '{place_name}'")


def fetch_route_points(origin, destination):
    route_response = requests.get(
        "https://api.tomtom.com/routing/1/calculateRoute/"
        f"{origin['position']['lat']},{origin['position']['lon']}:"
        f"{destination['position']['lat']},{destination['position']['lon']}/json",
        params={
            "key": settings.TOMTOM_API_KEY,
            "traffic": "true",
            "routeType": "fastest",
            "travelMode": "car",
        },
        timeout=10,
    )
    route_response.raise_for_status()

    routes = route_response.json().get("routes", [])
    if not routes:
        raise ValueError("TomTom did not return a route")

    route = routes[0]
    leg = (route.get("legs") or [{}])[0]
    points = leg.get("points") or []
    if len(points) < 2:
        raise ValueError("TomTom returned an incomplete route geometry")

    summary = route.get("summary") or {}
    return {
        "origin": origin,
        "destination": destination,
        "distance_meters": summary.get("lengthInMeters"),
        "points": [
            {
                "lat": point["latitude"],
                "lon": point["longitude"],
            }
            for point in points
            if "latitude" in point and "longitude" in point
        ],
    }


def route_bbox(points, padding_ratio=0.12):
    lats = [point["lat"] for point in points]
    lons = [point["lon"] for point in points]

    min_lat = min(lats)
    max_lat = max(lats)
    min_lon = min(lons)
    max_lon = max(lons)

    lat_padding = max((max_lat - min_lat) * padding_ratio, 0.05)
    lon_padding = max((max_lon - min_lon) * padding_ratio, 0.05)

    return {
        "min_lat": max(min_lat - lat_padding, -85),
        "max_lat": min(max_lat + lat_padding, 85),
        "min_lon": max(min_lon - lon_padding, -180),
        "max_lon": min(max_lon + lon_padding, 180),
    }


def route_center_and_zoom(route_bbox_data):
    center_lon = (route_bbox_data["min_lon"] + route_bbox_data["max_lon"]) / 2
    center_lat = (route_bbox_data["min_lat"] + route_bbox_data["max_lat"]) / 2
    lon_span = max(route_bbox_data["max_lon"] - route_bbox_data["min_lon"], 0.01)

    if lon_span > 12:
        zoom = 5
    elif lon_span > 6:
        zoom = 6
    elif lon_span > 3:
        zoom = 7
    elif lon_span > 1.5:
        zoom = 8
    elif lon_span > 0.75:
        zoom = 9
    elif lon_span > 0.35:
        zoom = 10
    else:
        zoom = 11

    return {
        "center": f"{center_lon},{center_lat}",
        "zoom": zoom,
    }


def request_static_map(params, timeout=15):
    response = requests.get(
        "https://api.tomtom.com/map/1/staticimage",
        params=params,
        timeout=timeout,
        headers={"User-Agent": "TravelsApp/1.0"},
    )
    response.raise_for_status()
    return response.content, response.headers.get("Content-Type", "image/jpeg")


def fetch_route_map_image(route_bbox_data, width=900, height=360):
    center_config = route_center_and_zoom(route_bbox_data)

    base_params = {
        "key": settings.TOMTOM_API_KEY,
        "width": width,
        "height": height,
        "layer": "basic",
        "style": "main",
        "view": "Unified",
        "language": "en-GB",
        "format": "jpg",
    }

    bbox_params = {
        **base_params,
        "zoom": center_config["zoom"],
        "bbox": ",".join(
            [
                str(route_bbox_data["min_lon"]),
                str(route_bbox_data["min_lat"]),
                str(route_bbox_data["max_lon"]),
                str(route_bbox_data["max_lat"]),
            ]
        ),
    }

    try:
        return request_static_map(bbox_params)
    except requests.RequestException as exc:
        response = getattr(exc, "response", None)
        if response is not None:
            logger.warning(
                "Static map bbox request failed: status=%s body=%s",
                response.status_code,
                response.text[:500],
            )

        center_params = {
            **base_params,
            "center": center_config["center"],
            "zoom": center_config["zoom"],
        }

        try:
            return request_static_map(center_params)
        except requests.RequestException as center_exc:
            center_response = getattr(center_exc, "response", None)
            if center_response is not None:
                logger.warning(
                    "Static map center request failed: status=%s body=%s",
                    center_response.status_code,
                    center_response.text[:500],
                )
            raise
