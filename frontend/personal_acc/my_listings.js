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
        console.error('Ошибка загрузки моих объявлений', e);
        return [];
    }
}

function translateType(code) {
    const map = { storage: 'Кладовка', office: 'Офис', retail: 'Торговое помещение', warehouse: 'Склад', garage: 'Гараж' };
    return map[code] || code;
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
        return `
        <div class="listing">
            <img src="${img}" alt="Фото помещения" class="listing-image">
            <div class="listing-content">
                <h3 class="listing-title">${title}</h3>
                <p class="listing-price">${priceNum.toLocaleString()} ₽/мес</p>
                <p><strong>Описание:</strong> ${listing.description || ''}</p>
                <p><strong>Комментарий:</strong> ${listing.comment || ''}</p>
                <p class="listing-address">${listing.address}</p>
                <div class="listing-actions">
                    <button class="btn btn-primary" data-id="${listing.id}">Редактировать</button>
                    <button class="btn btn-secondary" data-id="${listing.id}">Посмотреть объявление</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// --- МОДАЛКИ И ПРОЧЕЕ ОСТАВЛЯЕМ БЕЗ ИЗМЕНЕНИЙ ---

let listingsData = [];
let imagesMap = {};

function openEditModal(listing) {
    document.getElementById('edit-type').value = listing.type;
    document.getElementById('edit-city').value = listing.city;
    document.getElementById('edit-address').value = listing.address;
    document.getElementById('edit-price').value = parseInt(listing.price) || 0;
    document.getElementById('edit-description').value = listing.description || '';
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
            description: document.getElementById('edit-description').value
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
            console.error('Ошибка удаления', err);
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
            console.error('Ошибка загрузки view-modal.html:', error);
            alert('Не удалось загрузить окно просмотра.');
            return;
        }
    }
    document.getElementById('modal-type').textContent = listing.type;
    // Русский тип в модалке
    document.getElementById('modal-type').textContent = translateType(listing.type);
    document.getElementById('modal-city').textContent = listing.city;
    document.getElementById('modal-address').textContent = listing.address;
    document.getElementById('modal-price').textContent = (parseInt(listing.price)||0).toLocaleString();
    document.getElementById('modal-description').textContent = listing.description || '';
    // убедимся, что строка комментария существует
    let userCommentEl = document.getElementById('modal-user-comment');
    if (!userCommentEl) {
        const body = document.querySelector('#view-modal .modal-body');
        const img = document.getElementById('modal-image');
        const p = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = 'Комментарий: ';
        userCommentEl = document.createElement('span');
        userCommentEl.id = 'modal-user-comment';
        userCommentEl.style.color = '#666';
        p.appendChild(strong);
        p.appendChild(userCommentEl);
        body.insertBefore(p, img); // вставляем перед картинкой
    }
    userCommentEl.textContent = listing.comment || '';
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