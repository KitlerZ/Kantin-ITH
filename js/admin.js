document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    fetchUsers();
    setupEventListeners();
});

function checkAdminAuth() {
    const userRole = localStorage.getItem('loggedInUserRole');
    if (!userRole || userRole !== 'admin') {
        window.location.href = "../index.html";
    }
}

function setupEventListeners() {
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

    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', logout);
    }

    const saveUserBtn = document.getElementById('saveUserBtn');
    if (saveUserBtn) {
        saveUserBtn.addEventListener('click', handleSaveUser);
    }

    const confirmDeleteUserBtn = document.getElementById('confirmDeleteUserBtn');
    if (confirmDeleteUserBtn) {
        confirmDeleteUserBtn.addEventListener('click', handleConfirmDeleteUser);
    }

    const adduserButton = document.querySelector('.add-user-section .primary-btn');
    if (adduserButton) {
           adduserButton.addEventListener('click', showAddUserPopup);
    }

    document.querySelectorAll('.popup-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
            }
        });
    });

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

async function fetchUsers() {
    const adminTableBody = document.querySelector('#adminTable tbody');
    const buyerTableBody = document.querySelector('#buyerTable tbody');
    const sellerTableBody = document.querySelector('#sellerTable tbody');

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
            const admins = data.users.filter(user => user.role && user.role.toLowerCase() === 'admin');
            const buyers = data.users.filter(user => user.role && user.role.toLowerCase() === 'pembeli');
            const sellers = data.users.filter(user => user.role && user.role.toLowerCase() === 'seller');

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
                                <button class="btn small-btn warning-btn edit-btn" data-id="${user.id}">Edit</button>
                                <button class="btn small-btn danger-btn delete-btn" data-id="${user.id}" data-username="${user.username}">Hapus</button>
                            </td>
                        </tr>
                    `).join('');
                }
            }

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
                                <button class="btn small-btn warning-btn edit-btn" data-id="${user.id}">Edit</button>
                                <button class="btn small-btn danger-btn delete-btn" data-id="${user.id}" data-username="${user.username}">Hapus</button>
                            </td>
                        </tr>
                    `).join('');
                }
            }

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
                                <button class="btn small-btn warning-btn edit-btn" data-id="${user.id}">Edit</button>
                                <button class="btn small-btn danger-btn delete-btn" data-id="${user.id}" data-username="${user.username}">Hapus</button>
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

function handleUserActions(event) {
    const target = event.target;

    if (target.classList.contains('edit-btn')) {
        const userId = target.dataset.id;
        showEditUserPopup(userId);
        event.stopPropagation();
    }
    else if (target.classList.contains('delete-btn')) {
        const userId = target.dataset.id;
        const username = target.dataset.username;
        showDeleteUserPopup(userId, username);
        event.stopPropagation();
    }
}

function closePopup(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.style.display = 'none';
    }
}

function showLogoutPopup() {
    const logoutPopup = document.getElementById('logoutPopup');
    if (logoutPopup) {
        logoutPopup.style.display = 'flex';
    }
}

function logout() {
    localStorage.clear();
    window.location.href = '../index.html';
}

async function showEditUserPopup(userId) {
    const editUserPopup = document.getElementById('editUserPopup');
    const editUserIdSpan = document.getElementById('editUserId');
    const editUsernameInput = document.getElementById('editUsername');
    const editRoleSelect = document.getElementById('editRole');
    const editSaldoInput = document.getElementById('editSaldo');
    const editPasswordInput = document.getElementById('editPassword');
    const saveUserBtn = document.getElementById('saveUserBtn');
    const editSaldoFormGroup = document.getElementById('editSaldoFormGroup');

    if (!editUserPopup || !editUserIdSpan || !editUsernameInput || !editRoleSelect || !editSaldoInput || !editPasswordInput || !saveUserBtn || !editSaldoFormGroup) {
        console.error("Edit user popup elements not found!");
        return;
    }

    editUserIdSpan.textContent = 'Memuat...';
    editUsernameInput.value = '';
    editRoleSelect.value = 'pembeli';
    editSaldoInput.value = '';
    editPasswordInput.value = '';
    saveUserBtn.disabled = true;

    editSaldoFormGroup.style.display = 'none';

    editUserPopup.style.display = 'flex';

    try {
        const response = await fetch('../backend/admin_manage_users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_user_details', user_id: userId })
        });
        const data = await response.json();

        if (data.status === 'success' && data.user) {
            const user = data.user;
            editUserIdSpan.textContent = user.id;
            editUsernameInput.value = user.username;

            if (editRoleSelect.querySelector(`option[value="${user.role}"]`)) {
                   editRoleSelect.value = user.role;
                   if (user.role === 'pembeli' || user.role === 'seller') {
                       editSaldoFormGroup.style.display = 'block';
                       editSaldoInput.required = true;
                   } else {
                       editSaldoFormGroup.style.display = 'none';
                       editSaldoInput.required = false;
                   }
            } else {
                   console.warn(`Role "${user.role}" from backend not found in dropdown options.`);
                   editRoleSelect.value = 'pembeli';
                   const editSaldoFormGroup = document.getElementById('editSaldoFormGroup');
                   if (editSaldoFormGroup) {
                       editSaldoFormGroup.style.display = 'block';
                       editSaldoInput.required = true;
                   }
            }

            editSaldoInput.value = parseFloat(user.saldo || 0).toFixed(2);
            saveUserBtn.disabled = false;
            saveUserBtn.dataset.userId = userId;

            editRoleSelect.onchange = function() {
                   const editSaldoFormGroup = document.getElementById('editSaldoFormGroup');
                   if (editSaldoFormGroup) {
                       if (this.value === 'pembeli' || this.value === 'seller') {
                           editSaldoFormGroup.style.display = 'block';
                           editSaldoInput.required = true;
                       } else {
                           editSaldoFormGroup.style.display = 'none';
                           editSaldoInput.required = false;
                       }
                   }
            };

        } else {
            editUserIdSpan.textContent = userId;
            alert(`Gagal memuat detail pengguna: ${data.message || 'Unknown error'}`);
            closePopup('editUserPopup');
        }
    } catch (error) {
        console.error('Error fetching user details:', error);
        editUserIdSpan.textContent = userId;
        alert('Error memuat detail pengguna.');
        closePopup('editUserPopup');
    }
}

