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

// --- МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ ---

function openEditModal(listing) {
    document.getElementById('edit-type').value = listing.type;
    document.getElementById('edit-city').value = listing.city;
    document.getElementById('edit-address').value = listing.address;
    document.getElementById('edit-price').value = listing.price;
    document.getElementById('edit-description').value = listing.description;
    document.getElementById('edit-form').dataset.listingId = listing.id;
    document.getElementById('edit-modal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
}

function setupEditForm() {
    const form = document.getElementById('edit-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const id = parseInt(form.dataset.listingId);
        const listingIndex = listingsData.findIndex(l => l.id === id);
        if (listingIndex === -1) return;

        listingsData[listingIndex] = {
            ...listingsData[listingIndex],
            type: document.getElementById('edit-type').value,
            city: document.getElementById('edit-city').value,
            address: document.getElementById('edit-address').value,
            price: parseInt(document.getElementById('edit-price').value),
            description: document.getElementById('edit-description').value
        };

        renderListings(listingsData);
        closeEditModal();
        alert("Объявление успешно обновлено!");
    });
}

// --- МОДАЛЬНОЕ ОКНО ПРОСМОТРА (из отдельного файла) ---

let viewModalLoaded = false;

async function openViewModal(listing) {
    if (!viewModalLoaded) {
        try {
            const response = await fetch('view-modal.html');
            const html = await response.text();
            document.body.insertAdjacentHTML('beforeend', html);
            viewModalLoaded = true;
        } catch (error) {
            console.error('Ошибка загрузки view-modal.html:', error);
            alert('Не удалось загрузить окно просмотра.');
            return;
        }
    }

    // Заполняем данные
    document.getElementById('modal-type').textContent =
        listing.type === 'storage' ? 'Кладовка' :
        listing.type === 'office' ? 'Офис' :
        listing.type === 'retail' ? 'Торговое помещение' : listing.type;

    document.getElementById('modal-city').textContent = listing.city;
    document.getElementById('modal-address').textContent = listing.address;
    document.getElementById('modal-price').textContent = listing.price.toLocaleString();
    document.getElementById('modal-description').textContent = listing.description;
    document.getElementById('modal-image').src = listing.image;

    // Показываем
    document.getElementById('view-modal').style.display = 'block';

    // Назначаем обработчики закрытия (один раз)
    setupViewModalClose();
}

function setupViewModalClose() {
    const modal = document.getElementById('view-modal');
    if (!modal.dataset.initialized) {
        modal.querySelector('.close')?.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        modal.dataset.initialized = 'true';
    }
}

// --- ИНИЦИАЛИЗАЦИЯ ---

document.addEventListener('DOMContentLoaded', () => {
    renderListings(listingsData);

    // Обработка кликов
    document.addEventListener('click', (e) => {
        const btn = e.target;

        if (btn.classList.contains('btn') && btn.textContent === 'Редактировать') {
            const id = parseInt(btn.dataset.id);
            const listing = listingsData.find(l => l.id === id);
            if (listing) openEditModal(listing);
        }

        if (btn.classList.contains('btn') && btn.textContent === 'Посмотреть объявление') {
            const id = parseInt(btn.dataset.id);
            const listing = listingsData.find(l => l.id === id);
            if (listing) openViewModal(listing);
        }
    });

    // Обработчики для окна редактирования
    document.querySelector('#edit-modal .close')?.addEventListener('click', closeEditModal);
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('edit-modal');
        if (e.target === modal) closeEditModal();
    });

    setupEditForm();
});