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
}

async function fetchOrders() {
    const ordersTableBody = document.querySelector('#ordersTable tbody');
    if (!ordersTableBody) return;

    ordersTableBody.innerHTML = '<tr><td colspan="5">Memuat daftar pesanan...</td></tr>';

    try {
        const response = await fetch('../backend/seller_dashboard.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_recent_orders' })
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

        row.innerHTML = `
            <td>#${order.id}</td>
            <td>${itemNames} (${totalItems} item)</td>
            <td>Rp ${parseFloat(order.total).toLocaleString('id-ID')}</td>
            <td><span class="status-label ${order.status.toLowerCase().replace(' ', '-')}">${order.status}</span></td>
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

    if (!orderId || !newStatus) return;

    try {
        const response = await fetch('../backend/seller_dashboard.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update_order_status',
                order_id: orderId,
                status: newStatus
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
    const username = sessionStorage.getItem('username') || 'User';
    const role = sessionStorage.getItem('role') || 'Unknown Role';

    const profileUsernameSpan = document.getElementById('profileUsername');
    const profileRoleSpan = document.getElementById('profileRole');
    const topbarUsernameSpan = document.querySelector('.navbar .top-nav a:first-child');
    const sidebarLogoutLink = document.getElementById('logoutLinkSidebar');

    if (profileUsernameSpan) profileUsernameSpan.textContent = username;
    if (profileRoleSpan) profileRoleSpan.textContent = role;

    if(sidebarLogoutLink) {
        sidebarLogoutLink.innerHTML = `<i class="uil uil-signout"></i> Logout (${username})`;
    }

    if(topbarUsernameSpan) {
        topbarUsernameSpan.innerHTML = `<i class="uil uil-user"></i> ${username} (${role})`;
    }
}

function logout() {
    sessionStorage.clear();
    window.location.href = '../index.html';
}

document.getElementById('newOrderStatus').value = currentStatus; 
