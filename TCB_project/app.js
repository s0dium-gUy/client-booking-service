const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3000;

// ─── DATABASE SETUP ───────────────────────────────────────
const db = new Database(path.join(__dirname, 'appointments.db'));
db.pragma('journal_mode = WAL');

// Store times in total minutes (e.g., 9:30 AM = 570 minutes)
db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clientName TEXT NOT NULL,
        startTime INTEGER NOT NULL,
        endTime INTEGER NOT NULL
    )
`);

// Prepared SQL statements
const getAllStmt = db.prepare('SELECT * FROM appointments ORDER BY startTime');
const getByIdStmt = db.prepare('SELECT * FROM appointments WHERE id = ?');
const insertStmt = db.prepare('INSERT INTO appointments (clientName, startTime, endTime) VALUES (?, ?, ?)');
const deleteStmt = db.prepare('DELETE FROM appointments WHERE id = ?');
const checkOverlapStmt = db.prepare(`
    SELECT * FROM appointments 
    WHERE (? >= startTime AND ? < endTime) 
       OR (? > startTime AND ? <= endTime)
`);

// ─── VALIDATION HELPERS ──────────────────────────────────

// Only letters and spaces allowed in client name
function isValidName(name) {
    return /^[A-Za-z\s]+$/.test(name);
}

// Valid time must be in minutes (0–1425, i.e., 00:00 to 23:45)
function isValidTime(minutes) {
    return Number.isInteger(minutes) && minutes >= 0 && minutes <= 1425 && minutes % 15 === 0;
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── ROUTES ───────────────────────────────────────────────

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// GET – View all appointments
app.get('/api/appointments', (req, res) => {
    const appointments = getAllStmt.all();
    res.json({
        success: true,
        count: appointments.length,
        appointments: appointments
    });
});

// POST – Book a new appointment
app.post('/api/appointments', (req, res) => {
    const { clientName, startTime, endTime } = req.body;

    // Validate client name
    if (!clientName || clientName.trim() === '') {
        return res.status(400).json({ success: false, message: 'Client name is required' });
    }

    if (!isValidName(clientName.trim())) {
        return res.status(400).json({ success: false, message: 'Client name must contain only letters and spaces' });
    }

    const start = parseInt(startTime);
    const end = parseInt(endTime);

    // Validate times (now in minutes)
    if (!isValidTime(start) || !isValidTime(end)) {
        return res.status(400).json({ success: false, message: 'Times must be in valid 15-minute intervals (0-1425)' });
    }

    if (start >= end) {
        return res.status(400).json({ success: false, message: 'Start time must be before end time' });
    }

    // Check duration is a valid multiple (15, 30, 45, or 60 minutes)
    const duration = end - start;
    if (![15, 30, 45, 60].includes(duration)) {
        return res.status(400).json({ success: false, message: 'Appointment duration must be 15, 30, 45, or 60 minutes' });
    }

    // Check for overlapping time slots
    const overlap = checkOverlapStmt.get(start, start, end, end);
    if (overlap) {
        return res.status(409).json({ success: false, message: 'This time slot overlaps with an existing appointment' });
    }

    // Insert into database
    const result = insertStmt.run(clientName.trim(), start, end);

    res.status(201).json({
        success: true,
        message: 'Appointment booked successfully',
        appointment: {
            id: result.lastInsertRowid,
            clientName: clientName.trim(),
            startTime: start,
            endTime: end
        }
    });
});

// DELETE – Cancel an appointment by ID
app.delete('/api/appointments/:id', (req, res) => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
    }

    const appointment = getByIdStmt.get(id);
    if (!appointment) {
        return res.status(404).json({ success: false, message: `No appointment found with ID: ${id}` });
    }

    deleteStmt.run(id);

    res.json({
        success: true,
        message: `Appointment ID: ${id} has been successfully cancelled`,
        appointment: {
            id: appointment.id,
            clientName: appointment.clientName,
            startTime: appointment.startTime,
            endTime: appointment.endTime
        }
    });
});

// Gracefully close the database when the server stops
process.on('SIGINT', () => {
    db.close();
    console.log('\n Database connection closed.');
    process.exit(0);
});

// Start the server
app.listen(PORT, () => {
    console.log(`\n Appointment Scheduler is running at http://localhost:${PORT}`);
    console.log(` SQLite database: appointments.db\n`);
});