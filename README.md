# ⚖️ Système d’Automatisation pour Cabinet d’Avocats

## Description

Ce projet est une application web de gestion et d’automatisation destinée aux cabinets d’avocats.
Il permet de centraliser et automatiser plusieurs processus métier comme la gestion des dossiers, des factures, des honoraires et des relevés.

---

##  Fonctionnalités principales

* Gestion des dossiers clients
* Suivi des factures et honoraires
* Génération de relevés automatiques
* Gestion des statuts de factures (payé / non payé / en cours)
* API REST pour intégration avec frontend ou applications mobiles
* Connexion sécurisée à la base de données MySQL (pool de connexions)

---

##  Stack technique

* Node.js
* Express.js
* MySQL
* REST API
* (optionnel) React / React Native pour le frontend
* JWT pour l’authentification (si activé)

---

## Structure du projet

```
back-end/
 ├── controllers/
 ├── routes/
 ├── models/
 ├── config/
 ├── middlewares/
 └── app.js
```

---

##  Installation

```bash
git clone https://github.com/username/avocat-automatisation.git
cd avocat-automatisation
npm install
```

---

## Lancement du projet

```bash
npm start
```

ou en mode développement :

```bash
npm run dev
```

---

##  Variables d’environnement

Créer un fichier `.env` :

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=-----
DB_NAME=-----
JWT_SECRET=----
```

---

##  Endpoints API (exemples)

* `GET /api/factures` → Liste des factures
* `GET /api/factures/:id` → Détails facture
* `PUT /api/factures/:id/status` → Modifier le statut
* `POST /api/dossiers` → Créer un dossier

---

## Auteur

Projet développé par **EL Mehdi Chlilikh**

---

## Objectif

Optimiser et automatiser la gestion interne des cabinets d’avocats afin de réduire le travail manuel et améliorer la productivité.
