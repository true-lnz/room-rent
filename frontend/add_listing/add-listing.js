document.addEventListener('DOMContentLoaded', function () {
    // Проверка авторизации
    const token = localStorage.getItem("token");
    if (!token) {
        alert("Вы не авторизованы");
        window.location.href = "/frontend/authorization/authorization.html";
        return;
    }

    // Проверяем валидность токена и получаем email
    let userEmail;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userEmail = payload.email;
        console.log("Авторизован как:", userEmail);
    } catch (e) {
        alert("Ошибка токена. Войдите заново.");
        localStorage.removeItem("token");
        window.location.href = "/frontend/authorization/authorization.html";
        return;
    }

    const form = document.getElementById('listing-form');
    const imageUploadInput = document.getElementById('image-upload');
    const previewImage = document.getElementById('preview-image');

    // Обработка загрузки изображения
    imageUploadInput.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                previewImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Клик по изображению = открыть выбор файла
    previewImage.addEventListener('click', () => {
        imageUploadInput.click();
    });

    // Отправка формы
    form.addEventListener('submit', async function (e) {
        e.preventDefault(); // Блокируем стандартную отправку

        // Проверяем валидность формы
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }


        const formData = {
            type: document.getElementById('type').value,
            city: document.getElementById('city').value,
            address: document.getElementById('address').value,
            price: document.getElementById('price').value,
            comment: (document.getElementById('comment').value || '').trim(),
            user_email: userEmail // Добавляем email пользователя
        };

        try {
            console.log('[add] sending', formData);
            const response = await fetch('/api/add-listing', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            const raw = await response.text();
            console.log('[add] raw response:', raw);

            if (!response.ok) {
                alert('❌ Ошибка создания: ' + raw);
                return;
            }

            let created = {};
            try { created = JSON.parse(raw); } catch (_) {}
            const listingId = created?.id;
            console.log('[add] created id:', listingId);

            // 2) Если выбран файл — загружаем его
            const file = imageUploadInput.files && imageUploadInput.files[0];
            if (listingId && file) {
                const maxSize = 10 * 1024 * 1024; // 10MB
                if (file.size > maxSize) {
                    alert('Файл больше 10 МБ, выберите другой.');
                    return;
                }
                const fd = new FormData();
                fd.append('image', file);
                console.log('[upload] start for listing', listingId, file.name, file.size);
                // listing_id не обязателен, бек возьмёт id из пути
                const uploadResp = await fetch(`/api/listings/${listingId}/images`, {
                    method: 'POST',
                    body: fd,
                    credentials: 'include'
                });
                const uploadText = await uploadResp.text();
                console.log('[upload] status:', uploadResp.status, 'resp:', uploadText);
                if (!uploadResp.ok) {
                    alert('Объявление создано, но загрузка фото не удалась: ' + uploadText);
                }
            } else {
                console.log('[upload] пропуск: нет id или файла', { listingId, hasFile: !!file });
            }

            alert('✅ Объявление успешно добавлено!');
            form.reset(); // Очищаем форму
            previewImage.src = 'https://via.placeholder.com/200x200/cccccc/666666?text=Загрузить+фото'; // Сброс изображения
        } catch (error) {
            console.error('Ошибка отправки:', error);
            alert('❌ Ошибка сети. Попробуйте ещё раз.');
        }
    });
});