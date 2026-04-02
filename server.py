from flask import Flask, jsonify, request
from flask_cors import CORS
import json, os

app       = Flask(__name__)
CORS(app)
DATA_FILE = "fintrack_data.json"
PALETTE   = ["#1D9E75","#378ADD","#D85A30","#7F77DD","#D4537E","#639922","#BA7517","#E24B4A"]


def load():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE) as f:
            return json.load(f)
    return {"balance": 0, "categories": [], "expenses": []}


def save(d):
    with open(DATA_FILE, "w") as f:
        json.dump(d, f, indent=2, ensure_ascii=False)


def ensure_category(d, name):
    existing = [c["name"] for c in d.get("categories", [])]
    if name not in existing:
        color = PALETTE[len(d["categories"]) % len(PALETTE)]
        d["categories"].append({"name": name, "color": color})


@app.route("/data")
def get_data():
    return jsonify(load())


@app.route("/expense", methods=["POST"])
def add_expense():
    d = load()
    ensure_category(d, request.json["cat"])
    d["expenses"].append(request.json)
    save(d)
    return jsonify({"ok": True})


@app.route("/expense/edit", methods=["POST"])
def edit_expense():
    d   = load()
    idx = request.json.get("index")
    if idx is None or idx < 0 or idx >= len(d["expenses"]):
        return jsonify({"ok": False, "error": "indice invalido"}), 400
    d["expenses"][idx]["amount"] = request.json["amount"]
    d["expenses"][idx]["cat"]    = request.json["cat"]
    ensure_category(d, request.json["cat"])
    save(d)
    return jsonify({"ok": True})


@app.route("/expense/delete", methods=["POST"])
def delete_expense():
    d   = load()
    idx = request.json.get("index")
    if idx is None or idx < 0 or idx >= len(d["expenses"]):
        return jsonify({"ok": False, "error": "indice invalido"}), 400
    d["expenses"].pop(idx)
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
    name = body.get("name", "").strip().lower()
    if not name:
        return jsonify({"ok": False, "error": "nome invalido"}), 400
    if name not in [c["name"] for c in d["categories"]]:
        d["categories"].append({"name": name, "color": body.get("color", "#1D9E75")})
        save(d)
    return jsonify({"ok": True})


@app.route("/category/", methods=["DELETE"])
def delete_category(name):
    d = load()
    d["categories"] = [c for c in d["categories"] if c["name"] != name]
    save(d)
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)