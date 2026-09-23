# BankApp

Sample App built for regional bank to auotmate workflows using AI

A demo banking web app for DCCB-VZM with:
- A deposit scheme calculator (sliders + live charts)
- A loan application form
- User accounts via **Google Sign-In** (customers sign in with their Google account and apply; anyone whose Gmail address is on the manager list can view all submitted applications)

This README assumes **you have never coded before**. Follow the steps in order, top to bottom, and don't skip any. Every command below is meant to be typed into a terminal window (on Windows this is usually **PowerShell** — search for it in the Start menu).

---

## Part 1 — Install the tools (only needed once per computer)

You need four things installed: **Git**, **Python**, **Node.js**, and the **Angular CLI**. Install them in this order.

### 1. Install Git

Git is the tool used to download and manage the project's code.

1. Go to [git-scm.com/downloads](https://git-scm.com/downloads) and download the installer for Windows.
2. Run the installer. Keep clicking **Next** and accept all the default options — you don't need to change anything.
3. When it's done, open a **new** PowerShell window and check it worked by typing:
   ```
   git --version
   ```
   You should see something like `git version 2.xx.x`. If you instead see an error saying `git` is not recognized, close PowerShell completely and open a new window (this refreshes your computer's list of installed programs).

### 2. Install Python

Python runs the backend (the part that saves data to the database).

1. Go to [python.org/downloads](https://www.python.org/downloads/) and download the latest Python 3 installer for Windows.
2. Run the installer. **Important:** on the very first screen, tick the checkbox at the bottom that says **"Add python.exe to PATH"** before clicking Install. This step is easy to miss and causes problems later if skipped.
3. After it finishes, open a **new** PowerShell window and check it worked:
   ```
   python --version
   ```
   You should see something like `Python 3.12.x`.

### 3. Install Node.js

Node.js runs the frontend (the part you see and click on in the browser) and its tools.

1. Go to [nodejs.org](https://nodejs.org/) and download the **LTS** version (LTS means "long-term support" — the stable, recommended one).
2. Run the installer, keeping all the default options.
3. Open a **new** PowerShell window and check it worked:
   ```
   node --version
   npm --version
   ```
   Both should print a version number.

### 4. Install the Angular CLI

The Angular CLI is a tool that runs the frontend project. It's installed using Node's package manager (`npm`), which you just installed.

1. In PowerShell, run:
   ```
   npm install -g @angular/cli
   ```
   This downloads and installs the Angular command-line tool globally on your computer (only needs to be done once).
2. Open a **new** PowerShell window and check it worked:
   ```
   ng version
   ```
   You should see an Angular CLI banner with version numbers.

> **If any command says "is not recognized as an internal or external command"**: close every open PowerShell/terminal window and VS Code window completely, then reopen them. Windows only picks up newly-installed programs in *new* windows, not ones that were already open when you installed something.

---

## Part 2 — Get the project code

If you already have this folder on your computer (for example, someone gave it to you as a folder), skip to Part 3.

Otherwise, to download it fresh with Git:
```
git clone <the project's repository URL>
cd BankApp
```

---

## Part 3 — One-time project setup

This part prepares the backend and frontend to run. You only need to do this once (or again if the list of required libraries changes).

### Backend setup

Open PowerShell and navigate into the `backend` folder (adjust the path to wherever you saved the project):
```
cd C:\NeeruBankApp\BankApp\backend
```

Create a **virtual environment** — this is a private, self-contained copy of Python just for this project, so the libraries it needs don't clash with anything else on your computer:
```
python -m venv venv
```
This creates a new folder called `venv` inside `backend`. You'll only run this command once.

Now **activate** the virtual environment (you'll do this every time you want to work on the backend, including every time you open a new terminal):
```
.\venv\Scripts\Activate
```
You'll know it worked because your prompt line will now start with `(venv)`.

With the virtual environment active, install all the Python libraries this project needs:
```
pip install -r requirements.txt
```
This reads the `requirements.txt` file in the `backend` folder and downloads everything listed in it. It may take a minute or two.

### Frontend setup

Open a separate PowerShell window (or navigate back) into the `frontend` folder:
```
cd C:\NeeruBankApp\BankApp\frontend
```

Install all the JavaScript libraries this project needs:
```
npm install
```
This reads the `package.json` file and downloads everything the Angular app depends on. It may take a few minutes the first time.

### Set up Google Sign-In (one-time)

This app uses **"Sign in with Google"** instead of its own username/password system, so people log in with the Google account they already have. Before that works, you need to get one free piece of ID from Google and paste it into two files. You only need to do this once.

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and sign in with any Google account (you don't need to pay for anything — this is free).
2. If it asks you to create a project, create one (any name is fine, e.g. "BankApp Demo").
3. In the search bar at the top, type **"Credentials"** and open **APIs & Services → Credentials**.
4. Click **+ Create Credentials** → **OAuth client ID**.
   - If it asks you to configure a "consent screen" first, choose **External**, fill in an app name and your email in the required fields, and save — you can skip everything optional.
5. For **Application type**, choose **Web application**. Give it any name (e.g. "BankApp Local").
6. Under **Authorized JavaScript origins**, click **+ Add URI** and enter exactly:
   ```
   http://localhost:4200
   ```
7. Click **Create**. Google will show you a **Client ID** — a long string ending in `.apps.googleusercontent.com`. Copy it.

Now paste that Client ID into **two** files (open them in Notepad or VS Code):

- `backend/google_config.py` — set `GOOGLE_CLIENT_ID = "your-client-id-here"`. While you're in this file, also add your own Gmail address to `MANAGER_EMAILS` if you want to be able to see the Manager Dashboard, e.g. `MANAGER_EMAILS = {"you@gmail.com"}`.
- `frontend/src/app/auth/google-client-id.ts` — set `export const GOOGLE_CLIENT_ID = 'your-client-id-here';` (same value as above).

Save both files. This Client ID is safe to have in the code — it's not a secret, it just tells Google which app is asking.

---

## Part 4 — Running the app

Every time you want to use the app, you need **both** the backend and the frontend running at the same time, in **two separate PowerShell windows**.

### Window 1 — Backend (FastAPI + SQLite)

```
cd C:\NeeruBankApp\BankApp\backend
.\venv\Scripts\Activate
uvicorn main:app --reload
```

Leave this window open. It's running at http://127.0.0.1:8000 — you won't need to open that link yourself, the frontend talks to it automatically. The first time this runs, it also creates the database file (`bankapp.db`).

### Window 2 — Frontend (Angular)

```
cd C:\NeeruBankApp\BankApp\frontend
ng serve
```

Leave this window open too. Once it says `Application bundle generation complete`, open your web browser and go to:
```
http://localhost:4200
```

That's the app.

To stop either one, click into its window and press `Ctrl + C`.

---

## Logging in

- Click **Sign in** at the top of the page and use the **Sign in with Google** button. The first time you sign in, you'll be asked for your age and mobile number (Google doesn't share those with the app) — fill them in once and you're set.
- Once signed in, you can apply for deposits and loans.
- **Bank manager**: whichever Gmail address(es) you added to `MANAGER_EMAILS` in `backend/google_config.py` (see Part 3) automatically land on a separate **Manager Dashboard page** after signing in, listing every registered customer along with their age, contact details, and anything they've applied for.
- If you see a banner saying Google Sign-In isn't configured yet, you (or whoever set up the project) missed the "Set up Google Sign-In" step in Part 3.

---

## Troubleshooting

- **"`ng`/`node`/`python`/`git` is not recognized"** — close and reopen your terminal (or VS Code) window. See Part 1's note above.
- **Backend won't start / port already in use** — make sure you don't already have another `uvicorn` window running from before.
- **Frontend shows errors calling the backend** — make sure Window 1 (the backend) is running before you use the app in the browser.
