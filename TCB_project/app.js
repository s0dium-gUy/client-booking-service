const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3000;

// ─── DATABASE SETUP ───────────────────────────────────────
// Creates a file called 'appointments.db' in the project folder
// If the file already exists, it just connects to it
const db = new Database(path.join(__dirname, 'appointments.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create the appointments table if it doesn't exist yet
db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clientName TEXT NOT NULL,
        startTime INTEGER NOT NULL,
        endTime INTEGER NOT NULL
    )
`);

// Prepare reusable SQL statements (faster than writing SQL each time)
const getAllStmt = db.prepare('SELECT * FROM appointments ORDER BY startTime');
const getByIdStmt = db.prepare('SELECT * FROM appointments WHERE id = ?');
const insertStmt = db.prepare('INSERT INTO appointments (clientName, startTime, endTime) VALUES (?, ?, ?)');
const deleteStmt = db.prepare('DELETE FROM appointments WHERE id = ?');
const checkOverlapStmt = db.prepare(`
    SELECT * FROM appointments 
    WHERE (? >= startTime AND ? < endTime) 
       OR (? > startTime AND ? <= endTime)
`);

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

    // Validation
    if (!clientName || clientName.trim() === '') {
        return res.status(400).json({ success: false, message: 'Client name is required' });
    }

    const start = parseInt(startTime);
    const end = parseInt(endTime);

    if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ success: false, message: 'Start and end times must be valid numbers (0-23)' });
    }

    if (start < 0 || start > 23 || end < 0 || end > 23) {
        return res.status(400).json({ success: false, message: 'Times must be between 0 and 23' });
    }

    if (start >= end) {
        return res.status(400).json({ success: false, message: 'Start time must be before end time' });
    }

    // Check for overlapping time slots in the database
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
            appointmentID: result.lastInsertRowid,
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

    // Check if the appointment exists
    const appointment = getByIdStmt.get(id);
    if (!appointment) {
        return res.status(404).json({ success: false, message: `No appointment found with ID: ${id}` });
    }

    // Delete from database
    deleteStmt.run(id);

    res.json({
        success: true,
        message: `Appointment ID: ${id} has been successfully cancelled`,
        appointment: {
            appointmentID: appointment.id,
            clientName: appointment.clientName,
            startTime: appointment.startTime,
            endTime: appointment.endTime
        }
    });
});

// Gracefully close the database when the server stops
process.on('SIGINT', () => {
    db.close();
    console.log('\n📦 Database connection closed.');
    process.exit(0);
});

// Start the server
app.listen(PORT, () => {
    console.log(`\n Appointment Scheduler is running at http://localhost:${PORT}`);
    console.log(`📦 SQLite database: appointments.db\n`);
});