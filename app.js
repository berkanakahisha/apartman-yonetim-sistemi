let residents = JSON.parse(localStorage.getItem("residents") || "[]");
const tbody = document.getElementById("residentTableBody");

function render() {
    tbody.innerHTML = "";
    let totalMonthly = 0, totalPaid = 0;

    residents.forEach(r => {
        const remaining = Math.max(r.monthlyFee - r.paidThisMonth, 0);
        totalMonthly += r.monthlyFee;
        totalPaid += r.paidThisMonth;

        tbody.innerHTML += `
        <tr>
            <td>${r.flatNo}</td>
            <td>${r.fullName}</td>
            <td>${r.monthlyFee}₺</td>
            <td>${r.paidThisMonth}₺</td>
            <td>${remaining}₺</td>
            <td>${r.note || ""}</td>
            <td>
                <button onclick="editResident('${r.id}')">✎</button>
                <button onclick="deleteResident('${r.id}')">🗑</button>
            </td>
        </tr>`;
    });

    document.getElementById("summaryMonthlyFee").textContent = totalMonthly;
    document.getElementById("summaryPaid").textContent = totalPaid;
    document.getElementById("summaryRemaining").textContent = totalMonthly - totalPaid;
}
render();

function saveData() {
    localStorage.setItem("residents", JSON.stringify(residents));
}

function deleteResident(id) {
    residents = residents.filter(r => r.id !== id);
    saveData();
    render();
}

function editResident(id) {
    const r = residents.find(x => x.id === id);
    document.getElementById("residentId").value = r.id;
    flatNo.value = r.flatNo;
    fullName.value = r.fullName;
    monthlyFee.value = r.monthlyFee;
    paidThisMonth.value = r.paidThisMonth;
    note.value = r.note;
    openModal();
}

function openModal() {
    document.getElementById("residentModal").style.display = "flex";
}
function closeModal() {
    document.getElementById("residentModal").style.display = "none";
}

document.getElementById("modalCloseBtn").onclick = closeModal;

document.getElementById("residentForm").onsubmit = (e) => {
    e.preventDefault();

    const id = residentId.value || Date.now().toString();
    const obj = {
        id,
        flatNo: flatNo.value,
        fullName: fullName.value,
        monthlyFee: Number(monthlyFee.value),
        paidThisMonth: Number(paidThisMonth.value),
        note: note.value
    };

    const idx = residents.findIndex(x => x.id === id);
    if (idx >= 0) residents[idx] = obj;
    else residents.push(obj);

    saveData();
    closeModal();
    render();
};

function clearAll() {
    if (!confirm("Tüm veriler silinsin mi?")) return;
    residents = [];
    saveData();
    render();
}

/* PDF */
function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const rows = residents.map(r => [
        r.flatNo, r.fullName, r.monthlyFee, r.paidThisMonth,
        r.monthlyFee - r.paidThisMonth, r.note
    ]);

    doc.autoTable({
        head: [["Daire","İsim","Aidat","Ödenen","Kalan","Not"]],
        body: rows
    });

    doc.save("aidat_raporu.pdf");
}

/* Excel */
function exportExcel() {
    const rows = residents.map(r => ({
        Daire: r.flatNo,
        İsim: r.fullName,
        Aidat: r.monthlyFee,
        Ödenen: r.paidThisMonth,
        Kalan: r.monthlyFee - r.paidThisMonth,
        Not: r.note
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Aidat");

    XLSX.writeFile(wb, "aidat_listesi.xlsx");
}
console.log("JS yüklendi");
