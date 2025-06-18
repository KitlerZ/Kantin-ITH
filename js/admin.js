document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    updateProfileInfo();

    // Check if the current page is manage_users.html before setting up user management listeners and fetching users
    if (window.location.pathname.includes('/admin/manage_users.html')) {
        fetchUsers();
        setupUserManagementEventListeners(); // New function for specific listeners
    } else if (window.location.pathname.includes('/admin/topup.html')) {
        loadAdminTopups(); // Load topup data for admin
        setupAdminTopupManagementEventListeners(); // Setup listeners for approve/reject
    } else if (window.location.pathname.includes('/admin/saldo.html')) {
        updateAdminSaldo();
        loadTransactionHistory();
    } else if (window.location.pathname.includes('/admin/seller_bills.html')) {
        updateAdminSaldo();
        loadBills();
        loadSellersForDropdown(); // Load sellers for the add bill dropdown
        document.getElementById('saveNewBillBtn').addEventListener('click', saveNewBill);
        document.getElementById('bills-list').addEventListener('click', handleBillActions);
    }

    setupGeneralEventListeners(); // New function for general listeners like popups and logout

    // Fetch and display admin stats on page load
    // fetchAdminStatsManageUsers(); // Removed as per user request

    // --- Reverted sidebar active link logic ---
    const currentPath = window.location.pathname.split('/').pop();
    const sidebarLinks = document.querySelectorAll('.sidebar nav > a');
    sidebarLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (linkPath === currentPath) {
            link.classList.add('active');
        }
    });
    // --- End reverted sidebar active link logic ---
});

function checkAdminAuth() {
    const userRole = localStorage.getItem('loggedInUserRole');
    if (!userRole || userRole !== 'admin') {
        window.location.href = "../index.html";
    }
}

function setupGeneralEventListeners() {
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', confirmLogout);
    }

    // Add event listeners for general popups (close buttons and overlay clicks)
    document.querySelectorAll('.popup-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closePopup(overlay.id);
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

    // Attach click listener to all elements with the class 'logout-link' to show the logout popup
    document.querySelectorAll('.logout-link').forEach(link => {
        link.addEventListener('click', showLogoutPopup);
    });
}

function setupUserManagementEventListeners() {
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

    const saveUserBtn = document.getElementById('saveUserBtn');
    if (saveUserBtn) {
        saveUserBtn.addEventListener('click', handleSaveUser);
    }

    const confirmDeleteUserBtn = document.getElementById('confirmDeleteUserBtn');
    if (confirmDeleteUserBtn) {
        confirmDeleteUserBtn.addEventListener('click', handleConfirmDeleteUser);
    }

    const saveNewUserBtn = document.getElementById('saveNewUserBtn');
    if (saveNewUserBtn) {
        saveNewUserBtn.addEventListener('click', handleAddNewUser);
    }
}

async function fetchUsers() {
    try {
        const response = await fetch('../backend/admin_manage_users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_all_users' })
        });
        const data = await response.json();

        const adminTableBody = document.querySelector('#adminTable tbody');
        const buyerTableBody = document.querySelector('#buyerTable tbody');
        const sellerTableBody = document.querySelector('#sellerTable tbody');

        if (data.status === 'success' && Array.isArray(data.users)) {
            // Normalize role values for comparison
            const admins = data.users.filter(user => user.role && user.role.toLowerCase().trim() === 'admin');
            const buyers = data.users.filter(user => user.role && user.role.toLowerCase().trim() === 'buyer');
            const sellers = data.users.filter(user => user.role && user.role.toLowerCase().trim() === 'seller');

            console.log('Filtered users:', { admins, buyers, sellers }); // Debug log

            if (adminTableBody) {
                if (admins.length === 0) {
                    adminTableBody.innerHTML = '<tr><td colspan="5">Tidak ada pengguna admin.</td></tr>';
                } else {
                    adminTableBody.innerHTML = admins.map(user => `
                        <tr>
                            <td>${user.username}</td>
                            <td>********</td>
                            <td>${getDisplayRole(user.role)}</td>
                            <td>${user.saldo !== undefined ? parseFloat(user.saldo).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' }) : 'N/A'}</td>
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
                            <td>********</td>
                            <td>${getDisplayRole(user.role)}</td>
                            <td>${user.saldo !== undefined ? parseFloat(user.saldo).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' }) : 'N/A'}</td>
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
                            <td>********</td>
                            <td>${getDisplayRole(user.role)}</td>
                            <td>${user.saldo !== undefined ? parseFloat(user.saldo).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' }) : 'N/A'}</td>
                            <td>
                                <button class="btn small-btn warning-btn edit-btn" data-id="${user.id}">Edit</button>
                                <button class="btn small-btn danger-btn delete-btn" data-id="${user.id}" data-username="${user.username}">Hapus</button>
                            </td>
                        </tr>
                    `).join('');
                }
            }
        } else {
            console.error('Error fetching users:', data.message);
            showError('Gagal memuat daftar pengguna.');
        }
    } catch (error) {
        console.error('Error fetching users:', error);
        showError('Terjadi kesalahan saat memuat daftar pengguna.');
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
        popup.classList.remove('active');
    }
}

