// Basit apartman yönetimi uygulaması
// Veri sadece tarayıcı localStorage'da tutulur, sunucu yok.

const STORAGE_KEY = "apartmanYonetim_v1";

let residents = []; // { id, flatNo, fullName, monthlyFee, paidThisMonth, note }
let currentMonth = "";

// Yardımcı: para formatı (Türkçe)
function formatMoney(value) {
    const num = Number(value || 0);
    return num.toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// LocalStorage'dan veri yükle
function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const obj = JSON.parse(raw);
        if (Array.isArray(obj.residents)) {
            residents = obj.residents;
        }
    } catch (e) {
        console.error("Veri okunamadı:", e);
    }
}

// LocalStorage'a kaydet
function saveData() {
    const obj = { residents };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

// Tabloyu yeniden çiz
function renderTable() {
    const tbody = document.getElementById("residentTableBody");
    tbody.innerHTML = "";

    let totalMonthly = 0;
    let totalPaid = 0;
    let totalRemaining = 0;

    residents.forEach((r) => {
        const monthly = Number(r.monthlyFee || 0);
        const paid = Number(r.paidThisMonth || 0);
        const remaining = Math.max(monthly - paid, 0);

        totalMonthly += monthly;
        totalPaid += paid;
        totalRemaining += remaining;

        const tr = document.createElement("tr");

        const tdFlat = document.createElement("td");
        tdFlat.textContent = r.flatNo;
        tr.appendChild(tdFlat);

        const tdName = document.createElement("td");
        tdName.textContent = r.fullName;
        tr.appendChild(tdName);

        const tdMonthly = document.createElement("td");
        tdMonthly.className = "amount";
        tdMonthly.textContent = formatMoney(monthly);
        tr.appendChild(tdMonthly);

        const tdPaid = document.createElement("td");
        tdPaid.className = "amount";
        tdPaid.textContent = formatMoney(paid);
        tr.appendChild(tdPaid);

        const tdRemaining = document.createElement("td");
        tdRemaining.className = "amount";
        const badge = document.createElement("span");
        badge.classList.add("badge");
        if (remaining === 0 && (monthly > 0 || paid > 0)) {
            badge.classList.add("positive");
            badge.textContent = "Yok";
        } else if (remaining > 0) {
            badge.classList.add("negative");
            badge.textContent = formatMoney(remaining) + " ₺";
        } else {
            badge.classList.add("neutral");
            badge.textContent = "—";
        }
        tdRemaining.appendChild(badge);
        tr.appendChild(tdRemaining);

        const tdNote = document.createElement("td");
        tdNote.textContent = r.note || "";
        tr.appendChild(tdNote);

        const tdActions = document.createElement("td");
        tdActions.className = "actions";
        const editBtn = document.createElement("button");
        editBtn.className = "icon-btn";
        editBtn.title = "Düzenle";
        editBtn.textContent = "✎";
        editBtn.addEventListener("click", () => openEditModal(r.id));

        const delBtn = document.createElement("button");
        delBtn.className = "icon-btn danger";
        delBtn.title = "Sil";
        delBtn.textContent = "🗑";
        delBtn.addEventListener("click", () => deleteResident(r.id));

        tdActions.appendChild(editBtn);
        tdActions.appendChild(delBtn);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
    });

    document.getElementById("summaryMonthlyFee").textContent =
        formatMoney(totalMonthly);
    document.getElementById("summaryPaid").textContent = formatMoney(totalPaid);
    document.getElementById("summaryRemaining").textContent =
        formatMoney(totalRemaining);
}

// Yeni kullanıcı ekle
function addResident(data) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    residents.push({ id, ...data });
    saveData();
    renderTable();
}

// Kullanıcı güncelle
function updateResident(id, data) {
    const idx = residents.findIndex((r) => r.id === id);
    if (idx === -1) return;
    residents[idx] = { ...residents[idx], ...data };
    saveData();
    renderTable();
}

// Kullanıcı sil
function deleteResident(id) {
    const r = residents.find((x) => x.id === id);
    const name = r ? `${r.flatNo} - ${r.fullName}` : "";
    if (!confirm(`${name} kaydını silmek istediğinizden emin misiniz?`)) return;
    residents = residents.filter((r) => r.id !== id);
    saveData();
    renderTable();
}
// Modal aç (yeni)
function openNewModal() {
    document.getElementById("residentModalTitle").textContent =
        "Yeni Kullanıcı / Daire";
    document.getElementById("residentId").value = "";
    document.getElementById("flatNo").value = "";
    document.getElementById("fullName").value = "";
    document.getElementById("monthlyFee").value = "";
    document.getElementById("paidThisMonth").value = "0";
    document.getElementById("note").value = "";
    openModal();
}

