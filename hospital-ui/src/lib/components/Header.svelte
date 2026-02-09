<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
</script>

<header class="header">
  <div class="header-inner">
    <button class="menu-btn" on:click={() => dispatch('toggleSidebar')}>
      ☰
    </button>

    <h1>Hospital Management System</h1>

    <div class="right">
      <span class="role">Doctor</span>
      <div class="avatar">D</div>
    </div>
  </div>
</header>

<style>
/* HEADER BAR */
.header {
  height: 56px;
  background: linear-gradient(90deg, #f97316, #fb923c);
  display: flex;
  align-items: center;
}

/* CONTENT ALIGNMENT */
.header-inner {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;   /* spacing moved here ✅ */
    padding: 5 28px 5 35px;

}

/* MENU BUTTON */
.menu-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: white;
}

/* TITLE */
h1 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
}

/* RIGHT SIDE */
.right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.role {
  font-size: 13px;
  opacity: 0.9;
}

/* AVATAR */
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: white;
  color: #f97316;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
</style>
