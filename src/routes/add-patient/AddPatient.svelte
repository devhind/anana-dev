<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import '$lib/AddPatient.css';
  
  // Reactive state
  let patientName = '';
  let phoneNumber = '';
  let gender: 'M' | 'F' | 'Other' = 'M';
  let age = '';
  let ageUnit = 'years';
  let dob = '';
  let city = '';
  let language = 'English';
  let pinCode = '';
  let address = '';
  let title = 'Mr';
  
  // Additional details
  let maritalStatus = 'Marital Status';
  let anniversaryDate = '';
  let bloodGroup = 'Blood Group';
  let spouseName = '';
  let spouseBloodGroup = 'Spouse Blood Group';
  let referringDoctor = '';
  let speciality = 'Speciality';
  let patientId = '';
  let email = '';
  let channel = '';
  let c_o = '';
  let occupation = '';
  let tag = '';
  let alternateMobile = '';
  let aadharNumber = '';
  
  // UI state
  let showExtraSection = false;
  let cameraActive = false;
  let showVideo = false;
  let showPreview = false;
  let previewImage = '';
  let notification = {
    show: false,
    message: '',
    type: 'success'
  };
  let formStatus = 1; // 1: Basic, 2: Additional, 3: Review
  
  // Camera variables
  let stream: MediaStream | null = null;
  let videoElement: HTMLVideoElement;
  let previewElement: HTMLImageElement;
  let fileInput: HTMLInputElement;
  
  // Titles for dropdown
  const titles = ['Mr', 'Mrs', 'Ms', 'Dr', 'Baby', 'Master'];
  const languages = ['English', 'Hindi', 'Gujarati', 'Marathi', 'Other'];
  const maritalStatuses = ['Marital Status', 'Single', 'Married', 'Divorced', 'Widowed'];
  const bloodGroups = [
    'Blood Group', 'A +ve', 'B +ve', 'O +ve', 'AB +ve',
    'A -ve', 'B -ve', 'O -ve', 'AB -ve'
  ];
  const specialities = ['Speciality', 'Cardiologist', 'Dermatologist', 'Gynecologist', 'Pediatrician', 'Orthopedic'];
  
  // Gender options
  const genderOptions = [
    { value: 'M', icon: 'mars', text: 'Male', color: '#3b82f6' },
    { value: 'F', icon: 'venus', text: 'Female', color: '#ec4899' },
    { value: 'Other', icon: 'transgender-alt', text: 'Other', color: '#8b5cf6' }
  ];
  
  // Age units
  const ageUnits = ['years', 'months', 'weeks', 'days'];
  
  // Handle gender selection
  function selectGender(value: 'M' | 'F' | 'Other') {
    gender = value;
  }
  
  // Toggle extra section
  function toggleExtraSection() {
    showExtraSection = !showExtraSection;
    if (showExtraSection) {
      formStatus = 2;
    }
  }
  
  // Handle age/DOB sync
  function handleDobChange() {
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      
      if (calculatedAge > 0) {
        age = calculatedAge.toString();
        ageUnit = 'years';
      }
    }
  }
  
  function handleAgeChange() {
    if (age && ageUnit === 'years') {
      const today = new Date();
      const birthYear = today.getFullYear() - parseInt(age);
      const calculatedDob = new Date(birthYear, today.getMonth(), today.getDate());
      dob = calculatedDob.toISOString().split('T')[0];
    }
  }
  
  // Camera functions
  async function startCamera() {
    try {
      if (stream) {
        stopCamera();
      }
      
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      cameraActive = true;
      showVideo = true;
      showPreview = false;
      
      if (videoElement) {
        videoElement.srcObject = stream;
      }
      
      showNotification("Camera started", "success");
    } catch (error) {
      console.error("Error accessing camera:", error);
      showNotification("Unable to access camera", "error");
    }
  }
  
  function capturePhoto() {
    if (!stream || !videoElement) {
      showNotification("Please start camera first", "warning");
      return;
    }
    
    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      ctx.drawImage(videoElement, 0, 0);
      previewImage = canvas.toDataURL("image/jpeg", 0.9);
      showPreview = true;
      showVideo = false;
      
      stopCamera();
      showNotification("Photo captured", "success");
    }
  }
  
  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    cameraActive = false;
  }
  
  function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const reader = new FileReader();
      reader.onload = function(e) {
        previewImage = e.target?.result as string;
        showPreview = true;
        showVideo = false;
        stopCamera();
        showNotification("Photo uploaded", "success");
      };
      reader.readAsDataURL(target.files[0]);
    }
  }
  
  async function handleAction(type: 'Rx' | 'Bill' | 'Appointment') {

  // 1️⃣ Validate required fields
  if (!patientName || !phoneNumber || (!age && !dob)) {
    showNotification("Please fill all required fields", "error");
    return;
  }

  // 2️⃣ Prepare payload (MATCHES Patient.java)
  // 2️⃣ Prepare payload (MATCHES PatientRequest DTO)
const payload = {
  patient: {
    title,
    patientName,
    phoneNumber,
    gender,
    age: age ? Number(age) : null,
    dob,
    city,
    language,
    pinCode,
    address,
    email
  },

  additionalDetails: {
  maritalStatus: maritalStatus !== 'Marital Status' ? maritalStatus : null,
  anniversaryDate: anniversaryDate ? anniversaryDate : null,
  bloodGroup: bloodGroup !== 'Blood Group' ? bloodGroup : null,
  spouseName: spouseName || null,
  spouseBloodGroup:
    spouseBloodGroup !== 'Spouse Blood Group' ? spouseBloodGroup : null,
  referringDoctor: referringDoctor || null,
  speciality: speciality !== 'Speciality' ? speciality : null,
  channel: channel || null,
  co: c_o || null,
  occupation: occupation || null,
  tag: tag || null,
  alternateMobile: alternateMobile || null,
  aadharNumber: aadharNumber || null
}

};


  try {
    // 3️⃣ Send data to Spring Boot WebFlux backend
    const res = await fetch('http://localhost:8081/api/patients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error('Failed to save patient');
    }

    // 4️⃣ Success UI update
    formStatus = 3;
    showNotification(`Patient saved successfully`, "success");

    // 5️⃣ Optional reset
    setTimeout(() => {
      resetForm();
      showNotification(`${type} created for new patient`, "info");
    }, 1500);

  } catch (error) {
    console.error(error);
    showNotification("Backend error while saving patient", "error");
  }
}

  
  function closeForm() {
    if (confirm('Are you sure you want to close? Any unsaved changes will be lost.')) {
      resetForm();
      showNotification('Form closed', 'info');
    }
  }
  
  function resetForm() {
    patientName = '';
    phoneNumber = '';
    gender = 'M';
    age = '';
    ageUnit = 'years';
    dob = new Date().toISOString().split('T')[0];
    city = '';
    language = 'English';
    pinCode = '';
    address = '';
    title = 'Mr';
    
    // Reset additional details
    maritalStatus = 'Marital Status';
    anniversaryDate = '';
    bloodGroup = 'Blood Group';
    spouseName = '';
    spouseBloodGroup = 'Spouse Blood Group';
    referringDoctor = '';
    speciality = 'Speciality';
    patientId = '';
    email = '';
    channel = '';
    c_o = '';
    occupation = '';
    tag = '';
    alternateMobile = '';
    aadharNumber = '';
    
    // Reset UI
    showExtraSection = false;
    showVideo = false;
    showPreview = false;
    previewImage = '';
    cameraActive = false;
    formStatus = 1;
    
    stopCamera();
  }
  
  // Notification system
  function showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning') {
    notification = {
      show: true,
      message,
      type
    };
    
    setTimeout(() => {
      notification.show = false;
    }, 3000);
  }
  
  // Initialize date
  onMount(() => {
    dob = new Date().toISOString().split('T')[0];
  });
  
  // Cleanup camera on destroy
  onDestroy(() => {
    stopCamera();
  });
