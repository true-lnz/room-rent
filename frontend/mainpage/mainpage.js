document.addEventListener('DOMContentLoaded', async function () {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Вы не авторизованы");
        window.location.href = "/authorization/authorization.html";
        return;
    }

    // Раскодировать токен и показать email
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const email = payload.email;

        const userNav = document.querySelector(".user-nav");
        const emailTag = document.createElement("div");
        emailTag.textContent = `Вы вошли как: ${email}`;
        emailTag.style.marginLeft = "auto";
        emailTag.style.fontWeight = "bold";
        userNav.appendChild(emailTag);

        // Кнопка выхода
        const logoutBtn = document.getElementById("logout-btn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                localStorage.removeItem("token");
                window.location.href = "/authorization/authorization.html";
            });
        }
    } catch (e) {
        alert("Ошибка токена. Войдите заново.");
        localStorage.removeItem("token");
        window.location.href = "/authorization/authorization.html";
        return;
    }

    renderListings(listingsData);
    setupFilters();
});

function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const filter = this.closest('.filter');
            const isActive = filter.classList.contains('active');
            document.querySelectorAll('.filter').forEach(f => f.classList.remove('active'));
            if (!isActive) filter.classList.add('active');
        });
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.filter') && !e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('.filter').forEach(f => f.classList.remove('active'));
        }
    });

    document.getElementById('reset-filters').addEventListener('click', function () {
        document.getElementById('price-min').value = '';
        document.getElementById('price-max').value = '';
        document.getElementById('type').value = '';
        document.getElementById('city').value = '';
        document.getElementById('date-from').value = '';
        document.getElementById('date-to').value = '';
        applyFilters();
    });
}

const listingsData = [/* ...твой список объявлений... */];

function applyFilters() {
    const priceMin = parseInt(document.getElementById('price-min').value) || 0;
    const priceMax = parseInt(document.getElementById('price-max').value) || 999999;
    const type = document.getElementById('type').value;
    const city = document.getElementById('city').value;
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;

    const filtered = listingsData.filter(listing => {
        const priceOk = listing.price >= priceMin && listing.price <= priceMax;
        const typeOk = !type || listing.type === type;
        const cityOk = !city || listing.city === city;
        const dateOk = (!dateFrom || listing.date >= dateFrom) && (!dateTo || listing.date <= dateTo);
        return priceOk && typeOk && cityOk && dateOk;
    });

    renderListings(filtered);
}

function renderListings(listings) {
    const container = document.getElementById('listings-container');
    if (listings.length === 0) {
        container.innerHTML = '<div class="no-results">Ничего не найдено.</div>';
        return;
    }

    container.innerHTML = listings.map(listing => `
        <div class="listing">
            <img src="${listing.image}" alt="Фото помещения" class="listing-image">
            <div class="listing-content">
                <h3>${listing.title}</h3>
                <p class="listing-price">${listing.price.toLocaleString()} ₽/мес</p>
                <p>${listing.description}</p>
                <p class="listing-address">${listing.address}</p>
                <div class="listing-actions">
                    <button class="btn btn-primary">Забронировать</button>
                    <button class="btn btn-secondary">Подробнее</button>
                </div>
            </div>
        </div>
    `).join('');
}
