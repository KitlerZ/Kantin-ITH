let menuItems = [];

const keranjang = [];

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired.');
    const userIdCheck = localStorage.getItem('loggedInUserId');
    const userRoleCheck = localStorage.getItem('loggedInUserRole');

    if (!userIdCheck || !userRoleCheck) {
        // Redirect to login page if not logged in
        localStorage.clear();
        window.location.href = "../index.html";
        return;
    }

    fetchMenu();
    updateSaldo();
    updateKeranjang();
    updateProfileInfo();
    const submitBtn = document.getElementById('submitTopupRequestBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitTopupRequest);
    }

    // Add event listeners for category tabs
    const categoryTabs = document.querySelectorAll('.tab-item');
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterKategori(tab.dataset.kategori);
        });
    });

    const profileNameElement = document.querySelector('.profile-name');
    if (profileNameElement) {
        const loggedInUsername = localStorage.getItem('loggedInUsername') || '';
        profileNameElement.textContent = loggedInUsername;
    }

    // Initialize amount selection
    const amountButtons = document.querySelectorAll('.amount-btn');
    const amountInput = document.getElementById('topupAmount');

    amountButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            amountButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');
            // Set the amount in the input
            amountInput.value = button.dataset.amount;
        });
    });

    // Handle custom amount input
    amountInput.addEventListener('input', () => {
        // Remove active class from all buttons when user types custom amount
        amountButtons.forEach(btn => btn.classList.remove('active'));
    });
});

