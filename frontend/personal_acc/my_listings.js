// Загрузка моих объявлений из API и рендер
async function loadMyListings() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/frontend/authorization/authorization.html';
        return [];
    }
    let email = '';
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        email = payload.email;
    } catch (e) {
        window.location.href = '/frontend/authorization/authorization.html';
        return [];
    }
    try {
        const res = await fetch(`/api/my-listings?email=${encodeURIComponent(email)}`);
        if (!res.ok) throw new Error(await res.text());
        return await res.json();
    } catch (e) {
        //
        return [];
    }
}

function translateType(code) {
    const map = { storage: 'Кладовка', office: 'Офис', retail: 'Торговое помещение', warehouse: 'Склад', garage: 'Гараж' };
    return map[code] || code;
}

// Функция для проверки авторизации
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/auth';
        return null;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.email;
    } catch (e) {
        localStorage.removeItem('token');
        window.location.href = '/auth';
        return null;
    }
}

// Функция для проверки размера файла
function validateFileSize(file, maxSizeMB = 10) {
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
        alert(`Файл больше ${maxSizeMB} МБ, выберите другой.`);
        return false;
    }
    return true;
}

function renderListings(listings) {
    const container = document.getElementById('listings-container');
    if (!listings || listings.length === 0) {
        container.innerHTML = '<div class="no-results">Объявлений пока нет</div>';
        return;
    }
    container.innerHTML = listings.map(listing => {
        const img = imagesMap[listing.id] || 'image1.jpg';
        const priceNum = parseInt(listing.price) || 0;
        const title = `${translateType(listing.type)} — ${listing.city}`;
        const description = listing.description || listing.comment || '';
        return `
        <div class="listing">
            <img src="${img}" alt="Фото помещения" class="listing-image">
            <div class="listing-content">
                <h3 class="listing-title">${title}</h3>
                <p class="listing-price">${priceNum.toLocaleString()} ₽/мес</p>
                <p class="listing-address">${listing.address}</p>
                ${description ? `<p class="listing-description"><strong>Описание:</strong> ${description}</p>` : ''}
                ${listing.user_comment ? `<p class="listing-user-comment"><strong>Комментарий:</strong> ${listing.user_comment}</p>` : ''}
                <div class="listing-actions">
                    <button class="btn btn-primary" data-id="${listing.id}">Редактировать</button>
                    <button class="btn btn-secondary" data-id="${listing.id}">Посмотреть объявление</button>
                </div>
            </div>
        </div>`;
    }).join('');
}


// --- ФУНКЦИИ ДЛЯ МОДАЛЬНОГО ОКНА ДОБАВЛЕНИЯ ---

