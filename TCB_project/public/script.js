// ─── DOM Elements ─────────────────────────────────────────
const bookingForm   = document.getElementById('booking-form');
const clientInput   = document.getElementById('clientName');
const startSelect   = document.getElementById('startTime');
const durationSelect = document.getElementById('duration');
const summaryValue  = document.getElementById('summary-value');
const nameHint      = document.getElementById('name-hint');
const listContainer = document.getElementById('appointments-list');
const emptyState    = document.getElementById('empty-state');
const countBadge    = document.getElementById('apt-count');
const toastEl       = document.getElementById('toast');
const bookBtn       = document.getElementById('book-btn');

// ─── Populate Start Time Select (15-min intervals) ────────
function populateTimeSelects() {
    for (let m = 0; m <= 1425; m += 15) {
        const label = formatMinutes(m);
        startSelect.innerHTML += `<option value="${m}">${label}</option>`;
    }
    startSelect.value = '540'; // Default: 9:00 AM (9 * 60 = 540)
}

// ─── Format Minutes to Readable Time ─────────────────────
function formatMinutes(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${String(mins).padStart(2, '0')} ${suffix}`;
}

// ─── Update Time Summary Preview ──────────────────────────
function updateSummary() {
    const start = parseInt(startSelect.value);
    const duration = parseInt(durationSelect.value);
    const end = start + duration;

    if (end > 1440) {
        summaryValue.textContent = 'End time exceeds midnight!';
        summaryValue.style.color = '#ff6b8a';
    } else {
        summaryValue.textContent = `${formatMinutes(start)} — ${formatMinutes(end)}`;
        summaryValue.style.color = '';
    }
}

startSelect.addEventListener('change', updateSummary);
durationSelect.addEventListener('change', updateSummary);

// ─── Client Name Validation (text only) ───────────────────
clientInput.addEventListener('input', () => {
    const value = clientInput.value;
    // Remove any non-letter/non-space characters as they type
    const cleaned = value.replace(/[^A-Za-z\s]/g, '');
    if (value !== cleaned) {
        clientInput.value = cleaned;
        nameHint.style.color = '#ff6b8a';
        nameHint.textContent = 'Numbers and special characters are not allowed';
        setTimeout(() => {
            nameHint.style.color = '';
            nameHint.textContent = 'Only letters and spaces allowed';
        }, 2000);
    }
});

// ─── Toast Notification ──────────────────────────────────
let toastTimeout;
function showToast(message, type = 'success') {
    clearTimeout(toastTimeout);
    toastEl.textContent = message;
    toastEl.className = `toast ${type}`;
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
    toastTimeout = setTimeout(() => {
        toastEl.classList.remove('show');
    }, 3500);
}

// ─── Render Appointments ──────────────────────────────────
function renderAppointments(appointments) {
    countBadge.textContent = appointments.length;

    if (appointments.length === 0) {
        listContainer.innerHTML = '';
        listContainer.appendChild(emptyState);
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    listContainer.innerHTML = '';

    appointments.forEach(apt => {
        const aptId = apt.id || apt.appointmentID;
        const durationMins = apt.endTime - apt.startTime;
        const durationLabel = durationMins === 60 ? '1 hr' : `${durationMins} min`;

        const item = document.createElement('div');
        item.className = 'apt-item';
        item.id = `apt-${aptId}`;
        item.innerHTML = `
            <div class="apt-id">#${aptId}</div>
            <div class="apt-details">
                <div class="apt-name">${escapeHTML(apt.clientName)}</div>
                <div class="apt-time">
                    <span>${formatMinutes(apt.startTime)}</span> — <span>${formatMinutes(apt.endTime)}</span>
                    <span class="apt-duration">(${durationLabel})</span>
                </div>
            </div>
            <button class="btn btn-cancel" data-id="${aptId}" title="Cancel appointment">Cancel</button>
        `;
        listContainer.appendChild(item);
    });
}

// ─── Escape HTML ──────────────────────────────────────────
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ─── Fetch Appointments ───────────────────────────────────
async function loadAppointments() {
    try {
        const res = await fetch('/api/appointments');
        const data = await res.json();
        if (data.success) {
            renderAppointments(data.appointments);
        }
    } catch (err) {
        showToast('Failed to load appointments', 'error');
    }
}

// ─── Book Appointment ─────────────────────────────────────
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = clientInput.value.trim();

    // Extra client-side validation for text only
    if (!/^[A-Za-z\s]+$/.test(name)) {
        showToast('Client name must contain only letters and spaces', 'error');
        return;
    }

    const start = parseInt(startSelect.value);
    const duration = parseInt(durationSelect.value);
    const end = start + duration;

    if (end > 1440) {
        showToast('Appointment cannot extend past midnight', 'error');
        return;
    }

    const payload = {
        clientName: name,
        startTime: start,
        endTime: end
    };

    bookBtn.querySelector('.btn-text').textContent = 'Booking...';
    bookBtn.disabled = true;

    try {
        const res = await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            showToast(`✅ ${data.message}`, 'success');
            bookingForm.reset();
            startSelect.value = '540';
            durationSelect.value = '60';
            updateSummary();
            await loadAppointments();
        } else {
            showToast(`⚠️ ${data.message}`, 'error');
        }
    } catch (err) {
        showToast('Network error — please try again', 'error');
    } finally {
        bookBtn.querySelector('.btn-text').textContent = 'Book Appointment';
        bookBtn.disabled = false;
    }
});

// ─── Cancel Appointment (Event Delegation) ────────────────
listContainer.addEventListener('click', async (e) => {
    const cancelBtn = e.target.closest('.btn-cancel');
    if (!cancelBtn) return;

    const id = cancelBtn.dataset.id;
    cancelBtn.textContent = '...';
    cancelBtn.disabled = true;

    try {
        const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
        const data = await res.json();

        if (data.success) {
            showToast(`🗑️ ${data.message}`, 'success');
            await loadAppointments();
        } else {
            showToast(`⚠️ ${data.message}`, 'error');
        }
    } catch (err) {
        showToast('Network error — please try again', 'error');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.disabled = false;
    }
});

// ─── Init ─────────────────────────────────────────────────
populateTimeSelects();
updateSummary();
loadAppointments();
