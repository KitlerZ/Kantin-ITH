let menuItems = [];

const keranjang = [];

document.addEventListener('DOMContentLoaded', () => {
    const userIdCheck = sessionStorage.getItem('userId');
    fetchMenu();
    updateSaldo();
    updateKeranjang();
    updateProfileInfo();
});

function fetchMenu() {
    fetch('../backend/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_menu' })
    })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`HTTP error! status: ${response.status}, Response: ${text}`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (Array.isArray(data)) {
                menuItems = data;
                if (menuItems.length > 0) {
                    renderMenu(menuItems);
                    const allButton = document.querySelector('.kategori button');
                    if (allButton) {
                        allButton.classList.add('active');
                    }
                } else {
                    document.getElementById("menu-list").innerHTML = '<p>Tidak ada menu yang tersedia saat ini.</p>';
                }

            } else if (data && data.status === 'error') {
                document.getElementById("menu-list").innerHTML = `<p>Gagal memuat menu: ${data.message}.</p>`;
            }
              else {
                document.getElementById("menu-list").innerHTML = `<p>Gagal memuat menu: Format data tidak valid dari server.</p>`;
            }
        })
        .catch(error => {
            document.getElementById("menu-list").innerHTML = `<p>Gagal memuat menu. Error: ${error.message}. Silakan coba lagi nanti.</p>`;
        });
}

function renderMenu(itemsToRender) {
    const menuList = document.getElementById("menu-list");
    if (!menuList) {
        return;
    }

    if (!itemsToRender || itemsToRender.length === 0) {
        menuList.innerHTML = '<p>Tidak ada menu yang tersedia.</p>';
        return;
    }

    menuList.innerHTML = itemsToRender.map(item => {
              if (item === null || typeof item !== 'object' || item.id === undefined || item.id === null || !item.nama || item.harga === undefined || item.harga === null || !item.kategori) {
                   return '';
              }

        return `
        <div class="menu-card" data-kategori="${item.kategori}">
            <img src="../aset/nasi_goreng.jpg" alt="${item.nama}">
            <h4>${item.nama}</h4>
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
    document.querySelectorAll('.kategori button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === kat) btn.classList.add('active');
    });

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
        box.style.display = box.style.display === "none" ? "flex" : "none";
    } else {
    }
}

function tambahKeranjang(id) {
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
    const item = menuItems.find(i => parseInt(i.id) === parseInt(id));

    if (!item) {
        showError(`Menu dengan ID ${id} tidak ditemukan. Silakan refresh halaman.`);
        return;
    }

    const tempKeranjang = [{
        id: parseInt(item.id),
        nama: item.nama,
        harga: parseFloat(item.harga),
        jumlah: 1,
        total: parseFloat(item.harga)
    }];

    processCheckout(tempKeranjang);
}

function processCheckout(itemsToCheckout) {
    if (!itemsToCheckout || itemsToCheckout.length === 0) {
        showError("Tidak ada item untuk checkout.");
        return;
    }

    const totalHarga = itemsToCheckout.reduce((sum, item) => {
              if (item && typeof item.total === 'number') {
                   return sum + item.total;
              } else {
                   return sum;
              }
    }, 0);

    const checkoutItemsDiv = document.getElementById("checkout-items");
    const checkoutTotalAmountSpan = document.getElementById("checkout-total-amount");
    const checkoutPopup = document.getElementById("checkoutPopup");

    if (!checkoutItemsDiv || !checkoutTotalAmountSpan || !checkoutPopup) {
              showError("Terjadi kesalahan pada tampilan checkout.");
              return;
    }

    checkoutItemsDiv.innerHTML = itemsToCheckout.map(item => {
              if (!item || typeof item !== 'object' || !item.nama || typeof item.jumlah !== 'number' || typeof item.total !== 'number') {
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
    checkoutPopup.style.display = "flex";

    checkoutPopup.dataset.items = JSON.stringify(itemsToCheckout);
    checkoutPopup.dataset.total = totalHarga;
}

function checkout() {
    processCheckout(keranjang);
}

function confirmCheckout() {
    const itemsToCheckout = JSON.parse(document.getElementById('checkoutPopup').dataset.items || '[]');
    const totalHarga = parseFloat(document.getElementById('checkoutPopup').dataset.total || '0');

    if (!itemsToCheckout || itemsToCheckout.length === 0 || totalHarga <= 0) {
        showError("Tidak ada item untuk checkout.");
        closePopup('checkoutPopup');
        return;
    }

    const userId = sessionStorage.getItem('userId');

    if (!userId) {
        showError("Anda perlu login untuk melakukan checkout.");
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
                    saldoPopup.style.display = 'flex';
                } else {
                    showError(errorMessage);
                }

              } else {
                showError(errorMessage);
                closePopup('checkoutPopup');
              }
        }
          else {
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
    const userId = sessionStorage.getItem('userId');

    if (!userId) {
        document.getElementById('saldo').textContent = 'Rp ???';
        const currentSaldoSpan = document.getElementById('current-saldo');
        if (currentSaldoSpan) { currentSaldoSpan.textContent = 'Rp ???';}
        return;
    }

    fetch('../backend/login.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_saldo', userId: userId })
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`HTTP error! status: ${response.status}, Response: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data && typeof data.saldo === 'number') {
            const formattedSaldo = new Intl.NumberFormat('id-ID').format(data.saldo);
            document.getElementById('saldo').textContent = `Rp ${formattedSaldo}`;
              const currentSaldoSpan = document.getElementById('current-saldo');
              if (currentSaldoSpan) { currentSaldoSpan.textContent = `Rp ${formattedSaldo}`;}
        } else if (data && data.status === 'error') {
            document.getElementById('saldo').textContent = `Rp Error`;
              const currentSaldoSpan = document.getElementById('current-saldo');
              if (currentSaldoSpan) { currentSaldoSpan.textContent = `Rp Error`;}
        }
          else {
            document.getElementById('saldo').textContent = 'Rp ???';
              const currentSaldoSpan = document.getElementById('current-saldo');
              if (currentSaldoSpan) { currentSaldoSpan.textContent = 'Rp ???';}
          }
    })
    .catch(error => {
        document.getElementById('saldo').textContent = `Rp Fetch Error`;
          const currentSaldoSpan = document.getElementById('current-saldo');
          if (currentSaldoSpan) { currentSaldoSpan.textContent = `Rp Error`;}
    });
}