function showLogoutPopup(event) {
    // Prevent the default link behavior
    if (event) {
        event.preventDefault();
    }
    const logoutPopup = document.getElementById('logoutPopup');
    if (logoutPopup) {
        const logoutUserName = document.getElementById('logoutUserName');
        const logoutUserRole = document.getElementById('logoutUserRole');
        const loggedInUsername = localStorage.getItem('loggedInUsername');
        const loggedInUserRole = localStorage.getItem('loggedInUserRole');

        if (logoutUserName && loggedInUsername) {
            logoutUserName.textContent = loggedInUsername;
        }
        if (logoutUserRole && loggedInUserRole) {
            logoutUserRole.textContent = loggedInUserRole;
        }

        logoutPopup.classList.add('active');
    }
}

async function confirmLogout() {
    try {
        // Call the backend logout script (now using login.php for consistency)
        const response = await fetch('../backend/login.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'logout' })
        });

        const result = await response.json();

        if (result.status === 'success') {
            console.log('Server logout successful.', result.message);
            // Proceed with client-side logout
            localStorage.clear();
            window.location.href = '../index.html';
        } else {
            console.error('Server logout failed:', result.message);
            showError(`Server logout failed: ${result.message}`);
        }
    } catch (error) {
        console.error('Error during logout:', error);
        showError('Terjadi kesalahan saat logout.');
    }
}

function showSuccess(message) {
    console.log("Showing success popup with message:", message); // DEBUG LOG
    const successPopup = document.getElementById('successPopup');
    const successMessageElement = document.getElementById('successMessage');
    successMessageElement.textContent = message;
    successPopup.style.display = 'flex';
    setTimeout(() => {
        successPopup.style.display = 'none';
    }, 5000);
}

function showError(message) {
    console.log("Showing error popup with message:", message); // DEBUG LOG
    const errorPopup = document.getElementById('errorPopup');
    const errorMessageElement = document.getElementById('errorMessage');
    errorMessageElement.textContent = message;
    errorPopup.style.display = 'flex';
    setTimeout(() => {
        errorPopup.style.display = 'none';
    }, 5000);
}

// --- Admin Top Up Management Functions ---

