document.addEventListener('DOMContentLoaded', () => {
    // Functions used across multiple seller pages
    updateProfileInfo(); // Call this when page loads to show username/role
});

function updateProfileInfo() {
    // Assuming user info is stored in localStorage after login
    const username = localStorage.getItem('loggedInUsername');
    const role = localStorage.getItem('loggedInUserRole');

    if (username && role) {
        const profileUsernameSpan = document.getElementById('profileUsername');
        const profileRoleSpan = document.getElementById('profileRole');
        const topbarProfileLink = document.getElementById('topbarProfileLink');

        if (profileUsernameSpan) profileUsernameSpan.textContent = username;
        if (profileRoleSpan) profileRoleSpan.textContent = role;

        // Update topbar link text
        if (topbarProfileLink) {
             // Example: 'Kak Ros (Penjual)'
            topbarProfileLink.innerHTML = `<i class="uil uil-user"></i> ${username} (${role})`;
        }


    } else {
        // Redirect to login if no user info is found
        console.error('User info not found in localStorage. Redirecting to login.');
        logout(); // Use the logout function to clear anything and redirect
    }
}

function showProfileInfo() {
    const profilePopup = document.getElementById('profilePopup');
    if (profilePopup) {
        profilePopup.style.display = 'flex';
        updateProfileInfo(); // Ensure profile info is up-to-date when showing popup
    }
}

function showLogout() {
    console.log('Showing seller logout popup'); // Log
    const logoutPopup = document.getElementById('logoutPopup');
    // Menghapus referensi ke elemen username/role di popup logout karena tidak ada di HTML
    // const userNameElement = document.getElementById('sellerLogoutUserName');
    // const userRoleElement = document.getElementById('sellerLogoutUserRole');

    // Ambil username dan role dari localStorage tanpa fallback (tidak digunakan lagi di sini)
    // const loggedInUsername = localStorage.getItem('loggedInUsername') || '';
    // const loggedInUserRole = localStorage.getItem('loggedInUserRole') || '';

    // Isi elemen di popup (Tidak diperlukan lagi di sini)
    // if (userNameElement) userNameElement.textContent = loggedInUsername;
    // Isi role hanya jika elemen ada dan role tersedia (Tidak diperlukan lagi di sini)
    // if (userRoleElement && loggedInUserRole) userRoleElement.textContent = loggedInUserRole;

    if (logoutPopup) {
        logoutPopup.style.display = 'flex'; // Tampilkan popup overlay
    }
}

function closePopup(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.style.display = 'none';
    }
}

function logout() {
    console.log('Logging out seller...'); // Log
    // Hapus informasi login dari localStorage
    localStorage.removeItem('loggedInUserId');
    localStorage.removeItem('loggedInUsername');
    localStorage.removeItem('loggedInUserRole'); // Hapus role jika disimpan

    // Arahkan ke halaman logout penjual atau halaman login utama
    // Mengarahkan ke halaman logoutpenjual.html yang terpisah
    // window.location.href = 'logoutpenjual.html'; // Sesuaikan path jika perlu
    // Atau arahkan langsung ke halaman login utama jika tidak pakai halaman logout terpisah
    window.location.href = '../index.html'; // Redirect to the main login page
}

function toggleProfile(event) {
    event.stopPropagation(); // Prevent the click from bubbling up to the document listener
    const profileDropdown = document.getElementById('profileDropdown');
    if (profileDropdown) {
        profileDropdown.classList.toggle('active');
    }
}

// Close the profile dropdown if clicked outside
document.addEventListener('click', (event) => {
    const profileDropdown = document.getElementById('profileDropdown');
    const profileElement = document.querySelector('.main-content-topbar .profile');
    
    // Check if the click is outside the dropdown and the profile element
    if (profileDropdown && profileElement && !profileDropdown.contains(event.target) && !profileElement.contains(event.target)) {
        profileDropdown.classList.remove('active');
    }
}); 