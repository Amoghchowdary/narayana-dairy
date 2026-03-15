// Main Application State
const state = {
    currentView: 'dashboard',
    buffaloes: [],
    milkChartInstance: null
};

// Utilities
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const colors = type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white';
    const icon = type === 'success' ? 'fa-check' : 'fa-circle-exclamation';
    toast.className = `toast flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl ${colors} font-medium text-sm`;
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function logout() {
    localStorage.removeItem('farm_token');
    localStorage.removeItem('farm_user');
    window.location.href = '/static/login.html';
}

function toggleModal(id) {
    const modal = document.getElementById(id);
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.remove('opacity-0'), 10);
    } else {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

// ─── Custom Delete Confirmation Modal ────────────────────────────────────────
let _deleteCallback = null;

function showDeleteConfirm(message, onConfirm) {
    _deleteCallback = onConfirm;
    document.getElementById('delete-confirm-message').textContent = message;
    const modal = document.getElementById('delete-confirm-modal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
}

function cancelDelete() {
    _deleteCallback = null;
    const modal = document.getElementById('delete-confirm-modal');
    modal.classList.add('opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function confirmDelete() {
    const btn = document.getElementById('delete-confirm-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Deleting...';
    if (_deleteCallback) {
        Promise.resolve(_deleteCallback()).finally(() => {
            cancelDelete();
            btn.disabled = false;
            btn.innerHTML = 'Yes, Delete';
        });
    } else {
        cancelDelete();
        btn.disabled = false;
        btn.innerHTML = 'Yes, Delete';
    }
}

// Routing Simulation (SPA)
document.querySelectorAll('.nav-btn, .nav-btn-mobile').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        // Determine target
        let target = btn.getAttribute('data-target');
        if (!target) target = btn.closest('a').getAttribute('data-target');

        switchView(target);
    });
});

function switchView(viewId) {
    state.currentView = viewId;

    // Update active states
    document.querySelectorAll('.nav-btn, .nav-btn-mobile').forEach(b => b.classList.remove('active'));
    document.querySelectorAll(`[data-target="${viewId}"]`).forEach(b => b.classList.add('active'));

    // Hide all views, show selected
    document.querySelectorAll('.view-section').forEach(v => {
        v.classList.add('hidden');
        v.classList.remove('active');
    });

    let activeView = document.getElementById(`view-${viewId}`);
    if (activeView) {
        activeView.classList.remove('hidden');
        activeView.classList.add('active');
        document.getElementById('main-scroll').scrollTo(0, 0);

        // Trigger data loads
        if (viewId === 'dashboard') loadDashboard();
        if (viewId === 'buffaloes') loadBuffaloes();
        if (viewId === 'milk') prepMilkEntry();
        if (viewId === 'finance') prepFinanceEntry();
        if (viewId === 'health') prepHealthEntry();
        if (viewId === 'vendors') loadVendors();
        if (viewId === 'loginlogs') loadLoginLogs();
        if (viewId === 'ledger') loadVendorLedger();
        if (viewId === 'reports') initReportsView();
    }
}

// --- API Calls & Data Loading ---
const API_BASE = '/api';

async function fetchJSON(url, options = {}) {
    try {
        const token = localStorage.getItem('farm_token');
        if (token) {
            options.headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
        }
        const res = await fetch(`${API_BASE}${url}`, options);
        if (res.status === 401) {
            localStorage.removeItem('farm_token');
            localStorage.removeItem('farm_user');
            window.location.href = '/static/login.html';
            return null;
        }
        if (!res.ok) throw new Error(await res.text());
        return await res.json();
    } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
        return null;
    }
}

async function loadDashboard() {
    document.getElementById('dash-date').innerText = new Date().toDateString();

    // Fetch summary
    const summary = await fetchJSON('/dashboard');
    if (summary) {
        document.getElementById('dash-buffalo-count').innerText = summary.total_buffaloes;
        document.getElementById('dash-milk-today').innerText = summary.total_milk_today.toFixed(1);
        document.getElementById('dash-profit').innerText = summary.profit_loss_current_month.toFixed(2);
        document.getElementById('dash-alerts-count').innerText = summary.upcoming_vaccinations;
        document.getElementById('dash-vendor-count').innerText = summary.total_vendors;
    }

    // load chart dummy data for MVP based on today's yield
    initChart(summary?.total_milk_today || 0);

    // Load alerts
    const alerts = await fetchJSON('/health/alerts');
    const alertList = document.getElementById('dashboard-alert-list');
    alertList.innerHTML = '';

    if (!alerts || alerts.length === 0) {
        alertList.innerHTML = `<p class="text-sm text-gray-500 italic flex items-center gap-2"><i class="fa-solid fa-check-circle text-primary"></i> No immediate health alerts.</p>`;
    } else {
        alerts.forEach(a => {
            alertList.innerHTML += `
            <div class="bg-white p-3 rounded-lg border border-red-100 shadow-sm flex items-start gap-3">
                <i class="fa-solid fa-syringe text-red-500 mt-1"></i>
                <div>
                    <p class="text-sm font-bold text-gray-800">${a.record_type} Due</p>
                    <p class="text-xs text-gray-500">Buffalo ID: ${a.buffalo_id.substring(0, 8)}... | Due: ${a.next_due_date}</p>
                </div>
            </div>`;
        });
    }

    // Preload buffalo data so dashboard search works immediately
    if (state.buffaloes.length === 0) {
        const bufs = await fetchJSON('/buffaloes');
        state.buffaloes = bufs || [];
    }
}