// Modal aç (düzenleme)
function openEditModal(id) {
    const r = residents.find((x) => x.id === id);
    if (!r) return;
    document.getElementById("residentModalTitle").textContent =
        "Kullanıcı / Daire Düzenle";
    document.getElementById("residentId").value = r.id;
    document.getElementById("flatNo").value = r.flatNo;
    document.getElementById("fullName").value = r.fullName;
    document.getElementById("monthlyFee").value = r.monthlyFee;
    document.getElementById("paidThisMonth").value = r.paidThisMonth || 0;
    document.getElementById("note").value = r.note || "";
    openModal();
}

function openModal() {
    document.getElementById("residentModal").classList.add("open");
}

function closeModal() {
    document.getElementById("residentModal").classList.remove("open");
}

// PDF oluştur
function exportPDF() {
    if (!residents.length) {
        alert("Önce en az bir kullanıcı ekleyin.");
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const monthLabel = getCurrentMonthLabel();

    doc.setFontSize(16);
    doc.text("Apartman Aidat Raporu", 14, 16);
    doc.setFontSize(11);
    doc.text("Ay: " + monthLabel, 14, 24);

    const body = residents.map((r) => {
        const monthly = Number(r.monthlyFee || 0);
        const paid = Number(r.paidThisMonth || 0);
        const remaining = Math.max(monthly - paid, 0);

        return [
            r.flatNo,
            r.fullName,
            formatMoney(monthly) + " ₺",
            formatMoney(paid) + " ₺",
            formatMoney(remaining) + " ₺",
            (r.note || "").slice(0, 40)
        ];
    });

    doc.autoTable({
        head: [
            ["Daire", "İsim", "Aylık Aidat", "Bu Ay Ödenen", "Kalan Borç", "Not"]
        ],
        body,
        startY: 30,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229] }
    });

    const fileName = `Aidat_Raporu_${monthLabel.replace(" ", "_")}.pdf`;
    doc.save(fileName);
}

// Excel oluştur
function exportExcel() {
    if (!residents.length) {
        alert("Önce en az bir kullanıcı ekleyin.");
        return;
    }
    const monthLabel = getCurrentMonthLabel();

    const rows = residents.map((r) => {
        const monthly = Number(r.monthlyFee || 0);
        const paid = Number(r.paidThisMonth || 0);
        const remaining = Math.max(monthly - paid, 0);
        return {
            "Daire No": r.flatNo,
            "İsim Soyisim": r.fullName,
            "Aylık Aidat (₺)": Number(monthly.toFixed(2)),
            "Bu Ay Ödenen (₺)": Number(paid.toFixed(2)),
            "Kalan Borç (₺)": Number(remaining.toFixed(2)),
            Not: r.note || ""
        };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Aidat");

    const fileName = `Aidat_Listesi_${monthLabel.replace(" ", "_")}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

// Ay bilgisini yazıya çevir
function getCurrentMonthLabel() {
    const input = document.getElementById("monthSelect").value;
    if (!input) return "";
    const [year, month] = input.split("-");
    const monthNames = [
        "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
        "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
    ];
    const idx = Number(month) - 1;
    return monthNames[idx] + " " + year;
}

// Tüm veriyi sil
function clearAllData() {
    if (!confirm("Tüm daire ve ödeme verileri silinecek. Emin misiniz?"))
        return;

    residents = [];
    saveData();
    renderTable();
}

// DOM yüklendiğinde
document.addEventListener("DOMContentLoaded", () => {
    // Ay seçimini bugünün ayına ayarla
    const monthInput = document.getElementById("monthSelect");
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    monthInput.value = `${yyyy}-${mm}`;

    // Verileri yükle
    loadData();
    renderTable();

    // Buton olayları
    document.getElementById("btnAddResident").addEventListener("click", openNewModal);
    document.getElementById("btnExportPDF").addEventListener("click", exportPDF);
    document.getElementById("btnExportExcel").addEventListener("click", exportExcel);
    document.getElementById("btnClearData").addEventListener("click", clearAllData);

    // Modal kapatma
    document.getElementById("modalCloseBtn").addEventListener("click", closeModal);

    // Form submit
    document.getElementById("residentForm").addEventListener("submit", (e) => {
        e.preventDefault();

        const id = document.getElementById("residentId").value || null;
        const flatNo = document.getElementById("flatNo").value.trim();
        const fullName = document.getElementById("fullName").value.trim();
        const monthlyFee = Number(document.getElementById("monthlyFee").value || 0);
        const paidThisMonth = Number(document.getElementById("paidThisMonth").value || 0);
        const note = document.getElementById("note").value.trim();

        if (!flatNo || !fullName) {
            alert("Daire no ve isim zorunludur.");
            return;
        }

        const data = {
            flatNo,
            fullName,
            monthlyFee,
            paidThisMonth,
            note
        };

        if (id) updateResident(id, data);
        else addResident(data);

        closeModal();
    });

    // Modal dışına tıklayınca kapat
    document.getElementById("residentModal").addEventListener("click", (e) => {
        if (e.target.id === "residentModal") closeModal();
    });
});
