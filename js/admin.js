// File: js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    // Pastikan pengguna login dan role-nya admin (opsional tapi disarankan)
    checkAdminAuth(); // Panggil fungsi otentikasi admin

    fetchUsers(); // Ambil dan tampilkan data pengguna saat halaman dimuat
    setupEventListeners(); // Setup event listeners untuk tombol aksi dan popups
});

// --- AUTH CHECK ---
function checkAdminAuth() {
    const userRole = localStorage.getItem('loggedInUserRole');
    // Jika tidak ada role di localStorage atau role bukan 'admin', arahkan ke halaman login
    if (!userRole || userRole !== 'admin') {
        console.warn('Invalid access: Admin role not found or incorrect. Redirecting to login.');
        // localStorage.clear(); // Bersihkan sesi yang tidak valid - hati-hati dengan ini jika ada data lain
        window.location.href = "../index.html"; // Sesuaikan path jika index.html ada di lokasi lain
    }
    // TODO: Opsional, tambahkan logika validasi sesi lebih lanjut jika diperlukan (misal cek token)
}

// --- EVENT LISTENERS SETUP ---
function setupEventListeners() {
    // Event delegation untuk tombol Edit dan Hapus di SEMUA tabel pengguna
    // Kita pasang listener pada container tabel itu sendiri atau container yang lebih tinggi
    const adminTable = document.getElementById('adminTable');
    const buyerTable = document.getElementById('buyerTable');
    const sellerTable = document.getElementById('sellerTable');

    if (adminTable) {
        adminTable.addEventListener('click', handleUserActions);
    }
    if (buyerTable) {
        buyerTable.addEventListener('click', handleUserActions);
    }
    if (sellerTable) {
        sellerTable.addEventListener('click', handleUserActions);
    }


    // Event listeners untuk tombol di popups
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', logout); // Panggil fungsi logout saat dikonfirmasi
    }

    const saveUserBtn = document.getElementById('saveUserBtn');
    if (saveUserBtn) {
        saveUserBtn.addEventListener('click', handleSaveUser);
    }

    const confirmDeleteUserBtn = document.getElementById('confirmDeleteUserBtn');
    if (confirmDeleteUserBtn) {
        confirmDeleteUserBtn.addEventListener('click', handleConfirmDeleteUser);
    }

    // Event listener untuk tombol 'Tambah Pengguna Baru'
    const adduserButton = document.querySelector('.add-user-section .primary-btn'); // Selector disesuaikan dengan struktur HTML baru
    if (adduserButton) {
         adduserButton.addEventListener('click', showAddUserPopup);
    }

    // Menutup popup saat mengklik overlay
    document.querySelectorAll('.popup-overlay').forEach(overlay => {
        // Pastikan event hanya ter-trigger saat mengklik overlay itu sendiri
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
            }
        });
    });

    // Menutup popup saat mengklik tombol close (X)
    document.querySelectorAll('.close-popup').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            const popup = e.target.closest('.popup-overlay');
            if (popup) {
                 closePopup(popup.id);
            } else {
                 console.error("Could not find parent popup for close button.");
            }
        });
    });
}