function fetchMenu() {
    console.log('Fetching menu...'); // Debug log
    fetch('../backend/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_menu' })
    })
    .then(response => {
        console.log('Response status:', response.status); // Debug log
        if (!response.ok) {
            return response.text().then(text => {
                console.error('Response not OK:', text); // Debug log
                throw new Error(`HTTP error! status: ${response.status}, Response: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Menu data received:', data); // Debug log
        if (data && Array.isArray(data)) {
            menuItems = data;
            console.log('Menu items (array):', menuItems); // Debug log
            if (menuItems.length > 0) {
                renderMenu(menuItems);
                const allButton = document.querySelector('.kategori button');
                if (allButton) {
                    allButton.classList.add('active');
                }
            } else {
                document.getElementById("menu-list").innerHTML = '<p>Tidak ada menu yang tersedia saat ini.</p>';
            }
        } else if (data && data.status === 'success' && Array.isArray(data.menu)) {
            menuItems = data.menu;
            console.log('Menu items (object):', menuItems); // Debug log
            if (menuItems.length > 0) {
                renderMenu(menuItems);
                const allButton = document.querySelector('.kategori button');
                if (allButton) {
                    allButton.classList.add('active');
                }
            } else {
                document.getElementById("menu-list").innerHTML = '<p>Tidak ada menu yang tersedia saat ini.</p>';
            }
        } else {
            console.error('Invalid data format:', data); // Debug log
            document.getElementById("menu-list").innerHTML = '<p>Gagal memuat menu: Format data tidak valid dari server.</p>';
        }
    })
    .catch(error => {
        console.error('Error in fetchMenu:', error); // Debug log
        document.getElementById("menu-list").innerHTML = `<p>Gagal memuat menu. Error: ${error.message}. Silakan coba lagi nanti.</p>`;
    });
}

function renderMenu(itemsToRender) {
    console.log('Rendering menu items:', itemsToRender); // Debug log
    const menuList = document.getElementById("menu-list");
    if (!menuList) {
        console.error('Menu list element not found!');
        return;
    }

    if (!itemsToRender || itemsToRender.length === 0) {
        menuList.innerHTML = '<p>Tidak ada menu yang tersedia saat ini.</p>';
        return;
    }

    menuList.innerHTML = itemsToRender.map(item => {
        console.log('Processing menu item:', item); // Debug log
        if (item === null || typeof item !== 'object' || item.id === undefined || item.id === null || !item.nama || item.harga === undefined || item.harga === null || !item.kategori) {
            console.error('Invalid menu item:', item);
            return '';
        }

        const itemName = item.nama || 'Nama Menu Tidak Diketahui';
        let imagePath = item.gambar ? `../aset/menu_images/${item.gambar}` : '../aset/default-menu.png';
        console.log('Image path for item:', itemName, imagePath); // Debug log

        return `
        <div class="menu-card" data-kategori="${item.kategori}">
            <img src="${imagePath}" alt="${item.nama}" onerror="this.src='../aset/default-menu.png'">
            <h4>${item.nama}</h4>
            <h5 class="seller">Penjual: ${item.nama_penjual}</h5>
            <p>Rp ${parseFloat(item.harga).toLocaleString('id-ID')}</p>
            <div class="buttons">
                <button class="primary" onclick="beliLangsung(${item.id})">Beli Sekarang</button>
                <button class="secondary" onclick="tambahKeranjang(${item.id})">+ Keranjang</button>
            </div>
        </div>
        `;
    }).join('');
}

function filterKategori(kat) {
    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.classList.remove('active');
    });

    const activeTab = document.querySelector(`.tab-item[data-kategori="${kat}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }

    const filteredItems = (kat === "Semua")
        ? menuItems
        : menuItems.filter(item => {
                   return item && item.kategori && item.kategori === kat;
            });

    renderMenu(filteredItems);
}

function cariMenu(keyword) {
    const filtered = menuItems.filter(item =>
              item && item.nama && item.nama.toLowerCase().includes(keyword.toLowerCase())
    );
    renderMenu(filtered);
}

function toggleKeranjang() {
    const box = document.getElementById("keranjangOverlay");
    if (box) {
        console.log('toggleKeranjang called. Before toggle, active class:', box.classList.contains('active'));
        box.classList.toggle('active');
        console.log('toggleKeranjang called. After toggle, active class:', box.classList.contains('active'));
        console.log('keranjangOverlay computed display style:', getComputedStyle(box).display);
    }
}

function tambahKeranjang(id) {
    console.log('tambahKeranjang called for ID:', id);
    const item = menuItems.find(i => parseInt(i.id) === parseInt(id));

    if (!item) {
        showError(`Menu dengan ID ${id} tidak ditemukan. Silakan refresh halaman.`);
        return;
    }

    const existingItemIndex = keranjang.findIndex(i => parseInt(i.id) === parseInt(id));

    if (existingItemIndex > -1) {
        keranjang[existingItemIndex].jumlah++;
        keranjang[existingItemIndex].total = parseFloat(keranjang[existingItemIndex].harga) * keranjang[existingItemIndex].jumlah;
    } else {
        keranjang.push({
            id: parseInt(item.id),
            nama: item.nama,
            harga: parseFloat(item.harga),
            jumlah: 1,
            total: parseFloat(item.harga)
        });
    }

    updateKeranjang();
    showSuccess('Menu berhasil ditambahkan ke keranjang!');
}

function hapusDariKeranjang(id) {
    const index = keranjang.findIndex(item => parseInt(item.id) === parseInt(id));
    if (index > -1) {
        keranjang.splice(index, 1);
        updateKeranjang();
    } else {
    }
}

function updateKeranjang() {
    const list = document.getElementById("daftar-keranjang");
    const totalSpan = document.getElementById("total");
    const badgeSpan = document.getElementById("keranjang-badge");

    if (!list || !totalSpan || !badgeSpan) {
        return;
    }

    list.innerHTML = "";
    let totalHarga = 0;
    let totalJumlahItem = 0;

    if (keranjang.length === 0) {
        list.innerHTML = '<li>Keranjang kosong</li>';
    } else {
        keranjang.forEach(item => {
              if (!item || typeof item !== 'object' || !item.nama || typeof item.jumlah !== 'number' || typeof item.total !== 'number') {
                   return;
              }
            const li = document.createElement("li");
            li.innerHTML = `
            <div class="keranjang-item">
              <div class="item-info">
                <div>${item.nama}</div>
                <div>Rp ${parseFloat(item.harga).toLocaleString('id-ID')} x ${item.jumlah}</div>
              </div>
              <div class="item-actions">
                <span>Rp ${parseFloat(item.total).toLocaleString('id-ID')}</span>
                <button onclick="hapusDariKeranjang(${item.id})">🗑️</button>
              </div>
            </div>
        `;
            list.appendChild(li);
            totalHarga += item.total;
            totalJumlahItem += item.jumlah;
        });
    }

    totalSpan.textContent = totalHarga.toLocaleString('id-ID');
    badgeSpan.textContent = totalJumlahItem;
}

function beliLangsung(id) {
    console.log('beliLangsung: Attempting to buy item with ID:', id); // Debug log
    console.log('beliLangsung: Available menu items:', menuItems); // Debug log
    
    const item = menuItems.find(i => parseInt(i.id) === parseInt(id));
    console.log('beliLangsung: Found item:', item); // Debug log

    if (!item) {
        showError(`Menu dengan ID ${id} tidak ditemukan. Silakan refresh halaman.`);
        return;
    }

    // Ensure item.harga is a number before using it
    const itemHarga = parseFloat(item.harga);
    if (isNaN(itemHarga)) {
        console.error('beliLangsung: Invalid item price:', item.harga);
        showError(`Harga menu untuk ID ${id} tidak valid.`);
        return;
    }

    const tempKeranjang = [{
        id: parseInt(item.id),
        nama: item.nama,
        harga: itemHarga,
        jumlah: 1,
        total: itemHarga
    }];

    console.log('beliLangsung: Processing checkout with items:', tempKeranjang); // Debug log
    processCheckout(tempKeranjang);
}

function processCheckout(itemsToCheckout) {
    console.log('processCheckout: Received items:', itemsToCheckout); // Debug log
    if (!itemsToCheckout || itemsToCheckout.length === 0) {
        showError("Tidak ada item untuk checkout.");
        return;
    }

    const totalHarga = itemsToCheckout.reduce((sum, item) => {
        if (item && typeof item.total === 'number') {
            return sum + item.total;
        } else {
            console.warn('processCheckout: Invalid item total encountered:', item); // Debug log
            return sum;
        }
    }, 0);
    console.log('processCheckout: Calculated total amount:', totalHarga); // Debug log

    const checkoutItemsDiv = document.getElementById("checkout-items");
    const checkoutTotalAmountSpan = document.getElementById("checkout-total-amount");
    const checkoutPopup = document.getElementById("checkoutPopup");

    if (!checkoutItemsDiv || !checkoutTotalAmountSpan || !checkoutPopup) {
        showError("Terjadi kesalahan pada tampilan checkout.");
        return;
    }

    checkoutItemsDiv.innerHTML = itemsToCheckout.map(item => {
        if (!item || typeof item !== 'object' || !item.nama || typeof item.jumlah !== 'number' || typeof item.total !== 'number') {
            console.warn('renderCheckoutItems: Invalid item for rendering:', item); // Debug log
            return '';
        }
        return `
          <div class="checkout-item">
            <span>${item.nama} x${item.jumlah}</span>
            <span>Rp ${parseFloat(item.total).toLocaleString('id-ID')}</span>
          </div>
        `;
    }).join('');

    checkoutTotalAmountSpan.textContent = `Rp ${parseFloat(totalHarga).toLocaleString('id-ID')}`;
    checkoutPopup.classList.add('active');

    checkoutPopup.dataset.items = JSON.stringify(itemsToCheckout);
    checkoutPopup.dataset.total = totalHarga;
}

function checkout() {
    processCheckout(keranjang);
}

function confirmCheckout() {
    const checkoutPopup = document.getElementById('checkoutPopup');
    const itemsToCheckout = JSON.parse(checkoutPopup.dataset.items || '[]');
    const totalHarga = parseFloat(checkoutPopup.dataset.total || '0');

    console.log('confirmCheckout: Items from dataset:', itemsToCheckout); // Debug log
    console.log('confirmCheckout: Total from dataset:', totalHarga); // Debug log

    if (!itemsToCheckout || itemsToCheckout.length === 0 || totalHarga <= 0) {
        showError("Tidak ada item untuk checkout.");
        closePopup('checkoutPopup');
        return;
    }

    const userId = localStorage.getItem('loggedInUserId');

    if (!userId) {
        showError("Anda perlu login untuk melakukan checkout. (User ID tidak ditemukan)");
        closePopup('checkoutPopup');
        return;
    }

    fetch('../backend/login.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'checkout',
            userId: userId,
            items: itemsToCheckout.map(item => ({
                id: parseInt(item.id),
                jumlah: parseInt(item.jumlah),
                total: parseFloat(item.total)
            })),
            totalAmount: parseFloat(totalHarga)
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                let errorData = {};
                try { errorData = JSON.parse(text); } catch(e) {}
                const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
                error.status = response.status;
                error.reason = errorData.reason;
                error.backendResponse = errorData;
                throw error;
            });
        }
        return response.json();
    })
    .then(data => {
        if (data && data.status === 'success') {
            showSuccess('Checkout berhasil!');
            closePopup('checkoutPopup');
            updateSaldo();
            keranjang.length = 0;
            updateKeranjang();
        } else if (data && data.status === 'error') {
            let errorMessage = data.message || 'Checkout gagal: Unknown error from backend';

            if (errorMessage.includes('Saldo tidak cukup') || (data.reason && data.reason === 'insufficient_saldo')) {
                closePopup('checkoutPopup');
                const saldoPopup = document.getElementById('saldoPopup');
                const requiredSaldoSpan = document.getElementById('required-saldo');
                const currentSaldoSpan = document.getElementById('current-saldo');
                if(requiredSaldoSpan) requiredSaldoSpan.textContent = `Rp ${parseFloat(totalHarga).toLocaleString('id-ID')}`;
                const currentSaldoText = document.getElementById('saldo').textContent;
                const currentSaldoValue = parseFloat(currentSaldoText.replace('Rp ', '').replace(/\./g, '').replace(/,/g, '.'));
                if(currentSaldoSpan) currentSaldoSpan.textContent = `Rp ${currentSaldoValue.toLocaleString('id-ID') || '0'}`;

                if (saldoPopup) {
                    saldoPopup.classList.add('active');
                } else {
                    showError(errorMessage);
                }
            } else {
                showError(errorMessage);
                closePopup('checkoutPopup');
            }
        } else {
            showError('Checkout gagal: Format respons server tidak terduga.');
            closePopup('checkoutPopup');
        }
    })
    .catch(error => {
        let errorMessage = 'Terjadi kesalahan saat checkout. Silakan coba lagi.';

        if (error.message.includes('HTTP error!')) {
            errorMessage = `Error server: ${error.message}`;
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Gagal terhubung ke server.';
        } else if (error.backendResponse && error.backendResponse.message) {
            errorMessage = error.backendResponse.message;
        } else {
            errorMessage = error.message;
        }

        showError(errorMessage);
        closePopup('checkoutPopup');
    });
}

function updateSaldo() {
    const userId = localStorage.getItem('loggedInUserId');
    if (!userId) {
        document.getElementById('saldo').textContent = 'Rp 0';
        const currentSaldoSpan = document.getElementById('current-saldo');
        if (currentSaldoSpan) { currentSaldoSpan.textContent = 'Rp 0';}
        return;
    }

    fetch('../backend/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_saldo', userId: userId })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        const saldoSpan = document.getElementById('saldo');
        const currentSaldoSpan = document.getElementById('current-saldo');
        
        if (data && data.status === 'success') {
            const saldo = parseFloat(data.saldo || data.balance || 0);
            const formattedSaldo = new Intl.NumberFormat('id-ID').format(saldo);
            const displayText = `Rp ${formattedSaldo}`;
            
            if (saldoSpan) saldoSpan.textContent = displayText;
            if (currentSaldoSpan) currentSaldoSpan.textContent = displayText;
        } else {
            const errorText = 'Rp 0';
            if (saldoSpan) saldoSpan.textContent = errorText;
            if (currentSaldoSpan) currentSaldoSpan.textContent = errorText;
            console.error('Error fetching saldo:', data.message || 'Unknown error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        const errorText = 'Rp 0';
        const saldoSpan = document.getElementById('saldo');
        const currentSaldoSpan = document.getElementById('current-saldo');
        if (saldoSpan) saldoSpan.textContent = errorText;
        if (currentSaldoSpan) currentSaldoSpan.textContent = errorText;
    });
}

function showSuccess(message) {
    console.log('showSuccess called with message:', message);
    const popup = document.getElementById('successPopup');
    const messageElement = popup.querySelector('.success-message');
    if(messageElement) messageElement.textContent = message;
    if(popup) popup.classList.add('active');
    setTimeout(() => {
        if(popup) popup.classList.remove('active');
    }, 3000);
}

function showError(message) {
    console.log('showError called with message:', message);
    const popup = document.getElementById('errorPopup');
    const messageElement = popup.querySelector('.error-message');
    if (messageElement) {
        messageElement.textContent = message;
    }
    if (popup) {
        popup.classList.add('active');
        setTimeout(() => {
            popup.classList.remove('active');
        }, 3000);
    }
}

function closePopup(popupId) {
    console.log('closePopup called for ID:', popupId);
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.classList.remove('active');
    }

    if (popupId === 'checkoutPopup') {
        const checkoutPopup = document.getElementById('checkoutPopup');
        if(checkoutPopup) {
            delete checkoutPopup.dataset.items;
            delete checkoutPopup.dataset.total;
        }
    }
}

