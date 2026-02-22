"""PDF floor-plan processor — extracts room grids from ECEB building PDF."""

import numpy as np

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

# ── Config ──────────────────────────────────────────────────────────────────
SCALE = 2.0
CELL_SIZE = 4
VOTE_THR = 0.40
SAMPLE_OFFSETS = [0, 2, 4]

FLOOR_REGIONS = [
    {"page": 1, "x": 50,  "y": 280, "w": 720, "h": 680, "label": "Level 01"},
    {"page": 1, "x": 800, "y": 280, "w": 720, "h": 680, "label": "Level 02"},
    {"page": 2, "x": 30,  "y": 460, "w": 770, "h": 620, "label": "Level 03"},
    {"page": 2, "x": 790, "y": 460, "w": 770, "h": 620, "label": "Level 04"},
    {"page": 2, "x": 360, "y": 60,  "w": 600, "h": 420, "label": "Level 05"},
]

ROOM_TYPES = {
    "A": {"name": "Admin",       "color": "#002060", "hue": [200, 250], "sat": [0.50, 1.00], "lit": [0.05, 0.35]},
    "C": {"name": "Classroom",   "color": "#4472C4", "hue": [200, 250], "sat": [0.30, 1.00], "lit": [0.35, 0.75]},
    "R": {"name": "Circulation", "color": "#00B0F0", "hue": [175, 215], "sat": [0.50, 1.00], "lit": [0.35, 0.80]},
    "L": {"name": "Lab",         "color": "#E48F24", "hue": [10,  50],  "sat": [0.50, 1.00], "lit": [0.35, 0.80]},
    "O": {"name": "Office",      "color": "#70AD47", "hue": [70,  150], "sat": [0.20, 1.00], "lit": [0.25, 0.70]},
    "S": {"name": "Student",     "color": "#FF66CC", "hue": [285, 355], "sat": [0.40, 1.00], "lit": [0.40, 0.90]},
    "G": {"name": "General",     "color": "#B0B8C0"},
}

ROOM_KEYS = ["A", "C", "R", "L", "O", "S", "G"]


def rgb_to_hsl(r: int, g: int, b: int):
    r, g, b = r / 255.0, g / 255.0, b / 255.0
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2.0
    if mx == mn:
        return 0.0, 0.0, l
    d = mx - mn
    s = d / (2.0 - mx - mn) if l > 0.5 else d / (mx + mn)
    if mx == r:
        h = ((g - b) / d + (6 if g < b else 0)) / 6.0
    elif mx == g:
        h = ((b - r) / d + 2) / 6.0
    else:
        h = ((r - g) / d + 4) / 6.0
    return h * 360, s, l


def classify_pixel(r: int, g: int, b: int):
    h, s, l = rgb_to_hsl(r, g, b)
    if l > 0.92:
        return None
    if l < 0.12:
        return "W"
    if l < 0.20 and s < 0.15:
        return "W"

    for key in ROOM_KEYS:
        rt = ROOM_TYPES[key]
        if "hue" not in rt:
            continue
        h0, h1 = rt["hue"]
        s0, s1 = rt["sat"]
        l0, l1 = rt["lit"]
        h_match = (h >= h0 and h <= h1) if h0 <= h1 else (h >= h0 or h <= h1)
        if h_match and s >= s0 and s <= s1 and l >= l0 and l <= l1:
            return key

    if s < 0.15 and 0.20 <= l <= 0.85:
        return "G"
    return None


def process_floor(pixels: np.ndarray, img_w: int, img_h: int):
    """pixels: (H, W, 3) uint8 array. Returns grid as list of lists."""
    grid_w = img_w // CELL_SIZE
    grid_h = img_h // CELL_SIZE
    grid = []

    for gy in range(grid_h):
        row = []
        for gx in range(grid_w):
            votes: dict[str, int] = {}
            total = 0
            for dy in SAMPLE_OFFSETS:
                for dx in SAMPLE_OFFSETS:
                    px = gx * CELL_SIZE + dx
                    py = gy * CELL_SIZE + dy
                    if px >= img_w or py >= img_h:
                        continue
                    r, g, b = int(pixels[py, px, 0]), int(pixels[py, px, 1]), int(pixels[py, px, 2])
                    t = classify_pixel(r, g, b)
                    total += 1
                    if t is not None:
                        votes[t] = votes.get(t, 0) + 1
            if not votes:
                row.append(None)
                continue
            best_type = max(votes, key=lambda k: votes[k])
            best_count = votes[best_type]
            row.append(best_type if best_count / total > VOTE_THR else None)
        grid.append(row)

    # Post-process: remove interior furniture walls
    cleaned = [row[:] for row in grid]
    for gy in range(grid_h):
        for gx in range(grid_w):
            if grid[gy][gx] != "W":
                continue
            has_null = False
            neighbor_rooms: set[str] = set()
            for dy in range(-1, 2):
                for dx in range(-1, 2):
                    if dy == 0 and dx == 0:
                        continue
                    ny, nx = gy + dy, gx + dx
                    if ny < 0 or ny >= grid_h or nx < 0 or nx >= grid_w:
                        has_null = True
                        continue
                    n = grid[ny][nx]
                    if n is None:
                        has_null = True
                    elif n != "W":
                        neighbor_rooms.add(n)
            if not has_null and len(neighbor_rooms) < 2:
                cleaned[gy][gx] = list(neighbor_rooms)[0] if len(neighbor_rooms) == 1 else None

    # Add building outline
    final = [row[:] for row in cleaned]
    for gy in range(grid_h):
        for gx in range(grid_w):
            if cleaned[gy][gx] is not None:
                continue
            bordering = False
            for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                ny, nx = gy + dy, gx + dx
                if ny < 0 or ny >= grid_h or nx < 0 or nx >= grid_w:
                    continue
                n = cleaned[ny][nx]
                if n is not None and n != "W":
                    bordering = True
                    break
            if bordering:
                final[gy][gx] = "B"  # B for building outline

    return {"grid": final, "gridW": grid_w, "gridH": grid_h}


def load_and_process_pdf(pdf_path: str):
    """Load PDF, render pages, extract floor grids."""
    if fitz is None:
        raise RuntimeError("PyMuPDF not installed")

    doc = fitz.open(pdf_path)
    page_pixmaps: dict[int, tuple[np.ndarray, int, int]] = {}

    for page_num in [1, 2]:
        page = doc[page_num - 1]
        mat = fitz.Matrix(SCALE, SCALE)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        w, h = pix.width, pix.height
        data = np.frombuffer(pix.samples, dtype=np.uint8).reshape((h, w, 3))
        page_pixmaps[page_num] = (data, w, h)

    floors = []
    for region in FLOOR_REGIONS:
        data, pw, ph = page_pixmaps[region["page"]]
        x = max(0, min(region["x"], pw))
        y = max(0, min(region["y"], ph))
        x2 = min(x + region["w"], pw)
        y2 = min(y + region["h"], ph)
        crop = data[y:y2, x:x2]
        rw, rh = crop.shape[1], crop.shape[0]
        result = process_floor(crop, rw, rh)
        result["label"] = region["label"]
        floors.append(result)

    doc.close()
    return floors
