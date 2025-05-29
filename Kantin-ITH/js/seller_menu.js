// File: js/seller_menu.js

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in and is a seller (optional, already in seller_common.js)
    // const role = sessionStorage.getItem('role');
    // if (!role || role !== 'seller') {
    //   window.location.href = '../index.html';
    //   return;
    // }

    fetchMenuItems();
    setupEventListeners();
    updateProfileInfo(); // Assuming updateProfileInfo is in seller_common.js
});

function setupEventListeners() {
    // Add Menu Form Submit
    const addMenuForm = document.getElementById('addMenuForm');
    if (addMenuForm) {
        addMenuForm.addEventListener('submit', handleAddMenu);
    }

    // Edit Menu Form Submit
    const editMenuForm = document.getElementById('editMenuForm');
    if (editMenuForm) {
        editMenuForm.addEventListener('submit', handleEditMenu);
    }

    // Event delegation for Edit and Delete buttons
    const menuTableBody = document.querySelector('#menuTable tbody');
    if (menuTableBody) {
        menuTableBody.addEventListener('click', handleTableActions);
    }

     // Close popups by clicking outside
    document.querySelectorAll('.popup-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
            }
        });
    });
}

// --- FETCH MENU ITEMS ---
async function fetchMenuItems() {
    const menuTableBody = document.querySelector('#menuTable tbody');
    if (!menuTableBody) return;

    menuTableBody.innerHTML = '<tr><td colspan="6">Memuat daftar menu...</td></tr>';

    try {
        const response = await fetch('../backend/manage_menu.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_all' })
        });
        const data = await response.json();

        if (data.status === 'success' && data.menu) {
            displayMenuItems(data.menu);
        } else {
            menuTableBody.innerHTML = `<tr><td colspan="6">Gagal memuat menu: ${data.message || 'Unknown error'}</td></tr>`;
        }
    } catch (error) {
        console.error('Error fetching menu items:', error);
        menuTableBody.innerHTML = '<tr><td colspan="6">Error memuat daftar menu.</td></tr>';
    }
}

