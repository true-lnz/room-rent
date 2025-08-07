const listingsData = [
        {
            id: 1,
            title: "Помещение 10 м² 1 этаж",
            price: 10000,
            type: "storage",
            city: "ufa",
            address: "ул. Космонавтов 1",
            description: "Сдаётся кладовка на 1 этаже",
            image: "image1.jpg",
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
            image: "image1.jpg",
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
            image: "image1.jpg",
            date: "2025-07-15"
        }
    ];
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
                    <button class="btn btn-primary">Редактировать</button>
                    <button class="btn btn-secondary" data-id="${listing.id}">Посмотреть объявление</button>
                </div>
            </div>
        </div>
    `).join('');
    }

    renderListings(listingsData);