function initChart(todayYield) {
    const ctx = document.getElementById('milkChart');
    if (state.milkChartInstance) state.milkChartInstance.destroy();

    // Fake past 7 days trend based on today
    const labels = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Yest.", "Today"];
    let base = todayYield > 0 ? todayYield : 50;
    const data = labels.map((_, i) => i === 6 ? base : base + (Math.random() * 10 - 5));

    state.milkChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Milk (Liters)',
                data: data,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#10b981',
                pointHoverBackgroundColor: '#10b981',
                pointHoverBorderColor: '#fff',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [5, 5], color: '#f1f5f9' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// Buffaloes List
async function loadBuffaloes() {
    const grid = document.getElementById('roster-grid');
    grid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-400"><i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i><br>Loading...</div>';

    const buffaloes = await fetchJSON('/buffaloes');
    state.buffaloes = buffaloes || [];

    renderRoster(state.buffaloes);
}

function renderRoster(buffaloData) {
    const grid = document.getElementById('roster-grid');
    grid.innerHTML = '';

    if (buffaloData.length === 0) {
        grid.innerHTML = `
        <div class="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
            <i class="fa-solid fa-cow text-4xl text-gray-300 mb-3"></i>
            <h3 class="text-lg font-bold text-gray-700">No Buffaloes Found</h3>
            <p class="text-gray-500 text-sm mb-4">You haven't added any cattle yet.</p>
            <button onclick="toggleModal('add-buffalo-modal')" class="bg-primary/10 text-primary font-bold px-4 py-2 rounded-lg">Add First Buffalo</button>
        </div>`;
        return;
    }

    buffaloData.forEach(b => {
        const isPregnant = b.pregnancy_status ? `<span class="bg-pink-100 text-pink-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider"><i class="fa-solid fa-baby-carriage"></i> Pregnant</span>` : '';

        grid.innerHTML += `
        <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.1)] transition-all">
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 border border-gray-200">
                        <i class="fa-solid fa-cow text-xl"></i>
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-900 leading-tight">${b.tag_number}</h4>
                        <p class="text-xs text-gray-500">${b.name || 'Unnamed'} • ${b.breed}</p>
                    </div>
                </div>
                ${isPregnant}
            </div>
            
            <div class="grid grid-cols-2 gap-2 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div>
                    <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Lactation</p>
                    <p class="text-sm font-semibold text-gray-800">${b.lactation_number}</p>
                </div>
                <div>
                    <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">DOB</p>
                    <p class="text-sm font-semibold text-gray-800">${b.date_of_birth}</p>
                </div>
            </div>
            
            <button onclick="deleteBuffalo('${b.id}')" class="w-full text-center py-2 text-sm font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center gap-2">
                <i class="fa-solid fa-trash-can"></i> Delete Buffalo
            </button>
        </div>
        `;
    });
}

function deleteBuffalo(id) {
    showDeleteConfirm('Delete this buffalo? Linked milk & health records will also be removed.', async () => {
        const res = await fetchJSON('/buffaloes/' + id, { method: 'DELETE' });
        if (res) { showToast('Buffalo deleted.', 'error'); loadBuffaloes(); }
    });
}

// Add New Buffalo
async function submitNewBuffalo(e) {
    e.preventDefault();
    const btn = document.getElementById('buf-submit-btn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving';
    btn.disabled = true;

    const payload = {
        tag_number: document.getElementById('buf-tag').value,
        name: document.getElementById('buf-name').value || null,
        breed: document.getElementById('buf-breed').value,
        date_of_birth: document.getElementById('buf-dob').value,
        lactation_number: parseInt(document.getElementById('buf-lact').value),
        pregnancy_status: document.getElementById('buf-pregnant').checked,
        notes: document.getElementById('buf-notes').value || null
    };

    const res = await fetchJSON('/buffaloes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    btn.innerHTML = 'Save Data';
    btn.disabled = false;

    if (res) {
        showToast('Buffalo Added Successfully!');
        toggleModal('add-buffalo-modal');
        e.target.reset();
        loadBuffaloes(); // refresh list
    }
}

// ── Session detection based on local device time ──────────────────────────────
// Morning session : 05:00 – 11:59  (hour 5–11)
// Evening session : 12:00 – 20:59  (hour 12–20)
// Off-hours       : 21:00 – 04:59  (show neutral notice, both fields open)
function getMilkSession() {
    const hour = new Date().getHours(); // local device time
    if (hour >= 5  && hour <= 11) return 'morning';
    if (hour >= 12 && hour <= 20) return 'evening';
    return 'off';
}

function applyMilkSessionUI() {
    const session = getMilkSession();
    const now     = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const banner      = document.getElementById('milk-session-banner');
    const mWrap       = document.getElementById('milk-morning-wrap');
    const eWrap       = document.getElementById('milk-evening-wrap');
    const mInput      = document.getElementById('milk-morning');
    const eInput      = document.getElementById('milk-evening');

    // Reset both fields to active state first
    [mInput, eInput].forEach(inp => {
        inp.disabled  = false;
        inp.classList.remove('opacity-40', 'cursor-not-allowed', 'bg-gray-100');
        inp.classList.add('bg-gray-50');
    });
    [mWrap, eWrap].forEach(w => w.classList.remove('ring-2', 'ring-orange-300', 'ring-indigo-300', 'rounded-xl'));

    if (session === 'morning') {
        banner.innerHTML = `
            <div class="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3">
                <div class="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <i class="fa-regular fa-sun text-orange-500 text-lg"></i>
                </div>
                <div>
                    <p class="text-sm font-bold text-orange-700">Morning Session Active</p>
                    <p class="text-xs text-orange-500">Current time: ${timeStr} — Enter morning production below.</p>
                </div>
            </div>`;
        // Highlight morning, dim evening
        mWrap.classList.add('ring-2', 'ring-orange-300', 'rounded-xl');
        eInput.disabled = true;
        eInput.value    = '';
        eInput.classList.add('opacity-40', 'cursor-not-allowed', 'bg-gray-100');
        eInput.classList.remove('bg-gray-50');

    } else if (session === 'evening') {
        banner.innerHTML = `
            <div class="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3">
                <div class="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-moon text-indigo-500 text-lg"></i>
                </div>
                <div>
                    <p class="text-sm font-bold text-indigo-700">Evening Session Active</p>
                    <p class="text-xs text-indigo-500">Current time: ${timeStr} — Enter evening production below.</p>
                </div>
            </div>`;
        // Highlight evening, dim morning
        eWrap.classList.add('ring-2', 'ring-indigo-300', 'rounded-xl');
        mInput.disabled = true;
        mInput.value    = '';
        mInput.classList.add('opacity-40', 'cursor-not-allowed', 'bg-gray-100');
        mInput.classList.remove('bg-gray-50');

    } else {
        banner.innerHTML = `
            <div class="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                <div class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-clock text-gray-400 text-lg"></i>
                </div>
                <div>
                    <p class="text-sm font-bold text-gray-600">Off-Hours Entry</p>
                    <p class="text-xs text-gray-400">Current time: ${timeStr} — Both sessions available.</p>
                </div>
            </div>`;
    }

    // Recalculate total after session applied (disabled fields count as 0)
    calcMilkTotal();
}

function calcMilkTotal() {
    const m  = parseFloat(document.getElementById('milk-morning').value || 0);
    const ev = parseFloat(document.getElementById('milk-evening').value || 0);
    document.getElementById('milk-total').value = (m + ev).toFixed(1);
}

// Milk Entry Setup
async function prepMilkEntry() {
    document.getElementById('milk-date').valueAsDate = new Date();

    // fetch buffaloes if not loaded
    if (state.buffaloes.length === 0) {
        const buffaloes = await fetchJSON('/buffaloes');
        state.buffaloes = buffaloes || [];
    }

    const select = document.getElementById('milk-buffalo-id');
    select.innerHTML = '<option value="">Select a Buffalo...</option>';

    state.buffaloes.forEach(b => {
        select.innerHTML += `<option value="${b.id}">${b.tag_number} - ${b.name || 'Unnamed'}</option>`;
    });

    // Re-attach input listeners (replace node to clear old handlers)
    const mInput = document.getElementById('milk-morning');
    const eInput = document.getElementById('milk-evening');
    mInput.replaceWith(mInput.cloneNode(true));
    eInput.replaceWith(eInput.cloneNode(true));
    document.getElementById('milk-morning').addEventListener('input', calcMilkTotal);
    document.getElementById('milk-evening').addEventListener('input', calcMilkTotal);
    document.getElementById('milk-total').value = '';

    // Apply time-based session UI
    applyMilkSessionUI();

    loadMilkRecords();
}

async function submitMilkEntry(e) {
    e.preventDefault();
    const session = getMilkSession();
    const mInput  = document.getElementById('milk-morning');
    const eInput  = document.getElementById('milk-evening');

    // Only read the active field; disabled field stays 0
    const m  = mInput.disabled  ? 0 : parseFloat(mInput.value  || 0);
    const ev = eInput.disabled  ? 0 : parseFloat(eInput.value  || 0);

    if (m === 0 && ev === 0) {
        showToast('Please enter a milk quantity.', true);
        return;
    }

    const payload = {
        buffalo_id:           document.getElementById('milk-buffalo-id').value,
        date:                 document.getElementById('milk-date').value,
        morning_milk_liters:  m,
        evening_milk_liters:  ev
    };

    const btn = document.getElementById('milk-submit-btn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    const res = await fetchJSON('/milk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    btn.innerHTML = 'Save Record';

    if (res) {
        showToast(`Saved Total: ${res.total_milk_liters.toFixed(1)} Liters`);
        e.target.reset();
        document.getElementById('milk-date').valueAsDate = new Date();
        loadMilkRecords();
    }
}

async function loadMilkRecords() {
    const tbody = document.getElementById('milk-records-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-400 py-4"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>';
    const records = await fetchJSON('/milk/all');
    if (!records || records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-400 italic py-4">No milk records yet.</td></tr>';
        return;
    }
    // Build a buffalo ID -> tag map
    const bufMap = {};
    state.buffaloes.forEach(b => bufMap[b.id] = b.tag_number);
    tbody.innerHTML = records.map(r => `
        <tr class="border-t border-gray-100 hover:bg-gray-50">
            <td class="px-4 py-3 font-medium text-gray-700">${r.date}</td>
            <td class="px-4 py-3 text-gray-600">${bufMap[r.buffalo_id] || r.buffalo_id.substring(0, 8) + '...'}</td>
            <td class="px-4 py-3 text-orange-600 font-semibold">${r.morning_milk_liters} L</td>
            <td class="px-4 py-3 text-indigo-600 font-semibold">${r.evening_milk_liters} L</td>
            <td class="px-4 py-3 text-emerald-700 font-bold">${r.total_milk_liters} L</td>
            <td class="px-4 py-3">
                <button onclick="deleteMilkRecord('${r.id}')" class="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Delete">
                    <i class="fa-solid fa-trash-can text-sm"></i>
                </button>
            </td>
        </tr>`).join('');
}

function deleteMilkRecord(id) {
    showDeleteConfirm('Delete this milk production record?', async () => {
        const res = await fetchJSON('/milk/' + id, { method: 'DELETE' });
        if (res) { showToast('Milk record deleted.', 'error'); loadMilkRecords(); }
    });
}

// Finance Entry Setup
function prepFinanceEntry() {
    document.getElementById('finance-date').valueAsDate = new Date();
    document.getElementById('income-date').valueAsDate = new Date();
    switchFinanceTab('expense');
    loadIncomeRecords();
    loadExpenseRecords();
}

async function downloadFinanceLedger() {
    const btn = document.querySelector('[onclick="downloadFinanceLedger()"]');
    const origHTML = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Generating Excel...'; }

    try {
        const token = localStorage.getItem('farm_token');
        const res = await fetch('/api/finance/download-ledger', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            showToast('Failed to generate ledger.', 'error');
            return;
        }

        // Trigger .xlsx download
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        const today = new Date().toISOString().split('T')[0];
        a.href     = url;
        a.download = `Finance_Ledger_${today}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('\u2705 Excel ledger downloaded! Open with Microsoft Excel.', 'success');
    } catch (err) {
        showToast('Download error: ' + err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = origHTML; }
    }
}

function switchFinanceTab(tab) {
    const btnInc = document.getElementById('tab-income');
    const btnExp = document.getElementById('tab-expense');
    const divInc = document.getElementById('finance-income-container');
    const divExp = document.getElementById('finance-expense-container');

    // reset styles
    btnInc.className = "flex-1 py-1.5 text-sm font-bold text-gray-500 rounded-lg transition-all hover:text-gray-900 z-10";
    btnExp.className = "flex-1 py-1.5 text-sm font-bold text-gray-500 rounded-lg transition-all hover:text-gray-900 z-10";
    divInc.classList.add('hidden');
    divExp.classList.add('hidden');

    if (tab === 'income') {
        btnInc.className = "flex-1 py-1.5 text-sm font-bold bg-white text-gray-900 shadow-sm rounded-lg transition-all z-10";
        divInc.classList.remove('hidden');
        document.getElementById('income-records-section')?.classList.remove('hidden');
        document.getElementById('expense-records-section')?.classList.add('hidden');
    } else {
        btnExp.className = "flex-1 py-1.5 text-sm font-bold bg-white text-gray-900 shadow-sm rounded-lg transition-all z-10";
        divExp.classList.remove('hidden');
        document.getElementById('expense-records-section')?.classList.remove('hidden');
        document.getElementById('income-records-section')?.classList.add('hidden');
    }
}

function toggleSubCategories() {
    const category = document.getElementById('finance-category').value;

    const subContainer = document.getElementById('sub-category-container');
    const feedContainer = document.getElementById('feed-type-container');
    const equipContainer = document.getElementById('equipment-type-container');
    const workerContainer = document.getElementById('worker-name-container');

    const feedInput = document.getElementById('finance-feed-type');
    const equipInput = document.getElementById('finance-equipment-type');
    const workerInput = document.getElementById('finance-worker-name');

    // Reset all
    if (subContainer) subContainer.classList.add('hidden');
    if (feedContainer) feedContainer.classList.add('hidden');
    if (equipContainer) equipContainer.classList.add('hidden');
    if (workerContainer) workerContainer.classList.add('hidden');

    if (feedInput) { feedInput.required = false; feedInput.value = ''; }
    if (equipInput) { equipInput.required = false; equipInput.value = ''; }
    if (workerInput) { workerInput.required = false; workerInput.value = ''; }

    if (category === 'Cattle Feed') {
        if (subContainer) subContainer.classList.remove('hidden');
        if (feedContainer) feedContainer.classList.remove('hidden');
        if (feedInput) feedInput.required = true;
    } else if (category === 'Equipment') {
        if (subContainer) subContainer.classList.remove('hidden');
        if (equipContainer) equipContainer.classList.remove('hidden');
        if (equipInput) equipInput.required = true;
    } else if (category === 'Worker Salary') {
        if (subContainer) subContainer.classList.remove('hidden');
        if (workerContainer) workerContainer.classList.remove('hidden');
        if (workerInput) workerInput.required = true;
    }
}

async function submitFinanceEntry(e) {
    e.preventDefault();

    let category = document.getElementById('finance-category').value;
    if (category === 'Cattle Feed') {
        const feedType = document.getElementById('finance-feed-type')?.value;
        if (feedType) category = `Cattle Feed - ${feedType}`;
    } else if (category === 'Equipment') {
        const equipType = document.getElementById('finance-equipment-type')?.value;
        if (equipType) category = `Equipment - ${equipType}`;
    } else if (category === 'Worker Salary') {
        const workerName = document.getElementById('finance-worker-name')?.value;
        if (workerName) category = `Worker Salary - ${workerName}`;
    }

    const payload = {
        date: document.getElementById('finance-date').value,
        category: category,
        amount: parseFloat(document.getElementById('finance-amount').value || 0),
        description: document.getElementById('finance-description').value || null
    };

    const btn = document.getElementById('finance-submit-btn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    const res = await fetchJSON('/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    btn.innerHTML = 'Save Expense';
    btn.disabled = false;

    if (res) {
        showToast('Expense Saved Successfully!');
        e.target.reset();
        document.getElementById('finance-date').valueAsDate = new Date();
        toggleSubCategories();
        loadExpenseRecords();
    }
}

async function loadExpenseRecords() {
    const tbody = document.getElementById('expense-records-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-400 py-4"><i class="fa-solid fa-spinner fa-spin"></i></td></tr>';
    const records = await fetchJSON('/expenses');
    if (!records || records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-400 italic py-4">No expense records yet.</td></tr>';
        return;
    }
    // Sort newest first
    const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
    tbody.innerHTML = sorted.map(r => `
        <tr class="border-t border-gray-100 hover:bg-gray-50">
            <td class="px-4 py-3 font-medium text-gray-700">${r.date}</td>
            <td class="px-4 py-3 text-gray-600">${r.category}</td>
            <td class="px-4 py-3 text-red-600 font-bold">&#8377;${r.amount.toFixed(2)}</td>
            <td class="px-4 py-3 text-gray-400 text-xs">${r.description || '-'}</td>
            <td class="px-4 py-3">
                <button onclick="deleteExpense('${r.id}')" class="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Delete">
                    <i class="fa-solid fa-trash-can text-sm"></i>
                </button>
            </td>
        </tr>`).join('');
}

async function deleteExpense(id) {
    showDeleteConfirm('Delete this expense record?', async () => {
        const res = await fetchJSON('/expenses/' + id, { method: 'DELETE' });
        if (res) { showToast('Expense deleted.', 'error'); loadExpenseRecords(); }
    });
}

function calcIncomeTotal() {
    const qty = parseFloat(document.getElementById('income-quantity').value || 0);
    const price = parseFloat(document.getElementById('income-price').value || 0);
    const totalInput = document.getElementById('income-total');
    if (totalInput) {
        if (qty > 0 || price > 0) {
            totalInput.value = (qty * price).toFixed(2);
        } else {
            totalInput.value = '';
        }
    }
}

async function submitIncomeEntry(e) {
    e.preventDefault();

    const payload = {
        date: document.getElementById('income-date').value,
        milk_center_name: document.getElementById('income-center').value,
        quantity_supplied_liters: parseFloat(document.getElementById('income-quantity').value || 0),
        price_per_liter: parseFloat(document.getElementById('income-price').value || 0)
    };

    const btn = document.getElementById('income-submit-btn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    const res = await fetchJSON('/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    btn.innerHTML = 'Save Income';
    btn.disabled = false;

    if (res) {
        showToast('Income Saved Successfully!');
        e.target.reset();
        document.getElementById('income-date').valueAsDate = new Date();
        const totalInput = document.getElementById('income-total');
        if (totalInput) totalInput.value = '';
        loadIncomeRecords();
    }
}

async function loadIncomeRecords() {
    const tbody = document.getElementById('income-records-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-400 py-4"><i class="fa-solid fa-spinner fa-spin"></i></td></tr>';
    const records = await fetchJSON('/sales');
    if (!records || records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-400 italic py-4">No income records yet.</td></tr>';
        return;
    }
    tbody.innerHTML = records.map(r => `
        <tr class="border-t border-gray-100 hover:bg-gray-50">
            <td class="px-4 py-3 font-medium text-gray-700">${r.date}</td>
            <td class="px-4 py-3 text-gray-600">${r.milk_center_name}</td>
            <td class="px-4 py-3 font-semibold">${r.quantity_supplied_liters} L</td>
            <td class="px-4 py-3 text-gray-500">&#8377;${r.price_per_liter}</td>
            <td class="px-4 py-3 text-emerald-700 font-bold">&#8377;${r.total_income.toFixed(2)}</td>
            <td class="px-4 py-3">
                <button onclick="deleteIncome('${r.id}')" class="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Delete">
                    <i class="fa-solid fa-trash-can text-sm"></i>
                </button>
            </td>
        </tr>`).join('');
}

async function deleteIncome(id) {
    showDeleteConfirm('Delete this income record?', async () => {
        const res = await fetchJSON('/sales/' + id, { method: 'DELETE' });
        if (res) { showToast('Income record deleted.', 'error'); loadIncomeRecords(); }
    });
}

// Health Entry Setup
async function prepHealthEntry() {
    document.getElementById('health-date').valueAsDate = new Date();

    // fetch buffaloes if not loaded
    if (state.buffaloes.length === 0) {
        const buffaloes = await fetchJSON('/buffaloes');
        state.buffaloes = buffaloes || [];
    }

    const select = document.getElementById('health-buffalo-id');
    select.innerHTML = '<option value="">Select a Buffalo...</option>';

    state.buffaloes.forEach(b => {
        select.innerHTML += `<option value="${b.id}">${b.tag_number} - ${b.name || 'Unnamed'}</option>`;
    });

    loadHealthRecords();
}

function toggleHealthSubCategories() {
    const type = document.getElementById('health-type').value;
    const subContainer = document.getElementById('health-sub-container');
    const vacContainer = document.getElementById('health-vaccination-container');
    const chkContainer = document.getElementById('health-checkup-container');
    const vacInput = document.getElementById('health-next-vaccination-date');
    const chkInput = document.getElementById('health-next-checkup-date');

    if (subContainer) subContainer.classList.add('hidden');
    if (vacContainer) vacContainer.classList.add('hidden');
    if (chkContainer) chkContainer.classList.add('hidden');

    if (vacInput) { vacInput.value = ''; }
    if (chkInput) { chkInput.value = ''; }

    if (type === 'VACCINATION') {
        if (subContainer) subContainer.classList.remove('hidden');
        if (vacContainer) vacContainer.classList.remove('hidden');
    } else if (type === 'CHECKUP') {
        if (subContainer) subContainer.classList.remove('hidden');
        if (chkContainer) chkContainer.classList.remove('hidden');
    }
}

async function submitHealthEntry(e) {
    e.preventDefault();

    const type = document.getElementById('health-type').value;
    let nextDueDate = null;

    if (type === 'VACCINATION') {
        nextDueDate = document.getElementById('health-next-vaccination-date')?.value || null;
    } else if (type === 'CHECKUP') {
        nextDueDate = document.getElementById('health-next-checkup-date')?.value || null;
    }

    const payload = {
        buffalo_id: document.getElementById('health-buffalo-id').value,
        record_type: type,
        date: document.getElementById('health-date').value,
        details: document.getElementById('health-description').value,
        next_due_date: nextDueDate
    };

    const btn = document.getElementById('health-submit-btn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    const res = await fetchJSON('/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    btn.innerHTML = 'Save Health Record';
    btn.disabled = false;

    if (res) {
        showToast('Health Record Saved Successfully!');
        e.target.reset();
        document.getElementById('health-date').valueAsDate = new Date();
        toggleHealthSubCategories(); // Hide sub-categories again
        loadHealthRecords();
    }
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    // Auth guard — redirect to login if no token
    const token = localStorage.getItem('farm_token');
    if (!token) {
        window.location.href = '/static/login.html';
        return;
    }

    // Show partner name in sidebar
    const user = JSON.parse(localStorage.getItem('farm_user') || '{}');
    const nameEl  = document.getElementById('user-partner-name');
    const emailEl = document.getElementById('user-partner-email');
    if (nameEl  && user.name)  nameEl.textContent  = user.name;
    if (emailEl && user.email) emailEl.textContent = user.email;

    switchView('dashboard');

    // Set today's date for vendor form
    const vendorDateEl = document.getElementById('vendor-date');
    if (vendorDateEl) vendorDateEl.valueAsDate = new Date();

    // Search filter setup
    document.getElementById('search-buffalo')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = state.buffaloes.filter(b =>
            b.tag_number.toLowerCase().includes(term) ||
            (b.name && b.name.toLowerCase().includes(term))
        );
        renderRoster(filtered);
    });
});

async function loadHealthRecords() {
    const tbody = document.getElementById('health-records-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-400 py-4"><i class="fa-solid fa-spinner fa-spin"></i></td></tr>';
    const records = await fetchJSON('/health');
    if (!records || records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-400 italic py-4">No health records yet.</td></tr>';
        return;
    }
    const bufMap = {};
    state.buffaloes.forEach(b => bufMap[b.id] = b.tag_number);
    const typeLabels = { VACCINATION: '💉 Vaccination', PREGNANCY_CHECK: '🤰 Pregnancy Check', CHECKUP: '🩺 Checkup' };
    tbody.innerHTML = records.map(r => `
        <tr class="border-t border-gray-100 hover:bg-gray-50">
            <td class="px-4 py-3 font-medium text-gray-700">${r.date}</td>
            <td class="px-4 py-3 text-gray-600">${bufMap[r.buffalo_id] || r.buffalo_id.substring(0, 8) + '...'}</td>
            <td class="px-4 py-3">${typeLabels[r.record_type] || r.record_type}</td>
            <td class="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">${r.details || '-'}</td>
            <td class="px-4 py-3 ${r.next_due_date ? 'text-orange-600 font-semibold' : 'text-gray-400'}">${r.next_due_date || '-'}</td>
            <td class="px-4 py-3">
                <button onclick="deleteHealthRecord('${r.id}')" class="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Delete">
                    <i class="fa-solid fa-trash-can text-sm"></i>
                </button>
            </td>
        </tr>`).join('');
}

async function deleteHealthRecord(id) {
    showDeleteConfirm('Delete this health record?', async () => {
        const res = await fetchJSON('/health/' + id, { method: 'DELETE' });
        if (res) { showToast('Health record deleted.', 'error'); loadHealthRecords(); }
    });
}

// --- Dashboard Universal Smart Search ---
function hideAllResultPanels() {
    ['dash-buffalo-detail','dash-vendor-detail','dash-vaccination-results','dash-pregnancy-results'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

async function searchBuffaloDash(term) {
    const dropdown = document.getElementById('dash-search-dropdown');
    if (!term || term.trim().length < 1) {
        dropdown.classList.add('hidden');
        hideAllResultPanels();
        return;
    }
    const t = term.toLowerCase().trim();

    // ── Keyword: vaccination / vaccine ────────────────────────────────
    if (t.includes('vacc') || t.includes('injection') || t.includes('shot')) {
        dropdown.classList.add('hidden');
        hideAllResultPanels();
        await showVaccinationResults();
        return;
    }

    // ── Keyword: pregnancy / pregnant ─────────────────────────────────
    if (t.includes('pregn') || t.includes('pregnant') || t.includes('garbh')) {
        dropdown.classList.add('hidden');
        hideAllResultPanels();
        await showPregnancyResults();
        return;
    }

    // ── Match buffaloes ───────────────────────────────────────────────
    const bufMatches = state.buffaloes.filter(b =>
        (b.tag_number && b.tag_number.toLowerCase().includes(t)) ||
        (b.name && b.name.toLowerCase().includes(t))
    );

    // ── Match vendors ─────────────────────────────────────────────────
    const vendors = await fetchJSON('/vendors') || [];
    const vendorMatches = vendors.filter(v => v.name.toLowerCase().includes(t));

    if (bufMatches.length === 0 && vendorMatches.length === 0) {
        dropdown.innerHTML = '<div class="px-4 py-3 text-sm text-gray-400 italic">No results found. Try: buffalo name, tag, "vaccination", "pregnancy", or vendor name.</div>';
        dropdown.classList.remove('hidden');
        return;
    }

    let html = '';
    if (bufMatches.length > 0) {
        html += '<div class="px-4 py-2 text-xs text-gray-400 font-bold uppercase tracking-wider bg-gray-50">Buffaloes</div>';
        html += bufMatches.map(b => `
            <div class="px-4 py-3 cursor-pointer hover:bg-emerald-50 flex items-center gap-3 border-b border-gray-100"
                 onclick="hideAllResultPanels();document.getElementById('dash-search-dropdown').classList.add('hidden');showBufDetail('${b.id}')">
                <i class="fa-solid fa-cow text-primary"></i>
                <div><p class="font-semibold text-gray-800 text-sm">${b.tag_number}</p>
                <p class="text-xs text-gray-400">${b.name || 'No name'} &bull; ${b.breed || '-'}</p></div>
            </div>`).join('');
    }
    if (vendorMatches.length > 0) {
        // Cache vendors so onclick can safely look them up by ID
        window._vendorDashCache = window._vendorDashCache || {};
        vendorMatches.forEach(v => window._vendorDashCache[v.id] = v);

        html += '<div class="px-4 py-2 text-xs text-gray-400 font-bold uppercase tracking-wider bg-gray-50">Vendors</div>';
        html += vendorMatches.map(v => `
            <div class="px-4 py-3 cursor-pointer hover:bg-purple-50 flex items-center gap-3 border-b border-gray-100"
                 onclick="selectVendorFromSearch('${v.id}')">
                <i class="fa-solid fa-truck text-purple-500"></i>
                <div><p class="font-semibold text-gray-800 text-sm">${v.name}</p>
                <p class="text-xs text-gray-400">${v.vendor_type} ${v.phone ? '&bull; '+v.phone : ''} ${v.transaction_date ? '&bull; '+v.transaction_date : ''}</p></div>
            </div>`).join('');
    }
    dropdown.innerHTML = html;
    dropdown.classList.remove('hidden');
}

async function showVaccinationResults() {
    const panel = document.getElementById('dash-vaccination-results');
    if (!panel) return;
    const tbody = document.getElementById('dash-vacc-body');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4"><i class="fa-solid fa-spinner fa-spin text-gray-400"></i></td></tr>';
    panel.classList.remove('hidden');

    const records = await fetchJSON('/health') || [];
    const vaccinations = records.filter(r => r.record_type === 'VACCINATION');
    const bufMap = {};
    state.buffaloes.forEach(b => bufMap[b.id] = b.tag_number + (b.name ? ' - ' + b.name : ''));

    if (vaccinations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-gray-400 italic py-4">No vaccination records found.</td></tr>';
        return;
    }
    tbody.innerHTML = vaccinations.map(h => `
        <tr class="border-t border-gray-100 hover:bg-gray-50">
            <td class="px-4 py-2 font-medium text-gray-700">${h.date}</td>
            <td class="px-4 py-2 text-gray-600">${bufMap[h.buffalo_id] || h.buffalo_id.substring(0,8)+'...'}</td>
            <td class="px-4 py-2 text-gray-500 text-xs">${h.details || '-'}</td>
            <td class="px-4 py-2 ${h.next_due_date ? 'text-orange-600 font-semibold' : 'text-gray-400'}">${h.next_due_date || '-'}</td>
        </tr>`).join('');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function showPregnancyResults() {
    const panel = document.getElementById('dash-pregnancy-results');
    if (!panel) return;
    const body = document.getElementById('dash-preg-body');
    body.innerHTML = '<p class="text-center text-gray-400 py-4"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading...</p>';
    panel.classList.remove('hidden');

    const pregnant = state.buffaloes.filter(b => b.pregnancy_status === true);
    if (pregnant.length === 0) {
        body.innerHTML = '<p class="text-center text-gray-400 italic py-4">No pregnant buffaloes registered.</p>';
        return;
    }
    body.innerHTML = pregnant.map(b => `
        <div class="flex items-center gap-4 p-3 bg-pink-50 rounded-xl border border-pink-100 cursor-pointer hover:bg-pink-100 transition-colors"
             onclick="hideAllResultPanels();document.getElementById('dash-pregnancy-results').classList.add('hidden');showBufDetail('${b.id}')">
            <div class="w-10 h-10 bg-pink-200 rounded-full flex items-center justify-center">
                <i class="fa-solid fa-cow text-pink-600"></i>
            </div>
            <div>
                <p class="font-bold text-gray-800">${b.tag_number} ${b.name ? '— '+b.name : ''}</p>
                <p class="text-xs text-pink-600 font-semibold">🤰 Pregnant &bull; ${b.breed || '-'}</p>
            </div>
        </div>`).join('');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function selectVendorFromSearch(id) {
    hideAllResultPanels();
    document.getElementById('dash-search-dropdown').classList.add('hidden');
    const v = (window._vendorDashCache || {})[id];
    if (!v) return;
    showVendorDetail(v);
}

function showVendorDetail(v) {
    const panel = document.getElementById('dash-vendor-detail');
    if (!panel) return;
    const types = { FEED:'Feed Supplier', MEDICINE:'Medicine/Vet', EQUIPMENT:'Equipment', LABOUR:'Labour/Worker', MILK:'Milk Supplier', OTHER:'Other' };
    document.getElementById('dvd-name').textContent = v.name;
    document.getElementById('dvd-type').textContent = types[v.vendor_type] || v.vendor_type;
    document.getElementById('dvd-phone').textContent = v.phone || '-';
    document.getElementById('dvd-qty').textContent = (v.quantity_liters || 0) + ' L';
    document.getElementById('dvd-price').textContent = '₹' + (v.price_per_unit || 0);
    document.getElementById('dvd-total').textContent = '₹' + (v.total_amount || 0).toFixed(2);
    const payEl = document.getElementById('dvd-payment');
    payEl.textContent = v.payment_status === 'PAID' ? '✅ Paid' : '❌ Not Paid';
    payEl.className = 'text-sm font-bold px-3 py-1 rounded-full ' + (v.payment_status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600');
    document.getElementById('dvd-notes').textContent = v.notes || 'No notes.';
    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// legacy removed - searchBuffaloDash_OLD



// ─── Vendor Functions ─────────────────────────────────────────────────
const VENDOR_TYPE_LABELS = {
    FEED:      { label: 'Feed Supplier',   color: 'bg-green-100 text-green-700'  },
    MEDICINE:  { label: 'Medicine / Vet',  color: 'bg-blue-100 text-blue-700'    },
    EQUIPMENT: { label: 'Equipment',       color: 'bg-orange-100 text-orange-700' },
    LABOUR:    { label: 'Labour / Worker', color: 'bg-yellow-100 text-yellow-700' },
    OTHER:     { label: 'Other',           color: 'bg-gray-100 text-gray-600'    },
    MILK:      { label: 'Milk Supplier',   color: 'bg-cyan-100 text-cyan-700'    }
};

async function loadVendors() {
    const container = document.getElementById('vendor-list');
    if (!container) return;
    container.innerHTML = '<p class="text-center text-gray-400 py-6"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading...</p>';
    const vendors = await fetchJSON('/vendors');
    if (!vendors || vendors.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 italic py-8">No vendors added yet. Add your first vendor above!</p>';
        return;
    }
    container.innerHTML = vendors.map(v => {
        const t = VENDOR_TYPE_LABELS[v.vendor_type] || { label: v.vendor_type, color: 'bg-gray-100 text-gray-600' };
        const paid = v.payment_status === 'PAID';
        return `
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex justify-between items-start hover:shadow-md transition-shadow">
            <div class="flex items-start gap-4">
                <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-truck text-purple-500 text-lg"></i>
                </div>
                <div class="flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <h4 class="font-bold text-gray-800 text-base">${v.name}</h4>
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${t.color}">${t.label}</span>
                        <span class="text-xs font-bold px-2 py-0.5 rounded-full ${paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}">
                            ${paid ? '✅ Paid' : '❌ Not Paid'}
                        </span>
                    </div>
                    <div class="mt-2 space-y-1">
                        ${v.transaction_date ? `<p class="text-xs text-purple-600 font-semibold mb-1"><i class="fa-regular fa-calendar mr-1"></i>${v.transaction_date}</p>` : ''}
                        ${v.phone ? `<p class="text-sm text-gray-500"><i class="fa-solid fa-phone text-gray-400 mr-2"></i>${v.phone}</p>` : ''}
                        ${(v.quantity_liters > 0 || v.price_per_unit > 0) ? `
                        <p class="text-sm text-gray-600">
                            <i class="fa-solid fa-jug-detergent text-gray-400 mr-2"></i>${v.quantity_liters} L &times;
                            <i class="fa-solid fa-indian-rupee-sign text-gray-400 mx-1"></i>${v.price_per_unit}
                            = <strong class="text-emerald-700">&#8377;${(v.total_amount || 0).toFixed(2)}</strong>
                        </p>` : ''}
                        ${v.notes ? `<p class="text-sm text-gray-400 italic">${v.notes}</p>` : ''}
                    </div>
                </div>
            </div>
            <button onclick="deleteVendor('${v.id}')"
                class="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors ml-2 flex-shrink-0"
                title="Delete vendor">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>`;
    }).join('');
}

async function submitVendor(e) {
    e.preventDefault();
    const qty   = parseFloat(document.getElementById('vendor-quantity')?.value || 0);
    const price = parseFloat(document.getElementById('vendor-price')?.value || 0);
    const paid  = document.querySelector('input[name="vendor-payment"]:checked')?.value || 'UNPAID';
    const payload = {
        name:             document.getElementById('vendor-name').value.trim(),
        vendor_type:      document.getElementById('vendor-type').value,
        phone:            document.getElementById('vendor-phone').value.trim() || null,
        transaction_date: document.getElementById('vendor-date').value || new Date().toISOString().split('T')[0],
        quantity_liters:  qty,
        price_per_unit:   price,
        total_amount:     parseFloat(document.getElementById('vendor-total')?.value || 0),
        payment_status:   paid,
        notes:            document.getElementById('vendor-notes').value.trim() || null
    };
    const btn = document.getElementById('vendor-submit-btn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;
    const res = await fetchJSON('/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    btn.innerHTML = 'Save Vendor';
    btn.disabled = false;
    if (res) {
       showToast(`Vendor "${res.name}" saved!`);
        e.target.reset();
        const vt = document.getElementById('vendor-total'); if(vt) vt.value='';
        const vd = document.getElementById('vendor-date'); if(vd) vd.valueAsDate = new Date();
        loadVendors();
        const summary = await fetchJSON('/dashboard');
        const el = document.getElementById('dash-vendor-count');
        if (summary && el) el.innerText = summary.total_vendors;
    }
}

async function deleteVendor(id) {
    const res = await fetchJSON('/vendors/' + id, { method: 'DELETE' });
    if (res) {
        showToast('Vendor deleted.', 'error');
        loadVendors();
        const summary = await fetchJSON('/dashboard');
        const el = document.getElementById('dash-vendor-count');
        if (summary && el) el.innerText = summary.total_vendors;
    }
}

// ─── Generic Excel Downloader ────────────────────────────────────────────────
async function downloadExcel(endpoint, filename, btnEl) {
    const origHTML = btnEl ? btnEl.innerHTML : '';
    if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>Generating...'; }
    try {
        const token = localStorage.getItem('farm_token');
        const res = await fetch(`/api${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) { showToast('Failed to generate Excel file.', 'error'); return; }
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('✅ Excel downloaded! Open with Microsoft Excel.', 'success');
    } catch (err) {
        showToast('Download error: ' + err.message, 'error');
    } finally {
        if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = origHTML; }
    }
}

function downloadBuffaloesExcel(btn) {
    const today = new Date().toISOString().split('T')[0];
    downloadExcel('/download/buffaloes', `Buffalo_List_${today}.xlsx`, btn);
}
function downloadMilkExcel(btn) {
    const today = new Date().toISOString().split('T')[0];
    downloadExcel('/download/milk', `Milk_Production_${today}.xlsx`, btn);
}
function downloadHealthExcel(btn) {
    const today = new Date().toISOString().split('T')[0];
    downloadExcel('/download/health', `Health_Records_${today}.xlsx`, btn);
}
function downloadVendorsExcel(btn) {
    const today = new Date().toISOString().split('T')[0];
    downloadExcel('/download/vendors', `Vendor_Payments_${today}.xlsx`, btn);
}
function downloadLoginLogsExcel(btn) {
    const today = new Date().toISOString().split('T')[0];
    downloadExcel('/download/login-logs', `Login_Audit_${today}.xlsx`, btn);
}

// ─── Login Audit Log Table ────────────────────────────────────────────────────
async function loadLoginLogs() {
    const tbody = document.getElementById('login-log-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-gray-400 py-4"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>';
    const logs = await fetchJSON('/login-logs');
    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-gray-400 italic py-4">No login records yet.</td></tr>';
        return;
    }
    tbody.innerHTML = logs.map((l, i) => {
        const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const d = new Date(l.login_date + 'T00:00:00');
        const dayName = days[d.getDay()] || '';
        return `
        <tr class="border-t border-gray-100 hover:bg-blue-50 transition-colors">
            <td class="px-4 py-3 text-gray-400 text-sm">${i + 1}</td>
            <td class="px-4 py-3 font-semibold text-gray-800">
                <span class="inline-flex items-center gap-2">
                    <span class="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 text-xs font-bold">${l.partner_name.charAt(0).toUpperCase()}</span>
                    ${l.partner_name}
                </span>
            </td>
            <td class="px-4 py-3 text-gray-600">${l.login_date} <span class="text-xs text-gray-400 ml-1">(${dayName})</span></td>
            <td class="px-4 py-3 font-mono text-sm text-indigo-600 font-bold">${l.login_time}</td>
        </tr>`;
    }).join('');
}


// ─── Feature 3: Vendor Balance Ledger ────────────────────────────────────────

async function loadVendorLedger() {
    const tbody = document.getElementById('ledger-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-gray-400 italic py-6"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>';

    const data = await fetchJSON('/vendor-balances');
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-gray-400 italic py-6">No vendors found.</td></tr>';
        return;
    }

    let totalBilled = 0, totalPaid = 0, totalOutstanding = 0;
    tbody.innerHTML = data.map(v => {
        totalBilled      += v.total_amount;
        totalPaid        += v.total_paid;
        totalOutstanding += v.outstanding;
        const isPaid = v.outstanding <= 0;
        const badge = isPaid
            ? '<span class="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">✅ PAID</span>'
            : '<span class="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">⏳ UNPAID</span>';
        const payBtn = isPaid ? '' :
            `<button onclick="openPayModal('${v.vendor_id}','${v.vendor_name.replace(/'/g,"\\'")  }',${v.outstanding})"
                class="text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1 rounded-lg transition-all active:scale-95 flex items-center gap-1">
                <i class="fa-solid fa-money-bill-wave"></i> Pay
             </button>`;
        return `<tr class="border-t border-gray-100 hover:bg-purple-50 transition-colors">
            <td class="px-4 py-3 font-semibold text-gray-800">${v.vendor_name}</td>
            <td class="px-4 py-3 text-gray-500 text-xs uppercase">${v.vendor_type}</td>
            <td class="px-4 py-3 text-gray-500 text-xs">${v.transaction_date || '—'}</td>
            <td class="px-4 py-3 font-medium text-gray-700">₹${v.total_amount.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
            <td class="px-4 py-3 font-medium text-emerald-700">₹${v.total_paid.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
            <td class="px-4 py-3 font-bold ${isPaid ? 'text-gray-400' : 'text-red-600'}">
                ₹${v.outstanding.toLocaleString('en-IN', {minimumFractionDigits:2})}
            </td>
            <td class="px-4 py-3">${badge}</td>
            <td class="px-4 py-3">${payBtn}</td>
        </tr>`;
    }).join('');

    document.getElementById('ledger-total-billed').textContent    = totalBilled.toLocaleString('en-IN', {minimumFractionDigits:2});
    document.getElementById('ledger-total-paid').textContent      = totalPaid.toLocaleString('en-IN', {minimumFractionDigits:2});
    document.getElementById('ledger-outstanding').textContent     = totalOutstanding.toLocaleString('en-IN', {minimumFractionDigits:2});
}

function openPayModal(vendorId, vendorName, outstanding) {
    document.getElementById('rp-vendor-id').value        = vendorId;
    document.getElementById('rp-vendor-name-label').textContent = `Paying: ${vendorName}`;
    document.getElementById('rp-outstanding-amount').textContent = outstanding.toFixed(2);
    document.getElementById('rp-amount').value           = outstanding.toFixed(2);
    document.getElementById('rp-notes').value            = '';
    // Set today's date
    document.getElementById('rp-date').value = new Date().toISOString().split('T')[0];
    toggleModal('record-payment-modal');
}

async function submitVendorPayment() {
    const btn = document.getElementById('rp-submit-btn');
    const vendorId = document.getElementById('rp-vendor-id').value;
    const amount   = parseFloat(document.getElementById('rp-amount').value);
    const date     = document.getElementById('rp-date').value;
    const notes    = document.getElementById('rp-notes').value.trim();

    if (!vendorId || isNaN(amount) || amount <= 0) {
        showToast('Please enter a valid amount.', 'error'); return;
    }
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Saving...';

    try {
        const res = await fetchJSON('/vendor-payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendor_id: vendorId, amount_paid: amount, payment_date: date || null, notes: notes || null })
        });
        if (res && res.id) {
            toggleModal('record-payment-modal');
            showToast('Payment recorded successfully! ✅', 'success');
            loadVendorLedger();
        } else {
            showToast('Failed to record payment.', 'error');
        }
    } catch(e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Save Payment';
    }
}


// ─── Feature 5: Monthly Summary Reports ──────────────────────────────────────

function initReportsView() {
    // Set default month to current month
    const picker = document.getElementById('report-month-picker');
    if (picker && !picker.value) {
        const now = new Date();
        picker.value = now.toISOString().slice(0, 7); // YYYY-MM
    }
}

async function loadMonthlySummary() {
    const picker = document.getElementById('report-month-picker');
    const month  = picker ? picker.value : '';
    const panel  = document.getElementById('report-summary-panel');
    const btn    = document.getElementById('report-load-btn');

    if (!month) { showToast('Please select a month first.', 'error'); return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading...';

    try {
        const data = await fetchJSON(`/monthly-summary?month=${month}`);
        if (!data) { showToast('Failed to load summary.', 'error'); return; }

        document.getElementById('report-month-label').textContent = `Summary — ${data.month_label}`;
        document.getElementById('rpt-milk').textContent     = data.total_milk_liters.toFixed(2);
        document.getElementById('rpt-income').textContent   = `₹${data.total_income.toLocaleString('en-IN', {minimumFractionDigits:2})}`;
        document.getElementById('rpt-expenses').textContent = `₹${data.total_expenses.toLocaleString('en-IN', {minimumFractionDigits:2})}`;
        document.getElementById('rpt-unpaid').textContent   = data.unpaid_vendors;

        const profitEl    = document.getElementById('rpt-profit');
        const profitCard  = document.getElementById('rpt-profit-card');
        const profitLabel = document.getElementById('rpt-profit-label');
        const profitIcon  = document.getElementById('rpt-profit-icon');
        const profit = data.net_profit;
        profitEl.textContent = `₹${Math.abs(profit).toLocaleString('en-IN', {minimumFractionDigits:2})}`;
        if (profit >= 0) {
            profitCard.className  = 'bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm p-5 col-span-2 md:col-span-1';
            profitEl.className    = 'text-2xl font-bold text-emerald-700';
            profitLabel.className = 'text-xs font-bold text-emerald-600 uppercase';
            profitLabel.textContent = 'Net Profit (₹)';
            profitIcon.className  = 'fa-solid fa-arrow-trend-up text-emerald-500 bg-emerald-100 p-2 rounded-lg mb-2 inline-block';
        } else {
            profitCard.className  = 'bg-red-50 rounded-2xl border border-red-100 shadow-sm p-5 col-span-2 md:col-span-1';
            profitEl.className    = 'text-2xl font-bold text-red-600';
            profitLabel.className = 'text-xs font-bold text-red-500 uppercase';
            profitLabel.textContent = 'Net Loss (₹)';
            profitIcon.className  = 'fa-solid fa-arrow-trend-down text-red-500 bg-red-100 p-2 rounded-lg mb-2 inline-block';
        }

        panel.classList.remove('hidden');
    } catch(e) {
        showToast('Error loading summary: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Load Summary';
    }
}

async function downloadMonthlyReport(btn) {
    const picker = document.getElementById('report-month-picker');
    const month  = picker ? picker.value : '';
    if (!month) { showToast('Please select a month first.', 'error'); return; }
    await downloadExcel(`/api/download/monthly-report?month=${month}`, `Monthly_Report_${month}.xlsx`, btn);
}


// ─── Feature 4: PWA Service Worker Registration ───────────────────────────────

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const reg = await navigator.serviceWorker.register('/static/sw.js', { scope: '/' });
            console.log('[PWA] Service worker registered:', reg.scope);

            // Notify user when a new SW is available
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showToast('App updated! Refresh to get the latest version. 🔄', 'success');
                    }
                });
            });
        } catch (err) {
            console.warn('[PWA] SW registration failed:', err);
        }
    });

    // Show offline/online status
    window.addEventListener('offline', () =>
        showToast('⚠️ You are offline. Data will load from cache.', 'error'));
    window.addEventListener('online', () =>
        showToast('✅ Back online!', 'success'));
}
