<script lang="ts">
  import Header from '$lib/components/Header.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import Footer from '$lib/components/Footer.svelte';

  let sidebarOpen = true;

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }
</script>

<div class="app">
  <!-- SIDEBAR -->
  <div class="sidebar-container" class:open={sidebarOpen}>
    <Sidebar bind:open={sidebarOpen} />
  </div>

  <!-- MAIN AREA -->
  <div 
    class="main" 
    class:sidebar-closed={!sidebarOpen}
  >
    <Header on:toggleSidebar={toggleSidebar} />

    <main class="content">
      <slot />
    </main>

    <Footer />
  </div>
</div>

<style>
.main {
  margin-left: 220px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.25s ease;
  background: #fff7ed;
}

  .app {
    display: flex;
    height: 100vh;
    width: 100%;
    overflow: hidden;
    background: #ffffff;
  }

  /* SIDEBAR CONTAINER */
  .sidebar-container {
    height: 100vh;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    transform: translateX(0);
    opacity: 1;
  }

  .sidebar-container:not(.open) {
    transform: translateX(-100%);
    opacity: 0;
    pointer-events: none;
  }

  /* MAIN CONTENT AREA */
  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: #ffffff;
    position: relative;
    z-index: 1;
    overflow: hidden;
  }

  /* When sidebar is closed, content should take full width */
  .main.sidebar-closed {
    margin-left: 0 !important;
  }

  /* PAGE CONTENT */
  .content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    background: #ffffff;
    padding: 32px;
    position: relative;
    transition: padding 0.3s ease;
  }

  /* Optional: Add a semi-transparent overlay when sidebar is open on mobile */
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease;
  }

  .overlay.show {
    opacity: 1;
    visibility: visible;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .sidebar-container {
      transform: translateX(-100%);
    }

    .sidebar-container.open {
      transform: translateX(0);
      box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
    }

    .main {
      margin-left: 0 !important;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Optional: Push main content when sidebar opens on mobile */
    .main.sidebar-open-mobile {
      transform: translateX(260px);
    }

    .content {
      padding: 20px;
    }
  }

  /* Ensure smooth transitions for all interactive elements */
  .content * {
    transition: all 0.2s ease;
  }

  /* Scrollbar styling */
  .content::-webkit-scrollbar {
    width: 6px;
  }

  .content::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }

  .content::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }

  .content::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  /* Add subtle animation to content when sidebar toggles */
  @keyframes fadeIn {
    from { opacity: 0.9; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .content {
    animation: fadeIn 0.2s ease-out;
  }
</style>

<!-- Optional: Add overlay for mobile -->
{#if sidebarOpen}
  <div class="overlay" on:click={toggleSidebar} />
{/if}

<script context="module">
  // You can also add this to your global styles for better performance
  // Add to your global.css or app.css
  /*
  * {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  body {
    overscroll-behavior-y: none;
    overflow: hidden;
  }
  */
</script>