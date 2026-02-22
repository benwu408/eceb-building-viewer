"""FastAPI backend for ECEB Building Viewer."""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from pdf_processor import load_and_process_pdf, ROOM_TYPES

app = FastAPI(title="ECEB Building Viewer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

PDF_PATH = os.path.join(os.path.dirname(__file__), "..", "eceb_map_2014.pdf")

_cached_result = None


@app.get("/api/floors")
def get_floors():
    global _cached_result
    if _cached_result is not None:
        return _cached_result

    floors = load_and_process_pdf(PDF_PATH)

    config = {
        "voxelH": 2.5,
        "floorGap": 16,
        "roomTypes": {
            code: {"name": rt["name"], "color": rt["color"]}
            for code, rt in ROOM_TYPES.items()
        },
    }
    # Add wall and outline types
    config["roomTypes"]["W"] = {"name": "Wall"}
    config["roomTypes"]["B"] = {"name": "Outline"}

    _cached_result = {"floors": floors, "config": config}
    return _cached_result
