// Data menu (will be fetched from backend)
let menuItems = []; // Initialize as empty array

const keranjang = [];

// Inisialisasi halaman
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded. Initializing...'); // Log
    const userIdCheck = sessionStorage.getItem('userId');
    console.log('Initial check: userId in sessionStorage:', userIdCheck); // Log penting

    fetchMenu(); // Fetch menu items from backend
    updateSaldo(); // Fetch saldo from backend
    updateKeranjang(); // Update keranjang display on load
    updateProfileInfo(); // Update profile info in topbar and popups
});

// Function to fetch menu items from backend
function fetchMenu() {
    console.log('Fetching menu from backend via login.php with action="get_menu"'); // Log
    fetch('../backend/login.php', { // Pastikan URL ini benar
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_menu' }) // Pastikan action ini terkirim
    })
        .then(response => {
             console.log('Fetch menu response status:', response.status); // Log
             if (!response.ok) {
                 return response.text().then(text => {
                     console.error('HTTP error fetching menu. Response text:', text); // Log
                     throw new Error(`HTTP error! status: ${response.status}, Response: ${text}`);
                 });
             }
             return response.json();
        })
        .then(data => {
            console.log('Data received for menu:', data); // Log data aktual
            // backend/login.php action get_menu mengembalikan array langsung
            if (Array.isArray(data)) {
                menuItems = data; // *** Penting: Array global ini terisi dengan SEMUA menu ***
                console.log('Menu items successfully parsed and stored in global menuItems:', menuItems); // Log isi array global

                if (menuItems.length > 0) {
                     renderMenu(menuItems); // Render SEMUA menu pertama kali
                     const allButton = document.querySelector('.kategori button');
                     if (allButton) {
                          allButton.classList.add('active');
                     }
                } else {
                     console.log('Backend returned an empty menu array.'); // Log
                     document.getElementById("menu-list").innerHTML = '<p>Tidak ada menu yang tersedia saat ini.</p>';
                }

            } else if (data && data.status === 'error') { // Tangani respons error dari backend
                 console.error('Backend reported error fetching menu:', data.message, data); // Log error backend
                 document.getElementById("menu-list").innerHTML = `<p>Gagal memuat menu: ${data.message}.</p>`;
            }
             else { // Tangani format data yang tidak valid
                console.error('Failed to fetch menu items: Data is not an array or error object', data); // Log data tidak valid
                document.getElementById("menu-list").innerHTML = `<p>Gagal memuat menu: Format data tidak valid dari server.</p>`;
            }
        })
        .catch(error => {
            console.error('Error fetching menu items:', error); // Log error fetch
            document.getElementById("menu-list").innerHTML = `<p>Gagal memuat menu. Error: ${error.message}. Silakan coba lagi nanti.</p>`;
        });
}