function showSuccess(message) {
    const popup = document.getElementById('successPopup');
    const messageElement = popup.querySelector('.success-message');
    if(messageElement) messageElement.textContent = message;
    if(popup) popup.style.display = 'flex';
    setTimeout(() => {
        if(popup) popup.style.display = 'none';
    }, 3000);
}

function showError(message) {
    const popup = document.getElementById('errorPopup');
    const messageElement = document.getElementById('errorMessage');
    if(messageElement) messageElement.textContent = message;
    if(popup) popup.style.display = 'flex';
      setTimeout(() => {
        if(popup) popup.style.display = 'none';
      }, 3000);
}

function closePopup(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.style.display = "none";
    } else {
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
    const profileDropdown = document.getElementById("profileDropdown");
    if (profileDropdown) profileDropdown.classList.remove("active");

    const username = sessionStorage.getItem('username') || 'Pengguna KantinITH';
    const role = sessionStorage.getItem('role') || 'Pembeli';

    const profileInfoUserName = document.getElementById('profileInfoUserName');
    const profileInfoUserRole = document.getElementById('profileInfoUserRole');
    const profileInfoEmail = document.getElementById('profileInfoEmail');
    const profileInfoPhone = document.getElementById('profileInfoPhone');
    const profileInfoPopup = document.getElementById('profileInfoPopup');

    if(profileInfoUserName) profileInfoUserName.textContent = username;
    if(profileInfoUserRole) profileInfoUserRole.textContent = role;
    if(profileInfoEmail) profileInfoEmail.textContent = 'email@example.com';
    if(profileInfoPhone) profileInfoPhone.textContent = '081234567890';

    if(profileInfoPopup) profileInfoPopup.style.display = 'flex';
}

function toggleProfile() {
      const dropdown = document.getElementById('profileDropdown');
      if(dropdown) {
            dropdown.classList.toggle('active');
      } else {
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
    const logoutUserName = document.getElementById('logoutUserName');
    const logoutUserRole = document.getElementById('logoutUserRole');
    const logoutPopup = document.getElementById('logoutPopup');

    if (logoutUserName) logoutUserName.textContent = sessionStorage.getItem('username') || 'Pengguna';
    if (logoutUserRole) logoutUserRole.textContent = sessionStorage.getItem('role') || 'Pembeli';
    if (logoutPopup) logoutPopup.style.display = 'flex';
}

function confirmLogout() {
    sessionStorage.clear();
    window.location.href = "../index.html";
}

function tambahSaldo() {
    window.location.href = "saldo.html";
}

function updateProfileInfo() {
    const usernameElement = document.querySelector('.profile-name');
    const logoutUserNameElement = document.getElementById('logoutUserName');
    const logoutUserRoleElement = document.getElementById('logoutUserRole');
    
    const username = sessionStorage.getItem('username') || 'Pengguna';
    const role = sessionStorage.getItem('role') || 'Pembeli';

    if (usernameElement) usernameElement.textContent = username;
    if (logoutUserNameElement) logoutUserNameElement.textContent = username;
    if (logoutUserRoleElement) logoutUserRoleElement.textContent = role;
}
