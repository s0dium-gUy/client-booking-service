# 📅 Appointment Scheduler

A web-based appointment scheduling system built with **Express.js** and vanilla JavaScript. Users can book, view, and cancel appointments through a clean, modern interface.

## ✨ Features

- **Book Appointments** — Select a client name and time slot (0–23 hrs)
- **View Appointments** — See all scheduled appointments in real time
- **Cancel Appointments** — Remove any appointment with one click
- **Overlap Detection** — Prevents double-booking the same time slot
- **Input Validation** — Ensures start time is before end time and all fields are filled

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **Node.js** | JavaScript runtime |
| **Express.js** | Web server & REST API |
| **HTML/CSS/JS** | Frontend interface |

## 📁 Project Structure

```
TCB_project/
├── app.js               # Express server with API routes
├── package.json         # Project dependencies
├── .gitignore           # Files excluded from Git
└── public/
    ├── index.html       # Frontend page
    ├── style.css        # Styling
    └── script.js        # Frontend logic
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) installed on your system

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/TCB_project.git
   cd TCB_project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   node app.js
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/appointments` | Fetch all appointments |
| `POST` | `/api/appointments` | Book a new appointment |
| `DELETE` | `/api/appointments/:id` | Cancel an appointment by ID |

### Example: Book an Appointment

```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{"clientName": "John Doe", "startTime": 9, "endTime": 11}'
```

## 📸 Screenshot

<img width="1351" height="633" alt="image" src="https://github.com/user-attachments/assets/812d046c-72be-45f7-9cee-7f28717b183f" />


## 👥 Contributors

- **Naman** — Developer
- **Suhani** - Developer

## 📄 License

This project is for educational purposes.
