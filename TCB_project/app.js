const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// The Appointment Class
class Appointment {
    constructor(name, id, st, endt) {
        this.clientName = name;
        this.appointmentID = id;
        this.startTime = st;
        this.endTime = endt;
    }

    getName() {
        return this.clientName;
    }

    getID() {
        return this.appointmentID;
    }

    getStartTime() {
        return this.startTime;
    }

    getEndTime() {
        return this.endTime;
    }

    toJSON() {
        return {
            appointmentID: this.appointmentID,
            clientName: this.clientName,
            startTime: this.startTime,
            endTime: this.endTime
        };
    }
}

// Global Variables
const appointments = [];
let nextId = 1;

// ─── ROUTES ───────────────────────────────────────────────

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// GET – View all appointments
app.get('/api/appointments', (req, res) => {
    res.json({
        success: true,
        count: appointments.length,
        appointments: appointments.map(apt => apt.toJSON())
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

    // Check for overlapping time slots
    for (const exist of appointments) {
        if ((start >= exist.getStartTime() && start < exist.getEndTime()) ||
            (end > exist.getStartTime() && end <= exist.getEndTime())) {
            return res.status(409).json({ success: false, message: 'This time slot overlaps with an existing appointment' });
        }
    }

    const newApt = new Appointment(clientName.trim(), nextId, start, end);
    appointments.push(newApt);
    nextId++;

    res.status(201).json({
        success: true,
        message: 'Appointment booked successfully',
        appointment: newApt.toJSON()
    });
});

// DELETE – Cancel an appointment by ID
app.delete('/api/appointments/:id', (req, res) => {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
    }

    const index = appointments.findIndex(apt => apt.getID() === id);

    if (index === -1) {
        return res.status(404).json({ success: false, message: `No appointment found with ID: ${id}` });
    }

    const removed = appointments.splice(index, 1)[0];
    res.json({
        success: true,
        message: `Appointment ID: ${id} has been successfully cancelled`,
        appointment: removed.toJSON()
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`\n🚀 Appointment Scheduler is running at http://localhost:${PORT}\n`);
});