// --- DISPLAY MENU ITEMS ---
function displayMenuItems(menuItems) {
    const menuTableBody = document.querySelector('#menuTable tbody');
    if (!menuTableBody) return;

    menuTableBody.innerHTML = ''; // Clear loading/placeholder row

    if (menuItems.length === 0) {
        menuTableBody.innerHTML = '<tr><td colspan="6">Belum ada menu yang ditambahkan.</td></tr>';
        return;
    }

    menuItems.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.nama}</td>
            <td>Rp ${parseFloat(item.harga).toLocaleString('id-ID')}</td>
            <td>${item.kategori || '-'}</td>
            <td>${item.stok}</td>
            <td>${item.status}</td>
            <td>
                <button class="btn small-btn icon-btn edit-btn" data-id="${item.id}"
                    data-nama="${item.nama}"
                    data-harga="${item.harga}"
                    data-kategori="${item.kategori || ''}"
                    data-stok="${item.stok}"
                    data-status="${item.status}"
                >
                    <i class="uil uil-edit"></i>
                </button>
                <button class="btn small-btn icon-btn delete-btn" data-id="${item.id}"><i class="uil uil-trash"></i></button>
            </td>
        `;
        menuTableBody.appendChild(row);
    });
}

// --- HANDLE ADD MENU ---
async function handleAddMenu(event) {
    event.preventDefault();

    const form = event.target;
    const nama = form.querySelector('#nama').value;
    const harga = form.querySelector('#harga').value;
    const kategori = form.querySelector('#kategori').value;
    const stok = form.querySelector('#stok').value;
    const status = form.querySelector('#status').value;

    try {
        const response = await fetch('../backend/manage_menu.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'add_menu',
                nama: nama,
                harga: harga,
                kategori: kategori,
                stok: stok,
                status: status
            })
        });
        const data = await response.json();

        if (data.status === 'success') {
            alert(data.message); // Use alert for now, can replace with custom popup
            form.reset(); // Clear form
            fetchMenuItems(); // Refresh the menu list
        } else {
            alert('Gagal menambahkan menu: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error adding menu item:', error);
        alert('Terjadi error saat menambahkan menu.');
    }
}

// --- HANDLE TABLE ACTIONS (Edit/Delete) ---
function handleTableActions(event) {
    const target = event.target;

    // Handle Edit Button Click
    if (target.classList.contains('edit-btn')) {
        const menuId = target.dataset.id;
        const menuNama = target.dataset.nama;
        const menuHarga = target.dataset.harga;
        const menuKategori = target.dataset.kategori;
        const menuStok = target.dataset.stok;
        const menuStatus = target.dataset.status;

        // Populate the edit form
        document.getElementById('editMenuId').value = menuId;
        document.getElementById('editNama').value = menuNama;
        document.getElementById('editHarga').value = menuHarga;
        document.getElementById('editKategori').value = menuKategori;
        document.getElementById('editStok').value = menuStok;
        document.getElementById('editStatus').value = menuStatus;

        // Show the edit popup
        document.getElementById('editMenuPopup').style.display = 'flex';

    } else if (target.classList.contains('delete-btn')) {
        // Handle Delete Button Click
        const menuId = target.dataset.id;

        if (confirm('Anda yakin ingin menghapus menu ini?')) {
            handleDeleteMenu(menuId);
        }
    }
}

// --- HANDLE EDIT MENU ---
async function handleEditMenu(event) {
    event.preventDefault();

    const form = event.target;
    const menuId = form.querySelector('#editMenuId').value;
    const nama = form.querySelector('#editNama').value;
    const harga = form.querySelector('#editHarga').value;
    const kategori = form.querySelector('#editKategori').value;
    const stok = form.querySelector('#editStok').value;
    const status = form.querySelector('#editStatus').value;

    try {
        const response = await fetch('../backend/manage_menu.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update_menu',
                id: menuId,
                nama: nama,
                harga: harga,
                kategori: kategori,
                stok: stok,
                status: status
            })
        });
        const data = await response.json();

        if (data.status === 'success') {
            alert(data.message); // Use alert for now
            closePopup('editMenuPopup'); // Close the popup
            fetchMenuItems(); // Refresh the list
        } else {
            alert('Gagal memperbarui menu: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error updating menu item:', error);
        alert('Terjadi error saat memperbarui menu.');
    }
}

// --- HANDLE DELETE MENU ---
async function handleDeleteMenu(menuId) {
    try {
        const response = await fetch('../backend/manage_menu.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete_menu',
                id: menuId
            })
        });
        const data = await response.json();

        if (data.status === 'success') {
            alert(data.message); // Use alert for now
            fetchMenuItems(); // Refresh the list
        } else {
            alert('Gagal menghapus menu: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting menu item:', error);
        alert('Terjadi error saat menghapus menu.');
    }
}

// --- POPUP FUNCTIONS (Assuming these are common) ---
function showLogout() {
     document.getElementById('logoutPopup').style.display = 'flex';
}

function closePopup(popupId) {
    document.getElementById(popupId).style.display = 'none';
}

function updateProfileInfo() {
    // Placeholder - implement actual logic if needed
    const username = sessionStorage.getItem('username') || 'User';
    const role = sessionStorage.getItem('role') || 'Unknown Role';

    const profileUsernameSpan = document.getElementById('profileUsername');
    const profileRoleSpan = document.getElementById('profileRole');
    const topbarUsernameSpan = document.querySelector('.navbar .top-nav a:first-child'); // Assuming topbar exists
    const sidebarLogoutLink = document.getElementById('logoutLinkSidebar');

    if (profileUsernameSpan) profileUsernameSpan.textContent = username;
    if (profileRoleSpan) profileRoleSpan.textContent = role;

     // Update username in sidebar logout link if it exists
     if(sidebarLogoutLink) {
         sidebarLogoutLink.innerHTML = `<i class="uil uil-signout"></i> Logout (${username})`;
     }

     // Update username in topbar if it exists (for smaller screens)
      if(topbarUsernameSpan) {
         topbarUsernameSpan.innerHTML = `<i class="uil uil-user"></i> ${username} (${role})`;
      }
}

// Basic logout function (assuming it clears session and redirects)
function logout() {
    // Implement actual logout logic here
    sessionStorage.clear(); // Clear session storage
    window.location.href = '../index.html'; // Redirect to login page
} 