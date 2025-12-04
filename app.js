// ---------------------------------------------------
//  APARTMAN YÖNETİMİ – MUHASEBE MODÜLLÜ SÜRÜM
// ---------------------------------------------------

const STORAGE_KEY = "apartmanYonetim_v2";

// Veriler
let residents = [];
let expenses = [];
let currentRole = null;

// Kullanıcılar
const users = [
    { username: "yonetici", password: "6161", role: "admin" },
    { username: "denetci", password: "1234", role: "viewer" }
];

let summaryTotals = {
    totalMonthly: 0,
    totalPaid: 0,
    totalRemaining: 0
};

// ----------------------------------
// Yardımcı: Para formatı
// ----------------------------------
function formatMoney(value) {
    const num = Number(value || 0);
    return num.toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Seçili ay: "YYYY-MM"
function getSelectedMonthKey() {
    const input = document.getElementById("monthSelect");
    return input ? (input.value || "") : "";
}

// Ay label formatı
function monthKeyToLabel(key) {
    if (!key) return "";
    const [year, month] = key.split("-");
    const months = [
        "Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
        "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"
    ];
    return `${months[Number(month) - 1]} ${year}`;
}

// ----------------------------------
// Veri yükleme / kaydetme (şimdilik localStorage)
// ----------------------------------
function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const obj = JSON.parse(raw);
        residents = obj.residents || [];
        expenses  = obj.expenses  || [];
    } catch (e) {
        console.error("Veri okunamadı:", e);
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ residents, expenses }));
}

