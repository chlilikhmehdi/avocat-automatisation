#!/usr/bin/env python3
"""
rag_client.py
─────────────────────────────────────────────────────────────────────────────
Client Python simple pour tester l'API RAG du backend MiZan.

Usage :
  python rag_client.py login <email> <password>
  python rag_client.py ingest <dossier_id> <fichier.pdf>
  python rag_client.py query <dossier_id> "Votre question ici"
  python rag_client.py summary <dossier_id>
  python rag_client.py history <dossier_id>
─────────────────────────────────────────────────────────────────────────────
Dépendances : pip install requests
"""

import sys
import json
import requests

# ── Configuration ─────────────────────────────────────────────────────────────
BASE_URL = "http://localhost:4000/api"
TOKEN_FILE = ".rag_token"  # Stocke le JWT localement


def save_token(token):
    with open(TOKEN_FILE, "w") as f:
        f.write(token)


def load_token():
    try:
        with open(TOKEN_FILE, "r") as f:
            return f.read().strip()
    except FileNotFoundError:
        print("❌ Vous devez d'abord vous connecter : python rag_client.py login <email> <password>")
        sys.exit(1)


def headers():
    return {
        "Authorization": f"Bearer {load_token()}",
    }


def json_headers():
    h = headers()
    h["Content-Type"] = "application/json"
    return h


def pp(data):
    """Pretty print JSON"""
    print(json.dumps(data, indent=2, ensure_ascii=False))


# ── Commandes ─────────────────────────────────────────────────────────────────

def cmd_login(email, password):
    """Se connecter et sauvegarder le token JWT"""
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password,
    })
    data = res.json()
    if data.get("success") and data.get("token"):
        save_token(data["token"])
        print(f"✅ Connecté en tant que {data.get('user', {}).get('nom', email)}")
        print(f"   Rôle : {data.get('user', {}).get('role', '?')}")
    else:
        print(f"❌ Échec de connexion : {data.get('message', 'Erreur inconnue')}")


def cmd_ingest(dossier_id, file_path):
    """Ingérer un document dans un dossier"""
    print(f"📄 Ingestion de '{file_path}' dans le dossier #{dossier_id}...")

    with open(file_path, "rb") as f:
        res = requests.post(
            f"{BASE_URL}/rag/ingest",
            headers=headers(),
            data={"dossier_id": dossier_id},
            files={"file": (file_path.split("/")[-1], f)},
        )

    data = res.json()
    if data.get("success"):
        print(f"✅ {data.get('message', 'Ingestion lancée')}")
        print(f"   Fichier : {data.get('fichier')}")
    else:
        print(f"❌ Erreur : {data.get('message')}")


def cmd_query(dossier_id, question):
    """Poser une question RAG sur un dossier"""
    print(f"🔍 Question sur dossier #{dossier_id} : \"{question}\"\n")

    res = requests.post(
        f"{BASE_URL}/rag/query",
        headers=json_headers(),
        json={"dossier_id": int(dossier_id), "question": question},
    )

    data = res.json()
    if data.get("success"):
        result = data["data"]
        print("=" * 60)
        print("📝 RÉPONSE :")
        print("=" * 60)
        print(result["reponse"])
        print()

        if result.get("citations"):
            print("=" * 60)
            print("📌 CITATIONS :")
            print("=" * 60)
            for c in result["citations"]:
                print(f"\n  [{c['source_index']}] {c['nom_document']} — Page {c['page_numero']}")
                print(f"      Score : {c['score_pertinence']}")
                print(f"      Type  : {', '.join(c.get('type_recherche', []))}")
                print(f"      Extrait : {c['extrait'][:150]}...")
    else:
        print(f"❌ Erreur : {data.get('message')}")


def cmd_summary(dossier_id):
    """Récupérer le résumé d'un dossier"""
    print(f"📋 Résumé du dossier #{dossier_id}...\n")

    res = requests.get(
        f"{BASE_URL}/dossiers/{dossier_id}/summary",
        headers=headers(),
    )

    data = res.json()
    if data.get("success"):
        d = data["data"]
        print("=" * 60)
        print(f"📁 DOSSIER #{d['dossier_id']} — {d['documents_comptes']} document(s)")
        print("=" * 60)
        print(f"\n{d['resume_global']}\n")

        if d.get("entites"):
            print("🏷️  ENTITÉS EXTRAITES :")
            pp(d["entites"])
    else:
        print(f"❌ {data.get('message')}")


def cmd_history(dossier_id):
    """Voir l'historique des conversations RAG"""
    res = requests.get(
        f"{BASE_URL}/rag/history/{dossier_id}",
        headers=headers(),
    )

    data = res.json()
    if data.get("success"):
        conversations = data["data"]
        print(f"📜 {len(conversations)} conversation(s) trouvée(s) :\n")
        for conv in conversations:
            print(f"  [{conv['created_at']}]")
            print(f"  Q: {conv['question']}")
            print(f"  R: {conv['reponse'][:120]}...")
            print()
    else:
        print(f"❌ {data.get('message')}")


# ── Point d'entrée ────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1].lower()

    if command == "login" and len(sys.argv) == 4:
        cmd_login(sys.argv[2], sys.argv[3])
    elif command == "ingest" and len(sys.argv) == 4:
        cmd_ingest(sys.argv[2], sys.argv[3])
    elif command == "query" and len(sys.argv) == 4:
        cmd_query(sys.argv[2], sys.argv[3])
    elif command == "summary" and len(sys.argv) == 3:
        cmd_summary(sys.argv[2])
    elif command == "history" and len(sys.argv) == 3:
        cmd_history(sys.argv[2])
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
