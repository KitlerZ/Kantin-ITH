let cart = [];
let username = sessionStorage.getItem("username");

async function fetchSaldo() {
    const res = await fetch("../backend/get_saldo.php?username=" + username);
    const data = await res.json();
    document.getElementById("saldo").textContent = data.saldo;
    return parseFloat(data.saldo);
}

async function fetchMenu() {
    const res = await fetch("../backend/get_menu.php");
    const menu = await res.json();
    const list = document.getElementById("menuList");
    menu.forEach(item => {
        const div = document.createElement("div");
        div.innerHTML = `<b>${item.nama}</b> - Rp ${item.harga} 
        <button onclick='addToCart(${JSON.stringify(item)})'>Tambah</button>`;
        list.appendChild(div);
    });
}

function addToCart(item) {
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
        existing.jumlah += 1;
        existing.subtotal += parseFloat(item.harga);
    } else {
        cart.push({
            menu_id: item.id,
            nama: item.nama,
            jumlah: 1,
            subtotal: parseFloat(item.harga)
        });
    }
    renderCart();
}

function renderCart() {
    const list = document.getElementById("cartList");
    list.innerHTML = "";
    let total = 0;
    cart.forEach(item => {
        const li = document.createElement("li");
        li.textContent = `${item.nama} x${item.jumlah} - Rp ${item.subtotal}`;
        list.appendChild(li);
        total += item.subtotal;
    });
    document.getElementById("total").textContent = total;
}

async function checkout() {
    const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const saldo = await fetchSaldo();
    if (saldo < total) {
        document.getElementById("message").textContent = "Saldo tidak cukup!";
        return;
    }

    const res = await fetch("../backend/place_order.php", {
        method: "POST",
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            username: username,
            items: cart,
            total_harga: total
        })
    });
    const result = await res.json();
    if (result.status === "success") {
        document.getElementById("message").textContent = "Pesanan berhasil!";
        cart = [];
        renderCart();
        fetchSaldo();
    } else {
        document.getElementById("message").textContent = result.message;
    }
}

fetchMenu();
fetchSaldo();