// itemsToRender: array item yang akan ditampilkan di UI (bisa hasil filter)
function renderMenu(itemsToRender) {
    console.log('Rendering menu with items:', itemsToRender); // Log array yang akan dirender
    const menuList = document.getElementById("menu-list");
    if (!menuList) {
        console.error('Menu list element (#menu-list) not found!'); // Log
        return;
    }

    if (!itemsToRender || itemsToRender.length === 0) {
        menuList.innerHTML = '<p>Tidak ada menu yang tersedia.</p>';
        console.log('No items to render.'); // Log
        return;
    }

    menuList.innerHTML = itemsToRender.map(item => {
         // Pastikan item memiliki properti yang dibutuhkan dengan pemeriksaan tipe yang lebih ketat
         if (item === null || typeof item !== 'object' || item.id === undefined || item.id === null || !item.nama || item.harga === undefined || item.harga === null || !item.kategori) {
              console.error('Invalid item structure encountered during rendering:', item); // Log item yang rusak
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
     console.log('Finished rendering menu.'); // Log
}

// kat: kategori yang dipilih (e.g., 'Makanan', 'Minuman', 'Semua')
function filterKategori(kat) {
    console.log('Filtering by category:', kat); // Log kategori yang diklik
    // Update active button
    document.querySelectorAll('.kategori button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === kat) btn.classList.add('active');
    });

    // Filter berdasarkan kategori dari menuItems global (yang lengkap)
    const filteredItems = (kat === "Semua")
        ? menuItems // Menggunakan array global menuItems yang lengkap
        : menuItems.filter(item => {
             // Pastikan item dan item.kategori ada dan cocok
             return item && item.kategori && item.kategori === kat;
        });

    console.log('Filtered items result:', filteredItems); // Log hasil filter (array yang akan dirender)
    renderMenu(filteredItems); // Meneruskan array hasil filter ke renderMenu
}

// keyword: teks pencarian
function cariMenu(keyword) {
    console.log('Searching for keyword:', keyword); // Log
    // Cari berdasarkan keyword di menuItems global (yang lengkap)
    const filtered = menuItems.filter(item =>
         // Pastikan item dan item.nama ada sebelum memanggil toLowerCase
         item && item.nama && item.nama.toLowerCase().includes(keyword.toLowerCase())
    );
    console.log('Search results:', filtered); // Log
    renderMenu(filtered);
}

// Fungsi untuk menampilkan/menyembunyikan overlay keranjang
function toggleKeranjang() {
  console.log('Toggling keranjang overlay'); // Log
  const box = document.getElementById("keranjangOverlay");
  if (box) { // Pastikan elemen keranjang overlay ditemukan
       // Toggle display antara none dan flex
       box.style.display = box.style.display === "none" ? "flex" : "none";
       console.log('Keranjang overlay display set to:', box.style.display); // Log status display
  } else {
       console.error('Keranjang overlay element (#keranjangOverlay) not found!'); // Log error jika tidak ditemukan
  }
}

// id: ID item menu yang ditambahkan
function tambahKeranjang(id) {
  console.log('tambahKeranjang called with ID:', id); // Log ID yang diterima

  // *** Penting: Cari item di array global menuItems, bandingkan ID sebagai angka ***
  // Menggunakan find dengan parseInt untuk memastikan perbandingan tipe data
  const item = menuItems.find(i => parseInt(i.id) === parseInt(id));
  console.log('Item found in menuItems for ID:', id, item); // Log hasil pencarian

    if (!item) {
        console.error('Item not found in global menuItems array for ID:', id); // Log error jika tidak ditemukan
        showError(`Menu dengan ID ${id} tidak ditemukan. Silakan refresh halaman.`); // Feedback ke user dengan popup error
        return;
    }

    // *** Penting: Cari item di keranjang, bandingkan ID sebagai angka ***
    const existingItemIndex = keranjang.findIndex(i => parseInt(i.id) === parseInt(id));

    if (existingItemIndex > -1) {
        // Jika item sudah ada di keranjang, tambahkan jumlahnya
        keranjang[existingItemIndex].jumlah++;
        // Hitung ulang total untuk item ini
        keranjang[existingItemIndex].total = parseFloat(keranjang[existingItemIndex].harga) * keranjang[existingItemIndex].jumlah;
         console.log('Item already in cart, quantity increased.'); // Log
    } else {
        // Jika item belum ada, tambahkan sebagai item baru
        keranjang.push({
            id: parseInt(item.id), // Simpan ID sebagai angka
            nama: item.nama,
            harga: parseFloat(item.harga), // Simpan harga sebagai angka
            jumlah: 1,
            total: parseFloat(item.harga) // Total awal = harga
        });
         console.log('New item added to cart.'); // Log
    }

    updateKeranjang(); // Perbarui tampilan keranjang
     console.log('Item added/updated in keranjang. Current keranjang:', keranjang); // Log isi keranjang
}

// id: ID item yang dihapus dari keranjang
function hapusDariKeranjang(id) {
  console.log('hapusDariKeranjang called with ID:', id); // Log
  console.log('Current keranjang before removal:', keranjang); // Log
  // *** Penting: Cari item di keranjang, bandingkan ID sebagai angka ***
  const index = keranjang.findIndex(item => parseInt(item.id) === parseInt(id));
  if (index > -1) {
    keranjang.splice(index, 1); // Hapus item dari array
    updateKeranjang(); // Perbarui tampilan keranjang
     console.log('Item removed from keranjang. Current keranjang:', keranjang); // Log
  } else {
     console.warn('Item not found in keranjang for removal for ID:', id); // Log peringatan
  }
}

// Memperbarui tampilan daftar item di keranjang dan total, serta badge ikon
function updateKeranjang() {
  console.log('Updating keranjang display...'); // Log start
  const list = document.getElementById("daftar-keranjang");
   const totalSpan = document.getElementById("total");
   const badgeSpan = document.getElementById("keranjang-badge"); // Badge di ikon topbar

   if (!list || !totalSpan || !badgeSpan) {
        console.error('Keranjang display elements not found! (#daftar-keranjang, #total, #keranjang-badge)'); // Log error jika elemen tidak ditemukan
        return;
   }

  list.innerHTML = ""; // Kosongkan daftar keranjang saat ini
  let totalHarga = 0;
  let totalJumlahItem = 0; // Variabel untuk total jumlah item

  if (keranjang.length === 0) {
      list.innerHTML = '<li>Keranjang kosong</li>';
       console.log('Keranjang is empty.'); // Log
  } else {
  keranjang.forEach(item => {
        // Pastikan data di keranjang valid sebelum dirender
        if (!item || typeof item !== 'object' || !item.nama || typeof item.jumlah !== 'number' || typeof item.total !== 'number') {
             console.error('Invalid item structure in keranjang for rendering:', item); // Log item rusak
             return; // Lewati item yang rusak
        }
    const li = document.createElement("li");
        // Gunakan toLocaleString dengan 'id-ID' untuk format mata uang Indonesia
        li.innerHTML = `
          <div class="keranjang-item">
            <div class="item-info">
              <div>${item.nama}</div>
              <div>Rp ${parseFloat(item.harga).toLocaleString('id-ID')} x ${item.jumlah}</div> <!-- Tampilkan harga per item -->
            </div>
            <div class="item-actions">
              <span>Rp ${parseFloat(item.total).toLocaleString('id-ID')}</span> <!-- Tampilkan subtotal item -->
              <button onclick="hapusDariKeranjang(${item.id})">🗑️</button> <!-- Gunakan item.id -->
            </div>
          </div>
        `;
    list.appendChild(li);
        totalHarga += item.total; // Tambahkan ke total harga keseluruhan
        totalJumlahItem += item.jumlah; // Tambahkan ke total jumlah item
      });
      console.log(`Rendered ${keranjang.length} distinct items in keranjang.`); // Log jumlah item unik
  }

  // Perbarui total harga di UI dengan format mata uang Indonesia
  totalSpan.textContent = totalHarga.toLocaleString('id-ID');

  // Perbarui badge dengan total JUMLAH semua item
  badgeSpan.textContent = totalJumlahItem;

  console.log('Keranjang display updated. Total Quantity:', totalJumlahItem, 'Total Price:', totalHarga); // Log hasil update
  console.log('Updating keranjang display finished.'); // Log end
}

// id: ID item menu yang dibeli langsung
function beliLangsung(id) {
  console.log('beliLangsung called with ID:', id); // Log ID yang diterima

  // *** Penting: Cari item di array global menuItems, bandingkan ID sebagai angka ***
  const item = menuItems.find(i => parseInt(i.id) === parseInt(id));
  console.log('Item found in menuItems for ID:', id, item); // Log hasil pencarian

    if (!item) {
        console.error('Item not found in global menuItems array for ID:', id); // Log error jika tidak ditemukan
        showError(`Menu dengan ID ${id} tidak ditemukan. Silakan refresh halaman.`); // Feedback ke user
        return;
    }

    // Buat keranjang sementara dengan item ini
    const tempKeranjang = [{
        id: parseInt(item.id), // Simpan ID sebagai angka
        nama: item.nama,
        harga: parseFloat(item.harga), // Simpan harga sebagai angka
        jumlah: 1,
        total: parseFloat(item.harga) // Total = harga item * jumlah
    }];

    console.log('Processing direct buy with temp cart:', tempKeranjang); // Log
    processCheckout(tempKeranjang); // Lanjutkan ke proses checkout
}

// itemsToCheckout: array item yang akan dicheckout (bisa dari keranjang utama atau beli langsung)
function processCheckout(itemsToCheckout) {
    console.log('Processing checkout with items:', itemsToCheckout); // Log
    if (!itemsToCheckout || itemsToCheckout.length === 0) { // Periksa jika array kosong atau null
        showError("Tidak ada item untuk checkout.");
        console.warn("processCheckout called with empty or null items array."); // Log
        return;
    }

    // Hitung total harga dari array itemsToCheckout
    const totalHarga = itemsToCheckout.reduce((sum, item) => {
         // Pastikan item di array memiliki total bertipe number
         if (item && typeof item.total === 'number') {
              return sum + item.total;
         } else {
              console.error('Invalid item structure in itemsToCheckout:', item); // Log item rusak
              return sum; // Lewati item rusak
         }
    }, 0);

    console.log('Calculated total price for checkout display:', totalHarga); // Log

    // Display checkout confirmation popup
    const checkoutItemsDiv = document.getElementById("checkout-items");
    const checkoutTotalAmountSpan = document.getElementById("checkout-total-amount");
    const checkoutPopup = document.getElementById("checkoutPopup");

    if (!checkoutItemsDiv || !checkoutTotalAmountSpan || !checkoutPopup) {
         console.error('Checkout popup elements not found! (#checkout-items, #checkout-total-amount, #checkoutPopup)'); // Log
         showError("Terjadi kesalahan pada tampilan checkout.");
         return;
    }

    checkoutItemsDiv.innerHTML = itemsToCheckout.map(item => {
         // Pastikan data item valid untuk tampilan ringkasan
         if (!item || typeof item !== 'object' || !item.nama || typeof item.jumlah !== 'number' || typeof item.total !== 'number') {
              console.error('Invalid item structure for checkout summary display:', item); // Log
              return ''; // Lewati item rusak
         }
        return `
          <div class="checkout-item">
            <span>${item.nama} x${item.jumlah}</span>
            <span>Rp ${parseFloat(item.total).toLocaleString('id-ID')}</span> <!-- Tampilkan subtotal item -->
          </div>
        `;
    }).join('');

    checkoutTotalAmountSpan.textContent = `Rp ${parseFloat(totalHarga).toLocaleString('id-ID')}`; // Tampilkan total harga di popup
    checkoutPopup.style.display = "flex"; // Tampilkan popup

    // Store itemsToCheckout and totalHarga temporarily in dataset for confirmCheckout
    checkoutPopup.dataset.items = JSON.stringify(itemsToCheckout);
    checkoutPopup.dataset.total = totalHarga; // Simpan total harga sebagai angka

    console.log('Checkout confirmation popup displayed.'); // Log
}

// Trigger checkout process for the main cart
function checkout() {
   console.log('Initiating checkout from main cart.'); // Log
   processCheckout(keranjang); // Gunakan isi keranjang global
}

// Dipanggil saat tombol "Bayar Sekarang" di popup checkout diklik
function confirmCheckout() {
    console.log('Confirming checkout...'); // Log
    // Ambil data dari dataset popup
    const itemsToCheckout = JSON.parse(document.getElementById('checkoutPopup').dataset.items || '[]');
    const totalHarga = parseFloat(document.getElementById('checkoutPopup').dataset.total || '0'); // Ambil total sebagai angka

    console.log('Retrieved data from checkout popup dataset - Items:', itemsToCheckout, 'Total:', totalHarga); // Log

    if (!itemsToCheckout || itemsToCheckout.length === 0 || totalHarga <= 0) { // Periksa juga total > 0
        console.warn("No items or zero total for checkout confirmation."); // Log
        showError("Tidak ada item untuk checkout.");
        closePopup('checkoutPopup');
        return;
    }

    const userId = sessionStorage.getItem('userId'); // Ambil userId (penting)

    console.log('Attempting checkout backend call. Retrieved userId:', userId); // Log

    if (!userId) { // Cek hanya userId sebagai pengenal unik utama
        console.error('Checkout failed: userId is missing from sessionStorage. User not logged in?'); // Log error
        showError("Anda perlu login untuk melakukan checkout."); // Pesan lebih jelas
        closePopup('checkoutPopup');
        // Redirect ke halaman login mungkin lebih baik: window.location.href = "index.html";
    return;
  }

    console.log('Sending checkout request to login.php with action="checkout"'); // Log
    fetch('../backend/login.php', { // Pastikan URL ini benar
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'checkout', // Pastikan action ini terkirim
            userId: userId, // Kirim userId (disarankan)
            items: itemsToCheckout.map(item => ({
                 id: parseInt(item.id),
                 jumlah: parseInt(item.jumlah),
                 total: parseFloat(item.total)
            })),
            totalAmount: parseFloat(totalHarga)
        })
    })
    .then(response => {
        console.log('Checkout backend response status:', response.status); // Log
         if (!response.ok) {
             return response.text().then(text => {
                  console.error('HTTP error during checkout. Response text:', text); // Log
                 let errorData = {};
                 try { errorData = JSON.parse(text); } catch(e) {} // Coba parse JSON jika mungkin
                 const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
                 error.status = response.status;
                 error.reason = errorData.reason;
                 error.backendResponse = errorData; // Simpan data error backend jika ada
                 throw error;
             });
        }
        return response.json();
    })
    .then(data => {
        console.log('Data received for checkout backend call:', data); // Log data aktual
        if (data && data.status === 'success') { // Cek format sukses
            console.log('EVENT: Checkout success!'); // Log event sukses
            showSuccess('Checkout berhasil!');
            closePopup('checkoutPopup');
            updateSaldo();
  keranjang.length = 0;
            updateKeranjang();

        } else if (data && data.status === 'error') { // Tangani error dari backend
            let errorMessage = data.message || 'Checkout gagal: Unknown error from backend';
            console.error('EVENT: Checkout failed!', errorMessage, data); // Log event error backend + data

             if (errorMessage.includes('Saldo tidak cukup') || (data.reason && data.reason === 'insufficient_saldo')) {
               console.log("Handling insufficient saldo error specifically."); // Log
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
              console.error('Checkout failed: Unexpected backend response format', data);
              showError('Checkout gagal: Format respons server tidak terduga.');
              closePopup('checkoutPopup');
         }
    })
    .catch(error => {
        console.error('EVENT: Checkout fetch error!', error); // Log event error fetch
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

// Function to update saldo display by fetching from backend
function updateSaldo() {
    console.log('Attempting to update saldo...'); // Log
    const userId = sessionStorage.getItem('userId'); // Gunakan userId

    // Periksa apakah userId ada sebelum melakukan fetch
    if (!userId) {
        console.warn("updateSaldo: userId is missing from sessionStorage. Cannot fetch saldo."); // Log
        document.getElementById('saldo').textContent = 'Rp ???';
        const currentSaldoSpan = document.getElementById('current-saldo');
        if (currentSaldoSpan) { currentSaldoSpan.textContent = 'Rp ???';}
        return;
    }

    console.log('Fetching saldo via login.php with action="get_saldo" for userId:', userId); // Log
    fetch('../backend/login.php', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ action: 'get_saldo', userId: userId }) // Kirim HANYA userId
    })
    .then(response => {
        console.log('Fetch saldo response status:', response.status); // Log
        if (!response.ok) {
             return response.text().then(text => {
                 console.error('HTTP error fetching saldo. Response text:', text); // Log
                 throw new Error(`HTTP error! status: ${response.status}, Response: ${text}`);
             });
        }
        return response.json();
    })
    .then(data => {
        console.log('Data received for saldo:', data); // Log data aktual
        if (data && typeof data.saldo === 'number') {
            console.log('Saldo data format looks valid.'); // Log
            const formattedSaldo = new Intl.NumberFormat('id-ID').format(data.saldo);
            document.getElementById('saldo').textContent = `Rp ${formattedSaldo}`;
             const currentSaldoSpan = document.getElementById('current-saldo');
             if (currentSaldoSpan) { currentSaldoSpan.textContent = `Rp ${formattedSaldo}`;}
             console.log('Saldo display updated successfully.'); // Log sukses update UI
        } else if (data && data.status === 'error') {
            console.error('Backend reported error fetching saldo:', data.message, data);
            document.getElementById('saldo').textContent = `Rp Error`;
             const currentSaldoSpan = document.getElementById('current-saldo');
             if (currentSaldoSpan) { currentSaldoSpan.textContent = `Rp Error`;}
        }
         else {
            console.error('Failed to fetch saldo: Invalid data format from backend', data);
            document.getElementById('saldo').textContent = 'Rp ???';
             const currentSaldoSpan = document.getElementById('current-saldo');
             if (currentSaldoSpan) { currentSaldoSpan.textContent = 'Rp ???';}
        }
    })
    .catch(error => {
        console.error('Error fetching saldo:', error); // Log error fetch
        document.getElementById('saldo').textContent = `Rp Fetch Error`;
         const currentSaldoSpan = document.getElementById('current-saldo');
         if (currentSaldoSpan) { currentSaldoSpan.textContent = `Rp Error`;}
    });
}

// Fungsi untuk menampilkan popup sukses
function showSuccess(message) {
    const popup = document.getElementById('successPopup');
    const messageElement = popup.querySelector('.success-message');
    if(messageElement) messageElement.textContent = message;
    if(popup) popup.style.display = 'flex';
    setTimeout(() => {
        if(popup) popup.style.display = 'none';
    }, 3000);
}

// Fungsi untuk menampilkan popup error umum
function showError(message) {
    const popup = document.getElementById('errorPopup');
    const messageElement = document.getElementById('errorMessage');
    if(messageElement) messageElement.textContent = message;
    if(popup) popup.style.display = 'flex';
     setTimeout(() => {
        if(popup) popup.style.display = 'none';
    }, 3000);
}

// Fungsi untuk menutup popup berdasarkan ID overlay
function closePopup(popupId) {
  console.log('Closing popup:', popupId); // Log
  const popup = document.getElementById(popupId);
  if (popup) {
       popup.style.display = "none";
  } else {
       console.error('Popup element not found:', popupId); // Log error
  }

  if (popupId === 'checkoutPopup') {
       const checkoutPopup = document.getElementById('checkoutPopup');
       if(checkoutPopup) {
            delete checkoutPopup.dataset.items;
            delete checkoutPopup.dataset.total;
       }
  }
}

// Fungsi untuk menutup popup saat mengklik di luar area popup
window.onclick = function(event) {
  if (event.target && event.target.classList && event.target.classList.contains('popup-overlay')) {
    closePopup(event.target.id); // Use the ID of the clicked overlay to close the specific popup
  }
}

// Functions for profile info popup
function showProfileInfoPopup() {
    console.log('Showing profile info popup'); // Log
    const profileDropdown = document.getElementById("profileDropdown");
    if (profileDropdown) profileDropdown.classList.remove("active");

    const username = sessionStorage.getItem('username') || 'Pengguna KantinITH';
    const role = sessionStorage.getItem('role') || 'Pembeli';

    const profileInfoUserName = document.getElementById('profileInfoUserName');
    const profileInfoUserRole = document.getElementById('profileInfoUserRole');
    const profileInfoEmail = document.getElementById('profileInfoEmail'); // Assuming these exist
    const profileInfoPhone = document.getElementById('profileInfoPhone'); // Assuming these exist
    const profileInfoPopup = document.getElementById('profileInfoPopup');

    if(profileInfoUserName) profileInfoUserName.textContent = username;
    if(profileInfoUserRole) profileInfoUserRole.textContent = role;
    if(profileInfoEmail) profileInfoEmail.textContent = 'email@example.com'; // Placeholder
    if(profileInfoPhone) profileInfoPhone.textContent = '081234567890'; // Placeholder

    if(profileInfoPopup) profileInfoPopup.style.display = 'flex';

    console.log('Profile info popup displayed with data:', {username, role});
}

// Toggle profile dropdown
function toggleProfile() {
     console.log('Toggling profile dropdown'); // Log
     const dropdown = document.getElementById('profileDropdown');
     if(dropdown) {
         dropdown.classList.toggle('active');
          console.log('Profile dropdown state:', dropdown.classList.contains('active') ? 'Open' : 'Closed'); // Log
    } else {
         console.error('Profile dropdown element not found!'); // Log
     }
}

// Close dropdown when clicking outside
window.addEventListener('click', function(event) {
    const profileDropdown = document.getElementById('profileDropdown');
    const profileIconArea = document.querySelector('.profile'); // Area klik ikon/nama profil
    const isClickInsideDropdown = profileDropdown && profileDropdown.contains(event.target);
    const isClickOnProfileArea = profileIconArea && profileIconArea.contains(event.target);

    if (profileDropdown && profileDropdown.classList.contains('active') && !isClickInsideDropdown && !isClickOnProfileArea) {
         console.log('Clicked outside profile dropdown, closing.'); // Log
         profileDropdown.classList.remove('active');
    }
});

function logout() {
  console.log('Initiating logout'); // Log
  const logoutUserName = document.getElementById('logoutUserName');
  const logoutUserRole = document.getElementById('logoutUserRole');
  const logoutPopup = document.getElementById('logoutPopup');

  if (logoutUserName) logoutUserName.textContent = sessionStorage.getItem('username') || 'Pengguna';
  if (logoutUserRole) logoutUserRole.textContent = sessionStorage.getItem('role') || 'Pembeli';
  if (logoutPopup) logoutPopup.style.display = 'flex';

   console.log('Logout confirmation popup displayed.'); // Log
}

function confirmLogout() {
  console.log('Confirming logout...'); // Log
  sessionStorage.clear();
  console.log('sessionStorage cleared. Redirecting to index.html...'); // Log
  window.location.href = "../index.html";
}

// Function to navigate to saldo page (used by the '+' button)
function tambahSaldo() {
    console.log('Redirecting to saldo.html');
    window.location.href = "saldo.html";
    // Menambahkan ikon Font Awesome
    const button = document.createElement('button');
    button.innerHTML = 'Tambah Saldo <i class="fas fa-plus"></i>';
    document.body.appendChild(button);
}

// Function to update profile info (username and role) in the topbar and logout popup
function updateProfileInfo() {
  const usernameElement = document.querySelector('.profile-name');
  const logoutUserNameElement = document.getElementById('logoutUserName');
  const logoutUserRoleElement = document.getElementById('logoutUserRole');
  
  const username = sessionStorage.getItem('username') || 'Pengguna';
  const role = sessionStorage.getItem('role') || 'Pembeli';

  if (usernameElement) usernameElement.textContent = username;
  if (logoutUserNameElement) logoutUserNameElement.textContent = username;
  if (logoutUserRoleElement) logoutUserRoleElement.textContent = role;

  console.log('Profile info updated in UI:', { username, role });
}
