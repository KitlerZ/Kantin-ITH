// File: js/seller_orders.js

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in and is a seller (optional, already in seller_common.js)
    // const role = sessionStorage.getItem('role');
    // if (!role || role !== 'seller') {
    //   window.location.href = '../index.html';
    //   return;
    // }

    fetchOrders();
    setupEventListeners();
    updateProfileInfo(); // Assuming updateProfileInfo is in seller_common.js
});

function setupEventListeners() {
    // Event delegation for action buttons in the table
    const ordersTableBody = document.querySelector('#ordersTable tbody');
    if (ordersTableBody) {
        ordersTableBody.addEventListener('click', handleTableActions);
    }

     // Close popups by clicking outside
    document.querySelectorAll('.popup-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
            }
        });
    });

    // Save status button in update status popup
    const saveStatusBtn = document.getElementById('saveOrderStatusBtn');
    if (saveStatusBtn) {
        saveStatusBtn.addEventListener('click', handleSaveOrderStatus);
    }
}

// --- FETCH ORDERS ---
async function fetchOrders() {
    const ordersTableBody = document.querySelector('#ordersTable tbody');
    if (!ordersTableBody) return;

    ordersTableBody.innerHTML = '<tr><td colspan="5">Memuat daftar pesanan...</td></tr>';

    try {
        const response = await fetch('../backend/seller_dashboard.php', { // Using seller_dashboard.php for fetching orders for now
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_recent_orders' }) // Using the existing get_recent_orders action
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

// --- DISPLAY ORDERS ---
function displayOrders(orders) {
    const ordersTableBody = document.querySelector('#ordersTable tbody');
    if (!ordersTableBody) return;

    ordersTableBody.innerHTML = ''; // Clear loading/placeholder row

    if (orders.length === 0) {
        // colspan 6 karena ada 6 kolom header di thead
        ordersTableBody.innerHTML = '<tr><td colspan="6">Belum ada pesanan.</td></tr>';
        return;
    }

    orders.forEach(order => {
        const row = document.createElement('tr');

        // Hitung total jumlah item dalam pesanan ini
        const totalItems = order.items ? order.items.reduce((sum, item) => sum + item.jumlah, 0) : 0;
        // Gabungkan nama-nama item
        const itemNames = order.items && order.items.length > 0 ? order.items.map(item => item.nama).join(', ') : '-';

        // Buat sel <td> sesuai dengan header <th> di seller/daftar_pesanan.html (ID, Nama Pesanan, Total Harga, Status, Aksi)
        row.innerHTML = `
            <td>#${order.id}</td>
            <td>${itemNames} (${totalItems} item)</td>
            <td>Rp ${parseFloat(order.total).toLocaleString('id-ID')}</td>
            <td><span class="status-label ${order.status.toLowerCase().replace(' ', '-')}">${order.status}</span></td>
            <td>
               ${order.status !== 'Selesai' && order.status !== 'Dibatalkan' ? `<button class="btn small-btn icon-btn primary-btn status-btn" data-id="${order.id}"><i class="uil uil-sync"></i></button>` : ''}
            </td>
        `;
        ordersTableBody.appendChild(row);
    });
}

// --- HANDLE TABLE ACTIONS (Update Status) ---
function handleTableActions(event) {
    const target = event.target;

    // Handle Update Status Button Click
    if (target.classList.contains('status-btn')) {
        const orderId = target.dataset.id;
        const currentStatus = target.closest('tr').querySelector('.status-label').textContent;
        
        // Update the popup content
        const updateStatusOrderId = document.getElementById('updateStatusOrderId');
        if (updateStatusOrderId) {
            updateStatusOrderId.textContent = orderId;
        }
        
        // Set current status in the dropdown
        const statusSelect = document.getElementById('newOrderStatus');
        if (statusSelect) {
            // Find the option that matches the current status
            const options = Array.from(statusSelect.options);
            const matchingOption = options.find(option => 
                option.value.toLowerCase() === currentStatus.toLowerCase()
            );
            
            if (matchingOption) {
                statusSelect.value = matchingOption.value;
            }
        }
        
        // Show the popup
        const updateStatusPopup = document.getElementById('updateStatusPopup');
        if (updateStatusPopup) {
            updateStatusPopup.style.display = 'flex';
        }
        
        // Store order ID for saving
        const saveStatusBtn = document.getElementById('saveOrderStatusBtn');
        if (saveStatusBtn) {
            saveStatusBtn.dataset.orderId = orderId;
        }
    }
}

// --- HANDLE SAVE ORDER STATUS ---
async function handleSaveOrderStatus(event) {
    const orderId = event.target.dataset.orderId;
    const newStatus = document.getElementById('newOrderStatus').value;

    if (!orderId || !newStatus) return;

    try {
        const response = await fetch('../backend/seller_dashboard.php', { // Using seller_dashboard.php for updating status
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
            alert(data.message); // Use alert for now
            closePopup('updateStatusPopup'); // Close the popup
            fetchOrders(); // Refresh the order list
        } else {
            alert('Gagal mengupdate status pesanan: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        alert('Terjadi error saat mengupdate status pesanan.');
    }
}

// --- POPUP FUNCTIONS (Assuming these are common in seller_common.js) ---
// function showLogout() { ... }
// function closePopup(popupId) { ... }
// function updateProfileInfo() { ... }
// function logout() { ... } 

document.getElementById('newOrderStatus').value = currentStatus; // Try to set current stat 