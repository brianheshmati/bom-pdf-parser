import io
import json
import csv
import logging
import re
import azure.functions as func
import pdfplumber

# Output fields
FIELDS = [
    "Main Line", "Sub Line", "CPS Part No.", "Part Description",
    "Sales Qty", "UoM", "Unit Net Price", "Extended Amount"
]

# Regex for the first line (description line)
DESC_RE = re.compile(
    r"""^\s*
    (?P<main>\d+)\s+                 # Main Line (1, 2, 3 …)
    (?P<partno>[A-Z0-9\-]+)\s+       # CPS Part No.
    (?:Bid\s+Item.*?\s+)?            # Optional "Bid Item …" text
    (?P<qty>\d+(?:\.\d+)?)\s+        # Sales Qty
    (?P<uom>[A-Za-z]+)\s+            # UoM
    \$?(?P<unit>[\d,]+(?:\.\d{2})?)\s+
    \$?(?P<ext>[\d,]+(?:\.\d{2})?)   # Extended Amount
    """,
    re.VERBOSE
)

# Regex for the second line (detail line)
DETAIL_RE = re.compile(
    r"""^\s*
    (?P<sub>\d+(?:\.\d+)?)\s+        # Sub Line (1.1, 2.1 …)
    (?P<desc>.+)$                    # Part Description
    """,
    re.VERBOSE
)

def parse_row(desc_line: str, detail_line: str):
    """Parse a row consisting of two lines."""
    m = DESC_RE.match(desc_line.strip())
    m2 = DETAIL_RE.match(detail_line.strip())

    if not m or not m2:
        return None

    return {
        "Main Line": m.group("main"),
        "Sub Line": m2.group("sub"),
        "CPS Part No.": m.group("partno"),
        "Part Description": m2.group("desc"),
        "Sales Qty": m.group("qty"),
        "UoM": m.group("uom"),
        "Unit Net Price": m.group("unit"),
        "Extended Amount": m.group("ext"),
    }

def extract_rows(pdf_bytes: bytes):
    """Extract all structured rows from the PDF."""
    records = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text(x_tolerance=3, y_tolerance=3) or ""
            lines = [ln.strip() for ln in text.split("\n") if ln.strip()]

            i = 0
            while i < len(lines) - 1:
                # Stop at subtotals or totals
                if lines[i].startswith("Subtotal") or lines[i].startswith("Total"):
                    break

                row = parse_row(lines[i], lines[i + 1])
                if row:
                    records.append(row)
                    i += 2
                else:
                    i += 1
    return records

async def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info("PDF table extraction triggered.")

    try:
        file = req.files.get("file")
        if not file:
            return func.HttpResponse("No file uploaded (multipart/form-data with key 'file')", status_code=400)

        pdf_bytes = file.read()
        rows = extract_rows(pdf_bytes)

        fmt = (req.params.get("format") or "json").lower()
        if fmt == "csv":
            buf = io.StringIO()
            writer = csv.DictWriter(buf, fieldnames=FIELDS)
            writer.writeheader()
            writer.writerows(rows)
            return func.HttpResponse(buf.getvalue(), mimetype="text/csv", status_code=200)

        return func.HttpResponse(json.dumps(rows, indent=2), mimetype="application/json", status_code=200)

    except Exception as e:
        logging.exception("Extraction error")
        return func.HttpResponse(f"Error: {e}", status_code=500)
