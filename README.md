# BankApp

Sample App built for regional bank to auotmate workflows using AI

A demo banking web app for DCCB-VZM with:
- A deposit scheme calculator (sliders + live charts)
- A loan application form
- User accounts via **email + OTP** (customers sign in with any email address and apply; anyone whose email is on the manager list can view all submitted applications)

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

### Set up email sign-in (one-time)

This app lets people log in with **any email address and a one-time code (OTP)** instead of a username/password — Gmail, Outlook, Yahoo, a work email, anything. The actual email is sent by **Brevo** (a free transactional-email service) — before login works, you need a free Brevo account and to paste two values into one file. You only need to do this once.

1. Go to [app.brevo.com](https://app.brevo.com/) and sign up for a free account (no credit card needed).
2. Once logged in, click your account name (top right) → **SMTP & API** → the **API Keys** tab → **Generate a new API key**. Give it any name and copy the long key it shows you. It must start with `xkeysib-`. Don't use the **SMTP** tab's key (`xsmtpsib-...`): it won't work with this app — you won't be able to see it again, so copy it somewhere safe for now.
3. Go to **Senders, Domains & Dedicated IPs** (left sidebar, under "Contacts" or via the account menu) → **Senders** tab → **Add a sender**. Enter a name and the email address you want OTP codes to appear to come *from* (this can be your own email, e.g. your Gmail address — it doesn't need to be a custom domain).
4. Brevo emails a confirmation link to that address — open that email and click the link to verify it. Until this is done, Brevo will refuse to send anything from that address.

Now put the two values in place:

- **The API key** never goes into a file. GitHub refuses to accept code containing it, and it can send email as you. Instead, set it in the backend's PowerShell window each time, before starting the backend (see Part 4):
  ```
  $env:BREVO_API_KEY="xkeysib-your-key-here"
  ```
- **The sender address:** open `backend/manager_config.py` and set `FROM_EMAIL = "the-address-you-verified@example.com"`. While you're in this file, add your own email address (in lowercase) to `SUPER_MANAGER_EMAILS` if you want to see the Manager Dashboard for all branches. These aren't secret, so they stay in the file. Branch managers don't need any setup: each branch's email in `backend/branches.py` is automatically that branch's manager.

On the live site, the key is stored on Render instead. See `docs/deployment.md`.

**A note on cost:** Brevo's free plan includes 300 emails/day forever, which is far more than a demo needs — no paid upgrade required for this app's purposes.

---

## Part 4 — Running the app

Every time you want to use the app, you need **both** the backend and the frontend running at the same time, in **two separate PowerShell windows**.

### Window 1 — Backend (FastAPI + SQLite)

```
cd C:\NeeruBankApp\BankApp\backend
.\venv\Scripts\Activate
$env:BREVO_API_KEY="xkeysib-your-key-here"
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

- Click **Sign in** at the top of the page and enter your email address, then click **Continue**.
  - **New email**: you'll be asked for your full name, age, mobile number and **branch**, then a code is sent to that email — enter it and click **Verify & Sign in**. If your browser asks to use your location, allowing it lists the nearest branches first (your location stays in your browser). The **📍 Map** link shows the chosen branch on Google Maps.
  - **Email you've used before**: a code is sent straight away — enter it and click **Verify & Sign in**.
- Once signed in, you can apply for deposits and loans.
- **Branch manager** (a branch email such as `bbl202@dccbvzm.org`): just enter the email and the code — no signup form. You land on the **Manager Dashboard** showing only your branch's customers, with their contact details and anything they've applied for.
- **Super manager** (an email in `SUPER_MANAGER_EMAILS` in `backend/manager_config.py`): same dashboard, but for **all branches**, with a Branch column and a filter showing each branch's customer counts.
- If an error mentions email sign-in isn't configured, `BREVO_API_KEY` wasn't set in the backend window before `uvicorn` started (see Parts 3 and 4).
- If the code email never arrives, look in the backend window for a line starting `ERROR: Brevo rejected the send`. `Key not found` means you used an SMTP key instead of an `xkeysib-` API key.

---

## Kiosk mode (touchscreen at the Head Office)

Open **http://localhost:4200/kiosk** (live: https://dccb-vzm-bank.vercel.app/kiosk). No sign-in: visitors can explore deposits, loans, the children's scheme and branches, and ask for a call back. Call-back requests appear for managers under **Manager Dashboard → Call-back requests**. The screen clears itself after 90 seconds without a touch. How to set up the actual kiosk machine (Chrome in kiosk mode, portrait screen) is in `docs/kiosk.md`.

## Troubleshooting

- **"`ng`/`node`/`python`/`git` is not recognized"** — close and reopen your terminal (or VS Code) window. See Part 1's note above.
- **Backend won't start / port already in use** — make sure you don't already have another `uvicorn` window running from before.
- **Frontend shows errors calling the backend** — make sure Window 1 (the backend) is running before you use the app in the browser.
