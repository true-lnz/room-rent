document.addEventListener('DOMContentLoaded', function() {
    // Данные объявлений
    const listingsData = [
        {
            id: 1,
            title: "Помещение 10 м² 1 этаж",
            price: 10000,
            type: "storage",
            city: "ufa",
            address: "ул. Космонавтов 1",
            description: "Сдаётся кладовка на 1 этаже",
            image: "images/image.jpg",
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
            image: "images/image.jpg",
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
            image: "images/image.jpg",
            date: "2025-07-15"
        }
    ];

    // Инициализация
    renderListings(listingsData);
    
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

// Функция фильтрации
function applyFilters() {
    const priceMin = parseInt(document.getElementById('price-min').value) || 0;
    const priceMax = parseInt(document.getElementById('price-max').value) || 999999;
    const type = document.getElementById('type').value;
    const city = document.getElementById('city').value;
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    
    const allListings = [
        {
            id: 1,
            title: "Помещение 10 м² 1 этаж",
            price: 10000,
            type: "storage",
            city: "ufa",
            address: "ул. Космонавтов 1",
            description: "Сдаётся кладовка на 1 этаже",
            image: "images/image.jpg",
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
            image: "images/image.jpg",
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
            image: "images/image.jpg",
            date: "2025-07-15"
        }
    ];
    
    const filtered = allListings.filter(listing => {
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