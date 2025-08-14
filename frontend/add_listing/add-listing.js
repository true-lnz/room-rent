document.addEventListener('DOMContentLoaded', function () {
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
    form.addEventListener('submit', function (e) {
        e.preventDefault(); // Блокируем стандартную отправку

        // Проверяем валидность формы
        if (form.checkValidity()) {
            alert('✅ Объявление успешно добавлено!');
            form.reset(); // Очищаем форму
            previewImage.src = 'https://via.placeholder.com/200'; // Сброс изображения
        } else {
            // Показываем стандартные подсказки браузера
            form.reportValidity();
        }
    });
});