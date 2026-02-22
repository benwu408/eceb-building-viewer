"""Generate static floors.json for Vercel deployment."""

import json
import os

from pdf_processor import load_and_process_pdf, ROOM_TYPES

ROOT = os.path.dirname(os.path.abspath(__file__))
PDF_PATH = os.path.join(ROOT, "..", "eceb_map_2014.pdf")
OUT_PATH = os.path.join(ROOT, "..", "frontend", "public", "floors.json")

floors = load_and_process_pdf(PDF_PATH)

config = {
    "voxelH": 2.5,
    "floorGap": 16,
    "roomTypes": {
        code: {"name": rt["name"], "color": rt["color"]}
        for code, rt in ROOM_TYPES.items()
    },
}
config["roomTypes"]["W"] = {"name": "Wall"}
config["roomTypes"]["B"] = {"name": "Outline"}

data = {"floors": floors, "config": config}

with open(OUT_PATH, "w") as f:
    json.dump(data, f)

size_kb = os.path.getsize(OUT_PATH) / 1024
print(f"Wrote {OUT_PATH} ({size_kb:.0f} KB)")
