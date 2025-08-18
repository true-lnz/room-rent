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

// Функция рендеринга объявлений
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
                    <button class="btn btn-primary" data-id="${listing.id}">Редактировать</button>
                    <button class="btn btn-secondary" data-id="${listing.id}">Посмотреть объявление</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Открытие модального окна редактирования
function openEditModal(listing) {
    // Заполняем поля формы
    document.getElementById('edit-type').value = listing.type;
    document.getElementById('edit-city').value = listing.city;
    document.getElementById('edit-address').value = listing.address;
    document.getElementById('edit-price').value = listing.price;
    document.getElementById('edit-description').value = listing.description;

    // Показываем модальное окно
    document.getElementById('edit-modal').style.display = 'block';

    // Сохраняем ID текущего объявления
    document.getElementById('edit-form').dataset.listingId = listing.id;
}

// Закрытие модального окна
function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
}

// Обработчик формы редактирования
function setupEditForm() {
    const form = document.getElementById('edit-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const id = parseInt(form.dataset.listingId);
        const listingIndex = listingsData.findIndex(l => l.id === id);

        if (listingIndex === -1) return;

        // Обновляем данные
        listingsData[listingIndex] = {
            ...listingsData[listingIndex],
            type: document.getElementById('edit-type').value,
            city: document.getElementById('edit-city').value,
            address: document.getElementById('edit-address').value,
            price: parseInt(document.getElementById('edit-price').value),
            description: document.getElementById('edit-description').value
        };

        // Перерисовываем список
        renderListings(listingsData);

        // Закрываем окно
        closeEditModal();
        alert("Объявление успешно обновлено!");
    });
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    renderListings(listingsData);

    // Обработка кликов по кнопкам "Редактировать"
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn') && e.target.textContent === 'Редактировать') {
            const id = parseInt(e.target.dataset.id);
            const listing = listingsData.find(l => l.id === id);
            if (listing) {
                openEditModal(listing);
            }
        }
    });

    // Закрытие модального окна по кресту
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeEditModal);
    }

    // Закрытие по клику вне окна
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('edit-modal');
        if (e.target === modal) {
            closeEditModal();
        }
    });

    // Настройка формы
    setupEditForm();
});