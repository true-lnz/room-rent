const listingsData = [
        {
            id: 1,
            title: "Помещение 10 м² 1 этаж",
            price: 10000,
            type: "storage",
            city: "ufa",
            address: "ул. Космонавтов 1",
            description: "Сдаётся кладовка на 1 этаже",
            image: "/frontend/public/image1.jpg",
            date: "2025-07-22"
        },
        {
            id: 2,
            title: "Помещение 15 м² 2 этаж",
            price: 15000,
            type: "office",
            city: "ufa",
            address: "ул. Ленина 42",
            description: "Сдаётся офисное помещение",
            image: "/frontend/public/image1.jpg",
            date: "2025-07-20"
        },
        {
            id: 3,
            title: "Помещение 25 м² цоколь",
            price: 8000,
            type: "storage",
            city: "moscow",
            address: "ул. Гагарина 15",
            description: "Сдаётся складское помещение",
            image: "/frontend/public/image1.jpg",
            date: "2025-07-15"
        }
    ];
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Вы не авторизованы");
        window.location.href = "/frontend/authorization/authorization.html";
        return;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const email = payload.email;

        const userNav = document.querySelector(".user-nav");
        if (userNav) {
            const emailTag = document.createElement("div");
            emailTag.textContent = `Вы вошли как: ${email}`;
            emailTag.style.marginLeft = "auto";
            emailTag.style.fontWeight = "bold";
            userNav.appendChild(emailTag);
        }

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
        window.location.href = "/frontend/authorization/authorization.html";
        return;
    }

    // Инициализация
    renderListings(listingsData);
    document.querySelector('.close-btn').addEventListener('click', () => {
    document.getElementById('modal').style.display = 'none';
    });

    // Закрытие по клику вне окна
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('modal');
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Форма бронирования
    document.querySelector('.booking-form').addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Спасибо! Ваша заявка на бронирование отправлена.');
        document.getElementById('modal').style.display = 'none';
    });
    // Обработчики фильтров
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const filter = this.closest('.filter');
            const isActive = filter.classList.contains('active');
            
            document.querySelectorAll('.filter').forEach(f => {
                f.classList.remove('active');
            });
            
            if (!isActive) {
                filter.classList.add('active');
            }
        });
    });
    
    // Закрытие при клике вне фильтра
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.filter') && !e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('.filter').forEach(f => {
                f.classList.remove('active');
            });
        }
    });

    // Обработчик кнопки сброса фильтров
    document.getElementById('reset-filters').addEventListener('click', function() {
        // Сброс значений фильтров
        document.getElementById('price-min').value = '';
        document.getElementById('price-max').value = '';
        document.getElementById('type').value = '';
        document.getElementById('city').value = '';
        document.getElementById('date-from').value = '';
        document.getElementById('date-to').value = '';
        
        // Применение фильтров (покажет все объявления)
        applyFilters();
    });
});
// Функция для отображения названия города вместо кода
function getCityName(cityCode) {
    const cities = {
        ufa: 'Уфа',
        moscow: 'Москва',
        spb: 'Санкт-Петербург'
    };
    return cities[cityCode] || cityCode;
}
// Функция фильтрации
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
        const dateOk = (!dateFrom || listing.date >= dateFrom) && 
                      (!dateTo || listing.date <= dateTo);
        
        return priceOk && typeOk && cityOk && dateOk;
    });
    
    renderListings(filtered);
}

function renderListings(listings) {
    const container = document.getElementById('listings-container');
    if (listings.length === 0) {
        container.innerHTML = '<div class="no-results">Ничего не найдено. Измените параметры фильтрации.</div>';
        return;
    }

    container.innerHTML = listings.map(listing => `
        <div class="listing">
            <img src="${listing.image}" alt="Фото помещения" class="listing-image">
            <div class="listing-content">
                <h3 class="listing-title">${listing.title}</h3>
                <p class="listing-price">${listing.price.toLocaleString()} ₽/мес</p>
                <p class="listing-description">${listing.description}</p>
                <p class="listing-address">${listing.address}</p>
                <div class="listing-actions">
                    <button class="btn btn-primary">Забронировать</button>
                    <button class="btn btn-secondary" data-id="${listing.id}">Подробнее</button>
                </div>
            </div>
        </div>
    `).join('');

    // Добавляем обработчики для кнопок "Подробнее"
    document.querySelectorAll('.btn-secondary[data-id]').forEach(btn => {
        btn.addEventListener('click', function () {
            const id = parseInt(this.getAttribute('data-id'));
            const listing = listingsData.find(item => item.id === id);

            if (listing) {
                document.querySelector('.modal-title').textContent = listing.title;
                document.querySelector('.modal-price').textContent = `${listing.price.toLocaleString()} ₽/мес`;
                document.querySelector('.modal-description').textContent = listing.description;
                document.querySelector('.modal-city').textContent = `Город: ${getCityName(listing.city)}`;
                document.querySelector('.modal-address').textContent = `Адрес: ${listing.address}`;
                document.querySelector('.modal-image').src = listing.image;

                // Показываем модальное окно
                document.getElementById('modal').style.display = 'flex';
            }
        });
    });
}