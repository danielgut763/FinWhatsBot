from flask import Flask, jsonify, request
from flask_cors import CORS
import json, os

app       = Flask(__name__)
CORS(app)
DATA_FILE = "fintrack_data.json"

PALETTE = ["#1D9E75","#378ADD","#D85A30","#7F77DD","#D4537E","#639922","#BA7517","#E24B4A"]


def load():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE) as f:
            return json.load(f)
    return {"balance": 0, "categories": [], "expenses": []}


def save(d):
    with open(DATA_FILE, "w") as f:
        json.dump(d, f, indent=2)


@app.route("/data")
def get_data():
    return jsonify(load())


@app.route("/expense", methods=["POST"])
def add_expense():
    d    = load()
    body = request.json

    # Auto-create category if new
    existing = [c["name"] for c in d.get("categories", [])]
    if body["cat"] not in existing:
        color = PALETTE[len(d["categories"]) % len(PALETTE)]
        d["categories"].append({"name": body["cat"], "color": color})

    d["expenses"].append(body)
    save(d)
    return jsonify({"ok": True})


@app.route("/balance", methods=["POST"])
def set_balance():
    d = load()
    d["balance"] = request.json.get("balance", 0)
    save(d)
    return jsonify({"ok": True})


@app.route("/category", methods=["POST"])
def add_category():
    d    = load()
    body = request.json
    existing = [c["name"] for c in d.get("categories", [])]
    if body["name"] not in existing:
        d["categories"].append({"name": body["name"], "color": body.get("color", "#1D9E75")})
        save(d)
    return jsonify({"ok": True})


@app.route("/category/", methods=["DELETE"])
def delete_category(name):
    d = load()
    d["categories"] = [c for c in d["categories"] if c["name"] != name]
    save(d)
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(port=5000)