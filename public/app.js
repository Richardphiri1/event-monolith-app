const API_BASE = 'https://event-monolith-app-shgj.onrender.com/api';
let currentUser = null;
let ws = null;

// DOM Elements
const authSection = document.getElementById('authSection');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const createEventSection = document.getElementById('createEventSection');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    loadEvents();
});

// Auth functions
function showLogin() {
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
}

function showSignup() {
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }

    showLoading(true);

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showMainApp();
            initWebSocket();
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        alert('Login error: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function signup() {
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const role = document.getElementById('signupRole').value;

    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }

    showLoading(true);

    try {
        const response = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, role }),
        });

        const data = await response.json();

        if (response.ok) {
            alert('Signup successful! Please login.');
            showLogin();
            // Clear form
            document.getElementById('signupEmail').value = '';
            document.getElementById('signupPassword').value = '';
        } else {
            alert(data.error || 'Signup failed');
        }
    } catch (error) {
        alert('Signup error: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (ws) {
        ws.close();
        ws = null;
    }
    showAuth();
}

function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        currentUser = JSON.parse(user);
        showMainApp();
        initWebSocket();
    } else {
        showAuth();
    }
}

function showAuth() {
    authSection.style.display = 'block';
    mainApp.style.display = 'none';
    loginBtn.style.display = 'inline-block';
    signupBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
}

function showMainApp() {
    authSection.style.display = 'none';
    mainApp.style.display = 'block';
    loginBtn.style.display = 'none';
    signupBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';

    // Update user info
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('userRole').textContent = currentUser.role;

    // Show/hide create event section based on role
    if (currentUser.role === 'ORGANIZER' || currentUser.role === 'ADMIN') {
        createEventSection.style.display = 'block';
    } else {
        createEventSection.style.display = 'none';
    }

    loadEvents();
}

// Event functions
async function loadEvents() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE}/events`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (response.ok) {
            displayEvents(data.events || []);
        } else {
            console.error('Failed to load events:', data.error);
        }
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

function displayEvents(events) {
    const eventsList = document.getElementById('eventsList');
    
    if (events.length === 0) {
        eventsList.innerHTML = '<div class="event-card">No events found. Create one!</div>';
        return;
    }

    eventsList.innerHTML = events.map(event => `
        <div class="event-card">
            <h4>${event.title}</h4>
            <div class="event-meta">
                <div>📅 ${new Date(event.date).toLocaleString()}</div>
                <div>📍 ${event.location}</div>
                <div>👤 Organized by: ${event.organizer?.email || 'Unknown'}</div>
                <div>${event.approved ? '✅ Approved' : '⏳ Pending Approval'}</div>
            </div>
            <p>${event.description}</p>
            <div class="event-actions">
                ${currentUser.role === 'ATTENDEE' ? `
                    <button class="btn-primary" onclick="rsvpToEvent('${event.id}', 'GOING')">Going</button>
                    <button class="btn-outline" onclick="rsvpToEvent('${event.id}', 'MAYBE')">Maybe</button>
                ` : ''}
                ${currentUser.role === 'ADMIN' && !event.approved ? `
                    <button class="btn-primary" onclick="approveEvent('${event.id}')">Approve</button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

async function createEvent() {
    const title = document.getElementById('eventTitle').value;
    const description = document.getElementById('eventDescription').value;
    const date = document.getElementById('eventDate').value;
    const location = document.getElementById('eventLocation').value;

    if (!title || !description || !date || !location) {
        alert('Please fill in all fields');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    showLoading(true);

    try {
        const response = await fetch(`${API_BASE}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                title,
                description,
                date: new Date(date).toISOString(),
                location,
            }),
        });

        const data = await response.json();

        if (response.ok) {
            alert('Event created successfully!');
            // Clear form
            document.getElementById('eventTitle').value = '';
            document.getElementById('eventDescription').value = '';
            document.getElementById('eventDate').value = '';
            document.getElementById('eventLocation').value = '';
            loadEvents(); // Reload events
        } else {
            alert(data.error || 'Failed to create event');
        }
    } catch (error) {
        alert('Error creating event: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function rsvpToEvent(eventId, status) {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE}/events/${eventId}/rsvp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ status }),
        });

        const data = await response.json();

        if (response.ok) {
            alert(`RSVP status: ${status}`);
            loadEvents(); // Reload events to show updated RSVP status
        } else {
            alert(data.error || 'RSVP failed');
        }
    } catch (error) {
        alert('RSVP error: ' + error.message);
    }
}

async function approveEvent(eventId) {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE}/events/${eventId}/approve`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        });

        const data = await response.json();

        if (response.ok) {
            alert('Event approved successfully!');
            loadEvents(); // Reload events
        } else {
            alert(data.error || 'Approval failed');
        }
    } catch (error) {
        alert('Approval error: ' + error.message);
    }
}

// WebSocket functions
function initWebSocket() {
    if (ws) {
        ws.close();
    }

    ws = new WebSocket(`ws://localhost:3000/ws`);

    ws.onopen = () => {
        addRealtimeLog('✅ Connected to realtime updates');
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        addRealtimeLog(`📨 ${data.type}: ${data.message}`);
        
        // Reload events when updates are received
        if (data.type === 'EVENT_UPDATE' || data.type === 'RSVP_UPDATE') {
            loadEvents();
        }
    };

    ws.onclose = () => {
        addRealtimeLog('🔴 Disconnected from realtime updates');
    };

    ws.onerror = (error) => {
        addRealtimeLog('❌ WebSocket error');
        console.error('WebSocket error:', error);
    };
}

function addRealtimeLog(message) {
    const logsContainer = document.getElementById('realtimeLogs');
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    
    logsContainer.appendChild(logEntry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

// Utility functions
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

// Event listeners
loginBtn.addEventListener('click', showLogin);
signupBtn.addEventListener('click', showSignup);
logoutBtn.addEventListener('click', logout);

// Show login by default
showLogin();