window.onclick = function(event) {
    if (event.target && event.target.classList && event.target.classList.contains('popup-overlay')) {
        closePopup(event.target.id);
    }
}

function showProfileInfoPopup() {
    console.log('Showing profile info popup...');
    const profileDropdown = document.getElementById("profileDropdown");
    if (profileDropdown) profileDropdown.classList.remove("active");

    const username = localStorage.getItem('loggedInUsername') || sessionStorage.getItem('username') || 'Pengguna';
    const role = localStorage.getItem('loggedInUserRole') || sessionStorage.getItem('userRole') || 'Pembeli';

    const profileInfoUserName = document.getElementById('profileInfoUserName');
    const profileInfoUserRole = document.getElementById('profileInfoUserRole');
    const profileInfoEmail = document.getElementById('profileInfoEmail');
    const profileInfoPhone = document.getElementById('profileInfoPhone');
    const profileInfoPopup = document.getElementById('profileInfoPopup');

    if(profileInfoUserName) profileInfoUserName.textContent = username;
    if(profileInfoUserRole) profileInfoUserRole.textContent = role;
    if(profileInfoEmail) profileInfoEmail.textContent = 'Belum Tersedia';
    if(profileInfoPhone) profileInfoPhone.textContent = 'Belum Tersedia';

    if(profileInfoPopup) profileInfoPopup.classList.add('active');
}

