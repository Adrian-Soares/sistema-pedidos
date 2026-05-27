const STORAGE_KEY = "pedidos-publicacoes:v1";
const BACKUP_KEY = "pedidos-publicacoes:backups:v1";
const THEME_KEY = "pedidos-publicacoes:theme";
const STATUSES = ["Pendente", "Pedido realizado", "Recebido"];

const state = {
  orders: [],
  filters: {
    search: "",
    status: "all",
    fromDate: "",
    toDate: "",
    sort: "orderDate:asc"
  },
  pendingDeleteId: null,
  pendingRestoreOrders: null,
  toastTimer: null
};

const elements = {
  metricTotal: document.getElementById("metricTotal"),
  metricPending: document.getElementById("metricPending"),
  metricOrdered: document.getElementById("metricOrdered"),
  metricReceived: document.getElementById("metricReceived"),
  themeToggleButton: document.getElementById("themeToggleButton"),
  themeToggleText: document.getElementById("themeToggleText"),
  ordersTable: document.getElementById("ordersTable"),
  emptyState: document.getElementById("emptyState"),
  searchInput: document.getElementById("searchInput"),
  statusFilter: document.getElementById("statusFilter"),
  fromDateFilter: document.getElementById("fromDateFilter"),
  toDateFilter: document.getElementById("toDateFilter"),
  sortSelect: document.getElementById("sortSelect"),
  exportScope: document.getElementById("exportScope"),
  exportCsvButton: document.getElementById("exportCsvButton"),
  exportXlsxButton: document.getElementById("exportXlsxButton"),
  newOrderButton: document.getElementById("newOrderButton"),
  orderDialog: document.getElementById("orderDialog"),
  orderForm: document.getElementById("orderForm"),
  dialogTitle: document.getElementById("dialogTitle"),
  deleteDialog: document.getElementById("deleteDialog"),
  deleteDialogText: document.getElementById("deleteDialogText"),
  cancelDeleteButton: document.getElementById("cancelDeleteButton"),
  confirmDeleteButton: document.getElementById("confirmDeleteButton"),
  restoreDialog: document.getElementById("restoreDialog"),
  restoreDialogText: document.getElementById("restoreDialogText"),
  cancelRestoreButton: document.getElementById("cancelRestoreButton"),
  confirmRestoreButton: document.getElementById("confirmRestoreButton"),
  orderId: document.getElementById("orderId"),
  brotherName: document.getElementById("brotherName"),
  publication: document.getElementById("publication"),
  quantity: document.getElementById("quantity"),
  orderDate: document.getElementById("orderDate"),
  status: document.getElementById("status"),
  arrivalDate: document.getElementById("arrivalDate"),
  observations: document.getElementById("observations"),
  duplicateWarning: document.getElementById("duplicateWarning"),
  brotherNamesList: document.getElementById("brotherNamesList"),
  publicationsList: document.getElementById("publicationsList"),
  brotherNameToggle: document.querySelector('[data-combo-toggle="brotherName"]'),
  publicationToggle: document.querySelector('[data-combo-toggle="publication"]'),
  publicationCounters: document.getElementById("publicationCounters"),
  backupInfo: document.getElementById("backupInfo"),
  downloadBackupButton: document.getElementById("downloadBackupButton"),
  restoreBackupInput: document.getElementById("restoreBackupInput"),
  historyPanel: document.getElementById("historyPanel"),
  historyTitle: document.getElementById("historyTitle"),
  historyList: document.getElementById("historyList"),
  closeHistoryButton: document.getElementById("closeHistoryButton"),
  toast: document.getElementById("toast")
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normalize(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function statusClass(status) {
  return `status-${normalize(status).replace(/\s+/g, "-")}`;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadOrders() {
  try {
    state.orders = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    state.orders = [];
    showToast("Os dados locais estavam corrompidos e foram reiniciados.");
  }
}

function getPreferredTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isDark = theme === "dark";
  elements.themeToggleButton.setAttribute("aria-pressed", String(isDark));
  elements.themeToggleButton.setAttribute("aria-label", isDark ? "Ativar modo claro" : "Ativar modo escuro");
  elements.themeToggleText.textContent = isDark ? "Modo claro" : "Modo escuro";
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme || getPreferredTheme();
  const nextTheme = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, nextTheme);
  applyTheme(nextTheme);
  showToast(nextTheme === "dark" ? "Modo escuro ativado." : "Modo claro ativado.");
}

function saveOrders(message) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.orders));
  createAutomaticBackup();
  render();
  if (message) showToast(message);
}