// --- FETCH USERS ---
async function fetchUsers() {
    // Dapatkan body tabel
    const adminTableBody = document.querySelector('#adminTable tbody');
    const buyerTableBody = document.querySelector('#buyerTable tbody');
    const sellerTableBody = document.querySelector('#sellerTable tbody');

    // Tampilkan pesan memuat di semua tabel
    if (adminTableBody) adminTableBody.innerHTML = '<tr><td colspan="4">Memuat data admin...</td></tr>';
    if (buyerTableBody) buyerTableBody.innerHTML = '<tr><td colspan="5">Memuat data pembeli...</td></tr>';
    if (sellerTableBody) sellerTableBody.innerHTML = '<tr><td colspan="5">Memuat data penjual...</td></tr>';

    try {
        const response = await fetch('../backend/admin_manage_users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_all_users' })
        });
        const data = await response.json();

        if (data.status === 'success' && data.users) {
            // Pisahkan pengguna berdasarkan role
            const admins = data.users.filter(user => user.role && user.role.toLowerCase() === 'admin');
            const buyers = data.users.filter(user => user.role && user.role.toLowerCase() === 'pembeli');
            const sellers = data.users.filter(user => user.role && user.role.toLowerCase() === 'seller');

            // Tampilkan data admin
            if (adminTableBody) {
                if (admins.length === 0) {
                    adminTableBody.innerHTML = '<tr><td colspan="4">Tidak ada pengguna admin.</td></tr>';
                } else {
                    adminTableBody.innerHTML = admins.map(user => `
                        <tr>
                            <td>${user.username}</td>
                            <td>${user.password || '********'}</td>
                            <td>${user.role}</td>
                            <td>
                                <button class="btn small-btn warning-btn edit-btn" data-id="${user.id}"><i class="uil uil-edit"></i></button>
                                <button class="btn small-btn danger-btn delete-btn" data-id="${user.id}" data-username="${user.username}"><i class="uil uil-trash"></i></button>
                            </td>
                        </tr>
                    `).join('');
                }
            }

            // Tampilkan data pembeli
            if (buyerTableBody) {
                if (buyers.length === 0) {
                    buyerTableBody.innerHTML = '<tr><td colspan="5">Tidak ada pengguna pembeli.</td></tr>';
                } else {
                    buyerTableBody.innerHTML = buyers.map(user => `
                        <tr>
                            <td>${user.username}</td>
                            <td>${user.password || '********'}</td>
                            <td>${user.role}</td>
                            <td>Rp ${parseFloat(user.saldo || 0).toLocaleString('id-ID')}</td>
                            <td>
                                <button class="btn small-btn warning-btn edit-btn" data-id="${user.id}"><i class="uil uil-edit"></i></button>
                                <button class="btn small-btn danger-btn delete-btn" data-id="${user.id}" data-username="${user.username}"><i class="uil uil-trash"></i></button>
                            </td>
                        </tr>
                    `).join('');
                }
            }

            // Tampilkan data penjual
            if (sellerTableBody) {
                if (sellers.length === 0) {
                    sellerTableBody.innerHTML = '<tr><td colspan="5">Tidak ada pengguna penjual.</td></tr>';
                } else {
                    sellerTableBody.innerHTML = sellers.map(user => `
                        <tr>
                            <td>${user.username}</td>
                            <td>${user.password || '********'}</td>
                            <td>${user.role}</td>
                            <td>Rp ${parseFloat(user.saldo || 0).toLocaleString('id-ID')}</td>
                            <td>
                                <button class="btn small-btn warning-btn edit-btn" data-id="${user.id}"><i class="uil uil-edit"></i></button>
                                <button class="btn small-btn danger-btn delete-btn" data-id="${user.id}" data-username="${user.username}"><i class="uil uil-trash"></i></button>
                            </td>
                        </tr>
                    `).join('');
                }
            }
        } else {
            const errorMessage = `Gagal memuat pengguna: ${data.message || 'Unknown error'}`;
            if (adminTableBody) adminTableBody.innerHTML = `<tr><td colspan="4">${errorMessage}</td></tr>`;
            if (buyerTableBody) buyerTableBody.innerHTML = `<tr><td colspan="5">${errorMessage}</td></tr>`;
            if (sellerTableBody) sellerTableBody.innerHTML = `<tr><td colspan="5">${errorMessage}</td></tr>`;
        }
    } catch (error) {
        console.error('Error fetching users:', error);
        const errorMessage = 'Error memuat data pengguna.';
        if (adminTableBody) adminTableBody.innerHTML = `<tr><td colspan="4">${errorMessage}</td></tr>`;
        if (buyerTableBody) buyerTableBody.innerHTML = `<tr><td colspan="5">${errorMessage}</td></tr>`;
        if (sellerTableBody) sellerTableBody.innerHTML = `<tr><td colspan="5">${errorMessage}</td></tr>`;
    }
}

// --- HANDLE USER ACTIONS (Edit/Delete) ---
// Menggunakan event delegation pada elemen tabel
function handleUserActions(event) {
    const target = event.target;

    // Periksa apakah target adalah tombol 'Edit'
    if (target.classList.contains('edit-btn')) {
        const userId = target.dataset.id;
        showEditUserPopup(userId); // Panggil fungsi untuk menampilkan popup edit
        event.stopPropagation(); // Hentikan event bubbling
    }
    // Periksa apakah target adalah tombol 'Hapus'
    else if (target.classList.contains('delete-btn')) {
        const userId = target.dataset.id;
        const username = target.dataset.username;
        showDeleteUserPopup(userId, username); // Panggil fungsi untuk menampilkan popup hapus
        event.stopPropagation(); // Hentikan event bubbling
    }
    // Aksi lain bisa ditambahkan di sini
}

