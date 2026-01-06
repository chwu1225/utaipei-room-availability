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
let dateRange = { min: null, max: null };

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

    // Initialize date picker
    initDatePicker();

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

                // Calculate date range from data
                calculateDateRange();

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
 * Calculate min and max dates from loaded data
 */
function calculateDateRange() {
    if (allData.length === 0) return;

    const dates = allData.map(row => row.date).filter(d => d);
    dates.sort();

    dateRange.min = dates[0];
    dateRange.max = dates[dates.length - 1];

    console.log(`Date range: ${dateRange.min} to ${dateRange.max}`);
}

/**
 * Initialize date picker with constraints
 */
function initDatePicker() {
    const datePicker = document.getElementById('date-picker');
    const dateRangeInfo = document.getElementById('date-range');

    if (dateRange.min && dateRange.max) {
        // Set min/max constraints
        datePicker.min = dateRange.min;
        datePicker.max = dateRange.max;

        // Set default to today if within range, otherwise min date
        const today = new Date().toISOString().split('T')[0];
        if (today >= dateRange.min && today <= dateRange.max) {
            datePicker.value = today;
        } else {
            datePicker.value = dateRange.min;
        }

        // Show date range info
        const minFormatted = formatDateForDisplay(dateRange.min);
        const maxFormatted = formatDateForDisplay(dateRange.max);
        dateRangeInfo.textContent = `可查詢範圍：${minFormatted} ~ ${maxFormatted}`;
    }
}

/**
 * Format date for display (YYYY-MM-DD to YYYY/MM/DD)
 */
function formatDateForDisplay(dateStr) {
    if (!dateStr) return '';
    return dateStr.replace(/-/g, '/');
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Room selector
    const roomSelect = document.getElementById('room-select');
    roomSelect.value = currentRoom;

    roomSelect.addEventListener('change', function() {
        currentRoom = this.value;
        renderTable();
    });

    // Date picker
    const datePicker = document.getElementById('date-picker');
    datePicker.addEventListener('change', function() {
        jumpToDate(this.value);
    });

    // Today button
    const todayBtn = document.getElementById('today-btn');
    todayBtn.addEventListener('click', function() {
        const today = new Date().toISOString().split('T')[0];

        // Check if today is within range
        if (today >= dateRange.min && today <= dateRange.max) {
            datePicker.value = today;
            jumpToDate(today);
        } else if (today < dateRange.min) {
            datePicker.value = dateRange.min;
            jumpToDate(dateRange.min);
            showToast('今天不在可查詢範圍內，已跳至最早日期');
        } else {
            datePicker.value = dateRange.max;
            jumpToDate(dateRange.max);
            showToast('今天不在可查詢範圍內，已跳至最晚日期');
        }
    });
}

/**
 * Jump to a specific date in the table
 */
function jumpToDate(dateStr) {
    if (!dateStr) return;

    // Find the row with this date
    const rows = document.querySelectorAll('#table-body tr');
    let targetRow = null;

    rows.forEach(row => {
        // Remove any existing highlight
        row.classList.remove('highlight-row');

        // Check if this row matches the date
        const dateCell = row.querySelector('.date-col');
        if (dateCell) {
            // Convert displayed date (MM/DD) to compare with selected date
            const displayedDate = dateCell.textContent;
            const selectedParts = dateStr.split('-');
            const selectedMD = `${selectedParts[1]}/${selectedParts[2]}`;

            if (displayedDate === selectedMD) {
                targetRow = row;
            }
        }
    });

    if (targetRow) {
        // Scroll to the row
        targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Add highlight effect
        setTimeout(() => {
            targetRow.classList.add('highlight-row');
        }, 300);
    } else {
        showToast('找不到該日期的資料');
    }
}

/**
 * Show a toast notification
 */
function showToast(message) {
    // Create toast if not exists
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #2c3e50;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 0.95rem;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = '1';

    setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
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
            <tr data-date="${row.date}">
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
 * Render a status cell with enhanced visual
 */
function renderStatusCell(status) {
    if (status === '可借用') {
        return '<td class="status-available">✓ 可借用</td>';
    } else {
        return '<td class="status-occupied">✗ 已借用</td>';
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
