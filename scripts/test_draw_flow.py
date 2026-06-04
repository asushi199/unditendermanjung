"""Test two-phase draw flow."""
import json
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8088"


def post(path: str, body: dict | None = None):
    data = json.dumps(body or {}).encode() if body is not None else b"{}"
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=data if body is not None else None,
        headers={"Content-Type": "application/json"} if body is not None else {},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def get(path: str):
    with urllib.request.urlopen(f"{BASE}{path}") as resp:
        return json.loads(resp.read())


def main():
    post("/api/admin/reset-rehearsal", {"password": "manjunghebat"})
    post("/api/register", {"company_id": 1, "counter_id": 1})

    state = get("/api/state")
    assert state["phase"] == "idle"

    post("/api/draw/reveal", {"project_id": 1})
    state = get("/api/state")
    assert state["phase"] == "project"
    assert state["winning_company"] is None

    try:
        post("/api/draw/winner", {"draw_number": "999"})
        raise SystemExit("FAIL: unregistered number should be rejected")
    except urllib.error.HTTPError:
        pass

    post("/api/draw/winner", {"draw_number": "001"})
    state = get("/api/state")
    assert state["phase"] == "winner"

    post("/api/draw/winner", {"draw_number": "001"})
    state = get("/api/state")
    assert state["phase"] == "winner"
    assert state["winning_draw_number"] == "001"

    post("/api/draw/next")
    assert get("/api/state")["phase"] == "idle"

    print("PASS: Two-phase draw flow OK")


if __name__ == "__main__":
    main()
