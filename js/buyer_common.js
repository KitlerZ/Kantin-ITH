// Common functions for buyer module

function showLogoutPopup(event) {
    if (event) event.preventDefault();
    const logoutPopup = document.getElementById('logoutPopup');
    if (logoutPopup) {
        const username = localStorage.getItem('loggedInUsername') || 'Pengguna';
        const role = localStorage.getItem('loggedInUserRole') || '';
        const logoutUserName = document.getElementById('logoutUserName');
        const logoutUserRole = document.getElementById('logoutUserRole');
        if (logoutUserName) logoutUserName.textContent = username;
        if (logoutUserRole) logoutUserRole.textContent = role;
        logoutPopup.classList.add('active');
    }
}

function closePopup(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.classList.remove('active');
    }
}

async function confirmLogout() {
    try {
        const response = await fetch('../backend/login.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'logout' })
        });
        const data = await response.json();
        if (data.status === 'success') {
            localStorage.clear();
            window.location.href = '../index.html';
        } else {
            alert('Gagal logout: ' + (data.message || 'Terjadi kesalahan.'));
        }
    } catch (error) {
        alert('Terjadi error koneksi saat logout.');
        localStorage.clear();
        window.location.href = '../index.html';
    }
}

async function submitBankTransferTopup() {
    const topupAmountInput = document.getElementById('topupAmount');
    let amount = parseInt(topupAmountInput.value);

    if (isNaN(amount) || amount < 10000) {
        showError('Jumlah top up minimal Rp 10.000.');
        return;
    }

    const userId = localStorage.getItem('loggedInUserId');
    const username = localStorage.getItem('loggedInUsername');

    if (!userId || !username) {
        showError('Anda harus login untuk melakukan top up.');
        return;
    }

    try {
        const response = await fetch('../backend/topup.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'submit_topup_request', userId, amount, method: 'transfer' })
        });
        const data = await response.json();

        if (data.status === 'success') {
            showSuccess('Permintaan top up berhasil diajukan! Menunggu konfirmasi admin.');
            topupAmountInput.value = ''; // Clear input after successful submission
            loadTopupHistory(); // Reload history to show new request
        } else {
            showError(data.message || 'Gagal mengajukan top up. Silakan coba lagi.');
        }
    } catch (error) {
        console.error('Error during bank transfer topup request:', error);
        showError('Terjadi kesalahan jaringan saat mengajukan top up.');
    }
}

async function topupCash() {
    const topupAmountInput = document.getElementById('topupAmount');
    let amount = parseInt(topupAmountInput.value);

    if (isNaN(amount) || amount < 10000) {
        showError('Jumlah top up minimal Rp 10.000.');
        return;
    }

    const userId = localStorage.getItem('loggedInUserId');
    const username = localStorage.getItem('loggedInUsername');

    if (!userId || !username) {
        showError('Anda harus login untuk melakukan top up.');
        return;
    }

    try {
        const response = await fetch('../backend/topup.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'submit_topup_request', userId, amount, method: 'cash' })
        });
        const data = await response.json();

        if (data.status === 'success') {
            showSuccess('Permintaan top up tunai berhasil diajukan! Silakan lakukan pembayaran di kasir.');
            topupAmountInput.value = ''; // Clear input after successful submission
            loadTopupHistory(); // Reload history to show new request
        } else {
            showError(data.message || 'Gagal mengajukan top up tunai. Silakan coba lagi.');
        }
    } catch (error) {
        console.error('Error during cash topup request:', error);
        showError('Terjadi kesalahan jaringan saat mengajukan top up tunai.');
    }
}

function showSuccess(message) {
    const successPopup = document.getElementById('successPopup');
    const successMessageElement = successPopup.querySelector('.success-message');
    successMessageElement.textContent = message;
    successPopup.style.display = 'block';
    setTimeout(() => {
        successPopup.style.display = 'none';
    }, 5000);
}

function showError(message) {
    const errorPopup = document.getElementById('errorPopup');
    const errorMessageElement = document.getElementById('errorMessage');
    errorMessageElement.textContent = message;
    errorPopup.style.display = 'block';
    setTimeout(() => {
        errorPopup.style.display = 'none';
    }, 5000);
}

document.addEventListener('DOMContentLoaded', function() {
    // Event listener untuk semua tombol logout
    document.querySelectorAll('.logout-link').forEach(link => {
        link.addEventListener('click', showLogoutPopup);
    });
    // Event listener tombol konfirmasi di popup
    const confirmBtn = document.querySelector('#logoutPopup .confirm-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmLogout);
    }
    // Event listener tombol batal/close di popup
    const cancelBtn = document.querySelector('#logoutPopup .cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() { closePopup('logoutPopup'); });
    }
    // Klik di luar popup menutup popup
    window.onclick = function(event) {
        const logoutPopup = document.getElementById('logoutPopup');
        if (logoutPopup && logoutPopup.classList.contains('active') && event.target === logoutPopup) {
            closePopup('logoutPopup');
        }
    };
}); 