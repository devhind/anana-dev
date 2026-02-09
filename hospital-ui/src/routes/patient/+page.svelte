<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';

  let data: any[] = [];
  let loading = true;
  let error = '';
  let search = '';
  let showColumnMenu = false;
  let showExportMenu = false;
  let isExporting = false;
  
  // Font size settings
  let fontSize = 13;
  const minFontSize = 10;
  const maxFontSize = 18;

  let columns = {
    id: { label: 'ID', visible: true, locked: true },
    name: { label: 'Name', visible: true },
    phone: { label: 'Phone', visible: true },
    gender: { label: 'Gender', visible: true },
    age: { label: 'Age', visible: true },
    city: { label: 'City', visible: true },
    email: { label: 'Email', visible: false },
    bloodGroup: { label: 'Blood Group', visible: false },
    doctor: { label: 'Doctor', visible: false },
    occupation: { label: 'Occupation', visible: false },
    maritalStatus: { label: 'Marital Status', visible: false }
  };

  let tempColumns = structuredClone(columns);
  let columnOrder = [
    'id',
    'name',
    'phone',
    'gender',
    'age',
    'city',
    'email',
    'bloodGroup',
    'doctor',
    'occupation',
    'maritalStatus'
  ];
  let draggedIndex: number | null = null;

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

  function openColumnMenu() {
    tempColumns = structuredClone(columns);
    showColumnMenu = true;
  }

  function toggleExportMenu() {
    showExportMenu = !showExportMenu;
  }

  function closeExportMenu() {
    showExportMenu = false;
  }

  function applyColumns() {
    columns = structuredClone(tempColumns);
    showColumnMenu = false;
  }

  function cancelColumns() {
    showColumnMenu = false;
  }

  function increaseFontSize() {
    if (fontSize < maxFontSize) {
      fontSize += 1;
      saveFontSize();
    }
  }

  function decreaseFontSize() {
    if (fontSize > minFontSize) {
      fontSize -= 1;
      saveFontSize();
    }
  }

  function resetFontSize() {
    fontSize = 13;
    saveFontSize();
  }

  function saveFontSize() {
    if (browser) {
      try {
        localStorage.setItem('patientTableFontSize', fontSize.toString());
      } catch (e) {
        console.warn('Could not save font size:', e);
      }
    }
  }

  // Get data in export format
  function getExportData() {
    const visibleColumns = columnOrder.filter(key => columns[key].visible);
    const headers = visibleColumns.map(key => columns[key].label);
    
    const rows = filtered.map(row => {
      return visibleColumns.map(key => {
        const p = row.patient || {};
        const d = row.additionalDetails || {};
        
        switch (key) {
          case 'id':
            return `#${p.id}`;
          case 'name':
            return p.title ? `${p.title} ${p.patientName}`.trim() : p.patientName;
          case 'gender':
            return p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : p.gender || '';
          case 'age':
            return p.age || '';
          case 'city':
            return p.city || '';
          case 'phone':
            return p.phoneNumber || '';
          case 'email':
            return p.email || '';
          case 'bloodGroup':
            return d.bloodGroup || '';
          case 'doctor':
            return d.referringDoctor || '';
          case 'occupation':
            return d.occupation || '';
          case 'maritalStatus':
            return d.maritalStatus || '';
          default:
            return '';
        }
      });
    });
    
    return { headers, rows, visibleColumns };
  }

  // Export to Excel (XLSX)
  async function exportToExcel() {
    if (isExporting) return;
    isExporting = true;
    
    try {
      const { headers, rows } = getExportData();
      
      // Create worksheet
      const worksheetData = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Auto-size columns
      const colWidths = headers.map((_, colIndex) => {
        const maxLength = Math.max(
          ...worksheetData.map(row => (row[colIndex] || '').toString().length),
          headers[colIndex].length
        );
        return { wch: Math.min(maxLength + 2, 50) };
      });
      worksheet['!cols'] = colWidths;
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Patients');
      
      // Generate file
      const fileName = `Patients_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      closeExportMenu();
    } catch (error) {
      alert('Error exporting to Excel: ' + error.message);
      console.error('Excel export error:', error);
    } finally {
      isExporting = false;
    }
  }

  // Export to CSV
  function exportToCSV() {
    if (isExporting) return;
    isExporting = true;
    
    try {
      const { headers, rows } = getExportData();
      
      // Convert to CSV with proper escaping
      const csvRows = [];
      
      // Add headers
      csvRows.push(headers.map(header => escapeCSV(header)).join(','));
      
      // Add data rows
      rows.forEach(row => {
        csvRows.push(row.map(cell => escapeCSV(cell.toString())).join(','));
      });
      
      // Create and download file
      const csvContent = csvRows.join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Patients_Export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      closeExportMenu();
    } catch (error) {
      alert('Error exporting to CSV: ' + error.message);
      console.error('CSV export error:', error);
    } finally {
      isExporting = false;
    }
  }

  // Helper functions
  function escapeCSV(str: string): string {
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function escapeHTML(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Enhanced search function
  function searchPatient(row: any, query: string): boolean {
    if (!query.trim()) return true;
    
    const p = row.patient || {};
    const d = row.additionalDetails || {};
    const q = query.toLowerCase().trim();
    
    // Define all searchable fields with their values
    const searchFields = [
      // Patient fields
      p.id?.toString(),
      p.patientName,
      p.title,
      `${p.title || ''} ${p.patientName || ''}`.trim(), // Full name with title
      p.gender,
      p.gender === 'M' ? 'male' : p.gender === 'F' ? 'female' : '',
      p.age?.toString(),
      p.city,
      p.phoneNumber,
      p.email,
      p.address,
      p.state,
      p.country,
      p.pincode,
      p.emergencyContact,
      p.alternatePhone,
      
      // Additional details fields
      d.bloodGroup,
      d.referringDoctor,
      d.occupation,
      d.maritalStatus,
      d.insuranceProvider,
      d.insuranceNumber,
      d.allergies,
      d.medicalHistory,
      d.familyHistory,
      d.notes
    ];
    
    // Special handling for ID search (search with or without #)
    if (q.startsWith('#') && p.id?.toString()?.includes(q.substring(1))) {
      return true;
    }
    
    // Search through all fields
    return searchFields.some(field => {
      if (!field) return false;
      return field.toString().toLowerCase().includes(q);
    });
  }

  async function loadPatients() {
    try {
      const res = await fetch('http://localhost:8081/api/patients/with-details');
      if (!res.ok) throw new Error('Failed to fetch patients');
      data = await res.json();
    } catch {
      error = 'Unable to load patients';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadPatients();
    
    // Load saved font size
    if (browser) {
      try {
        const savedFontSize = localStorage.getItem('patientTableFontSize');
        if (savedFontSize) {
          const parsed = parseInt(savedFontSize);
          if (!isNaN(parsed) && parsed >= minFontSize && parsed <= maxFontSize) {
            fontSize = parsed;
          }
        }
      } catch (e) {
        console.warn('Could not load font size:', e);
      }
    }

    // Load SheetJS library for Excel export
    if (browser) {
      const script = document.createElement('script');
      script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js';
      script.onload = () => console.log('SheetJS loaded successfully');
      script.onerror = () => console.error('Failed to load SheetJS');
      document.head.appendChild(script);
    }

    // Close export menu when clicking outside
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (showExportMenu && !target.closest('.export-tool')) {
        closeExportMenu();
      }
    }
    
    if (browser) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  });

  $: filtered = search.trim() === '' 
    ? data 
    : data.filter(row => searchPatient(row, search));
</script>

<div class="container">
  <!-- HEADER -->
  <div class="header">
    <div>
      <h1 class="page-title">Registered Patients</h1>
      {#if !loading && !error}
        <p class="patient-count">{filtered.length} {filtered.length === 1 ? 'patient' : 'patients'}</p>
      {/if}
    </div>
    
    <div class="header-actions">
      <!-- Enhanced Search Container -->
      <button class="btn btn-secondary" on:click={() => goto('/custom-field')}>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
      d="M4 6h16M4 12h16M4 18h16" />
  </svg>
  Custom Fields
</button>

      <div class="search-container">
        <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          class="search-input"
          placeholder="Search by name, phone, ID (#), city, doctor, blood group, occupation..."
          bind:value={search}
        />
        {#if search}
          <button class="clear-search" on:click={() => search = ''} title="Clear search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        {/if}
        <div class="search-hint">
          Search across all patient fields
        </div>
      </div>
      
      <!-- Font Size Tool -->
      <div class="font-size-tool">
        <button 
          class="font-size-btn {fontSize === minFontSize ? 'disabled' : ''}" 
          on:click={decreaseFontSize}
          title="Decrease font size"
          disabled={fontSize === minFontSize}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
          </svg>
        </button>
        
        <div class="font-size-display">
          <span class="font-size-value">{fontSize}px</span>
          <span class="font-size-label">Text Size</span>
        </div>
        
        <button 
          class="font-size-btn {fontSize === maxFontSize ? 'disabled' : ''}" 
          on:click={increaseFontSize}
          title="Increase font size"
          disabled={fontSize === maxFontSize}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
        </button>
        
        <button 
          class="font-size-reset" 
          on:click={resetFontSize}
          title="Reset to default size"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>
      </div>
      
      <!-- Export Tool -->
      <div class="export-tool">
        <button class="btn btn-export {isExporting ? 'exporting' : ''}" on:click={toggleExportMenu} disabled={isExporting}>
          {#if isExporting}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="spinner">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Exporting...
          {:else}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Export
          {/if}
        </button>
        
        {#if showExportMenu && !isExporting}
          <div class="export-menu">
            <div class="export-menu-header">
              <h4>Export Patient Data</h4>
              <p>Export {filtered.length} patient{filtered.length !== 1 ? 's' : ''} in current view</p>
            </div>
            <div class="export-options">
              <button class="export-option" on:click={exportToExcel}>
                <div class="export-icon excel">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
                <div class="export-info">
                  <span class="export-type">Excel (.xlsx)</span>
                  <span class="export-desc">Spreadsheet with formatting</span>
                </div>
              </button>
              
              <button class="export-option" on:click={exportToCSV}>
                <div class="export-icon csv">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div class="export-info">
                  <span class="export-type">CSV (.csv)</span>
                  <span class="export-desc">Simple text format</span>
                </div>
              </button>
            </div>
            <div class="export-footer">
              <span class="export-note">Includes {columnOrder.filter(key => columns[key].visible).length} columns • {filtered.length} records</span>
            </div>
          </div>
        {/if}
      </div>
      
      <button class="btn btn-secondary" on:click={openColumnMenu}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m0 0v2m0 6v2m0-6a2 2 0 100 4m0-4a2 2 0 110 4m6 4a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
        </svg>
        Columns
      </button>
      
      <button class="btn btn-primary" on:click={() => goto('/add-patient')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Add Patient
      </button>
    </div>
  </div>

  <!-- COLUMN MENU -->
  {#if showColumnMenu}
    <div class="column-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Manage Columns</h3>
          <p>Select which columns to display and drag to reorder</p>
        </div>
        
        <div class="columns-list">
          {#each columnOrder as key, index}
            {#if tempColumns[key]}
              <div class="column-item {tempColumns[key].locked ? 'locked' : ''}"
                   draggable={!tempColumns[key].locked}
                   on:dragstart={() => onDragStart(index, key)}
                   on:dragover|preventDefault
                   on:drop={() => onDrop(index)}>
                <div class="column-info">
                  <label class="custom-checkbox">
                    <input type="checkbox" bind:checked={tempColumns[key].visible} disabled={tempColumns[key].locked} />
                    <span class="checkmark"></span>
                  </label>
                  <span class="column-label">{tempColumns[key].label}</span>
                </div>
                
                <div class="column-status">
                  {#if tempColumns[key].locked}
                    <span class="badge badge-locked">Locked</span>
                  {:else}
                    <span class="drag-handle">⋮⋮</span>
                  {/if}
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

  <!-- MAIN CONTENT -->
  <div class="content-card">
    {#if loading}
      <div class="loading-state">
        <div class="loader"></div>
        <p>Loading patient data...</p>
      </div>
    {:else if error}
      <div class="error-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p>{error}</p>
        <button class="btn btn-outline" on:click={loadPatients}>Retry</button>
      </div>
    {:else if filtered.length === 0}
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <h3>No patients found</h3>
        <p>{search ? `No results for "${search}"` : 'Get started by adding your first patient'}</p>
        {#if search}
          <button class="btn btn-text" on:click={() => search = ''}>Clear search</button>
        {:else}
          <button class="btn btn-primary" on:click={() => goto('/add-patient')}>Add Patient</button>
        {/if}
      </div>
    {:else}
      <div class="table-scroll-container" style="--table-font-size: {fontSize}px;">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                {#each columnOrder as key, index}
                  {#if columns[key].visible}
                    <th draggable={!columns[key].locked}
                        class:locked={columns[key].locked}
                        on:dragstart={() => onDragStart(index, key)}
                        on:dragover|preventDefault
                        on:drop={() => onDrop(index)}>
                      <div class="th-content">
                        {columns[key].label}
                        {#if !columns[key].locked}
                          <span class="drag-indicator">⋮</span>
                        {/if}
                      </div>
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
                        {#if key === 'id'}
                          <span class="patient-id">#{row.patient.id}</span>
                        {:else if key === 'name'}
                          <div class="patient-name">
                            <strong>{row.patient.patientName}</strong>
                            {#if row.patient.title}
                              <span class="title">{row.patient.title}</span>
                            {/if}
                          </div>
                        {:else if key === 'gender'}
                          <span class="gender-badge {row.patient.gender?.toLowerCase()}">
                            {row.patient.gender === 'M' ? 'Male' : row.patient.gender === 'F' ? 'Female' : row.patient.gender}
                          </span>
                        {:else if key === 'age'}
                          <span class="age-cell">{row.patient.age ?? '—'}</span>
                        {:else if key === 'city'}
                          <span class="city-cell">{row.patient.city ?? '—'}</span>
                        {:else if key === 'phone'}
                          <span class="phone-number">{row.patient.phoneNumber}</span>
                        {:else if key === 'email'}
                          <span class="email">{row.patient.email ?? '—'}</span>
                        {:else if key === 'bloodGroup'}
                          <span class="blood-group">{row.additionalDetails?.bloodGroup ?? '—'}</span>
                        {:else if key === 'doctor'}
                          <span class="doctor-cell">{row.additionalDetails?.referringDoctor ?? '—'}</span>
                        {:else if key === 'occupation'}
                          <span class="occupation-cell">{row.additionalDetails?.occupation ?? '—'}</span>
                        {:else if key === 'maritalStatus'}
                          <span class="marital-cell">{row.additionalDetails?.maritalStatus ?? '—'}</span>
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
          </svg>
          <span>Scroll to see more</span>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .container {
    padding: 24px;
    max-width: 1400px;
    margin: 0 auto;
    background: #f8fafc;
    min-height: 100vh;
  }

  /* HEADER */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
  }

  .page-title {
    font-size: 24px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 6px;
  }

  .patient-count {
    color: #64748b;
    font-size: 13px;
    font-weight: 500;
  }

  .header-actions {
    display: flex;
    gap: 12px;
    align-items: center;
    position: relative;
  }

  /* ENHANCED SEARCH CONTAINER */
  .search-container {
    position: relative;
    width: 320px;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    z-index: 2;
  }

  .search-input {
    width: 100%;
    padding: 10px 40px 10px 40px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 13px;
    background: white;
    transition: all 0.2s;
    position: relative;
    z-index: 1;
  }

  .search-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    padding-right: 40px;
  }

  .clear-search {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    transition: all 0.2s;
  }

  .clear-search:hover {
    background: #f1f5f9;
    color: #64748b;
  }

  .search-hint {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    font-size: 11px;
    color: #64748b;
    padding: 4px 12px;
    background: #f8fafc;
    border-radius: 0 0 6px 6px;
    border: 1px solid #e2e8f0;
    border-top: none;
    opacity: 0;
    transform: translateY(-5px);
    transition: all 0.2s;
    pointer-events: none;
    z-index: 0;
  }

  .search-input:focus ~ .search-hint {
    opacity: 1;
    transform: translateY(0);
  }

  /* FONT SIZE TOOL */
  .font-size-tool {
    display: flex;
    align-items: center;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 4px;
    height: 40px;
  }

  .font-size-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    color: #475569;
  }

  .font-size-btn:hover:not(.disabled) {
    background: #f8fafc;
    border-color: #cbd5e1;
  }

  .font-size-btn.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .font-size-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 70px;
    padding: 0 8px;
    font-family: 'SF Mono', Monaco, 'Cascadia Mono', monospace;
  }

  .font-size-value {
    font-size: 13px;
    font-weight: 600;
    color: #1e293b;
    line-height: 1.2;
  }

  .font-size-label {
    font-size: 10px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    line-height: 1.2;
  }

  .font-size-reset {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    margin-left: 4px;
    cursor: pointer;
    transition: all 0.2s;
    color: #475569;
  }

  .font-size-reset:hover {
    background: #e2e8f0;
    border-color: #cbd5e1;
  }

  /* EXPORT TOOL */
  .export-tool {
    position: relative;
  }

  .btn-export {
    background: white;
    color: #475569;
    border: 1px solid #e2e8f0;
    position: relative;
  }

  .btn-export:hover:not(:disabled) {
    background: #f8fafc;
    border-color: #cbd5e1;
  }

  .btn-export.exporting {
    opacity: 0.7;
    cursor: wait;
  }

  .btn-export.exporting .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .export-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 8px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
    width: 300px;
    z-index: 100;
    animation: slideDown 0.2s ease;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .export-menu-header {
    padding: 20px;
    border-bottom: 1px solid #f1f5f9;
  }

  .export-menu-header h4 {
    margin: 0 0 4px 0;
    font-size: 16px;
    color: #1e293b;
    font-weight: 600;
  }

  .export-menu-header p {
    margin: 0;
    font-size: 13px;
    color: #64748b;
  }

  .export-options {
    padding: 12px;
  }

  .export-option {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px;
    border: none;
    background: white;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .export-option:hover {
    background: #f8fafc;
    transform: translateY(-1px);
  }

  .export-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
  }

  .export-icon.excel {
    background: #ecfdf5;
    color: #10b981;
  }

  .export-icon.csv {
    background: #eff6ff;
    color: #3b82f6;
  }

  .export-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .export-type {
    font-size: 14px;
    font-weight: 500;
    color: #1e293b;
  }

  .export-desc {
    font-size: 12px;
    color: #64748b;
  }

  .export-footer {
    padding: 12px 20px;
    border-top: 1px solid #f1f5f9;
    background: #f8fafc;
    border-radius: 0 0 12px 12px;
  }

  .export-note {
    font-size: 12px;
    color: #64748b;
    display: block;
    text-align: center;
  }

  /* BUTTONS */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
  }

  .btn-secondary {
    background: white;
    color: #475569;
    border: 1px solid #e2e8f0;
  }

  .btn-secondary:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }

  .btn-outline {
    background: transparent;
    color: #475569;
    border: 1px solid #cbd5e1;
  }

  .btn-outline:hover {
    background: #f8fafc;
  }

  .btn-text {
    background: transparent;
    color: #3b82f6;
    padding: 6px 12px;
    font-size: 12px;
  }

  .btn-text:hover {
    background: #eff6ff;
  }

  /* COLUMN MODAL */
  .column-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 460px;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  }

  .modal-header {
    padding: 20px;
    border-bottom: 1px solid #f1f5f9;
  }

  .modal-header h3 {
    font-size: 16px;
    color: #1e293b;
    margin-bottom: 4px;
  }

  .modal-header p {
    font-size: 13px;
    color: #64748b;
  }

  .columns-list {
    padding: 16px 20px;
    overflow-y: auto;
    flex: 1;
  }

  .column-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #f8fafc;
    cursor: move;
  }

  .column-item:hover {
    background: #f8fafc;
    margin: 0 -20px;
    padding: 10px 20px;
  }

  .column-item.locked {
    cursor: not-allowed;
    opacity: 0.7;
  }

  .column-info {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .custom-checkbox {
    position: relative;
    display: inline-block;
  }

  .custom-checkbox input {
    opacity: 0;
    position: absolute;
  }

  .checkmark {
    width: 16px;
    height: 16px;
    border: 2px solid #cbd5e1;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .custom-checkbox input:checked + .checkmark {
    background: #3b82f6;
    border-color: #3b82f6;
  }

  .checkmark:after {
    content: '✓';
    color: white;
    font-size: 11px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .custom-checkbox input:checked + .checkmark:after {
    opacity: 1;
  }

  .column-label {
    font-size: 13px;
    color: #334155;
  }

  .column-status {
    display: flex;
    align-items: center;
  }

  .badge {
    padding: 3px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 500;
  }

  .badge-locked {
    background: #fef2f2;
    color: #dc2626;
  }

  .drag-handle {
    color: #94a3b8;
    font-size: 14px;
    cursor: grab;
    user-select: none;
  }

  .modal-footer {
    padding: 16px 20px;
    border-top: 1px solid #f1f5f9;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    background: #f8fafc;
    border-radius: 0 0 12px 12px;
  }

  /* CONTENT CARD */
  .content-card {
    background: white;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }

  /* TABLE SCROLL CONTAINER */
  .table-scroll-container {
    position: relative;
    --table-font-size: 13px;
  }

  .table-wrapper {
    max-height: 500px;
    overflow-y: auto;
    overflow-x: auto;
  }

  /* Custom scrollbar styling */
  .table-wrapper::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .table-wrapper::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }

  .table-wrapper::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }

  .table-wrapper::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  /* DYNAMIC FONT SIZE TABLE */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--table-font-size, 13px);
    min-width: 1000px;
  }

  thead {
    position: sticky;
    top: 0;
    background: white;
    z-index: 10;
  }

  th {
    padding: calc(var(--table-font-size, 13px) * 0.92) calc(var(--table-font-size, 13px) * 1.23);
    text-align: left;
    font-weight: 600;
    color: #475569;
    border-bottom: 2px solid #e2e8f0;
    user-select: none;
    position: relative;
    white-space: nowrap;
    font-size: calc(var(--table-font-size, 13px) * 0.92);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  th:not(.locked):hover {
    background: #f8fafc;
  }

  .th-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .drag-indicator {
    color: #94a3b8;
    font-size: calc(var(--table-font-size, 13px) * 1.23);
    cursor: grab;
    opacity: 0.5;
    transition: opacity 0.2s;
  }

  th:not(.locked):hover .drag-indicator {
    opacity: 1;
  }

  /* TABLE ROWS WITH DYNAMIC FONT SIZE */
  td {
    padding: calc(var(--table-font-size, 13px) * 0.92) calc(var(--table-font-size, 13px) * 1.23);
    border-bottom: 1px solid #f1f5f9;
    color: #475569;
    vertical-align: top;
    line-height: 1.4;
  }

  tbody tr {
    transition: background 0.2s ease;
  }

  tbody tr:hover {
    background: #f8fafc;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  /* CELL STYLES - SCALING WITH FONT SIZE */
  .patient-id {
    background: #eff6ff;
    color: #1d4ed8;
    padding: calc(var(--table-font-size, 13px) * 0.23) calc(var(--table-font-size, 13px) * 0.62);
    border-radius: 12px;
    font-size: calc(var(--table-font-size, 13px) * 0.85);
    font-weight: 500;
    display: inline-block;
  }

  .patient-name {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 150px;
  }

  .patient-name strong {
    color: #1e293b;
    font-weight: 500;
    font-size: var(--table-font-size, 13px);
    line-height: 1.3;
  }

  .patient-name .title {
    font-size: calc(var(--table-font-size, 13px) * 0.85);
    color: #94a3b8;
    font-weight: normal;
  }

  .gender-badge {
    display: inline-block;
    padding: calc(var(--table-font-size, 13px) * 0.23) calc(var(--table-font-size, 13px) * 0.62);
    border-radius: 12px;
    font-size: calc(var(--table-font-size, 13px) * 0.85);
    font-weight: 500;
  }

  .gender-badge.male {
    background: #dbeafe;
    color: #1e40af;
  }

  .gender-badge.female {
    background: #fce7f3;
    color: #9d174d;
  }

  .phone-number {
    font-family: 'SF Mono', Monaco, 'Cascadia Mono', monospace;
    font-size: calc(var(--table-font-size, 13px) * 0.92);
    color: #475569;
  }

  .email {
    color: #3b82f6;
    font-size: calc(var(--table-font-size, 13px) * 0.92);
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px;
    display: inline-block;
  }

  .age-cell, .city-cell, .doctor-cell, .occupation-cell, .marital-cell {
    font-size: calc(var(--table-font-size, 13px) * 0.92);
  }

  .blood-group {
    font-weight: 500;
    color: #dc2626;
    font-size: calc(var(--table-font-size, 13px) * 0.92);
  }

  /* SCROLL INDICATOR */
  .scroll-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: calc(var(--table-font-size, 13px) * 0.77);
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    color: #64748b;
    font-size: calc(var(--table-font-size, 13px) * 0.92);
  }

  .scroll-indicator svg {
    color: #94a3b8;
    animation: bounce 2s infinite;
  }

  /* STATES */
  .loading-state, .error-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 40px;
    text-align: center;
  }

  .loader {
    width: 32px;
    height: 32px;
    border: 3px solid #e2e8f0;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  .error-state svg, .empty-state svg {
    color: #94a3b8;
    margin-bottom: 16px;
  }

  .error-state h3, .empty-state h3 {
    color: #1e293b;
    margin-bottom: 8px;
    font-size: 16px;
  }

  .error-state p, .empty-state p {
    color: #64748b;
    margin-bottom: 16px;
    font-size: 13px;
  }

  /* ANIMATIONS */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
    40% {transform: translateY(-5px);}
    60% {transform: translateY(-3px);}
  }

  /* RESPONSIVE */
  @media (max-width: 1024px) {
    .container {
      padding: 20px;
    }
    
    .header {
      flex-direction: column;
      gap: 16px;
    }
    
    .header-actions {
      width: 100%;
      flex-wrap: wrap;
    }
    
    .search-container {
      flex: 1;
      min-width: 200px;
    }
    
    .font-size-tool {
      order: -1;
      width: 100%;
      justify-content: center;
      margin-bottom: 8px;
    }
    
    .export-tool {
      width: 100%;
      display: flex;
      justify-content: center;
    }
    
    .export-menu {
      left: 50%;
      right: auto;
      transform: translateX(-50%);
    }
  }

  @media (max-width: 768px) {
    .modal-content {
      width: 95%;
      margin: 20px;
    }
    
    .header-actions {
      flex-direction: column;
      align-items: stretch;
    }
    
    .search-container {
      width: 100%;
    }
    
    .table-wrapper {
      max-height: 400px;
    }
    
    .font-size-tool {
      justify-content: space-between;
    }
    
    .export-menu {
      width: 280px;
    }
    
    .search-hint {
      display: none;
    }
  }
</style>