// --- POPUP FUNCTIONS (General) ---
function closePopup(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.style.display = 'none';
    }
}

// --- LOGOUT POPUP & FUNCTIONALITY ---
function showLogoutPopup() {
     // Opsional: Tampilkan username/role di popup logout jika diperlukan
     // const username = localStorage.getItem('loggedInUsername') || 'Admin';
     // const logoutUsernameElement = document.getElementById('adminLogoutUserName'); // Pastikan ID ini ada di HTML
     // if(logoutUsernameElement) logoutUsernameElement.textContent = username;

    const logoutPopup = document.getElementById('logoutPopup');
    if (logoutPopup) {
        logoutPopup.style.display = 'flex';
    }
}

function logout() {
    console.log('Admin logging out...');
    // Hapus informasi login dari localStorage
    localStorage.removeItem('loggedInUserId');
    localStorage.removeItem('loggedInUsername');
    localStorage.removeItem('loggedInUserRole');
     // localStorage.clear(); // Alternatif: Hapus semua, hati-hati jika ada data lain

    // Arahkan ke halaman login utama (index.html)
    window.location.href = '../index.html'; // Sesuaikan path jika perlu
}


// --- EDIT USER POPUP ---
async function showEditUserPopup(userId) {
    const editUserPopup = document.getElementById('editUserPopup');
    const editUserIdSpan = document.getElementById('editUserId');
    const editUsernameInput = document.getElementById('editUsername');
    const editRoleSelect = document.getElementById('editRole');
    const editSaldoInput = document.getElementById('editSaldo');
    const editPasswordInput = document.getElementById('editPassword');
    const saveUserBtn = document.getElementById('saveUserBtn');
    const editSaldoFormGroup = document.getElementById('editSaldoFormGroup'); // Dapatkan form group saldo

    if (!editUserPopup || !editUserIdSpan || !editUsernameInput || !editRoleSelect || !editSaldoInput || !editPasswordInput || !saveUserBtn || !editSaldoFormGroup) {
        console.error("Edit user popup elements not found!");
        // Tampilkan pesan error di UI jika memungkinkan
        return;
    }

    // Reset form dan tampilkan loading/placeholder
    editUserIdSpan.textContent = 'Memuat...';
    editUsernameInput.value = '';
    editRoleSelect.value = 'pembeli'; // Default value (bisa diubah nanti)
    editSaldoInput.value = '';
    editPasswordInput.value = ''; // Kosongkan input password saat membuka
    saveUserBtn.disabled = true; // Disable tombol simpan saat memuat

    // Sembunyikan form group saldo secara default
    editSaldoFormGroup.style.display = 'none';

    editUserPopup.style.display = 'flex'; // Tampilkan popup dengan state loading

    try {
        // TODO: Fetch user details from backend based on userId
        // Pastikan endpoint PHP Anda merespons dengan { status: 'success', user: { id, username, role, saldo, ... } }
        const response = await fetch('../backend/admin_manage_users.php', { // Sesuaikan endpoint
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_user_details', user_id: userId })
        });
        const data = await response.json();

        if (data.status === 'success' && data.user) {
            const user = data.user;
            editUserIdSpan.textContent = user.id;
            editUsernameInput.value = user.username;

            // Set nilai role dropdown berdasarkan data dari backend
            if (editRoleSelect.querySelector(`option[value="${user.role}"]`)) {
                 editRoleSelect.value = user.role;
                 // Tampilkan form group saldo hanya jika role adalah 'pembeli' atau 'seller'
                 // Juga pastikan saldo input group ada sebelum mencoba mengakses gayanya.
                 if (user.role === 'pembeli' || user.role === 'seller') {
                     editSaldoFormGroup.style.display = 'block'; // Atau 'flex'
                     editSaldoInput.required = true; // Saldo wajib diisi untuk role ini
                 } else {
                     editSaldoFormGroup.style.display = 'none';
                     editSaldoInput.required = false;
                 }
            } else {
                 // Fallback jika role dari backend tidak ada di opsi dropdown
                 console.warn(`Role "${user.role}" from backend not found in dropdown options.`);
                 editRoleSelect.value = 'pembeli'; // Set default
                 // Tampilkan saldo jika fallback ke pembeli dan saldo input group ada
                 const editSaldoFormGroup = document.getElementById('editSaldoFormGroup');
                 if (editSaldoFormGroup) {
                     editSaldoFormGroup.style.display = 'block'; // Tampilkan saldo jika fallback ke pembeli
                     editSaldoInput.required = true;
                 }
            }

            editSaldoInput.value = parseFloat(user.saldo || 0).toFixed(2); // Format saldo, gunakan 0 jika null/undefined
            // Password input dibiarkan kosong secara default
            saveUserBtn.disabled = false; // Aktifkan tombol simpan
            saveUserBtn.dataset.userId = userId; // Simpan userId di tombol simpan

            // Tambahkan event listener change pada dropdown role di popup edit
            // Agar form group saldo muncul/sembunyi saat role diubah
            editRoleSelect.onchange = function() {
                 // Pastikan saldo input group ada sebelum mencoba mengakses gayanya.
                 const editSaldoFormGroup = document.getElementById('editSaldoFormGroup');
                 if (editSaldoFormGroup) {
                     if (this.value === 'pembeli' || this.value === 'seller') {
                         editSaldoFormGroup.style.display = 'block'; // Atau 'flex'
                         editSaldoInput.required = true;
                     } else {
                         editSaldoFormGroup.style.display = 'none';
                         editSaldoInput.required = false;
                     }
                 }
            };

        } else {
            editUserIdSpan.textContent = userId; // Tampilkan ID meskipun gagal
            alert(`Gagal memuat detail pengguna: ${data.message || 'Unknown error'}`);
            closePopup('editUserPopup'); // Tutup popup jika gagal memuat
        }
    } catch (error) {
        console.error('Error fetching user details:', error);
        editUserIdSpan.textContent = userId; // Tampilkan ID meskipun error
        alert('Error memuat detail pengguna.');
        closePopup('editUserPopup'); // Tutup popup jika error
    }
}