function createAutomaticBackup() {
  const backups = readBackups();
  backups.unshift({
    createdAt: new Date().toISOString(),
    orders: state.orders
  });
  localStorage.setItem(BACKUP_KEY, JSON.stringify(backups.slice(0, 10)));
}

function readBackups() {
  try {
    return JSON.parse(localStorage.getItem(BACKUP_KEY) || "[]");
  } catch {
    return [];
  }
}

function updateBackupInfo() {
  const latest = readBackups()[0];
  elements.backupInfo.textContent = latest
    ? `Último backup: ${new Date(latest.createdAt).toLocaleString("pt-BR")}`
    : "Nenhum backup criado ainda.";
}

function getUniqueValues(field) {
  return [...new Set(state.orders.map((order) => order[field]).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function fillDatalists() {
  renderComboList("brotherName");
  renderComboList("publication");
}

function getComboOptions(type) {
  return type === "brotherName" ? getUniqueValues("brotherName") : getPublicationSuggestions();
}

function getComboElements(type) {
  return type === "brotherName"
    ? { input: elements.brotherName, list: elements.brotherNamesList, toggle: elements.brotherNameToggle }
    : { input: elements.publication, list: elements.publicationsList, toggle: elements.publicationToggle };
}

function renderComboList(type) {
  const { input, list } = getComboElements(type);
  const query = normalize(input.value);
  const options = getComboOptions(type).filter((option) => !query || normalize(option).includes(query));

  list.innerHTML = options.length
    ? options.map((option) => `
        <button class="combo-option" type="button" role="option" data-combo-value="${escapeHtml(option)}">
          ${escapeHtml(option)}
        </button>
      `).join("")
    : `<div class="combo-empty">Nenhum registro encontrado.</div>`;
}

function openCombo(type) {
  const { list, toggle } = getComboElements(type);
  renderComboList(type);
  closeCombo(type === "brotherName" ? "publication" : "brotherName");
  list.hidden = false;
  toggle.setAttribute("aria-expanded", "true");
}

function closeCombo(type) {
  const { list, toggle } = getComboElements(type);
  list.hidden = true;
  toggle.setAttribute("aria-expanded", "false");
}

function closeAllCombos() {
  closeCombo("brotherName");
  closeCombo("publication");
}

function selectComboValue(type, value) {
  const { input } = getComboElements(type);
  input.value = value;
  closeCombo(type);
  elements.duplicateWarning.hidden = !findPossibleDuplicate(getFormData());
  input.focus();
}

function getPublicationSuggestions() {
  const totals = getPublicationTotals();
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
    .map(([name]) => name);
}

function getPublicationTotals() {
  return state.orders.reduce((totals, order) => {
    totals[order.publication] = (totals[order.publication] || 0) + Number(order.quantity || 0);
    return totals;
  }, {});
}

function getVisibleOrders() {
  const search = normalize(state.filters.search);
  const filtered = state.orders.filter((order) => {
    const matchesSearch = !search || [order.brotherName, order.publication, order.status, order.observations]
      .some((value) => normalize(value).includes(search));
    const matchesStatus = state.filters.status === "all" || order.status === state.filters.status;
    const matchesFrom = !state.filters.fromDate || order.orderDate >= state.filters.fromDate;
    const matchesTo = !state.filters.toDate || order.orderDate <= state.filters.toDate;
    return matchesSearch && matchesStatus && matchesFrom && matchesTo;
  });

  const [field, direction] = state.filters.sort.split(":");
  return filtered.sort((a, b) => {
    const left = a[field] || "";
    const right = b[field] || "";
    const result = field === "quantity"
      ? Number(left) - Number(right)
      : String(left).localeCompare(String(right), "pt-BR");
    return direction === "desc" ? -result : result;
  });
}

function render() {
  fillDatalists();
  renderMetrics();
  renderTable();
  renderCounters();
  updateBackupInfo();
}

function renderMetrics() {
  elements.metricTotal.textContent = state.orders.length;
  elements.metricPending.textContent = state.orders.filter((order) => order.status === "Pendente").length;
  elements.metricOrdered.textContent = state.orders.filter((order) => order.status === "Pedido realizado").length;
  elements.metricReceived.textContent = state.orders.filter((order) => order.status === "Recebido").length;
}

function renderCounters() {
  const totals = Object.entries(getPublicationTotals())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"));

  elements.publicationCounters.innerHTML = totals.length
    ? totals.map(([publication, total]) => `
        <div class="counter-item">
          <span>${escapeHtml(publication)}</span>
          <strong>${total}</strong>
        </div>
      `).join("")
    : `<div class="empty-state">Sem publicações cadastradas.</div>`;
}

function renderTable() {
  const orders = getVisibleOrders();
  elements.emptyState.hidden = orders.length > 0;

  elements.ordersTable.innerHTML = orders.map((order) => `
    <tr>
      <td data-label="Nome"><button class="person-button" type="button" data-history="${order.id}">${escapeHtml(order.brotherName)}</button></td>
      <td data-label="Publicação">${escapeHtml(order.publication)}</td>
      <td data-label="Qtd.">${order.quantity}</td>
      <td data-label="Data do pedido">${formatDate(order.orderDate)}</td>
      <td data-label="Status"><span class="status-badge ${statusClass(order.status)}">${escapeHtml(order.status)}</span></td>
      <td data-label="Data de chegada">${formatDate(order.arrivalDate)}</td>
      <td data-label="Observações"><span class="table-note">${escapeHtml(order.observations || "-")}</span></td>
      <td data-label="Ações">
        <div class="row-actions">
          ${order.status === "Pendente" ? `<button class="small-button" type="button" data-mark-ordered="${order.id}">Pedido feito</button>` : ""}
          ${order.status !== "Recebido" ? `<button class="small-button" type="button" data-mark-received="${order.id}">Recebido</button>` : ""}
          <button class="small-button" type="button" data-edit="${order.id}">Editar</button>
          <button class="small-button danger" type="button" data-delete="${order.id}">Excluir</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function openOrderDialog(order) {
  const isEditing = Boolean(order);
  elements.dialogTitle.textContent = isEditing ? "Editar Pedido" : "Novo Pedido";
  elements.orderId.value = order?.id || "";
  elements.brotherName.value = order?.brotherName || "";
  elements.publication.value = order?.publication || "";
  elements.quantity.value = order?.quantity || 1;
  elements.orderDate.value = order?.orderDate || today();
  elements.status.value = order?.status || "Pendente";
  elements.arrivalDate.value = order?.arrivalDate || "";
  elements.observations.value = order?.observations || "";
  elements.duplicateWarning.hidden = true;
  elements.orderDialog.showModal();
  elements.brotherName.focus();
}

function closeOrderDialog() {
  elements.orderDialog.close();
}

function handleSubmit(event) {
  event.preventDefault();
  const formData = getFormData();

  if (!formData.brotherName || !formData.publication || formData.quantity < 1 || !formData.orderDate) {
    showToast("Preencha nome, publicação, quantidade e data do pedido.");
    return;
  }

  if (formData.status === "Recebido" && !formData.arrivalDate) {
    formData.arrivalDate = today();
  }

  if (formData.status !== "Recebido") {
    formData.arrivalDate = "";
  }

  const duplicate = findPossibleDuplicate(formData);
  if (duplicate && elements.duplicateWarning.hidden) {
    elements.duplicateWarning.hidden = false;
    showToast("Possível pedido duplicado encontrado. Clique em salvar novamente para confirmar.");
    return;
  }

  if (formData.id) {
    state.orders = state.orders.map((order) => order.id === formData.id ? { ...order, ...formData } : order);
    closeOrderDialog();
    saveOrders("Pedido atualizado.");
    return;
  }

  state.orders.push({
    ...formData,
    id: uid(),
    createdAt: new Date().toISOString()
  });
  closeOrderDialog();
  saveOrders("Pedido cadastrado.");
}

function getFormData() {
  return {
    id: elements.orderId.value,
    brotherName: elements.brotherName.value.trim(),
    publication: elements.publication.value.trim(),
    quantity: Number(elements.quantity.value),
    orderDate: elements.orderDate.value,
    status: elements.status.value,
    arrivalDate: elements.arrivalDate.value,
    observations: elements.observations.value.trim()
  };
}

function findPossibleDuplicate(formData) {
  return state.orders.find((order) => {
    if (formData.id && order.id === formData.id) return false;
    return normalize(order.brotherName) === normalize(formData.brotherName)
      && normalize(order.publication) === normalize(formData.publication)
      && order.status !== "Recebido"
      && formData.status !== "Recebido";
  });
}

function updateOrderStatus(id, status) {
  state.orders = state.orders.map((order) => {
    if (order.id !== id) return order;
    return {
      ...order,
      status,
      arrivalDate: status === "Recebido" ? today() : order.arrivalDate
    };
  });
  saveOrders(status === "Recebido" ? "Pedido marcado como recebido." : "Pedido marcado como realizado.");
}

function requestDeleteOrder(id) {
  const order = state.orders.find((item) => item.id === id);
  if (!order) return;
  state.pendingDeleteId = id;
  elements.deleteDialogText.textContent = `Você está prestes a excluir o pedido de ${order.brotherName} para "${order.publication}". Essa ação não pode ser desfeita.`;
  elements.deleteDialog.classList.remove("trash-close", "trash-open");
  elements.deleteDialog.showModal();
  window.requestAnimationFrame(() => {
    elements.deleteDialog.classList.add("trash-open");
  });
  elements.cancelDeleteButton.focus();
}

function closeDeleteDialog(afterClose) {
  elements.deleteDialog.classList.remove("trash-open");
  elements.deleteDialog.classList.add("trash-close");
  window.setTimeout(() => {
    state.pendingDeleteId = null;
    elements.deleteDialog.classList.remove("trash-close");
    elements.deleteDialog.close();
    if (typeof afterClose === "function") afterClose();
  }, 340);
}

function confirmDeleteOrder() {
  const id = state.pendingDeleteId;
  if (!id) return;
  state.orders = state.orders.filter((item) => item.id !== id);
  closeDeleteDialog(() => saveOrders("Pedido excluído."));
}

function openHistory(id) {
  const order = state.orders.find((item) => item.id === id);
  if (!order) return;
  const name = order.brotherName;
  const history = state.orders
    .filter((item) => normalize(item.brotherName) === normalize(name))
    .sort((a, b) => a.orderDate.localeCompare(b.orderDate));

  elements.historyTitle.textContent = name;
  elements.historyList.innerHTML = history.map((item) => `
    <article class="history-item">
      <strong>${escapeHtml(item.publication)} (${item.quantity})</strong>
      <span class="status-badge ${statusClass(item.status)}">${escapeHtml(item.status)}</span>
      <p>Pedido: ${formatDate(item.orderDate)}</p>
      <p>Chegada: ${formatDate(item.arrivalDate)}</p>
      ${item.observations ? `<p>Observações: ${escapeHtml(item.observations)}</p>` : ""}
    </article>
  `).join("");
  elements.historyPanel.classList.add("open");
  elements.historyPanel.setAttribute("aria-hidden", "false");
}

function closeHistory() {
  elements.historyPanel.classList.remove("open");
  elements.historyPanel.setAttribute("aria-hidden", "true");
}

function getExportRows(scope) {
  const source = scope === "all"
    ? state.orders
    : state.orders.filter((order) => order.status === scope);
  return source
    .slice()
    .sort((a, b) => a.orderDate.localeCompare(b.orderDate))
    .map((order) => ({
      "Nome do irmão": order.brotherName,
      "Publicação solicitada": order.publication,
      "Quantidade": order.quantity,
      "Data do pedido": order.orderDate,
      "Status": order.status,
      "Data de chegada": order.arrivalDate || "",
      "Observações": order.observations || ""
    }));
}

function exportCsv() {
  const rows = getExportRows(elements.exportScope.value);
  if (!rows.length) {
    showToast("Não há dados para exportar nesse filtro.");
    return;
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
  ].join("\n");

  downloadBlob(new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }), fileName("csv"));
  showToast("Arquivo CSV exportado.");
}

function exportXlsx() {
  const rows = getExportRows(elements.exportScope.value);
  if (!rows.length) {
    showToast("Não há dados para exportar nesse filtro.");
    return;
  }
  const blob = buildXlsx(rows);
  downloadBlob(blob, fileName("xlsx"));
  showToast("Arquivo XLSX exportado.");
}

function fileName(extension) {
  const scope = elements.exportScope.value === "all" ? "todos" : normalize(elements.exportScope.value).replace(/\s+/g, "-");
  return `pedidos-publicacoes-${scope}-${today()}.${extension}`;
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadBackup() {
  const payload = {
    exportedAt: new Date().toISOString(),
    orders: state.orders,
    backups: readBackups()
  };
  downloadBlob(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    `backup-pedidos-publicacoes-${today()}.json`
  );
  showToast("Backup baixado.");
}

function restoreBackup(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      const orders = Array.isArray(payload) ? payload : payload.orders;
      if (!Array.isArray(orders)) throw new Error("Formato invalido");
      requestRestoreBackup(orders.map(normalizeOrder));
    } catch {
      showToast("Não foi possível restaurar esse arquivo.");
    } finally {
      elements.restoreBackupInput.value = "";
    }
  };
  reader.readAsText(file);
}

function requestRestoreBackup(orders) {
  state.pendingRestoreOrders = orders;
  elements.restoreDialogText.textContent = `O backup selecionado contém ${orders.length} pedido(s). Ao restaurar, os ${state.orders.length} pedido(s) atuais serão substituídos.`;
  elements.restoreDialog.showModal();
  elements.cancelRestoreButton.focus();
}

function closeRestoreDialog() {
  state.pendingRestoreOrders = null;
  elements.restoreDialog.close();
}

function confirmRestoreBackup() {
  if (!state.pendingRestoreOrders) return;
  state.orders = state.pendingRestoreOrders;
  closeRestoreDialog();
  saveOrders("Backup restaurado.");
}

function normalizeOrder(order) {
  return {
    id: order.id || uid(),
    brotherName: String(order.brotherName || "").trim(),
    publication: String(order.publication || "").trim(),
    quantity: Number(order.quantity || 1),
    orderDate: order.orderDate || today(),
    status: STATUSES.includes(order.status) ? order.status : "Pendente",
    arrivalDate: order.arrivalDate || "",
    observations: String(order.observations || "").trim(),
    createdAt: order.createdAt || new Date().toISOString()
  };
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildXlsx(rows) {
  const headers = Object.keys(rows[0]);
  const sheetRows = [headers, ...rows.map((row) => headers.map((header) => row[header]))];
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => {
    const cellRef = `${columnName(columnIndex)}${rowIndex + 1}`;
    return `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
  }).join("")}</row>`).join("")}</sheetData></worksheet>`;

  const files = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Pedidos" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": sheetXml
  };

  return new Blob([zipStore(files)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}

function columnName(index) {
  let name = "";
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function zipStore(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  Object.entries(files).forEach(([name, content]) => {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const crc = crc32(data);
    const local = concatBytes(
      uint32(0x04034b50), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0),
      uint32(crc), uint32(data.length), uint32(data.length), uint16(nameBytes.length), uint16(0),
      nameBytes, data
    );
    const central = concatBytes(
      uint32(0x02014b50), uint16(20), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0),
      uint32(crc), uint32(data.length), uint32(data.length), uint16(nameBytes.length), uint16(0),
      uint16(0), uint16(0), uint16(0), uint32(0), uint32(offset), nameBytes
    );
    localParts.push(local);
    centralParts.push(central);
    offset += local.length;
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = concatBytes(
    uint32(0x06054b50), uint16(0), uint16(0), uint16(centralParts.length),
    uint16(centralParts.length), uint32(centralSize), uint32(offset), uint16(0)
  );

  return concatBytes(...localParts, ...centralParts, end);
}

function uint16(value) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function uint32(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
  return bytes;
}

function concatBytes(...parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function crc32(data) {
  let crc = -1;
  for (let i = 0; i < data.length; i += 1) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeHtml(value) {
  return escapeXml(value).replace(/'/g, "&#039;");
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  state.toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2800);
}

function wireEvents() {
  elements.themeToggleButton.addEventListener("click", toggleTheme);
  elements.newOrderButton.addEventListener("click", () => openOrderDialog());
  elements.orderForm.addEventListener("submit", handleSubmit);
  elements.cancelDeleteButton.addEventListener("click", closeDeleteDialog);
  elements.confirmDeleteButton.addEventListener("click", confirmDeleteOrder);
  elements.deleteDialog.addEventListener("click", (event) => {
    if (event.target === elements.deleteDialog) closeDeleteDialog();
  });
  elements.deleteDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDeleteDialog();
  });
  elements.cancelRestoreButton.addEventListener("click", closeRestoreDialog);
  elements.confirmRestoreButton.addEventListener("click", confirmRestoreBackup);
  elements.restoreDialog.addEventListener("click", (event) => {
    if (event.target === elements.restoreDialog) closeRestoreDialog();
  });
  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", closeOrderDialog);
  });

  elements.status.addEventListener("change", () => {
    if (elements.status.value === "Recebido" && !elements.arrivalDate.value) {
      elements.arrivalDate.value = today();
    }
    if (elements.status.value !== "Recebido") {
      elements.arrivalDate.value = "";
    }
  });

  [elements.brotherName, elements.publication, elements.status].forEach((input) => {
    input.addEventListener("input", () => {
      elements.duplicateWarning.hidden = !findPossibleDuplicate(getFormData());
    });
  });

  [
    { type: "brotherName", input: elements.brotherName, list: elements.brotherNamesList, toggle: elements.brotherNameToggle },
    { type: "publication", input: elements.publication, list: elements.publicationsList, toggle: elements.publicationToggle }
  ].forEach(({ type, input, list, toggle }) => {
    input.addEventListener("focus", () => openCombo(type));
    input.addEventListener("input", () => openCombo(type));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeCombo(type);
      if (event.key === "ArrowDown") openCombo(type);
    });
    toggle.addEventListener("click", () => {
      if (list.hidden) {
        input.focus();
        openCombo(type);
      } else {
        closeCombo(type);
      }
    });
    list.addEventListener("mousedown", (event) => {
      event.preventDefault();
      const option = event.target.closest("[data-combo-value]");
      if (option) selectComboValue(type, option.dataset.comboValue);
    });
  });

  document.addEventListener("mousedown", (event) => {
    if (!event.target.closest(".combo-field")) closeAllCombos();
  });

  elements.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value;
    renderTable();
  });
  elements.statusFilter.addEventListener("change", (event) => {
    state.filters.status = event.target.value;
    renderTable();
  });
  elements.fromDateFilter.addEventListener("change", (event) => {
    state.filters.fromDate = event.target.value;
    renderTable();
  });
  elements.toDateFilter.addEventListener("change", (event) => {
    state.filters.toDate = event.target.value;
    renderTable();
  });
  elements.sortSelect.addEventListener("change", (event) => {
    state.filters.sort = event.target.value;
    renderTable();
  });

  elements.ordersTable.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const editId = button.dataset.edit;
    const deleteId = button.dataset.delete;
    const orderedId = button.dataset.markOrdered;
    const receivedId = button.dataset.markReceived;
    const historyId = button.dataset.history;

    if (editId) openOrderDialog(state.orders.find((order) => order.id === editId));
    if (deleteId) requestDeleteOrder(deleteId);
    if (orderedId) updateOrderStatus(orderedId, "Pedido realizado");
    if (receivedId) updateOrderStatus(receivedId, "Recebido");
    if (historyId) openHistory(historyId);
  });

  elements.exportCsvButton.addEventListener("click", exportCsv);
  elements.exportXlsxButton.addEventListener("click", exportXlsx);
  elements.downloadBackupButton.addEventListener("click", downloadBackup);
  elements.restoreBackupInput.addEventListener("change", (event) => restoreBackup(event.target.files[0]));
  elements.closeHistoryButton.addEventListener("click", closeHistory);
  elements.historyPanel.addEventListener("click", (event) => {
    if (event.target === elements.historyPanel) closeHistory();
  });
}

applyTheme(getPreferredTheme());
loadOrders();
wireEvents();
render();