function openAddModal() {
    document.getElementById('add-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeAddModal() {
    document.getElementById('add-modal').style.display = 'none';
    document.body.style.overflow = '';
    document.getElementById('add-form').reset();
    // Сбрасываем изображение на placeholder
    document.getElementById('preview-image').src = 'download-icon.png';
}

function setupAddModal() {
    const addModal = document.getElementById('add-modal');
    const openAddModalBtn = document.getElementById('open-add-modal');
    const closeAddModalBtn = document.getElementById('close-add-modal');
    const cancelAddBtn = document.getElementById('cancel-add');
    const addForm = document.getElementById('add-form');
    const imageUploadInput = document.getElementById('image-upload');
    const previewImage = document.getElementById('preview-image');

    // Проверяем авторизацию при открытии модального окна
    openAddModalBtn.addEventListener('click', function() {
        const userEmail = checkAuth();
        if (!userEmail) return;
        openAddModal();
    });

    // Закрытие модального окна
    closeAddModalBtn.addEventListener('click', closeAddModal);
    cancelAddBtn.addEventListener('click', closeAddModal);

    // Закрытие по клику вне модального окна
    window.addEventListener('click', function(event) {
        if (event.target === addModal) {
            closeAddModal();
        }
    });

    // Обработка загрузки изображения
    imageUploadInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            if (!validateFileSize(file)) {
                this.value = ''; // Очищаем input
                return;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Клик по изображению = открыть выбор файла
    previewImage.addEventListener('click', () => {
        imageUploadInput.click();
    });

    // Обработка отправки формы
    addForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Проверяем авторизацию
        const userEmail = checkAuth();
        if (!userEmail) return;

        // Валидация формы
        if (!addForm.checkValidity()) {
            e.stopPropagation();
            addForm.classList.add('was-validated');
            return;
        }

        // Сбор данных формы
        const formData = {
            type: document.getElementById('add-type').value,
            city: document.getElementById('add-city').value,
            address: document.getElementById('add-address').value,
            price: document.getElementById('add-price').value,
            description: (document.getElementById('add-description').value || '').trim(),
            user_comment: (document.getElementById('add-user_comment').value || '').trim(),
            user_email: userEmail
        };

        const imageInput = document.getElementById('image-upload');
        const file = imageInput.files[0];

        try {
            // 1) Создаем объявление
            const response = await fetch('/api/add-listing', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                alert('❌ Ошибка создания: ' + errorText);
                return;
            }

            let created = {};
            try {
                created = await response.json();
            } catch (_) {
                const raw = await response.text();
                alert('❌ Ошибка парсинга ответа: ' + raw);
                return;
            }

            const listingId = created?.id;

            // 2) Загружаем изображение, если есть
            if (listingId && file) {
                if (!validateFileSize(file)) return;

                const fd = new FormData();
                fd.append('image', file);

                const uploadResp = await fetch(`/api/listings/${listingId}/images`, {
                    method: 'POST',
                    body: fd,
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!uploadResp.ok) {
                    const uploadError = await uploadResp.text();
                    alert('Объявление создано, но загрузка фото не удалась: ' + uploadError);
                }
            }

            // Успешное завершение
            closeAddModal();
            await reloadListings();
            alert('✅ Объявление успешно добавлено!');

        } catch (error) {
            console.error('Ошибка отправки:', error);
            alert('❌ Ошибка сети. Попробуйте ещё раз.');
        }
    });
}

// Функция для перезагрузки объявлений
async function reloadListings() {
    listingsData = await loadMyListings();

    // Загрузка изображений
    try {
        await Promise.all((listingsData || []).map(async (l) => {
            try {
                const r = await fetch(`/api/listings/${l.id}/images`);
                if (r.ok) {
                    const imgs = await r.json();
                    if (Array.isArray(imgs) && imgs.length > 0 && imgs[0].file_path) {
                        imagesMap[l.id] = imgs[0].file_path;
                    }
                }
            } catch (_) {}
        }));
    } catch (_) {}

    renderListings(listingsData);
}


// --- МОДАЛКИ И ПРОЧЕЕ ОСТАВЛЯЕМ БЕЗ ИЗМЕНЕНИЙ ---

let listingsData = [];
let imagesMap = {};

function openEditModal(listing) {
    document.getElementById('edit-type').value = listing.type;
    document.getElementById('edit-city').value = listing.city;
    document.getElementById('edit-address').value = listing.address;
    document.getElementById('edit-price').value = parseInt(listing.price) || 0;
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
            price: String(parseInt(document.getElementById('edit-price').value) || 0),
        };
        renderListings(listingsData);
        closeEditModal();
        alert('Объявление успешно обновлено!');
    });

    // Удаление объявления
    const deleteBtn = document.getElementById('delete-listing');
    const deleteModal = document.getElementById('delete-modal');
    const deleteClose = document.getElementById('delete-close');
    const cancelDelete = document.getElementById('cancel-delete');
    const confirmDelete = document.getElementById('confirm-delete');

    const openDeleteModal = () => { deleteModal.style.display = 'block'; };
    const closeDeleteModal = () => { deleteModal.style.display = 'none'; };

    deleteBtn.addEventListener('click', () => {
        openDeleteModal();
    });
    deleteClose.addEventListener('click', closeDeleteModal);
    cancelDelete.addEventListener('click', closeDeleteModal);
    window.addEventListener('click', (e) => { if (e.target === deleteModal) closeDeleteModal(); });

    confirmDelete.addEventListener('click', async function () {
        const id = parseInt(form.dataset.listingId);
        if (!id) return;
        try {
            const resp = await fetch(`/api/listings/${id}`, { method: 'DELETE', credentials: 'include' });
            if (!resp.ok) {
                const t = await resp.text();
                alert('Ошибка удаления: ' + t);
                return;
            }
            listingsData = listingsData.filter(l => l.id !== id);
            renderListings(listingsData);
            closeDeleteModal();
            closeEditModal();
        } catch (err) {
            //
            alert('Ошибка сети при удалении');
        }
    });
}

let viewModalLoaded = false;
async function openViewModal(listing) {
    if (!viewModalLoaded) {
        try {
            const response = await fetch('view-modal.html');
            const html = await response.text();
            document.body.insertAdjacentHTML('beforeend', html);
            viewModalLoaded = true;
        } catch (error) {
            //
            alert('Не удалось загрузить окно просмотра.');
            return;
        }
    }
    document.getElementById('modal-type').textContent = translateType(listing.type);
    document.getElementById('modal-city').textContent = listing.city;
    document.getElementById('modal-address').textContent = listing.address;
    document.getElementById('modal-price').textContent = (parseInt(listing.price)||0).toLocaleString();
    document.getElementById('modal-description').textContent = listing.description || listing.comment || '';
    document.getElementById('modal-user-comment').textContent = listing.user_comment || '';
    document.getElementById('modal-image').src = imagesMap[listing.id] || 'image1.jpg';
    document.getElementById('view-modal').style.display = 'block';
    setupViewModalClose();
}

function setupViewModalClose() {
    const modal = document.getElementById('view-modal');
    if (!modal.dataset.initialized) {
        modal.querySelector('.close')?.addEventListener('click', () => { modal.style.display = 'none'; });
        window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
        modal.dataset.initialized = 'true';
    }
}

// --- ИНИЦИАЛИЗАЦИЯ ---

document.addEventListener('DOMContentLoaded', async () => {
    listingsData = await loadMyListings();
    try {
        await Promise.all((listingsData || []).map(async (l) => {
            try {
                const r = await fetch(`/api/listings/${l.id}/images`);
                if (r.ok) {
                    const imgs = await r.json();
                    if (Array.isArray(imgs) && imgs.length > 0 && imgs[0].file_path) {
                        imagesMap[l.id] = imgs[0].file_path;
                    }
                }
            } catch (_) {}
        }));
    } catch (_) {}
    renderListings(listingsData);

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

    document.querySelector('#edit-modal .close')?.addEventListener('click', closeEditModal);
    window.addEventListener('click', (e) => { const modal = document.getElementById('edit-modal'); if (e.target === modal) closeEditModal(); });
    setupEditForm();
});