async function handleSaveUser(event) {
    const userId = event.target.dataset.userId;
    const username = document.getElementById('editUsername').value.trim();
    const role = document.getElementById('editRole').value;
    const password = document.getElementById('editPassword').value; // Ambil nilai input password (bisa kosong)
    const editSaldoInput = document.getElementById('editSaldo'); // Ambil elemen input saldo
    const saldoInput = editSaldoInput.value; // Ambil nilai saldo sebagai string

    // Validasi input umum
    if (!userId || !username || !role) {
        alert('Data pengguna tidak lengkap.');
        return;
    }

     let saldo = null; // Saldo akan null secara default

    // Validasi dan ambil saldo hanya jika form group saldo terlihat (untuk pembeli/seller)
    // Juga pastikan saldo input group ada sebelum mencoba mengakses gayanya.
    const editSaldoFormGroup = document.getElementById('editSaldoFormGroup');
    if (editSaldoFormGroup && editSaldoFormGroup.style.display !== 'none') {
         if (saldoInput === '') {
             alert('Saldo harus diisi untuk role ini.');
             return;
         }
         saldo = parseFloat(saldoInput);
         if (isNaN(saldo) || saldo < 0) {
             alert('Saldo tidak valid atau negatif.');
             return;
         }
    }


    // Opsional: Validasi format username jika diperlukan
    // Opsional: Validasi panjang password jika diisi

    // Tampilkan loading state pada tombol simpan
    const saveUserBtn = event.target; // Tombol yang diklik
    const originalButtonText = saveUserBtn.textContent;
    saveUserBtn.disabled = true;
    saveUserBtn.textContent = 'Menyimpan...';

    try {
        // TODO: Send updated user data to backend
        // Pastikan endpoint PHP Anda menangani aksi 'update_user' dan mengembalikan { status: 'success', message: '...' }
        const response = await fetch('../backend/admin_manage_users.php', { // Sesuaikan endpoint
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update_user',
                user_id: userId,
                username: username,
                role: role,
                // Kirim saldo hanya jika nilainya bukan null (yaitu jika form group saldo terlihat dan valid)
                // Juga pastikan saldo input group ada sebelum mencoba mengakses gayanya.
                saldo: (editSaldoFormGroup && editSaldoFormGroup.style.display !== 'none') ? saldo : undefined,
                // Kirim password hanya jika diisi (tidak kosong)
                password: password !== '' ? password : undefined
            })
        });
        const data = await response.json();

        if (data.status === 'success') {
            alert('Data pengguna berhasil diperbarui!');
            closePopup('editUserPopup'); // Tutup popup setelah berhasil
            fetchUsers(); // Muat ulang daftar pengguna untuk melihat perubahan
        } else {
            alert(`Gagal memperbarui data pengguna: ${data.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error updating user:', error);
        alert('Error saat memperbarui data pengguna.');
    } finally {
        // Kembalikan state tombol simpan
        saveUserBtn.disabled = false;
        saveUserBtn.textContent = originalButtonText;
        // Hapus event listener change dari select role agar tidak menumpuk
        const editRoleSelect = document.getElementById('editRole');
        if (editRoleSelect) editRoleSelect.onchange = null;
    }
}

// --- DELETE USER POPUP & FUNCTIONALITY ---
function showDeleteUserPopup(userId, username) {
    const deleteUserPopup = document.getElementById('deleteUserPopup');
    const deleteUserIdSpan = document.getElementById('deleteUserId');
    const deleteUsernameStrong = document.getElementById('deleteUsername');
    const confirmDeleteUserBtn = document.getElementById('confirmDeleteUserBtn');

    if (!deleteUserPopup || !deleteUserIdSpan || !deleteUsernameStrong || !confirmDeleteUserBtn) {
        console.error("Delete user popup elements not found!");
        return;
    }

    deleteUserIdSpan.textContent = userId;
    deleteUsernameStrong.textContent = username; // Tampilkan username di popup konfirmasi
    confirmDeleteUserBtn.dataset.userId = userId; // Simpan userId di tombol konfirmasi hapus

    deleteUserPopup.style.display = 'flex'; // Tampilkan popup
}

async function handleConfirmDeleteUser(event) {
    const userIdToDelete = event.target.dataset.userId;

    if (!userIdToDelete) {
        alert('User ID tidak ditemukan untuk dihapus.');
        return;
    }

    // Tampilkan loading state pada tombol hapus
    const confirmDeleteUserBtn = event.target; // Tombol yang diklik
    const originalButtonText = confirmDeleteUserBtn.textContent;
    confirmDeleteUserBtn.disabled = true;
    confirmDeleteUserBtn.textContent = 'Menghapus...';

    try {
        // TODO: Send delete user request to backend
        // Pastikan endpoint PHP Anda menangani aksi 'delete_user' dan mengembalikan { status: 'success', message: '...' }
        const response = await fetch('../backend/admin_manage_users.php', { // Sesuaikan endpoint
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete_user',
                user_id: userIdToDelete
            })
        });
        const data = await response.json();

        if (data.status === 'success') {
            alert('Pengguna berhasil dihapus!');
            closePopup('deleteUserPopup'); // Tutup popup setelah berhasil
            fetchUsers(); // Muat ulang daftar pengguna untuk melihat perubahan
        } else {
            alert(`Gagal menghapus pengguna: ${data.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error saat menghapus pengguna.');
    } finally {
        // Kembalikan state tombol hapus
        confirmDeleteUserBtn.disabled = false;
        confirmDeleteUserBtn.textContent = originalButtonText;
    }
}

// --- ADD USER POPUP & FUNCTIONALITY ---
function showAddUserPopup(role) {
    const popup = document.getElementById('addUserPopup');
    const roleSelect = document.getElementById('userRole');
    const saldoGroup = document.getElementById('saldoFormGroup');
    
    // Set role yang dipilih
    roleSelect.value = role;
    
    // Tampilkan/sembunyikan field saldo berdasarkan role
    if (role === 'admin') {
        saldoGroup.style.display = 'none';
    } else {
        saldoGroup.style.display = 'block';
    }
    
    // Reset form
    document.getElementById('addUserForm').reset();
    
    // Tampilkan popup
    popup.style.display = 'flex';
}

function closeAddUserPopup() {
    const popup = document.getElementById('addUserPopup');
    popup.style.display = 'none';
} 