async function loadAdminTopups() {
    const pendingTableBody = document.querySelector('#pending-topup-table tbody');
    const allHistoryTableBody = document.querySelector('#all-topup-history-table tbody');
    const noPendingMessage = document.getElementById('no-pending-topups');
    const noAllMessage = document.getElementById('no-all-topups');

    if (pendingTableBody) pendingTableBody.innerHTML = '<tr><td colspan="6">Memuat permintaan top up...</td></tr>';
    if (allHistoryTableBody) allHistoryTableBody.innerHTML = '<tr><td colspan="6">Memuat riwayat top up...</td></tr>';

    try {
        // Fetch pending top-ups
        const pendingResponse = await fetch('../backend/admin_topup_handler.php?action=get_pending_topups');
        const pendingData = await pendingResponse.json();

        if (pendingData.status === 'success' && Array.isArray(pendingData.data)) {
            if (pendingData.data.length === 0) {
                noPendingMessage.style.display = 'block';
                pendingTableBody.innerHTML = '';
            } else {
                noPendingMessage.style.display = 'none';
                pendingTableBody.innerHTML = pendingData.data.map(item => {
                    const formattedAmount = parseInt(item.jumlah).toLocaleString('id-ID');
                    const date = new Date(item.created_at);
                    const formattedDate = date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    return `
                        <tr>
                            <td>${item.id}</td>
                            <td>${item.pembeli_id}</td>
                            <td>${item.username}</td>
                            <td>Rp ${formattedAmount}</td>
                            <td>${formattedDate}</td>
                            <td>
                                <button class="btn small-btn success-btn approve-topup" data-id="${item.id}">Approve</button>
                                <button class="btn small-btn danger-btn reject-topup" data-id="${item.id}">Reject</button>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        } else {
            pendingTableBody.innerHTML = `<tr><td colspan="6">Error memuat permintaan pending: ${pendingData.message || 'Unknown error'}</td></tr>`;
            noPendingMessage.style.display = 'none';
        }

        // Fetch all top-up history
        const allResponse = await fetch('../backend/admin_topup_handler.php?action=get_all_topups');
        const allData = await allResponse.json();

        if (allData.status === 'success' && Array.isArray(allData.data)) {
            if (allData.data.length === 0) {
                noAllMessage.style.display = 'block';
                allHistoryTableBody.innerHTML = '';
            } else {
                noAllMessage.style.display = 'none';
                allHistoryTableBody.innerHTML = allData.data.map(item => {
                    const formattedAmount = parseInt(item.jumlah).toLocaleString('id-ID');
                    const date = new Date(item.created_at);
                    const formattedDate = date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    const statusText = getStatusText(item.status);
                    const statusClass = `status-${item.status}`;
                    return `
                        <tr>
                            <td>${item.id}</td>
                            <td>${item.pembeli_id}</td>
                            <td>${item.username}</td>
                            <td>Rp ${formattedAmount}</td>
                            <td>${formattedDate}</td>
                            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                        </tr>
                    `;
                }).join('');
            }
        } else {
            allHistoryTableBody.innerHTML = `<tr><td colspan="6">Error memuat riwayat top up: ${allData.message || 'Unknown error'}</td></tr>`;
            noAllMessage.style.display = 'none';
        }

    } catch (error) {
        console.error('Error loading admin top-ups:', error);
        showError('Gagal memuat data top up admin.');
        if (pendingTableBody) pendingTableBody.innerHTML = '<tr><td colspan="6">Gagal memuat data.</td></tr>';
        if (allHistoryTableBody) allHistoryTableBody.innerHTML = '<tr><td colspan="6">Gagal memuat data.</td></tr>';
        noPendingMessage.style.display = 'block';
        noAllMessage.style.display = 'block';
    }
}

function setupAdminTopupManagementEventListeners() {
    const pendingTable = document.getElementById('pending-topup-table');
    if (pendingTable) {
        pendingTable.addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('approve-topup')) {
                const topupId = target.dataset.id;
                handleTopupAction(topupId, 'disetujui');
            } else if (target.classList.contains('reject-topup')) {
                const topupId = target.dataset.id;
                handleTopupAction(topupId, 'ditolak');
            }
        });
    }
}

async function handleTopupAction(topupId, newStatus) {
    if (!confirm(`Apakah Anda yakin ingin ${newStatus === 'disetujui' ? 'menyetujui' : 'menolak'} top up ini (ID: ${topupId})?`)) {
        return;
    }

    try {
        const formData = new FormData();
        formData.append('action', 'update_topup_status');
        formData.append('topupId', topupId);
        formData.append('newStatus', newStatus);

        const response = await fetch('../backend/admin_topup_handler.php', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (result.status === 'success') {
            showSuccess(result.message);
            loadAdminTopups(); // Reload tables after successful action
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error('Error updating topup status:', error);
        showError('Terjadi kesalahan saat memperbarui status top up.');
    }
}

function getStatusText(status) {
    switch(status) {
        case 'menunggu': return 'Menunggu Konfirmasi';
        case 'disetujui': return 'Dikonfirmasi';
        case 'ditolak': return 'Ditolak';
        default: return status;
    }
}

// Placeholder functions from previous context, might need review for admin context
function updateAdminSaldo() {
    // Implement actual logic to fetch admin saldo if needed
    console.log("Updating admin saldo placeholder.");
    document.getElementById('saldo').textContent = 'Rp 999.999.999'; // Placeholder
}

function loadTransactionHistory() {
    // Implement actual logic to fetch admin transaction history if needed
    console.log("Loading admin transaction history placeholder.");
    // Example of populating a table:
    // const tableBody = document.querySelector('#adminTransactionTable tbody');
    // if (tableBody) tableBody.innerHTML = '<tr><td colspan="4">Belum ada transaksi.</td></tr>';
}

function updateProfileInfo() {
    const loggedInUsername = localStorage.getItem('loggedInUsername');
    const loggedInUserRole = localStorage.getItem('loggedInUserRole');
    const profileNameElement = document.querySelector('.profile-name');
    const profileInfoUserName = document.getElementById('profileInfoUserName');
    const profileInfoUserRole = document.getElementById('profileInfoUserRole');
    const profileInfoEmail = document.getElementById('profileInfoEmail');
    const profileInfoPhone = document.getElementById('profileInfoPhone');

    if (profileNameElement) profileNameElement.textContent = loggedInUsername || 'Admin';
    if (profileInfoUserName) profileInfoUserName.textContent = loggedInUsername || 'Admin';
    if (profileInfoUserRole) profileInfoUserRole.textContent = loggedInUserRole || 'Administrator';
    if (profileInfoEmail) profileInfoEmail.textContent = localStorage.getItem('loggedInUserEmail') || 'Belum Tersedia';
    if (profileInfoPhone) profileInfoPhone.textContent = localStorage.getItem('loggedInUserPhone') || 'Belum Tersedia';
}

// --- User Management Functions ---

function showAddUserPopup(role) {
    const addUserPopup = document.getElementById('addUserPopup');
    const addUsernameInput = document.getElementById('addUsername');
    const addSaldoInput = document.getElementById('addSaldo');
    const addPasswordInput = document.getElementById('addPassword');

    if (addUserPopup) {
        addUsernameInput.value = '';
        addPasswordInput.value = '';
        addSaldoInput.value = '0'; // Set default saldo to 0
        addUserPopup.dataset.currentRole = role; // Store the role in a data attribute
        addUserPopup.classList.add('active'); // Use class 'active' to show popup
    }
}

// Helper function to convert display role to database role
function getDisplayRole(role) {
    const roleMap = {
        'buyer': 'Pembeli',
        'seller': 'Penjual',
        'admin': 'Admin'
    };
    return roleMap[role] || role;
}

// Helper function to convert database role to display role
function getDatabaseRole(role) {
    const roleMap = {
        'Pembeli': 'buyer',
        'Penjual': 'seller',
        'Admin': 'admin'
    };
    return roleMap[role] || role;
}

async function handleAddNewUser() {
    const addUsername = document.getElementById('addUsername').value;
    const addUserPopup = document.getElementById('addUserPopup');
    const addRole = addUserPopup.dataset.currentRole; // Get role from data attribute
    const addPassword = document.getElementById('addPassword').value;
    const addSaldo = document.getElementById('addSaldo').value;

    console.log("Attempting to add new user with:", {
        username: addUsername,
        role: addRole,
        saldo: addSaldo
    }); // DEBUG LOG

    if (!addUsername || !addPassword || !addRole) {
        showError('Username, Password, dan Role tidak boleh kosong.');
        return;
    }

    try {
        const response = await fetch('../backend/admin_manage_users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'add_user',
                username: addUsername,
                password: addPassword,
                role: addRole, // Role is already in database format
                saldo: parseFloat(addSaldo) // Parse saldo as float
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            showSuccess('Pengguna berhasil ditambahkan.');
            closePopup('addUserPopup');
            fetchUsers(); // Refresh the user list
        } else {
            showError(`Gagal menambahkan pengguna: ${data.message}`);
        }
    } catch (error) {
        console.error('Error adding new user:', error);
        showError('Terjadi kesalahan saat menambahkan pengguna.');
    }
}

async function showEditUserPopup(userId) {
    const editUserPopup = document.getElementById('editUserPopup');
    const editUserIdSpan = document.getElementById('editUserId');
    const editUsernameInput = document.getElementById('editUsername');
    const editRoleSelect = document.getElementById('editRole');
    const editPasswordInput = document.getElementById('editPassword');
    const editSaldoFormGroup = document.getElementById('editSaldoFormGroup');
    const editSaldoInput = document.getElementById('editSaldo');

    try {
        const response = await fetch('../backend/admin_manage_users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'get_user_details',
                userId: userId 
            })
        });
        const data = await response.json();

        if (data.status === 'success' && data.user) {
            const user = data.user;
            editUserIdSpan.textContent = user.id;
            editUsernameInput.value = user.username;
            editRoleSelect.value = user.role; // Role is already in database format
            editPasswordInput.value = ''; // Clear password field

            // Show/hide saldo input based on role
            if (user.role === 'buyer' || user.role === 'seller') {
                if (editSaldoFormGroup) editSaldoFormGroup.style.display = 'block';
                if (editSaldoInput) editSaldoInput.value = user.saldo || 0;
            } else {
                if (editSaldoFormGroup) editSaldoFormGroup.style.display = 'none';
                if (editSaldoInput) editSaldoInput.value = 0;
            }
            editUserPopup.classList.add('active'); // Use class 'active' to show popup

            // Set data-id on save button for easy access
            const saveUserBtn = document.getElementById('saveUserBtn');
            if (saveUserBtn) {
                saveUserBtn.dataset.id = userId;
            }
        } else {
            showError(`Gagal memuat detail pengguna: ${data.message || 'Pengguna tidak ditemukan.'}`);
        }
    } catch (error) {
        console.error('Error fetching user details:', error);
        showError('Terjadi kesalahan saat memuat detail pengguna.');
    }
}

async function handleSaveUser() {
    const userId = document.getElementById('saveUserBtn').dataset.id;
    const username = document.getElementById('editUsername').value;
    const role = document.getElementById('editRole').value;
    const password = document.getElementById('editPassword').value;
    const saldo = document.getElementById('editSaldo').value;

    if (!username || !role) {
        showError('Username dan Role tidak boleh kosong.');
        return;
    }

    try {
        const payload = {
            action: 'update_user',
            userId: userId,
            username: username,
            role: role // Role is already in database format
        };

        if (password) {
            payload.password = password;
        }

        // Add saldo to payload if the role is buyer or seller
        if (role === 'buyer' || role === 'seller') {
            payload.saldo = parseFloat(saldo);
        }

        console.log('Sending update payload:', payload); // Debug log

        const response = await fetch('../backend/admin_manage_users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log('Update response:', data); // Debug log

        if (data.status === 'success') {
            showSuccess('Pengguna berhasil diperbarui.');
            closePopup('editUserPopup');
            fetchUsers(); // Refresh the user list
        } else {
            showError(`Gagal memperbarui pengguna: ${data.message}`);
        }
    } catch (error) {
        console.error('Error saving user:', error);
        showError('Terjadi kesalahan saat memperbarui pengguna.');
    }
}

function showDeleteUserPopup(userId, username) {
    document.getElementById('deleteUserId').textContent = userId;
    document.getElementById('deleteUsername').textContent = username;
    document.getElementById('deleteUserPopup').classList.add('active'); // Use class 'active' to show popup
}

async function handleConfirmDeleteUser() {
    const userId = document.getElementById('deleteUserId').textContent;

    try {
        const response = await fetch('../backend/admin_manage_users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_user', userId: userId })
        });
        const result = await response.json();

        if (result.status === 'success') {
            showSuccess(result.message);
            closePopup('deleteUserPopup');
            fetchUsers(); // Reload users after deleting
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showError('Terjadi kesalahan saat menghapus pengguna.');
    }
}

// Admin stats for manage_users page (formerly used, now adapted for safety)
async function fetchAdminStatsManageUsers() {
    // Check if the target elements for admin stats exist on the current page
    const mainAdminBalanceElement = document.getElementById('mainAdminBalance');
    const totalTransactionsElement = document.getElementById('totalTransactions');

    // If elements are not found, it means we are likely not on admin/saldo.html,
    // so we can safely exit to prevent TypeErrors.
    if (!mainAdminBalanceElement || !totalTransactionsElement) {
        console.log("Admin stats elements not found on this page. Skipping fetchAdminStatsManageUsers.");
        return;
    }

    try {
        const response = await fetch('../backend/admin_saldo.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_admin_stats' })
        });
        const data = await response.json();

        if (data.status === 'success') {
            // Update the main admin balance display
            if (mainAdminBalanceElement) {
                mainAdminBalanceElement.textContent = parseFloat(data.totalIncome).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' });
            }
            // Update the total transactions display
            if (totalTransactionsElement) {
                totalTransactionsElement.textContent = data.totalTransactions;
            }
        } else {
            console.error('Failed to fetch admin stats:', data.message);
            // Optionally display an error message on the UI
        }
    } catch (error) {
        console.error('Error fetching admin stats:', error);
    }
}

async function loadSellersForDropdown() {
    try {
        const response = await fetch('../backend/admin_manage_users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_all_users' }) // Fetch all users
        });
        const data = await response.json();

        const billSellerDropdown = document.getElementById('billSeller');
        if (billSellerDropdown) {
            billSellerDropdown.innerHTML = '<option value="">Pilih Penjual</option>'; // Default option
            if (data.status === 'success' && Array.isArray(data.users)) {
                const sellers = data.users.filter(user => user.role && user.role.toLowerCase().trim() === 'seller');
                if (sellers.length > 0) {
                    sellers.forEach(seller => {
                        const option = document.createElement('option');
                        option.value = seller.id;
                        option.textContent = seller.username;
                        billSellerDropdown.appendChild(option);
                    });
                } else {
                    billSellerDropdown.innerHTML = '<option value="">Tidak ada penjual tersedia</option>';
                }
            } else {
                console.error('Error fetching sellers:', data.message);
                showError('Gagal memuat daftar penjual.');
            }
        }
    } catch (error) {
        console.error('Error fetching sellers for dropdown:', error);
        showError('Terjadi kesalahan saat memuat daftar penjual.');
    }
}

async function saveNewBill() {
    const sellerId = document.getElementById('billSeller').value;
    const billAmount = document.getElementById('billAmount').value;
    const billMonth = document.getElementById('billMonth').value;
    const billYear = document.getElementById('billYear').value;

    if (!sellerId || !billAmount || !billMonth || !billYear) {
        showError('Semua bidang harus diisi.');
        return;
    }

    if (parseFloat(billAmount) <= 0) {
        showError('Jumlah tagihan harus lebih besar dari nol.');
        return;
    }

    try {
        const response = await fetch('../backend/admin_manage_bills.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'add_bill',
                seller_id: sellerId,
                total: parseFloat(billAmount),
                periode_bulan: parseInt(billMonth),
                periode_tahun: parseInt(billYear)
            })
        });
        const data = await response.json();

        if (data.status === 'success') {
            showSuccess(data.message);
            closePopup('addBillPopup');
            loadBills(); // Reload bills after adding
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Error adding new bill:', error);
        showError('Terjadi kesalahan saat menambahkan tagihan baru.');
    }
}

async function loadBills() {
    const filterStatus = document.getElementById('filter-status').value;
    const filterMonth = document.getElementById('filter-month').value;
    const billListContainer = document.getElementById('bills-list');

    // Ensure bills-list exists before proceeding
    if (!billListContainer) {
        console.error("Element with ID 'bills-list' not found.");
        return;
    }

    try {
        const response = await fetch('../backend/admin_manage_bills.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_all_bills' }) // Currently fetches all bills, filtering will be client-side for now
        });
        const data = await response.json();

        if (data.status === 'success' && Array.isArray(data.bills)) {
            let filteredBills = data.bills;

            // Apply status filter
            if (filterStatus !== 'all') {
                filteredBills = filteredBills.filter(bill => bill.status === filterStatus);
            }

            // Apply month filter
            if (filterMonth !== 'all') {
                filteredBills = filteredBills.filter(bill => {
                    const billDate = new Date(bill.tanggal);
                    return billDate.getMonth() + 1 === parseInt(filterMonth);
                });
            }

            if (filteredBills.length === 0) {
                billListContainer.innerHTML = '<p class="no-records">Tidak ada tagihan ditemukan.</p>';
            } else {
                let tableHtml = `
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Penjual</th>
                                    <th>Periode</th>
                                    <th>Jumlah</th>
                                    <th>Status</th>
                                    <th>Tanggal Dibuat</th>
                                    <th>Tanggal Dibayar</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                filteredBills.forEach(bill => {
                    const formattedAmount = parseFloat(bill.total).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' });
                    const formattedDateCreated = new Date(bill.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                    const formattedDatePaid = bill.tanggal_dibayar ? new Date(bill.tanggal_dibayar).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
                    const statusClass = bill.status === 'paid' ? 'status-paid' : 'status-pending';
                    const statusText = bill.status === 'paid' ? 'Sudah Dibayar' : 'Belum Dibayar';
                    const payButton = bill.status === 'pending' ?
                        `<button class="btn small-btn primary-btn pay-bill-btn" data-id="${bill.id}">Bayar</button>` : '';

                    tableHtml += `
                        <tr>
                            <td>${bill.id}</td>
                            <td>${bill.seller_username}</td>
                            <td>${getMonthName(bill.periode_bulan)} ${bill.periode_tahun}</td>
                            <td>${formattedAmount}</td>
                            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                            <td>${formattedDateCreated}</td>
                            <td>${formattedDatePaid}</td>
                            <td>${payButton}</td>
                        </tr>
                    `;
                });
                tableHtml += `
                            </tbody>
                        </table>
                    </div>
                `;
                billListContainer.innerHTML = tableHtml;
            }
        } else {
            console.error('Error fetching bills:', data.message);
            billListContainer.innerHTML = '<p class="no-records">Gagal memuat daftar tagihan.</p>';
        }
    } catch (error) {
        console.error('Error loading bills:', error);
        billListContainer.innerHTML = '<p class="no-records">Terjadi kesalahan saat memuat daftar tagihan.</p>';
    }
}

function handleBillActions(event) {
    const target = event.target;
    if (target.classList.contains('pay-bill-btn')) {
        const billId = target.dataset.id;
        showConfirmPayBillPopup(billId);
    }
}

function showConfirmPayBillPopup(billId) {
    const confirmPayBillBtn = document.getElementById('confirmPayBillBtn');
    if (confirmPayBillBtn) {
        confirmPayBillBtn.dataset.billId = billId;
        document.getElementById('payBillPopup').classList.add('active');
    }
}

async function confirmPayBill() {
    const billId = document.getElementById('confirmPayBillBtn').dataset.billId;
    try {
        const response = await fetch('../backend/admin_manage_bills.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update_bill_status',
                bill_id: billId,
                new_status: 'paid'
            })
        });
        const data = await response.json();

        if (data.status === 'success') {
            showSuccess(data.message);
            closePopup('payBillPopup');
            loadBills(); // Reload bills after updating
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Error paying bill:', error);
        showError('Terjadi kesalahan saat memperbarui status tagihan.');
    }
}

function getMonthName(monthNumber) {
    const date = new Date();
    date.setMonth(monthNumber - 1); // Month is 0-indexed
    return date.toLocaleString('id-ID', { month: 'long' });
}

window.showAddBillPopup = function() {
    document.getElementById('addBillPopup').classList.add('active');
}
