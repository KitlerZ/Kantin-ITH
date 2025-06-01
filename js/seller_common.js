document.addEventListener('DOMContentLoaded', () => {
    updateProfileInfo();
});

function updateProfileInfo() {
    const username = localStorage.getItem('loggedInUsername');
    const role = localStorage.getItem('loggedInUserRole');

    if (username && role) {
        const profileName = document.getElementById('profileName');
        const profileUsernameSpan = document.getElementById('profileUsername');
        const profileRoleSpan = document.getElementById('profileRole');

        if (profileName) profileName.textContent = `${username} (${role})`;
        if (profileUsernameSpan) profileUsernameSpan.textContent = username;
        if (profileRoleSpan) profileRoleSpan.textContent = role;
    } else {
        console.error('User info not found in localStorage. Redirecting to login.');
        logout();
    }
}

function showProfileInfo() {
    const profilePopup = document.getElementById('profilePopup');
    if (profilePopup) {
        profilePopup.style.display = 'flex';
        updateProfileInfo();
    }
}

function showLogout() {
    const logoutPopup = document.getElementById('logoutPopup');
    const username = localStorage.getItem('loggedInUsername') || 'Pengguna';
    const role = localStorage.getItem('loggedInUserRole') || '';
    const userNameElement = document.getElementById('sellerLogoutUserName');
    const userRoleElement = document.getElementById('sellerLogoutUserRole');
    if (userNameElement) userNameElement.textContent = username;
    if (userRoleElement) userRoleElement.textContent = role;
    if (logoutPopup) {
        logoutPopup.style.display = 'flex';
    }
}

function closePopup(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.style.display = 'none';
    }
}

function logout() {
    localStorage.removeItem('loggedInUserId');
    localStorage.removeItem('loggedInUsername');
    localStorage.removeItem('loggedInUserRole');
    
    window.location.href = '../index.html';
}

function toggleProfile(event) {
    event.stopPropagation();
    const profileDropdown = document.getElementById('profileDropdown');
    if (profileDropdown) {
        profileDropdown.classList.toggle('active');
    }
}

document.addEventListener('click', (event) => {
    const profileDropdown = document.getElementById('profileDropdown');
    const profileElement = document.querySelector('.main-content-topbar .profile');
    
    if (profileDropdown && profileElement && !profileDropdown.contains(event.target) && !profileElement.contains(event.target)) {
        profileDropdown.classList.remove('active');
    }
}); 
