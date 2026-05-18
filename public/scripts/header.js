// Función para manejar el menú móvil
function setupMobileMenu() {
  const menuToggle = document.getElementById('mobile-menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const html = document.documentElement;
  
  if (!menuToggle || !mobileMenu) return;
  
  // Función para abrir/cerrar el menú
  const toggleMenu = (e) => {
    if (e) e.stopPropagation();
    
    const isOpening = !mobileMenu.classList.contains('active');
    
    if (isOpening) {
      // Abrir menú
      menuToggle.classList.add('active');
      mobileMenu.classList.add('active');
      document.body.style.overflow = 'hidden';
      
      // Agregar overlay
      const overlay = document.createElement('div');
      overlay.className = 'mobile-menu-overlay';
      overlay.addEventListener('click', closeMenu);
      document.body.appendChild(overlay);
      
      // Agregar estilos al overlay
      setTimeout(() => {
        overlay.style.opacity = '0.5';
        overlay.style.visibility = 'visible';
      }, 10);
    } else {
      closeMenu();
    }
  };
  
  // Función para cerrar el menú
  const closeMenu = () => {
    mobileMenuButton.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('active');
    document.body.style.overflow = '';
    
    // Eliminar overlay
    const overlay = document.querySelector('.mobile-menu-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.visibility = 'hidden';
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 300);
    }
    
    // Devolver el foco al botón del menú
    mobileMenuButton.focus();
  };
  
  // Event listeners
  mobileMenuButton.addEventListener('click', toggleMenu);
  
  // Cerrar menú al hacer clic en un enlace
  const menuLinks = mobileMenu.querySelectorAll('a');
  menuLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });
  
  // Cerrar menú con la tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
      closeMenu();
    }
  });
  
  // Cerrar menú al cambiar el tamaño de la ventana
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth > 1024) {
        closeMenu();
      }
    }, 250);
  });
}

// Función para manejar el menú desplegable del usuario
function setupUserDropdown() {
  const userMenuButton = document.getElementById('user-menu-button');
  const userDropdown = document.getElementById('user-dropdown');
  
  if (userMenuButton && userDropdown) {
    userMenuButton.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('show');
    });
    
    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!userDropdown.contains(e.target) && !userMenuButton.contains(e.target)) {
        userDropdown.classList.remove('show');
      }
    });
  }
}

// Verificar el estado de autenticación
function checkAuthStatus() {
  // En una aplicación real, esto vendría de tu sistema de autenticación
  // Por ahora, usaremos localStorage para simular el estado de autenticación
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  const guestButtons = document.getElementById('guest-buttons');
  const userMenu = document.getElementById('user-menu');
  const mobileGuestButtons = document.querySelector('.mobile-auth-buttons');
  
  if (isAuthenticated) {
    if (guestButtons) guestButtons.style.display = 'none';
    if (userMenu) userMenu.style.display = 'block';
    if (mobileGuestButtons) mobileGuestButtons.style.display = 'none';
  } else {
    if (guestButtons) guestButtons.style.display = 'flex';
    if (userMenu) userMenu.style.display = 'none';
    if (mobileGuestButtons) mobileGuestButtons.style.display = 'flex';
  }
}

// Inicializar todo cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  setupMobileMenu();
  setupUserDropdown();
  checkAuthStatus();
  
  // Simular cierre de sesión
  const logoutButtons = document.querySelectorAll('.logout-button');
  logoutButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.setItem('isAuthenticated', 'false');
      window.location.href = '/';
    });
  });
});
