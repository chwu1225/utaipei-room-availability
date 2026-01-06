/**
 * Room Availability Query System
 * Loads CSV data and renders availability table
 */

// Configuration
const CONFIG = {
    dataPath: './data/availability.csv',
    updatePath: './data/last_update.txt',
    defaultRoom: 'G201'
};

// Global state
let allData = [];
let currentRoom = CONFIG.defaultRoom;

/**
 * Initialize the application
 */
async function init() {
    console.log('Initializing Room Availability System...');

    // Load last update time
    loadLastUpdate();

    // Load CSV data
    await loadData();

    // Set up event listeners
    setupEventListeners();

    // Initial render
    renderTable();
}

/**
 * Load last update timestamp
 */
async function loadLastUpdate() {
    try {
        const response = await fetch(CONFIG.updatePath);
        if (response.ok) {
            const timestamp = await response.text();
            document.getElementById('last-update').textContent =
                `資料更新時間：${timestamp.trim()}`;
        }
    } catch (error) {
        console.warn('Could not load update timestamp:', error);
        document.getElementById('last-update').textContent =
            '資料更新時間：未知';
    }
}

/**
 * Load CSV data using Papa Parse
 */
async function loadData() {
    return new Promise((resolve, reject) => {
        Papa.parse(CONFIG.dataPath, {
            download: true,
            header: true,
            encoding: 'UTF-8',
            complete: function(results) {
                if (results.errors.length > 0) {
                    console.warn('CSV parsing warnings:', results.errors);
                }

                allData = results.data.filter(row => row.date && row.room_id);
                console.log(`Loaded ${allData.length} rows`);
                resolve();
            },
            error: function(error) {
                console.error('CSV loading error:', error);
                showError('無法載入資料，請稍後再試');
                reject(error);
            }
        });
    });
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    const roomSelect = document.getElementById('room-select');
    roomSelect.value = currentRoom;

    roomSelect.addEventListener('change', function() {
        currentRoom = this.value;
        renderTable();
    });
}

/**
 * Render the availability table for current room
 */
function renderTable() {
    const tbody = document.getElementById('table-body');
    const roomData = allData.filter(row => row.room_id === currentRoom);

    if (roomData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="error">沒有找到資料</td></tr>';
        updateStats(0, 0);
        return;
    }

    // Calculate statistics
    let availableCount = 0;
    let occupiedCount = 0;

    const rows = roomData.map(row => {
        const isWeekend = row.weekday === '六' || row.weekday === '日';
        const weekdayClass = isWeekend ? 'weekend' : '';

        // Count availability
        ['morning', 'afternoon', 'evening'].forEach(period => {
            if (row[period] === '可借用') {
                availableCount++;
            } else {
                occupiedCount++;
            }
        });

        return `
            <tr>
                <td class="date-col">${formatDate(row.date)}</td>
                <td class="${weekdayClass}">${row.weekday}</td>
                ${renderStatusCell(row.morning)}
                ${renderStatusCell(row.afternoon)}
                ${renderStatusCell(row.evening)}
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rows;
    updateStats(availableCount, occupiedCount);
}

/**
 * Render a status cell
 */
function renderStatusCell(status) {
    if (status === '可借用') {
        return '<td class="status-available">可借用</td>';
    } else {
        return '<td class="status-occupied">已借用</td>';
    }
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
    // Convert YYYY-MM-DD to MM/DD format
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[1]}/${parts[2]}`;
}

/**
 * Update statistics display
 */
function updateStats(available, occupied) {
    document.getElementById('available-count').textContent = available;
    document.getElementById('occupied-count').textContent = occupied;
}

/**
 * Show error message in table
 */
function showError(message) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = `<tr><td colspan="5" class="error">${escapeHtml(message)}</td></tr>`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
