document.addEventListener('DOMContentLoaded', function () {
    // Обработка формы
    const form = document.getElementById('listing-form');
    form.addEventListener('submit', function (event) {
        event.preventDefault(); // Предотвращаем отправку формы

        // Получаем данные из полей
        const type = document.getElementById('type').value;
        const city = document.getElementById('city').value;
        const address = document.getElementById('address').value;
        const price = document.getElementById('price').value;
        const description = document.getElementById('description').value;
        const comment = document.getElementById('comment').value;

        // Проверяем заполнение обязательных полей
        if (!type || !city || !address || !price || !description) {
            alert('Пожалуйста, заполните все обязательные поля.');
            return;
        }

        
        alert('Объявление успешно добавлено!');

        // Очищаем форму
        form.reset();
    });

    // Обработка загрузки изображения
    const imageUploadInput = document.getElementById('image-upload');
    const previewImage = document.querySelector('.image-upload img');

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
});