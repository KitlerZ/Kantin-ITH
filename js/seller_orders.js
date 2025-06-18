document.addEventListener('DOMContentLoaded', () => {
    fetchOrders();
    setupEventListeners();
    updateProfileInfo();
});

function setupEventListeners() {
    const ordersTableBody = document.querySelector('#ordersTable tbody');
    if (ordersTableBody) {
        ordersTableBody.addEventListener('click', handleTableActions);
    }

    document.querySelectorAll('.popup-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
            }
        });
    });

    const saveStatusBtn = document.getElementById('saveOrderStatusBtn');
    if (saveStatusBtn) {
        saveStatusBtn.addEventListener('click', handleSaveOrderStatus);
    }

    const orderStatusFilter = document.getElementById('orderStatusFilter');
    if (orderStatusFilter) {
        orderStatusFilter.addEventListener('change', fetchOrders);
    }
}

async function fetchOrders() {
    const ordersTableBody = document.querySelector('#ordersTable tbody');
    if (!ordersTableBody) return;

    ordersTableBody.innerHTML = '<tr><td colspan="5">Memuat daftar pesanan...</td></tr>';

    const sellerId = localStorage.getItem('loggedInUserId'); // Assuming userId is stored in localStorage
    const filterStatus = document.getElementById('orderStatusFilter').value; // Get selected filter

    if (!sellerId) {
        ordersTableBody.innerHTML = '<tr><td colspan="5">User ID penjual tidak ditemukan.</td></tr>';
        console.error('loggedInUserId not found in localStorage.');
        return;
    }

    try {
        const response = await fetch('../backend/orders.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'get_seller_orders',
                userId: sellerId,
                filterStatus: filterStatus
            })
        });
        const data = await response.json();

        if (data.status === 'success' && data.orders) {
            displayOrders(data.orders);
        } else {
            ordersTableBody.innerHTML = `<tr><td colspan="5">Gagal memuat pesanan: ${data.message || 'Unknown error'}</td></tr>`;
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
        ordersTableBody.innerHTML = '<tr><td colspan="5">Error memuat daftar pesanan.</td></tr>';
    }
}

function displayOrders(orders) {
    const ordersTableBody = document.querySelector('#ordersTable tbody');
    if (!ordersTableBody) return;

    ordersTableBody.innerHTML = '';

    if (orders.length === 0) {
        ordersTableBody.innerHTML = '<tr><td colspan="6">Belum ada pesanan.</td></tr>';
        return;
    }

    orders.forEach(order => {
        const row = document.createElement('tr');

        const totalItems = order.items ? order.items.reduce((sum, item) => sum + item.jumlah, 0) : 0;
        const itemNames = order.items && order.items.length > 0 ? order.items.map(item => item.nama).join(', ') : '-';

        const statusClass = order.status ? order.status.toLowerCase().replace(' ', '-') : '';

        row.innerHTML = `
            <td>#${order.id}</td>
            <td>${itemNames} (${totalItems} item)</td>
            <td>Rp ${parseFloat(order.total).toLocaleString('id-ID')}</td>
            <td><span class="status-label ${statusClass}">${order.status}</span></td>
            <td>
               ${order.status !== 'Selesai' && order.status !== 'Dibatalkan' ? `<button class="btn small-btn primary-btn status-btn" data-id="${order.id}">Update Status</button>` : ''}
            </td>
        `;
        ordersTableBody.appendChild(row);
    });
}

function handleTableActions(event) {
    const target = event.target;

    if (target.classList.contains('status-btn')) {
        const orderId = target.dataset.id;
        const currentStatus = target.closest('tr').querySelector('.status-label').textContent;
        
        const updateStatusOrderId = document.getElementById('updateStatusOrderId');
        if (updateStatusOrderId) {
            updateStatusOrderId.textContent = orderId;
        }
        
        const statusSelect = document.getElementById('newOrderStatus');
        if (statusSelect) {
            const options = Array.from(statusSelect.options);
            const matchingOption = options.find(option => 
                option.value.toLowerCase() === currentStatus.toLowerCase()
            );
            
            if (matchingOption) {
                statusSelect.value = matchingOption.value;
            }
        }
        
        const updateStatusPopup = document.getElementById('updateStatusPopup');
        if (updateStatusPopup) {
            updateStatusPopup.style.display = 'flex';
        }
        
        const saveStatusBtn = document.getElementById('saveOrderStatusBtn');
        if (saveStatusBtn) {
            saveStatusBtn.dataset.orderId = orderId;
        }
    }
}

async function handleSaveOrderStatus(event) {
    const orderId = event.target.dataset.orderId;
    const newStatus = document.getElementById('newOrderStatus').value;
    const sellerId = localStorage.getItem('loggedInUserId');

    if (!orderId || !newStatus || !sellerId) return;

    try {
        const response = await fetch('../backend/orders.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update_order_status',
                order_id: orderId,
                status: newStatus,
                userId: sellerId
            })
        });
        const data = await response.json();

        if (data.status === 'success') {
            alert(data.message);
            closePopup('updateStatusPopup');
            fetchOrders();
        } else {
            alert('Gagal mengupdate status pesanan: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        alert('Terjadi error saat mengupdate status pesanan.');
    }
}

function showLogout() {
    document.getElementById('logoutPopup').style.display = 'flex';
}

function closePopup(popupId) {
    document.getElementById(popupId).style.display = 'none';
}

function updateProfileInfo() {
    const username = localStorage.getItem('loggedInUsername') || 'User'; // Changed to localStorage
    const role = localStorage.getItem('loggedInUserRole') || 'Unknown Role'; // Changed to localStorage

    const profileUsernameSpan = document.getElementById('profileUsername');
    const profileRoleSpan = document.getElementById('profileRole');
    const topbarUsernameSpan = document.querySelector('.navbar .profile-name'); // Corrected selector
    // Removed sidebarLogoutLink as it's not present in the HTML

    if (profileUsernameSpan) profileUsernameSpan.textContent = username;
    if (profileRoleSpan) profileRoleSpan.textContent = role;

    if(topbarUsernameSpan) {
        topbarUsernameSpan.textContent = username; // Update the top right name
    }
    // Removed logic for sidebarLogoutLink and topbarUsernameSpan if they don't exist as per HTML
}

function logout() {
    localStorage.clear(); // Changed to localStorage
    window.location.href = '../index.html';
} 