// ----------------------------------
// TABLOYU YENİDEN ÇİZ (Aidat tablosu)
// ----------------------------------
function renderTable() {
    const tbody = document.getElementById("residentTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    let totalMonthly   = 0;
    let totalPaid      = 0;
    let totalRemaining = 0;

    const monthKey = getSelectedMonthKey();

    residents.forEach(r => {
        const monthly = Number(r.monthlyFee || 0);
        let paid = 0;

        if (r.payments && r.payments[monthKey]) {
            paid = Number(r.payments[monthKey].paid || 0);
        }

        const remaining = Math.max(monthly - paid, 0);

        totalMonthly   += monthly;
        totalPaid      += paid;
        totalRemaining += remaining;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${r.flatNo}</td>
            <td>${r.fullName}</td>
            <td class="amount">${formatMoney(monthly)}</td>
            <td class="amount">${formatMoney(paid)}</td>
            <td class="amount">
                <span class="badge ${remaining > 0 ? "negative" : "positive"}">
                    ${remaining > 0 ? formatMoney(remaining) + " ₺" : "Yok"}
                </span>
            </td>
            <td>${r.note || ""}</td>
            <td class="actions">
                <button class="icon-btn history-btn" onclick="openHistoryModal('${r.id}')">📅</button>
                <button class="icon-btn edit-btn" onclick="openEditModal('${r.id}')">✎</button>
                <button class="icon-btn danger delete-btn" onclick="deleteResident('${r.id}')">🗑</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    summaryTotals = { totalMonthly, totalPaid, totalRemaining };

    document.getElementById("summaryMonthlyFee").textContent = formatMoney(totalMonthly);
    document.getElementById("summaryPaid").textContent       = formatMoney(totalPaid);
    document.getElementById("summaryRemaining").textContent  = formatMoney(totalRemaining);

    if (currentRole === "viewer") disableAdminFeatures();

    renderExpenses();
}

// ----------------------------------
// GELİR – GİDER TABLOSU
// ----------------------------------
function renderExpenses() {
    const tbody = document.getElementById("expenseTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const monthKey = getSelectedMonthKey();
    let totalExpense = 0;

    expenses
        .filter(e => e.date && e.date.startsWith(monthKey))
        .forEach(e => {
            totalExpense += Number(e.amount || 0);

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${e.date}</td>
                <td>${e.category}</td>
                <td>${e.description}</td>
                <td class="amount">${formatMoney(e.amount)}</td>
                <td class="actions">
                    <button class="icon-btn expense-edit-btn" onclick="openEditExpenseModal('${e.id}')">✎</button>
                    <button class="icon-btn danger expense-delete-btn" onclick="deleteExpense('${e.id}')">🗑</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    const income = summaryTotals.totalPaid;
    const net    = income - totalExpense;

    document.getElementById("summaryIncome").textContent  = formatMoney(income);
    document.getElementById("summaryExpense").textContent = formatMoney(totalExpense);
    document.getElementById("summaryNet").textContent     = formatMoney(net);

    if (currentRole === "viewer") disableAdminFeatures();
}

// ----------------------------------
// YIL GENELİ ÖZETİ HESAPLAMA
// ----------------------------------
function renderYearSummary() {
    const tbody = document.getElementById("yearSummaryTableBody");
    if (!tbody) return;

    const yearSelect = document.getElementById("yearSelect");
    if (!yearSelect) return;
    const year = yearSelect.value;

    tbody.innerHTML = "";

    let totalYearIncome  = 0;
    let totalYearExpense = 0;

    const months = [
        "Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
        "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"
    ];

    months.forEach((m, i) => {
        const key = `${year}-${String(i + 1).padStart(2, "0")}`;
        let income  = 0;
        let expense = 0;

        residents.forEach(r => {
            if (r.payments && r.payments[key]) {
                income += Number(r.payments[key].paid || 0);
            }
        });

        expenses.forEach(e => {
            if (e.date && e.date.startsWith(key)) {
                expense += Number(e.amount || 0);
            }
        });

        totalYearIncome  += income;
        totalYearExpense += expense;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${m}</td>
            <td class="amount">${formatMoney(income)}</td>
            <td class="amount">${formatMoney(expense)}</td>
            <td class="amount">${formatMoney(income - expense)}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById("yearIncome").textContent  = formatMoney(totalYearIncome);
    document.getElementById("yearExpense").textContent = formatMoney(totalYearExpense);
    document.getElementById("yearNet").textContent     = formatMoney(totalYearIncome - totalYearExpense);
}

// ----------------------------------
// Yeni kullanıcı ekle / güncelle / sil
// ----------------------------------
function addResident(data, paidAmount) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const monthKey = getSelectedMonthKey();

    const payments = {};
    if (paidAmount > 0 && monthKey) {
        payments[monthKey] = { paid: paidAmount };
    }

    residents.push({ id, ...data, payments });
    saveData();
    renderTable();
    renderYearSummary();
}

function updateResident(id, data, paidAmount) {
    const monthKey = getSelectedMonthKey();
    const idx = residents.findIndex(r => r.id === id);
    if (idx === -1) return;

    const old = residents[idx];
    const payments = old.payments || {};

    if (monthKey) {
        payments[monthKey] = { paid: paidAmount };
    }

    residents[idx] = { ...old, ...data, payments };
    saveData();
    renderTable();
    renderYearSummary();
}

function deleteResident(id) {
    if (!confirm("Bu daireyi silmek istiyor musunuz?")) return;
    residents = residents.filter(r => r.id !== id);
    saveData();
    renderTable();
    renderYearSummary();
}

// ----------------------------------
// Gider ekleme / güncelleme / silme
// ----------------------------------
function addExpense(data) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    expenses.push({ id, ...data });
    saveData();
    renderExpenses();
    renderYearSummary();
}

function updateExpense(id, data) {
    const idx = expenses.findIndex(e => e.id === id);
    if (idx === -1) return;
    expenses[idx] = { ...expenses[idx], ...data };
    saveData();
    renderExpenses();
    renderYearSummary();
}

function deleteExpense(id) {
    if (!confirm("Bu gideri silmek istiyor musunuz?")) return;
    expenses = expenses.filter(e => e.id !== id);
    saveData();
    renderExpenses();
    renderYearSummary();
}

// ----------------------------------
// Ödeme geçmişi modalı
// ----------------------------------
function openHistoryModal(id) {
    const r = residents.find(x => x.id === id);
    if (!r) return;

    const listEl  = document.getElementById("historyList");
    const titleEl = document.getElementById("historyModalTitle");

    titleEl.textContent = `${r.flatNo} – ${r.fullName} | Ödeme Geçmişi`;
    listEl.innerHTML = "";

    const payments = r.payments || {};
    const entries  = Object.entries(payments).sort((a, b) => (a[0] < b[0] ? 1 : -1));

    if (entries.length === 0) {
        listEl.innerHTML = `<tr><td colspan="4">Kayıt yok</td></tr>`;
    } else {
        entries.forEach(([monthKey, info]) => {
            const monthly   = Number(r.monthlyFee || 0);
            const paid      = Number(info.paid || 0);
            const remaining = monthly - paid;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${monthKeyToLabel(monthKey)}</td>
                <td class="amount">${formatMoney(monthly)}</td>
                <td class="amount">${formatMoney(paid)}</td>
                <td class="amount">${formatMoney(remaining)}</td>
            `;
            listEl.appendChild(tr);
        });
    }

    document.getElementById("historyModal").classList.add("open");
}

function closeHistoryModal() {
    document.getElementById("historyModal").classList.remove("open");
}

// ----------------------------------
// DAİRE MODALI (aç / kapat / düzenle)
// ----------------------------------
function openNewModal() {
    document.getElementById("residentModalTitle").textContent = "Yeni Kullanıcı / Daire";

    document.getElementById("residentId").value       = "";
    document.getElementById("flatNo").value           = "";
    document.getElementById("fullName").value         = "";
    document.getElementById("monthlyFee").value       = "";
    document.getElementById("paidThisMonth").value    = "0";
    document.getElementById("note").value             = "";

    document.getElementById("residentModal").classList.add("open");
}

function openEditModal(id) {
    const r = residents.find(x => x.id === id);
    if (!r) return;

    document.getElementById("residentModalTitle").textContent = "Kullanıcı / Daire Düzenle";

    const monthKey = getSelectedMonthKey();
    let paid = 0;
    if (r.payments && r.payments[monthKey]) {
        paid = Number(r.payments[monthKey].paid || 0);
    }

    document.getElementById("residentId").value       = r.id;
    document.getElementById("flatNo").value           = r.flatNo;
    document.getElementById("fullName").value         = r.fullName;
    document.getElementById("monthlyFee").value       = r.monthlyFee;
    document.getElementById("paidThisMonth").value    = paid;
    document.getElementById("note").value             = r.note || "";

    document.getElementById("residentModal").classList.add("open");
}

function closeModal() {
    document.getElementById("residentModal").classList.remove("open");
}

// ----------------------------------
// GİDER MODALI
// ----------------------------------
function openNewExpenseModal() {
    document.getElementById("expenseModalTitle").textContent = "Yeni Gider";

    document.getElementById("expenseId").value          = "";
    const monthKey = getSelectedMonthKey();
    document.getElementById("expenseDate").value        = monthKey ? monthKey + "-01" : "";
    document.getElementById("expenseCategory").value    = "";
    document.getElementById("expenseDescription").value = "";
    document.getElementById("expenseAmount").value      = "";

    document.getElementById("expenseModal").classList.add("open");
}

function openEditExpenseModal(id) {
    const e = expenses.find(x => x.id === id);
    if (!e) return;

    document.getElementById("expenseModalTitle").textContent = "Gideri Düzenle";

    document.getElementById("expenseId").value          = e.id;
    document.getElementById("expenseDate").value        = e.date || "";
    document.getElementById("expenseCategory").value    = e.category || "";
    document.getElementById("expenseDescription").value = e.description || "";
    document.getElementById("expenseAmount").value      = e.amount || 0;

    document.getElementById("expenseModal").classList.add("open");
}

function closeExpenseModal() {
    document.getElementById("expenseModal").classList.remove("open");
}

// ----------------------------------
// PDF ÇIKTI
// ----------------------------------
function exportPDF() {
    if (!residents.length) {
        alert("Önce en az bir kullanıcı ekleyin.");
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const monthKey   = getSelectedMonthKey();
    const monthLabel = monthKeyToLabel(monthKey);

    doc.setFontSize(16);
    doc.text("Apartman Aidat Raporu", 14, 16);
    doc.setFontSize(11);
    doc.text("Ay: " + (monthLabel || "-"), 14, 24);

    const body = residents.map(r => {
        const monthly = Number(r.monthlyFee || 0);
        let paid = 0;
        if (r.payments && r.payments[monthKey]) {
            paid = Number(r.payments[monthKey].paid || 0);
        }
        const remaining = Math.max(monthly - paid, 0);

        return [
            r.flatNo,
            r.fullName,
            formatMoney(monthly)   + " ₺",
            formatMoney(paid)      + " ₺",
            formatMoney(remaining) + " ₺",
            (r.note || "").slice(0, 40)
        ];
    });

    doc.autoTable({
        head: [["Daire", "İsim", "Aidat", "Ödenen", "Kalan", "Not"]],
        body,
        startY: 30,
        styles: { fontSize: 9 }
    });

    doc.save(`Aidat_Raporu_${monthKey || "Ay"}.pdf`);
}

// ----------------------------------
// EXCEL ÇIKTI
// ----------------------------------
function exportExcel() {
    if (!residents.length) {
        alert("Önce en az bir kullanıcı ekleyin.");
        return;
    }
    const monthKey = getSelectedMonthKey();

    const rows = residents.map(r => {
        const monthly = Number(r.monthlyFee || 0);
        let paid = 0;
        if (r.payments && r.payments[monthKey]) {
            paid = Number(r.payments[monthKey].paid || 0);
        }
        const remaining = monthly - paid;

        return {
            "Daire":        r.flatNo,
            "İsim":         r.fullName,
            "Aidat (₺)":    monthly,
            "Ödenen (₺)":   paid,
            "Kalan (₺)":    remaining,
            "Not":          r.note || ""
        };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Aidat");

    XLSX.writeFile(wb, `Aidat_Listesi_${monthKey || "Ay"}.xlsx`);
}

// ----------------------------------
// TÜM VERİLERİ TEMİZLE
// ----------------------------------
function clearAllData() {
    if (!confirm("Tüm veriler (daireler + giderler) silinecek! Emin misiniz?")) return;
    residents = [];
    expenses  = [];
    saveData();
    renderTable();
    renderExpenses();
    renderYearSummary();
}

// ----------------------------------
// Admin yetki gizleme
// ----------------------------------
function disableAdminFeatures() {
    document.querySelectorAll(".edit-btn, .delete-btn, .expense-edit-btn, .expense-delete-btn")
        .forEach(btn => btn.style.display = "none");

    const addRes  = document.getElementById("btnAddResident");
    const addExp  = document.getElementById("btnAddExpense");
    const clearBtn = document.getElementById("btnClearData");

    if (addRes)  addRes.style.display  = "none";
    if (addExp)  addExp.style.display  = "none";
    if (clearBtn) clearBtn.style.display = "none";
}

// ----------------------------------
// Giriş
// ----------------------------------
function handleLogin() {
    const u = document.getElementById("loginUsername").value.trim();
    const p = document.getElementById("loginPassword").value.trim();

    const found = users.find(x => x.username === u && x.password === p);
    if (!found) {
        document.getElementById("loginError").textContent = "Hatalı kullanıcı!";
        return;
    }

    currentRole = found.role;
    document.getElementById("loginScreen").style.display = "none";

    if (currentRole === "viewer") disableAdminFeatures();
}

// ----------------------------------
// DOM YÜKLENDİĞİNDE
// ----------------------------------
document.addEventListener("DOMContentLoaded", () => {

    // Giriş butonu
    document.getElementById("loginBtn").addEventListener("click", handleLogin);

    // Ay seçiciyi kur
    const now = new Date();
    const monthInput = document.getElementById("monthSelect");
    if (monthInput) {
        monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        monthInput.addEventListener("change", () => {
            renderTable();
            renderYearSummary();
        });
    }

    // Yıl seçici doldur
    const yearSelect = document.getElementById("yearSelect");
    if (yearSelect) {
        const currentYear = now.getFullYear();
        for (let y = currentYear - 5; y <= currentYear + 1; y++) {
            const opt = document.createElement("option");
            opt.value = y;
            opt.textContent = y;
            if (y === currentYear) opt.selected = true;
            yearSelect.appendChild(opt);
        }
        yearSelect.addEventListener("change", renderYearSummary);
    }

    // Verileri yükle + ekrana yazdır
    loadData();
    renderTable();
    renderYearSummary();

    // Butonlar
    document.getElementById("btnAddResident").addEventListener("click", openNewModal);
    document.getElementById("btnAddExpense").addEventListener("click", openNewExpenseModal);
    document.getElementById("btnExportPDF").addEventListener("click", exportPDF);
    document.getElementById("btnExportExcel").addEventListener("click", exportExcel);
    document.getElementById("btnClearData").addEventListener("click", clearAllData);

    // Modal kapatma ve form eventleri
    document.getElementById("modalCloseBtn").addEventListener("click", closeModal);
    document.getElementById("expenseModalCloseBtn").addEventListener("click", closeExpenseModal);
    document.getElementById("historyModalCloseBtn").addEventListener("click", closeHistoryModal);

    // Dışına tıklayınca modalları kapat
    document.getElementById("residentModal").addEventListener("click", (e) => {
        if (e.target.id === "residentModal") closeModal();
    });
    document.getElementById("expenseModal").addEventListener("click", (e) => {
        if (e.target.id === "expenseModal") closeExpenseModal();
    });
    document.getElementById("historyModal").addEventListener("click", (e) => {
        if (e.target.id === "historyModal") closeHistoryModal();
    });

    // Form: daire
    document.getElementById("residentForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const id = document.getElementById("residentId").value;
        const data = {
            flatNo:     document.getElementById("flatNo").value.trim(),
            fullName:   document.getElementById("fullName").value.trim(),
            monthlyFee: Number(document.getElementById("monthlyFee").value || 0),
            note:       document.getElementById("note").value.trim()
        };
        const paid = Number(document.getElementById("paidThisMonth").value || 0);

        if (id) updateResident(id, data, paid);
        else    addResident(data, paid);

        closeModal();
    });

    // Form: gider
    document.getElementById("expenseForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const id = document.getElementById("expenseId").value;
        const data = {
            date:        document.getElementById("expenseDate").value,
            category:    document.getElementById("expenseCategory").value.trim(),
            description: document.getElementById("expenseDescription").value.trim(),
            amount:      Number(document.getElementById("expenseAmount").value || 0)
        };

        if (!data.date) {
            alert("Lütfen gider tarihini girin.");
            return;
        }

        if (id) updateExpense(id, data);
        else    addExpense(data);

        closeExpenseModal();
    });
});
