document.addEventListener('DOMContentLoaded', () => {
    updateProfileInfo();
});

function updateProfileInfo() {
    const username = localStorage.getItem('loggedInUsername');
    const role = localStorage.getItem('loggedInUserRole');

    console.log('updateProfileInfo: Retrieved username from localStorage:', username);
    console.log('updateProfileInfo: Retrieved role from localStorage:', role);

    if (username) {
        // Update all elements with class 'profile-name'
        const profileNameElements = document.querySelectorAll('.profile-name');
        console.log('updateProfileInfo: Found profile-name elements:', profileNameElements.length);
        profileNameElements.forEach(el => {
            el.textContent = username;
            console.log('updateProfileInfo: Updated profile-name element to:', el.textContent);
        });
    }

    if (username && role) {
        const profileUsernameSpan = document.getElementById('profileInfoUserName');
        const profileRoleSpan = document.getElementById('profileInfoUserRole');
        const sellerLogoutUserName = document.getElementById('sellerLogoutUserName');
        const sellerLogoutUserRole = document.getElementById('sellerLogoutUserRole');

        if (profileUsernameSpan) {
            profileUsernameSpan.textContent = username;
            console.log('updateProfileInfo: Updated profileInfoUserName to:', profileUsernameSpan.textContent);
        }
        if (profileRoleSpan) {
            profileRoleSpan.textContent = role;
            console.log('updateProfileInfo: Updated profileInfoUserRole to:', profileRoleSpan.textContent);
        }
        if (sellerLogoutUserName) {
            sellerLogoutUserName.textContent = username;
            console.log('updateProfileInfo: Updated sellerLogoutUserName to:', sellerLogoutUserName.textContent);
        }
        if (sellerLogoutUserRole) {
            sellerLogoutUserRole.textContent = role;
            console.log('updateProfileInfo: Updated sellerLogoutUserRole to:', sellerLogoutUserRole.textContent);
        }
    } else {
        console.error('User info not found in localStorage. Redirecting to login.');
        logout();
    }

    const profileDropdownUsername = document.getElementById('profileDropdownUsername');
    if (profileDropdownUsername) {
        profileDropdownUsername.textContent = username;
        console.log('updateProfileInfo: Updated profileDropdownUsername to:', profileDropdownUsername.textContent);
    }
}

function showProfileInfoPopup() {
    console.log('showProfileInfoPopup: Function called.');
    const profileDropdown = document.getElementById("profileDropdown");
    console.log('showProfileInfoPopup: profileDropdown element:', profileDropdown);

    if (profileDropdown) {
        console.log('showProfileInfoPopup: profileDropdown has active class before remove:', profileDropdown.classList.contains('active'));
        profileDropdown.classList.remove("active"); // Close the profile dropdown
        console.log('showProfileInfoPopup: profileDropdown has active class after remove:', profileDropdown.classList.contains('active'));
    } else {
        console.log('showProfileInfoPopup: profileDropdown element not found.');
    }

    const profileInfoPopup = document.getElementById('profileInfoPopup');
    if (profileInfoPopup) {
        profileInfoPopup.style.display = 'flex';
        updateProfileInfo(); // Ensure profile info is updated when showing the popup
        console.log('showProfileInfoPopup: Profile info popup displayed.');
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
        logoutPopup.classList.add('active');
    }
}

function closePopup(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.classList.remove('active');
    }
}

function logout() {
    // Make an API call to the backend to destroy the session
    fetch('../backend/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            localStorage.clear(); // Clear local storage after successful server-side logout
            window.location.href = '../index.html'; // Redirect to login page
        } else {
            console.error('Server-side logout failed:', data.message);
            alert('Gagal logout: ' + (data.message || 'Terjadi kesalahan.'));
        }
    })
    .catch(error => {
        console.error('Error during logout API call:', error);
        alert('Terjadi error koneksi saat logout.');
        // Even if API call fails, clear local storage and redirect for safety
        localStorage.clear();
        window.location.href = '../index.html';
    });
}

function toggleProfile(event) {
    event.stopPropagation();
    const profileDropdown = document.getElementById('profileDropdown');
    if (profileDropdown) {
        const isActive = profileDropdown.classList.contains('active');
        // Close all other dropdowns first
        document.querySelectorAll('.profile-dropdown.active').forEach(dropdown => {
            if (dropdown !== profileDropdown) {
                dropdown.classList.remove('active');
            }
        });
        // Toggle current dropdown
        profileDropdown.classList.toggle('active');
        console.log('Profile dropdown toggled:', !isActive);
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (event) => {
    const profileDropdown = document.getElementById('profileDropdown');
    const profileElements = document.querySelectorAll('.profile');
    
    if (profileDropdown && profileDropdown.classList.contains('active')) {
        const isClickInsideDropdown = profileDropdown.contains(event.target);
        const isClickOnProfile = Array.from(profileElements).some(el => el.contains(event.target));
        
        if (!isClickInsideDropdown && !isClickOnProfile) {
            profileDropdown.classList.remove('active');
            console.log('Profile dropdown closed');
        }
    }
});

// Prevent dropdown from closing when clicking inside it
document.getElementById('profileDropdown')?.addEventListener('click', (event) => {
    event.stopPropagation();
});

// Update profile info when dropdown is shown
document.getElementById('profileDropdown')?.addEventListener('transitionend', (event) => {
    if (event.target.classList.contains('active')) {
        updateProfileInfo();
    }
}); 