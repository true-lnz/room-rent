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

        // Собираем данные формы
        const formData = {
            type: document.getElementById('type').value,
            city: document.getElementById('city').value,
            address: document.getElementById('address').value,
            price: document.getElementById('price').value,
            comment: document.getElementById('comment').value,
            user_email: userEmail // Добавляем email пользователя
        };

        try {
            // Отправляем данные на сервер
            const response = await fetch('/api/add-listing', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                alert('✅ Объявление успешно добавлено!');
                form.reset(); // Очищаем форму
                previewImage.src = 'https://via.placeholder.com/200x200/cccccc/666666?text=Загрузить+фото'; // Сброс изображения
            } else {
                const errorText = await response.text();
                alert('❌ Ошибка: ' + errorText);
            }
        } catch (error) {
            console.error('Ошибка отправки:', error);
            alert('❌ Ошибка сети. Попробуйте ещё раз.');
        }
    });
});