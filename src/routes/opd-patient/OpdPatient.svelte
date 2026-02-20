<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import Swal from 'sweetalert2';
  import '$lib/opdPatient.css';


  // ---------- Data ----------
  let data: any[] = [];
  let loading = true;
  let error = '';
  let search = '';

  // ---------- UI State ----------
  let showOptionsMenu = false;
  let showColumnModal = false;
  let showExportMenu = false;
  let isExporting = false;

  // ---------- Font size ----------
  let fontSize = 13;
  const minFontSize = 10;
  const maxFontSize = 18;

  // ---------- Column definitions (OPD) ----------
  let columns = {
  opdId:      { label: 'Visit ID', visible: true, locked: true },
  name:       { label: 'Name', visible: true, locked: false },
  gender:     { label: 'Gender', visible: true, locked: false },
  age:        { label: 'Age', visible: true, locked: false },
  city:       { label: 'City', visible: true, locked: false },
  phone:      { label: 'Phone', visible: true, locked: false },
  visitDate:  { label: 'Visit Date', visible: true, locked: false },
  doctor:     { label: 'Doctor', visible: false, locked: false },
  department: { label: 'Department', visible: false, locked: false },
  status:     { label: 'Status', visible: false, locked: false },
  action:     { label: 'Action', visible: true, locked: true }
};

  let tempColumns = structuredClone(columns);
  let columnOrder = [
  'opdId',
  'name',
  'gender',
  'age',
  'city',
  'phone',
  'visitDate',
  'doctor',
  'department',
  'status',
  'action'
];

  let draggedIndex: number | null = null;

  // ---------- Patient detail modal + professional file upload ----------
  let showPatientDetail = false;
  let selectedPatient: any = null;
  let selectedFiles: File[] = [];      // accumulated files
  let noteText: string = '';
  let isSaving = false;

  // File validation limits
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  // ---------- Column drag & drop ----------
  function onDragStart(index: number, key: string) {
    if (columns[key].locked) return;
    draggedIndex = index;
  }
  function onDrop(index: number) {
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...columnOrder];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, moved);
    columnOrder = updated;
    draggedIndex = null;
  }

  // ---------- Column modal ----------
  function openColumnMenu() {
    tempColumns = structuredClone(columns);
    showColumnModal = true;
  }
  function applyColumns() {
    columns = structuredClone(tempColumns);
    showColumnModal = false;
  }
  function cancelColumns() {
    showColumnModal = false;
  }

  // ---------- Patient detail modal handlers ----------
  function openPatientDetail(patientData: any) {
    selectedPatient = patientData;
    selectedFiles = [];
    noteText = '';
    showPatientDetail = true;
  }
  function closePatientDetail() {
    showPatientDetail = false;
    selectedPatient = null;
    selectedFiles = [];
    noteText = '';
  }

  // ---------- PROFESSIONAL MULTIPLE FILE HANDLING ----------
  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const newFiles = Array.from(input.files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    newFiles.forEach(file => {
      // 1. Check size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} exceeds 10MB limit.`);
        return;
      }
      // 2. Check type
      if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
        errors.push(`${file.name} has unsupported file type.`);
        return;
      }
      // 3. Prevent duplicate (by name and size and lastModified)
      const isDuplicate = selectedFiles.some(existing =>
        existing.name === file.name &&
        existing.size === file.size &&
        existing.lastModified === file.lastModified
      );
      if (isDuplicate) {
        errors.push(`${file.name} is already added.`);
        return;
      }
      validFiles.push(file);
    });

    // Append valid files
    selectedFiles = [...selectedFiles, ...validFiles];

    // Show validation errors
    if (errors.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Some files were not added',
        html: errors.join('<br>'),
        timer: 3000,
        showConfirmButton: true
      });
    }

    // Reset input so same file can be re-selected after removal
    input.value = '';
  }

  function removeFile(index: number) {
    selectedFiles = selectedFiles.filter((_, i) => i !== index);
  }

  function clearAllFiles() {
    selectedFiles = [];
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function getFileIcon(file: File): string {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('word') || file.type.includes('document')) return '📝';
    if (file.type.includes('sheet') || file.type.includes('excel')) return '📊';
    return '📎';
  }

  // ---------- Save documents + notes ----------
  // async function saveDocumentNote() {
  //   if (!selectedPatient?.opdId) {
  //     Swal.fire('Error', 'No patient selected', 'error');
  //     return;
  //   }
  //   if (selectedFiles.length === 0 && !noteText.trim()) {
  //     Swal.fire('Info', 'Nothing to save', 'info');
  //     return;
  //   }

  //   isSaving = true;
  //   const formData = new FormData();
  //   selectedFiles.forEach(file => {
  //     formData.append('files', file);   // field name expected by backend
  //   });
  //   formData.append('opdId', selectedPatient.opdId.toString());
  //   formData.append('description', noteText);

  //   try {
  //     const res = await fetch('http://localhost:8081/api/opd/upload-documents', {
  //       method: 'POST',
  //       body: formData,
  //     });
  //     if (!res.ok) throw new Error('Upload failed');

  //     await Swal.fire({
  //       icon: 'success',
  //       title: 'Saved',
  //       text: `${selectedFiles.length} document(s) and notes saved successfully`,
  //       timer: 2000,
  //       showConfirmButton: false,
  //     });

  //     // Clear after successful save
  //     selectedFiles = [];
  //     noteText = '';
  //   } catch (err: any) {
  //     Swal.fire('Error', err.message || 'Could not save documents', 'error');
  //   } finally {
  //     isSaving = false;
  //   }
  // }
  async function saveDocumentNote() {
  await Swal.fire({
    icon: 'info',
    title: 'Coming Soon 🚀',
    text: 'Document upload feature will be available in the next enhancement.',
    confirmButtonText: 'OK'
  });
}


  // ---------- DISCHARGE from OPD ----------
  async function dischargeFromOpd() {
    if (!selectedPatient?.opdId) return;
    const result = await Swal.fire({
      title: 'Discharge from OPD?',
      text: `Discharge ${selectedPatient.patientName || 'patient'} from current OPD visit.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, discharge',
      cancelButtonText: 'Cancel'
    });
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(
        `http://localhost:8081/api/opd/discharge/${selectedPatient.opdId}`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Discharge failed');
      }
      await Swal.fire({
        icon: 'success',
        title: 'Discharged',
        text: 'Patient has been removed from active OPD.',
        timer: 2000,
        showConfirmButton: false
      });
      closePatientDetail();
      loadOpdPatients();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Could not discharge patient'
      });
    }
  }

  // ---------- Font size controls ----------
  function increaseFontSize() {
    if (fontSize < maxFontSize) { fontSize += 1; saveFontSize(); }
  }
  function decreaseFontSize() {
    if (fontSize > minFontSize) { fontSize -= 1; saveFontSize(); }
  }
  function resetFontSize() {
    fontSize = 13; saveFontSize();
  }
  function saveFontSize() {
    if (browser) localStorage.setItem('patientTableFontSize', fontSize.toString());
  }

  // ---------- Export helpers ----------
  function getExportData() {
    const visibleColumns = columnOrder.filter(key => columns[key].visible);
    const headers = visibleColumns.map(key => columns[key].label);
    const rows = filtered.map(row => visibleColumns.map(key => {
      switch (key) {
        case 'opdId':      return `#${row.opdId}`;
        case 'name':       return row.title ? `${row.title} ${row.patientName}`.trim() : row.patientName;
        case 'gender':     return row.gender === 'M' ? 'Male' : row.gender === 'F' ? 'Female' : row.gender || '';
        case 'age':        return row.age || '';
        case 'city':       return row.city || '';
        case 'phone':      return row.phoneNumber || '';
        case 'visitDate':  return row.visitDate ? new Date(row.visitDate).toLocaleDateString() : '';
        case 'doctor':     return row.doctorName || '';
        case 'department': return row.department || '';
        case 'status':     return row.status || 'Active';
        default:           return '';
      }
    }));
    return { headers, rows, visibleColumns };
  }

  async function exportToExcel() {
    if (isExporting) return; isExporting = true;
    try {
      const { headers, rows } = getExportData();
      // @ts-ignore
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      // @ts-ignore
      const workbook = XLSX.utils.book_new();
      // @ts-ignore
      XLSX.utils.book_append_sheet(workbook, worksheet, 'OPD Patients');
      // @ts-ignore
      XLSX.writeFile(workbook, `OPD_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
      showExportMenu = false;
    } catch (error: any) {
      alert('Error exporting to Excel: ' + error.message);
    } finally { isExporting = false; }
  }

  function exportToCSV() {
    if (isExporting) return; isExporting = true;
    try {
      const { headers, rows } = getExportData();
      const csvRows = [
        headers.map(h => escapeCSV(h)).join(','),
        ...rows.map(row => row.map(cell => escapeCSV(cell.toString())).join(','))
      ];
      const csvContent = csvRows.join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `OPD_Export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showExportMenu = false;
    } catch (error: any) {
      alert('Error exporting to CSV: ' + error.message);
    } finally { isExporting = false; }
  }
  function escapeCSV(str: string): string {
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  // ---------- Enhanced search ----------
  function searchPatient(row: any, query: string): boolean {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    const searchFields = [
      row.opdId?.toString(), row.patientName, row.title,
      `${row.title || ''} ${row.patientName || ''}`.trim(),
      row.gender, row.gender === 'M' ? 'male' : row.gender === 'F' ? 'female' : '',
      row.age?.toString(), row.city, row.phoneNumber,
      row.visitDate ? new Date(row.visitDate).toLocaleDateString() : '',
      row.doctorName, row.department, row.status
    ];
    if (q.startsWith('#') && row.opdId?.toString()?.includes(q.substring(1))) return true;
    return searchFields.some(field => field && field.toString().toLowerCase().includes(q));
  }

  // ---------- Load OPD patients ----------
  async function loadOpdPatients() {
    loading = true; error = '';
    try {
      const res = await fetch('http://localhost:8081/api/opd/active');
      if (!res.ok) throw new Error('Failed to fetch OPD patients');
      data = await res.json();
    } catch (err) {
      error = 'Unable to load OPD patients';
      console.error(err);
    } finally { loading = false; }
  }

  // ---------- Lifecycle ----------
  onMount(() => {
    loadOpdPatients();
    if (browser) {
      try {
        const saved = localStorage.getItem('patientTableFontSize');
        if (saved) {
          const parsed = parseInt(saved);
          if (!isNaN(parsed) && parsed >= minFontSize && parsed <= maxFontSize) fontSize = parsed;
        }
      } catch (e) { console.warn('Could not load font size'); }
      // Load SheetJS for Excel export
      const script = document.createElement('script');
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
      document.head.appendChild(script);
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (showExportMenu && !target.closest('.three-line-wrapper') && !target.closest('.export-menu')) showExportMenu = false;
      if (showPatientDetail && !target.closest('.patient-modal-content') && !target.closest('.patient-name')) closePatientDetail();
      if (showOptionsMenu && !target.closest('.three-line-button') && !target.closest('.options-menu')) showOptionsMenu = false;
    }
    if (browser) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  });

  $: filtered = search.trim() === '' ? data : data.filter(row => searchPatient(row, search));
//<!----------------------------------------------- -->
function goToBilling(row: any) {
  // You can change the route as per your app
  goto(`/billing/${row.opdId}`);
}

</script>

<!-- ===================================================== -->
<!--  HTML – PROFESSIONAL MULTIPLE FILE UPLOAD + SEARCH    -->
<!-- ===================================================== -->
<div class="container">
  <!-- HEADER with enhanced search bar -->
  <div class="header">
    <div class="header-left">
      <div>
        <h1 class="page-title">OPD Patients</h1>
        {#if !loading && !error}
          <p class="patient-count">{filtered.length} {filtered.length === 1 ? 'patient' : 'patients'}</p>
          {#if search.trim()}
            <p class="search-result-info">Showing results for "{search}"</p>
          {/if}
        {/if}
      </div>
      <!-- SEARCH BAR – smooth focus effect -->
      <input
        type="text"
        placeholder="Search by name, visit ID, phone..."
        bind:value={search}
        class="search-box"
      />
    </div>

    <div class="header-actions">
      <!-- Font Size Tool -->
      <div class="font-size-tool">
        <button class="font-size-btn {fontSize === minFontSize ? 'disabled' : ''}" on:click={decreaseFontSize} title="Decrease font size" disabled={fontSize === minFontSize}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
        </button>
        <div class="font-size-display">
          <span class="font-size-value">{fontSize}px</span>
          <span class="font-size-label">Text Size</span>
        </div>
        <button class="font-size-btn {fontSize === maxFontSize ? 'disabled' : ''}" on:click={increaseFontSize} title="Increase font size" disabled={fontSize === maxFontSize}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        </button>
        <button class="font-size-reset" on:click={resetFontSize} title="Reset to default size">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        </button>
      </div>

      <!-- Three‑line Options Menu -->
      <div class="three-line-wrapper">
        <button class="three-line-button {showOptionsMenu ? 'active' : ''}" on:click={() => showOptionsMenu = !showOptionsMenu} title="More options">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="6" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="18" r="1"/></svg>
        </button>
        {#if showOptionsMenu}
          <div class="options-menu" on:click|stopPropagation>
            <div class="menu-header"><h4>Table Options</h4><p>Manage your view and data</p></div>
            <div class="menu-items">
              <button class="menu-item" on:click={() => { showOptionsMenu = false; openColumnMenu(); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                <span>Manage Columns</span>
              </button>
              <button class="menu-item" on:click={() => { showOptionsMenu = false; showExportMenu = true; }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                <span>Export Data</span>
              </button>
            </div>
          </div>
        {/if}
        <!-- Export Menu -->
        {#if showExportMenu}
          <div class="export-menu" on:click|stopPropagation>
            <div class="export-header"><h4>Export OPD Data</h4><p>Export {filtered.length} active patient{filtered.length !== 1 ? 's' : ''}</p></div>
            <div class="export-options">
              <button class="export-option" on:click={exportToExcel} disabled={isExporting}>
                <div class="export-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></div>
                <div class="export-info"><span class="export-type">Excel (.xlsx)</span><span class="export-desc">Spreadsheet with formatting</span></div>
              </button>
              <button class="export-option" on:click={exportToCSV} disabled={isExporting}>
                <div class="export-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></div>
                <div class="export-info"><span class="export-type">CSV (.csv)</span><span class="export-desc">Simple text format</span></div>
              </button>
            </div>
            <div class="export-footer">
              <span class="export-note">{columnOrder.filter(key => columns[key].visible).length} columns • {filtered.length} records</span>
              <button class="btn btn-outline btn-sm" on:click={() => showExportMenu = false}>Cancel</button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- ========== COLUMN MANAGEMENT MODAL ========== -->
  {#if showColumnModal}
    <div class="column-modal">
      <div class="modal-content">
        <div class="modal-header"><h3>Manage Columns</h3><p>Select which columns to display and drag to reorder</p></div>
        <div class="columns-list">
          {#each columnOrder as key, index}
            {#if tempColumns[key]}
              <div class="column-item {tempColumns[key].locked ? 'locked' : ''}" draggable={!tempColumns[key].locked}
                   on:dragstart={() => onDragStart(index, key)} on:dragover|preventDefault on:drop={() => onDrop(index)}>
                <div class="column-info">
                  <label class="custom-checkbox">
                    <input type="checkbox" bind:checked={tempColumns[key].visible} disabled={tempColumns[key].locked} />
                    <span class="checkmark"></span>
                  </label>
                  <span class="column-label">{tempColumns[key].label}</span>
                </div>
                <div class="column-status">
                  {#if tempColumns[key].locked}<span class="badge badge-locked">Locked</span>{:else}<span class="drag-handle">⋮⋮</span>{/if}
                </div>
              </div>
            {/if}
          {/each}
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" on:click={cancelColumns}>Cancel</button>
          <button class="btn btn-primary" on:click={applyColumns}>Save Changes</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- ========== PATIENT DETAIL MODAL – PROFESSIONAL UPLOAD ========== -->
  {#if showPatientDetail && selectedPatient}
    <div class="patient-modal">
      <div class="patient-modal-content compact-design" on:click|stopPropagation>
        <!-- Compact Square Header -->
        <div class="compact-header">
          <div class="compact-header-content">
            <div class="compact-avatar">
              <div class="avatar-initials">
                {#if selectedPatient.patientName}
                  {selectedPatient.patientName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                {:else}OP{/if}
              </div>
            </div>
            <div class="compact-patient-info">
              <div class="compact-name">
                {#if selectedPatient.title}{selectedPatient.title} {selectedPatient.patientName}{:else}{selectedPatient.patientName}{/if}
              </div>
              <div class="compact-details">
                <span class="compact-id">OPD ID: #{selectedPatient.opdId}</span>
                <span class="compact-gender">{selectedPatient.gender === 'M' ? 'Male' : selectedPatient.gender === 'F' ? 'Female' : selectedPatient.gender}</span>
                <span class="compact-age">{selectedPatient.age || '?'} years</span>
              </div>
            </div>
            <button class="compact-close" on:click={closePatientDetail}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <!-- Modal Body -->
        <div class="compact-body">
          <div class="info-sections">
            <!-- Visit Information -->
            <div class="info-section">
              <h4 class="section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                OPD Visit
              </h4>
              <div class="info-grid">
                <div class="info-item"><span class="info-label">Visit Date</span><span class="info-value">{new Date(selectedPatient.visitDate).toLocaleDateString()}</span></div>
                {#if selectedPatient.doctorName}<div class="info-item"><span class="info-label">Doctor</span><span class="info-value">{selectedPatient.doctorName}</span></div>{/if}
                {#if selectedPatient.department}<div class="info-item"><span class="info-label">Department</span><span class="info-value">{selectedPatient.department}</span></div>{/if}
                <div class="info-item"><span class="info-label">Status</span><span class="info-value" style="color: #10b981;">{selectedPatient.status || 'Active'}</span></div>
              </div>
            </div>

            <!-- Contact Information -->
            <div class="info-section">
              <h4 class="section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                Contact
              </h4>
              <div class="info-grid">
                <div class="info-item"><span class="info-label">Phone</span><span class="info-value">{selectedPatient.phoneNumber}</span></div>
                {#if selectedPatient.email}<div class="info-item"><span class="info-label">Email</span><span class="info-value">{selectedPatient.email}</span></div>{/if}
              </div>
            </div>

            <!-- Address -->
            <div class="info-section">
              <h4 class="section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                Address
              </h4>
              <div class="info-grid">
                <div class="info-item full-width"><span class="info-label">City</span><span class="info-value">{selectedPatient.city || 'Not specified'}</span></div>
              </div>
            </div>

            <!-- ========== PROFESSIONAL MULTIPLE DOCUMENT UPLOAD ========== -->
            <div class="info-section">
              <h4 class="section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Documents & Notes
              </h4>
              
              <!-- File input with validation -->
              <div class="upload-area">
                <label for="file-upload" class="file-upload-label">
                  <span>📎 Add files</span>
                  <input id="file-upload" type="file" multiple on:change={handleFileChange} />
                </label>
                {#if selectedFiles.length > 0}
                  <button class="btn btn-text" on:click={clearAllFiles} title="Remove all files">
                    🗑️ Clear all
                  </button>
                {/if}
                <span class="upload-hint">Max 10MB each. Allowed: Images, PDF, DOC, XLS</span>
              </div>

              <!-- File list with icons and remove buttons -->
              {#if selectedFiles.length > 0}
                <div class="file-list">
                  {#each selectedFiles as file, index}
                    <div class="file-item">
                      <span class="file-icon">{getFileIcon(file)}</span>
                      <span class="file-name" title={file.name}>
                        {file.name.length > 40 ? file.name.slice(0, 37) + '...' : file.name}
                      </span>
                      <span class="file-size">{formatFileSize(file.size)}</span>
                      <button class="file-remove" on:click={() => removeFile(index)} title="Remove file">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  {/each}
                </div>
              {/if}

              <!-- Description textarea -->
              <div class="description-area">
                <textarea bind:value={noteText} placeholder="Add notes or description... (optional)"></textarea>
              </div>

              <!-- Save button with loading state -->
              <div class="upload-actions">
                <button class="btn btn-primary" on:click={saveDocumentNote} disabled={isSaving || (selectedFiles.length === 0 && !noteText.trim())}>
                  {#if isSaving}
                    <span class="spinner-small"></span> Saving...
                  {:else}
                    💾 Save Documents & Notes
                  {/if}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer – Discharge -->
        <div class="compact-footer">
          <button class="btn btn-outline" on:click={closePatientDetail}>Close</button>
          <button class="btn" style="background:#ef4444;color:white;" on:click={dischargeFromOpd}>Discharge from OPD</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- ========== MAIN CONTENT ========== -->
  <div class="content-card">
    {#if loading}
      <div class="loading-state"><div class="loader"></div><p>Loading OPD patients...</p></div>
    {:else if error}
      <div class="error-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <p>{error}</p>
        <button class="btn btn-outline" on:click={loadOpdPatients}>Retry</button>
      </div>
    {:else if filtered.length === 0}
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <h3>No active OPD patients</h3>
        <p>{search ? `No results for "${search}"` : 'No patients currently in OPD'}</p>
        {#if search}<button class="btn btn-text" on:click={() => search = ''}>Clear search</button>{/if}
      </div>
    {:else}
      <div class="table-scroll-container" style="--table-font-size: {fontSize}px;">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                {#each columnOrder as key, index}
                  {#if columns[key].visible}
                    <th draggable={!columns[key].locked} class:locked={columns[key].locked}
                        on:dragstart={() => onDragStart(index, key)} on:dragover|preventDefault on:drop={() => onDrop(index)}>
                      <div class="th-content">{columns[key].label}{#if !columns[key].locked}<span class="drag-indicator">⋮</span>{/if}</div>
                    </th>
                  {/if}
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each filtered as row}
                <tr>
                  {#each columnOrder as key}
                    {#if columns[key].visible}
                      <td class="cell-{key}">
                        {#if key === 'opdId'}<span class="patient-id">#{row.opdId}</span>
                        {:else if key === 'name'}
                          <div class="patient-name clickable" on:click|stopPropagation={() => openPatientDetail(row)}>
                            <strong>{row.patientName}</strong>{#if row.title}<span class="title">{row.title}</span>{/if}
                            <svg class="name-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                          </div>
                        {:else if key === 'gender'}<span class="gender-badge {row.gender?.toLowerCase()}">{row.gender === 'M' ? 'Male' : row.gender === 'F' ? 'Female' : row.gender}</span>
                        {:else if key === 'age'}<span class="age-cell">{row.age ?? '—'}</span>
                        {:else if key === 'city'}<span class="city-cell">{row.city ?? '—'}</span>
                        {:else if key === 'phone'}<span class="phone-number">{row.phoneNumber}</span>
                        {:else if key === 'visitDate'}<span class="visit-date">{new Date(row.visitDate).toLocaleDateString()}</span>
                        {:else if key === 'doctor'}<span>{row.doctorName ?? '—'}</span>
                        {:else if key === 'department'}<span>{row.department ?? '—'}</span>
                        {:else if key === 'status'}<span class="status-badge active">{row.status || 'Active'}</span>
                        {:else if key === 'action'}<button class="btn btn-sm btn-primary" on:click={() => goToBilling(row)}>💳 Billing</button>

                        {/if}
                      </td>
                    {/if}
                  {/each}
                </tr>
              {/each} 
            </tbody>
          </table>
        </div>
        <div class="scroll-indicator">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>
          <span>Scroll to see more</span>
        </div>
      </div>
    {/if}
  </div>
</div>

