document.addEventListener('DOMContentLoaded', () => {
    fetchMenuItems();
    setupEventListeners();
    updateProfileInfo();
});

function setupEventListeners() {
    const addMenuForm = document.getElementById('addMenuForm');
    if (addMenuForm) {
        addMenuForm.addEventListener('submit', handleAddMenu);
    }

    const editMenuForm = document.getElementById('editMenuForm');
    if (editMenuForm) {
        editMenuForm.addEventListener('submit', handleEditMenu);
    }

    const menuTableBody = document.querySelector('#menuTable tbody');
    if (menuTableBody) {
        menuTableBody.addEventListener('click', handleTableActions);
    }

    document.querySelectorAll('.popup-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
            }
        });
    });
}

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

function displayMenuItems(menuItems) {
    const menuTableBody = document.querySelector('#menuTable tbody');
    if (!menuTableBody) return;

    menuTableBody.innerHTML = '';

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
                <button class="btn small-btn secondary-btn edit-btn" data-id="${item.id}"
                    data-nama="${item.nama}"
                    data-harga="${item.harga}"
                    data-kategori="${item.kategori || ''}"
                    data-stok="${item.stok}"
                    data-status="${item.status}"
                    title="Edit"
                >
                    <i class="uil uil-pen"></i>
                </button>
                <button class="btn small-btn danger-btn delete-btn" data-id="${item.id}" title="Hapus">
                    <i class="uil uil-trash"></i>
                </button>
            </td>
        `;
        menuTableBody.appendChild(row);
    });
}

async function handleAddMenu(event) {
    event.preventDefault();

    const form = event.target;
    const nama = form.querySelector('#nama').value;
    let hargaString = form.querySelector('#harga').value;
    const kategori = form.querySelector('#kategori').value;
    const stok = form.querySelector('#stok').value;
    const status = form.querySelector('#status').value;

 
    if (kategori === '') {
        alert('Mohon pilih kategori menu.');
        return;
    }


    hargaString = hargaString.replace(/[^0-9]/g, ''); 

    const harga = parseFloat(hargaString);

    if (isNaN(harga) || harga < 0) {
        alert('Masukkan harga yang valid.');
        return;
    }

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
            alert(data.message);
            form.reset();
            fetchMenuItems();
        } else {
            alert('Gagal menambahkan menu: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error adding menu item:', error);
        alert('Terjadi error saat menambahkan menu.');
    }
}

function handleTableActions(event) {
    const target = event.target;

    if (target.classList.contains('edit-btn')) {
        const menuId = target.dataset.id;
        const menuNama = target.dataset.nama;
        const menuHarga = target.dataset.harga;
        const menuKategori = target.dataset.kategori;
        const menuStok = target.dataset.stok;
        const menuStatus = target.dataset.status;

        document.getElementById('editMenuId').value = menuId;
        document.getElementById('editNama').value = menuNama;
        document.getElementById('editHarga').value = menuHarga;
        document.getElementById('editKategori').value = menuKategori;
        document.getElementById('editStok').value = menuStok;
        document.getElementById('editStatus').value = menuStatus;

        document.getElementById('editMenuPopup').style.display = 'flex';

    } else if (target.classList.contains('delete-btn')) {
        const menuId = target.dataset.id;

        if (confirm('Anda yakin ingin menghapus menu ini?')) {
            handleDeleteMenu(menuId);
        }
    }
}

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
            alert(data.message);
            closePopup('editMenuPopup');
            fetchMenuItems();
        } else {
            alert('Gagal memperbarui menu: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error updating menu item:', error);
        alert('Terjadi error saat memperbarui menu.');
    }
}

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
            alert(data.message);
            fetchMenuItems();
        } else {
            alert('Gagal menghapus menu: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting menu item:', error);
        alert('Terjadi error saat menghapus menu.');
    }
}

function showLogout() {
    document.getElementById('logoutPopup').style.display = 'flex';
}

function closePopup(popupId) {
    document.getElementById(popupId).style.display = 'none';
}

function updateProfileInfo() {
    const username = localStorage.getItem('loggedInUsername') || 'User';
    const role = localStorage.getItem('loggedInUserRole') || 'Penjual';

    const profileUsernameSpan = document.getElementById('profileUsername');
    const profileRoleSpan = document.getElementById('profileRole');
    const topbarUsernameSpan = document.querySelector('.navbar .top-nav .profile-name');
    const sidebarLogoutLink = document.getElementById('logoutLinkSidebar');

    if (profileUsernameSpan) profileUsernameSpan.textContent = username;
    if (profileRoleSpan) profileRoleSpan.textContent = role;

    if(sidebarLogoutLink) {
        sidebarLogoutLink.innerHTML = `<i class="uil uil-signout"></i> Logout (${username})`;
    }

    if(topbarUsernameSpan) {
        topbarUsernameSpan.textContent = username;
    }
}

function logout() {
    localStorage.clear();
    window.location.href = '../index.html';
} 
