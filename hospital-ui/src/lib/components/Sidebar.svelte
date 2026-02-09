<script lang="ts">
  import { page } from '$app/stores';
  export let open = true;
</script>

<aside class="sidebar {open ? 'open' : 'closed'}">
  <div class="logo">
    <span class="logo-icon">✚</span>
    <span class="logo-text" class:hidden={!open}>Anana</span>
  </div>

  <nav>
    <a href="/patient" class:active={$page.url.pathname.startsWith('/patient')}>
      Patients
    </a>
    <a href="/add-patient" class:active={$page.url.pathname === '/add-patient'}>
      Add Patient
    </a>
    <a href="/custom-field" class:active={$page.url.pathname.startsWith('/custom-field')}>
      Custom Fields
    </a>
  </nav>
</aside>

<style>
.sidebar {
  height: 100vh;
  background: #fff3e8;
  border-right: 2px solid #fb923c;
  padding: 22px 14px;
  transition: width 0.25s ease;
  overflow: hidden;
  
}

/* OPEN / CLOSE */
.sidebar.open {
  width: 220px;
}

.sidebar.closed {
  width: 64px;
}

/* LOGO */
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
}

.logo-icon {
  font-size: 20px;
  color: #f97316;
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: #7c2d12;
}

.hidden {
  display: none;
}

/* NAV */
nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

nav a {
  padding: 11px 14px;
  border-radius: 10px;
  text-decoration: none;
  font-size: 14px;
  color: #7c2d12;
  white-space: nowrap;
}

nav a.active {
  background: linear-gradient(90deg, #fb923c, #f97316);
  color: white;
  font-weight: 700;
}
</style>
