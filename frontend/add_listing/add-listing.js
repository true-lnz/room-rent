document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("listing-form"); // ID формы должен быть listing-form

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const listingData = {
            type: document.getElementById("type").value,
            city: document.getElementById("city").value,
            address: document.getElementById("address").value,
            price: document.getElementById("price").value,
            description: document.getElementById("description").value,
            comment: document.getElementById("comment").value,
            user_id: 7 // <-- Временно ставим 7
        };

        try {
            const response = await fetch("/api/add-listing", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(listingData)
            });

            const result = await response.text();
            alert(result);
        } catch (error) {
            console.error("Ошибка при отправке:", error);
            alert("Ошибка при добавлении объявления.");
        }
    });
});