</script>

<div class="modal">
  <!-- ================= PROFESSIONAL HEADER ================= -->
  <div class="modal-header">
    <div class="header-left">
      <div class="header-icon">
        <i class="fas fa-user-plus"></i>
      </div>
      <div>
        <h2>Add New Patient</h2>
        <div class="header-subtitle">Patient Registration Form</div>
      </div>
    </div>
    
    <div class="header-actions">
      <div class="header-badge">
        <i class="fas fa-circle"></i>
        New Registration
      </div>
      <button class="close-btn" title="Close" on:click={closeForm}>
        <i class="fas fa-times"></i>
      </button>
    </div>
  </div>

  <!-- ================= FORM STATUS ================= -->
  <div class="modal-content">
    <div class="form-status">
      <div class="status-item {formStatus >= 1 ? 'active' : ''}">
        <span class="status-circle"></span>
        Basic Information
      </div>
      <div class="status-item {formStatus >= 2 ? 'active' : ''}">
        <span class="status-circle"></span>
        Additional Details
      </div>
      <div class="status-item {formStatus >= 3 ? 'active' : ''}">
        <span class="status-circle"></span>
        Review & Submit
      </div>
    </div>

    <form id="patientForm">
      <div class="form-grid">
        <!-- Name Field -->
        <div class="form-group">
          <label class="required">Patient Name</label>
          <div class="name-group">
            <select bind:value={title}>
              {#each titles as t}
                <option>{t}</option>
              {/each}
            </select>
            <input placeholder="Enter Name" required bind:value={patientName}>
          </div>
        </div>

        <!-- Phone Field -->
        <div class="form-group">
          <label class="required">Phone Number</label>
          <input type="tel" placeholder="Enter Number" required bind:value={phoneNumber}>
        </div>

        <!-- Gender Field -->
        <div class="form-group">
          <div class="gender-label">
            <span class="required">Gender</span>
            <i class="fas fa-info-circle info-icon" title="Select patient's gender"></i>
          </div>
          <div class="gender-container">
            {#each genderOptions as option}
              <button 
                type="button" 
                class="gender-option {gender === option.value ? 'active' : ''}" 
                on:click={() => selectGender(option.value)}
              >
                <i class="fas fa-{option.icon} gender-icon" style="color: {option.color};"></i>
                <span class="gender-text">{option.text}</span>
              </button>
            {/each}
          </div>
          <input type="hidden" id="gender" name="gender" value={gender} required>
        </div>

        <!-- Age/DOB Field -->
        <div class="form-group">
          <div class="age-label">
            <span class="required">Age or DOB</span>
            <i class="fas fa-info-circle info-icon" title="Enter age or select date of birth"></i>
          </div>
          <div class="age-dob-container">
            <div class="age-input-group">
              <input 
                type="number" 
                class="age-number" 
                placeholder="Age" 
                min="0" 
                max="120" 
                bind:value={age}
                on:input={handleAgeChange}
              >
              <select class="age-unit-select" bind:value={ageUnit} on:change={() => { age = ''; dob = ''; }}>
                {#each ageUnits as unit}
                  <option value={unit}>{unit.charAt(0).toUpperCase() + unit.slice(1)}</option>
                {/each}
              </select>
            </div>
            <div style="color: #9ca3af; font-size: 13px; font-weight: 500;">OR</div>
            <input 
              type="date" 
              class="dob-input" 
              bind:value={dob}
              on:change={handleDobChange}
            >
          </div>
        </div>

        <!-- City Field -->
        <div class="form-group">
          <label>City</label>
          <input placeholder="Enter City" bind:value={city}>
        </div>

        <!-- Language Field -->
        <div class="form-group">
          <label>Preferred Language</label>
          <select bind:value={language}>
            {#each languages as lang}
              <option>{lang}</option>
            {/each}
          </select>
        </div>

        <!-- City & Pin in same row -->
        <div class="form-group" style="grid-column: span 2;">
          <div class="city-pin-group">
            <div>
              <label>Pin Code</label>
              <input type="text" placeholder="Enter Pin" bind:value={pinCode}>
            </div>
            <div>
              <label>Address</label>
              <textarea rows="2" placeholder="Enter Address" bind:value={address}></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= EXPAND SECTION ================= -->
      <div class="more">
        <a on:click={toggleExtraSection}>
          <i class="fas fa-chevron-{showExtraSection ? 'up' : 'down'}"></i>
          {showExtraSection ? 'Hide additional details' : 'Add more details (Optional)'}
        </a>
      </div>

      <!-- ================= EXPANDED FORM ================= -->
      {#if showExtraSection}
        <div class="extra" id="extraSection">
          <h3>
            <i class="fas fa-info-circle"></i>
            Additional Information
          </h3>

          <div class="grid">
            <select id="marital" bind:value={maritalStatus}>
              {#each maritalStatuses as status}
                <option>{status}</option>
              {/each}
            </select>

            <input type="date" placeholder="Date of Anniversary" bind:value={anniversaryDate}>

            <select bind:value={bloodGroup}>
              {#each bloodGroups as bg}
                <option>{bg}</option>
              {/each}
            </select>

            <input 
              id="spouseName" 
              class="{maritalStatus !== 'Married' ? 'hidden' : ''}" 
              placeholder="Spouse Name" 
              bind:value={spouseName}
            >

            <select 
              id="spouseBlood" 
              class="{maritalStatus !== 'Married' ? 'hidden' : ''}" 
              bind:value={spouseBloodGroup}
            >
              <option>Spouse Blood Group</option>
              <option>A +ve</option>
              <option>B +ve</option>
              <option>O +ve</option>
              <option>AB +ve</option>
            </select>

            <input placeholder="Referring Doctor" bind:value={referringDoctor}>
            <select bind:value={speciality}>
              {#each specialities as spec}
                <option>{spec}</option>
              {/each}
            </select>

            <input placeholder="Patient ID" bind:value={patientId}>
            <input type="email" placeholder="Email Address" bind:value={email}>

            <input placeholder="Channel" bind:value={channel}>
            <input placeholder="C/O" bind:value={c_o}>

            <input placeholder="Occupation" bind:value={occupation}>
            <input placeholder="Tag" bind:value={tag}>

            <input type="tel" placeholder="Alternate Mobile" bind:value={alternateMobile}>
            <input type="text" placeholder="Aadhar Number" bind:value={aadharNumber}>
          </div>

          <!-- ================= CAMERA SECTION ================= -->
          <div class="camera-section">
            <h4 style="margin-bottom: 12px; color: #4b5563; display: flex; align-items: center; gap: 8px; font-size: 14px;">
              <i class="fas fa-camera"></i>
              Patient Photo (Optional)
            </h4>
            <div class="camera-box">
              <video 
                id="video" 
                class="{showVideo ? '' : 'hidden'}" 
                autoplay 
                bind:this={videoElement}
              ></video>
              <img 
                id="preview" 
                class="{showPreview ? '' : 'hidden'}" 
                alt="Patient Photo Preview" 
                src={previewImage}
                bind:this={previewElement}
              >
              <div style="color: #6b7280; margin-bottom: 12px; font-size: 13px;">
                <i class="fas fa-info-circle"></i> 
                Take a photo or upload from device
              </div>
              <div class="camera-controls">
                <button class="btn" on:click={startCamera}>
                  <i class="fas fa-camera"></i> Open Camera
                </button>
                <button class="btn" on:click={capturePhoto}>
                  <i class="fas fa-circle"></i> Capture
                </button>
                <button class="btn" on:click={() => fileInput?.click()}>
                  <i class="fas fa-upload"></i> Upload
                </button>
                <input 
                  type="file" 
                  id="upload" 
                  accept="image/*" 
                  class="hidden" 
                  bind:this={fileInput}
                  on:change={handleFileUpload}
                >
              </div>
            </div>
          </div>
        </div>
      {/if}

      <!-- ================= ACTIONS ================= -->
      <div class="actions">
  <button type="button" class="primary-btn" on:click={() => handleAction('Rx')}>
    Add & Create Rx
  </button>

  <div class="secondary">
    <button type="button" on:click={() => handleAction('Bill')}>
      Add & Create Bill
    </button>

    <button type="button" on:click={() => handleAction('Appointment')}>
      Add & Create Appointment
    </button>

    <!-- ✅ ADD THIS -->
    <button
      type="button"
      class="view-btn"
      on:click={() => window.location.href = '/patient'}
    >
      View Patients
    </button>
  </div>
</div>

    </form>
  </div>
</div>

{#if notification.show}
  <div class="notification notification-{notification.type}">
    <i class="fas fa-{
      notification.type === 'success' ? 'check-circle' : 
      notification.type === 'error' ? 'exclamation-circle' : 'info-circle'
    }"></i>
    <span>{notification.message}</span>
  </div>
{/if}
