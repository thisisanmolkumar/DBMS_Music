# Banana Music – Local Setup Guide

This project includes a **React frontend**, a **Flask API backend**, and a **Flask streaming server** for serving MP3 files.

---

## 🧰 Prerequisites

Make sure you have the following installed:

-   **Node.js** (v18 or higher)
-   **npm** or **yarn**
-   **Python 3.11+**
-   **pip** (Python package manager)
-   **MongoDB** (local or cloud instance like MongoDB Atlas)

---

## ⚙️ Folder Structure

```
ADBMS/
├── frontend/           # React + TypeScript app
├── backend/
│   ├── server.py          # Flask API server (MongoDB + CRUD)
│   ├── stream.py       # Flask streaming server for MP3s
│   ├── crud.py, db.py  # Database helpers
│   └── .env            # Environment variables (not tracked)
```

---

## 🚀 Step 1 – Set Up the Python Environment

1. Navigate to the utils folder:

    ```bash
    cd backend
    ```

2. Create a virtual environment and activate it:

    ```bash
    python3 -m venv venv
    source venv/bin/activate   # On Windows: venv\Scripts\activate
    ```

3. Install dependencies:

    ```bash
    pip install -r requirements.txt
    ```

4. Make sure your `.env` file includes MongoDB credentials, for example:
    ```env
    MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net
    MONGODB_DB=dbms_music
    FLASK_ENV=development
    ```

---

## 💽 Step 2 – Run the Flask Servers

### 🔸 Start the API Server (for React frontend)

```bash
python server.py
```

This will start your backend API on:
👉 http://localhost:5001

### 🔹 Start the Streaming Server (for MP3 playback)

In a new terminal (while keeping the first running):

```bash
python stream.py
```

This will host your MP3 files on:
👉 http://localhost:8000/stream/<filename>

---

## 🎨 Step 3 – Run the React Frontend

1. Open another terminal window and navigate to the frontend directory:

    ```bash
    cd ../frontend
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Start the development server:
    ```bash
    npm start
    ```

The app will open automatically in your browser at:
👉 http://localhost:3000

---

## 🔄 Step 4 – Verify Everything Works

-   Visit **http://localhost:3000** → the React UI loads.
-   API is running at **http://localhost:5001/api/** → test endpoints like `/api/songs`.
-   Stream audio from **http://localhost:8000/stream/<song_name>.mp3**.

---

## ✅ Summary

| Service          | Port | Command            |
| ---------------- | ---- | ------------------ |
| React Frontend   | 3000 | `npm start`        |
| Flask API        | 5001 | `python server.py` |
| Streaming Server | 8000 | `python stream.py` |

---

Now you’re ready to develop and test **Banana Music** locally 🎧
