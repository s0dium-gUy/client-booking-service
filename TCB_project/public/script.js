// ─── DOM Elements ─────────────────────────────────────────
const bookingForm   = document.getElementById('booking-form');
const clientInput   = document.getElementById('clientName');
const startSelect   = document.getElementById('startTime');
const endSelect     = document.getElementById('endTime');
const listContainer = document.getElementById('appointments-list');
const emptyState    = document.getElementById('empty-state');
const countBadge    = document.getElementById('apt-count');
const toastEl       = document.getElementById('toast');
const bookBtn       = document.getElementById('book-btn');

// ─── Populate Time Selects ────────────────────────────────
function populateTimeSelects() {
    for (let h = 0; h <= 23; h++) {
        const label = `${String(h).padStart(2, '0')}:00`;
        startSelect.innerHTML += `<option value="${h}">${label}</option>`;
        endSelect.innerHTML   += `<option value="${h}">${label}</option>`;
    }
    startSelect.value = '9';
    endSelect.value   = '10';
}

// ─── Toast Notification ──────────────────────────────────
let toastTimeout;
function showToast(message, type = 'success') {
    clearTimeout(toastTimeout);
    toastEl.textContent = message;
    toastEl.className = `toast ${type}`;
    // Force reflow before adding the show class
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
    toastTimeout = setTimeout(() => {
        toastEl.classList.remove('show');
    }, 3500);
}

// ─── Format Hour ──────────────────────────────────────────
function formatHour(h) {
    const suffix = h >= 12 ? 'PM' : 'AM';
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${display}:00 ${suffix}`;
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
        const item = document.createElement('div');
        item.className = 'apt-item';
        item.id = `apt-${apt.appointmentID}`;
        item.innerHTML = `
            <div class="apt-id">#${apt.appointmentID}</div>
            <div class="apt-details">
                <div class="apt-name">${escapeHTML(apt.clientName)}</div>
                <div class="apt-time"><span>${formatHour(apt.startTime)}</span> — <span>${formatHour(apt.endTime)}</span></div>
            </div>
            <button class="btn btn-cancel" data-id="${apt.appointmentID}" title="Cancel appointment">Cancel</button>
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

    const payload = {
        clientName: clientInput.value.trim(),
        startTime: parseInt(startSelect.value),
        endTime:   parseInt(endSelect.value)
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
            startSelect.value = '9';
            endSelect.value   = '10';
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
loadAppointments();
