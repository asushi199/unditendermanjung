"""Concurrent registration load test (run while server is up)."""
import concurrent.futures
import sys
from pathlib import Path

import urllib.error
import urllib.request
import json

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

BASE = "http://127.0.0.1:8088"


def register_one(company_id: int, counter: int) -> dict:
    body = json.dumps({"company_id": company_id, "counter_id": counter}).encode()
    req = urllib.request.Request(
        f"{BASE}/api/register",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {"error": json.loads(e.read()).get("detail", str(e))}


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    print(f"Testing {n} concurrent registrations across 4 counters...")
    numbers = []
    errors = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        futures = [
            ex.submit(register_one, i + 1, (i % 4) + 1)
            for i in range(n)
        ]
        for f in concurrent.futures.as_completed(futures):
            r = f.result()
            if "error" in r:
                errors.append(r["error"])
            else:
                numbers.append(r["draw_number_int"])

    numbers.sort()
    unique = len(set(numbers))
    expected = list(range(1, n + 1))
    gaps = [x for x in expected if x not in numbers]

    print(f"Success: {len(numbers)}, Errors: {len(errors)}")
    print(f"Unique numbers: {unique}")
    if gaps:
        print(f"FAIL: Missing numbers: {gaps[:10]}...")
    elif unique != len(numbers):
        print("FAIL: Duplicate numbers detected")
    elif numbers != expected:
        print(f"FAIL: Expected 1..{n}, got range {numbers[0]}..{numbers[-1]}")
    else:
        print(f"PASS: Sequential unique numbers 001-{n:03d}")

    if errors and len(errors) < 5:
        print("Sample errors:", errors[:3])


if __name__ == "__main__":
    main()