function toggleProfile() {
    console.log('Toggling profile dropdown...');
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

window.addEventListener('click', function(event) {
    const profileDropdown = document.getElementById('profileDropdown');
    const profileIconArea = document.querySelector('.profile');
    const isClickInsideDropdown = profileDropdown && profileDropdown.contains(event.target);
    const isClickOnProfileArea = profileIconArea && profileIconArea.contains(event.target);

    if (profileDropdown && profileDropdown.classList.contains('active') && !isClickInsideDropdown && !isClickOnProfileArea) {
            profileDropdown.classList.remove('active');
    }
});

function logout() {
    console.log('Attempting to logout...');
    localStorage.clear();
    window.location.href = "../index.html";
}

function confirmLogout() {
    logout();
}

function updateProfileInfo() {
    const profileNameElement = document.querySelector('.profile-name');
    if (profileNameElement) {
        const loggedInUsername = localStorage.getItem('loggedInUsername') || sessionStorage.getItem('username') || '';
        profileNameElement.textContent = loggedInUsername;
    }
}

async function submitTopupRequest() {
    const amountInput = document.getElementById('topupAmount');
    const proofImageInput = document.getElementById('proofImage');
    
    if (!amountInput || !proofImageInput) {
        console.error("Required input elements not found.");
        showError("Internal error: Input tidak ditemukan.");
        return;
    }

    const amount = parseInt(amountInput.value);
    const proofImage = proofImageInput.files[0];

    if (isNaN(amount) || amount < 10000) {
        showError('Jumlah top up minimal Rp 10.000');
        return;
    }

    if (!proofImage) {
        showError('Mohon unggah bukti transfer');
        return;
    }

    if (proofImage.size > 2 * 1024 * 1024) { // 2MB limit
        showError('Ukuran gambar maksimal 2MB');
        return;
    }

    const userId = localStorage.getItem('loggedInUserId');
    if (!userId) {
        showError('User ID tidak ditemukan. Silakan login kembali.');
        return;
    }

    const submitBtn = document.getElementById('submitTopupRequestBtn');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';

    try {
        const formData = new FormData();
        formData.append('action', 'request_topup');
        formData.append('userId', userId);
        formData.append('amount', amount);
        formData.append('proofImage', proofImage);

        const response = await fetch('../backend/topup_request_handler.php', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new TypeError("Oops, we haven't got JSON!");
        }

        const data = await response.json();
        console.log('Server response:', data); // Debug log

        if (data.success) {
            showSuccess('Permintaan top up berhasil dikirim. Mohon tunggu konfirmasi admin.');
            amountInput.value = '';
            proofImageInput.value = ''; // Clear selected file
        } else {
            showError(data.message || 'Gagal mengirim permintaan top up.');
        }
    } catch (error) {
        console.error('Error submitting top up request:', error);
        showError('Error saat mengirim permintaan top up. Silakan coba lagi.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}