async function handleSaveUser(event) {
    const userId = event.target.dataset.userId;
    const username = document.getElementById('editUsername').value.trim();
    const role = document.getElementById('editRole').value;
    const password = document.getElementById('editPassword').value;
    const editSaldoInput = document.getElementById('editSaldo');
    const saldoInput = editSaldoInput.value;

    if (!userId || !username || !role) {
        alert('Data pengguna tidak lengkap.');
        return;
    }

      let saldo = null;

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

    const saveUserBtn = event.target;
    const originalButtonText = saveUserBtn.textContent;
    saveUserBtn.disabled = true;
    saveUserBtn.textContent = 'Menyimpan...';

    try {
        const response = await fetch('../backend/admin_manage_users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update_user',
                user_id: userId,
                username: username,
                role: role,
                saldo: (editSaldoFormGroup && editSaldoFormGroup.style.display !== 'none') ? saldo : undefined,
                password: password !== '' ? password : undefined
            })
        });
        const data = await response.json();

        if (data.status === 'success') {
            alert('Data pengguna berhasil diperbarui!');
            closePopup('editUserPopup');
            fetchUsers();
        } else {
            alert(`Gagal memperbarui data pengguna: ${data.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error updating user:', error);
        alert('Error saat memperbarui data pengguna.');
    } finally {
        saveUserBtn.disabled = false;
        saveUserBtn.textContent = originalButtonText;
        const editRoleSelect = document.getElementById('editRole');
        if (editRoleSelect) editRoleSelect.onchange = null;
    }
}

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
    deleteUsernameStrong.textContent = username;
    confirmDeleteUserBtn.dataset.userId = userId;

    deleteUserPopup.style.display = 'flex';
}

async function handleConfirmDeleteUser(event) {
    const userIdToDelete = event.target.dataset.userId;

    if (!userIdToDelete) {
        alert('User ID tidak ditemukan untuk dihapus.');
        return;
    }

    const confirmDeleteUserBtn = event.target;
    const originalButtonText = confirmDeleteUserBtn.textContent;
    confirmDeleteUserBtn.disabled = true;
    confirmDeleteUserBtn.textContent = 'Menghapus...';

    try {
        const response = await fetch('../backend/admin_manage_users.php', {
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
            closePopup('deleteUserPopup');
            fetchUsers();
        } else {
            alert(`Gagal menghapus pengguna: ${data.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error saat menghapus pengguna.');
    } finally {
        confirmDeleteUserBtn.disabled = false;
        confirmDeleteUserBtn.textContent = originalButtonText;
    }
}

function showAddUserPopup(role) {
    const popup = document.getElementById('addUserPopup');
    const roleSelect = document.getElementById('userRole');
    const saldoGroup = document.getElementById('saldoFormGroup');
    
    roleSelect.value = role;
    
    if (role === 'admin') {
        saldoGroup.style.display = 'none';
    } else {
        saldoGroup.style.display = 'block';
    }
    
    document.getElementById('addUserForm').reset();
    
    popup.style.display = 'flex';
}

function closeAddUserPopup() {
    const popup = document.getElementById('addUserPopup');
    popup.style.display = 'none';
}
