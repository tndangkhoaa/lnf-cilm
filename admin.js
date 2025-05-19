document.addEventListener("DOMContentLoaded", () => {
    const SUPABASE_URL = 'https://nrsksqrofooddfsiavot.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yc2tzcXJvZm9vZGRmc2lhdm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwMjc3NjgsImV4cCI6MjA2MjYwMzc2OH0.nMWFx8T4r3o5Nu1RfuX07KhpAOlaoj9QQRxTMv9x-8o';

    const { createClient } = supabase;
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

    checkLoginStatus();

    function checkLoginStatus() {
        if (localStorage.getItem("isAdminLoggedIn") === "true") {
            showAdminContent();
        } else {
            showUnauthorizedMessage();
        }
    }

    function showAdminContent() {
        document.getElementById("unauthorized-section").style.display = "none";
        document.getElementById("admin-content").style.display = "block";
        loadAdminItems();
    }

    function showUnauthorizedMessage() {
        document.getElementById("unauthorized-section").style.display = "block";
        document.getElementById("admin-content").style.display = "none";
    }

    window.logoutAdmin = function () {
        localStorage.removeItem("isAdminLoggedIn");
        location.reload();
    };

    async function uploadImage(file) {
        const fileName = Date.now() + "_" + encodeURIComponent(file.name);
        const { data, error } = await supabaseClient
            .storage
            .from('images')
            .upload(fileName, file);

        if (error) {
            console.error("Lỗi tải ảnh:", error.message);
            return null;
        }

        const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/images/${data.path}`;
        return imageUrl;
    }

    const form = document.getElementById("report-form");
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = {
            title: document.getElementById("title").value,
            description: document.getElementById("description").value,
            location_found: document.getElementById("location").value,
            contact_email: document.getElementById("email").value,
            image_url: document.getElementById("image").files[0]
                ? await uploadImage(document.getElementById("image").files[0])
                : null,
            status: "Chưa nhận",
            date_reported: new Date().toISOString()
        };

        try {
            const { data, error } = await supabaseClient
                .from('LFLibrary')
                .insert([formData])
                .select();

            if (error) throw error;

            alert("Gửi thành công!");
            form.reset();
            document.getElementById("update-btn").style.display = "none";
            loadAdminItems();
        } catch (error) {
            console.error("Lỗi khi gửi dữ liệu:", error);
            alert(`Lỗi: ${error.message}`);
        }
    });

    async function loadAdminItems() {
        try {
            const { data, error } = await supabaseClient
                .from('LFLibrary')
                .select('*')
                .order('date_reported', { ascending: false });

            if (error) throw error;

            const itemsList = document.getElementById("admin-items-list");
            itemsList.innerHTML = "";

            data.forEach(item => {
                const row = document.createElement("tr");

                const statusSelect = document.createElement("select");
                statusSelect.className = "status-dropdown";
                const statusOptions = ["Chưa nhận", "Đã nhận"];
                statusOptions.forEach(status => {
                    const option = document.createElement("option");
                    option.value = status;
                    option.textContent = status;
                    if (status === item.status) option.selected = true;
                    statusSelect.appendChild(option);
                });
                statusSelect.addEventListener("change", () => updateStatus(item.id, statusSelect.value));

                const deleteBtn = document.createElement("button");
                deleteBtn.textContent = "Xóa";
                deleteBtn.className = "delete-btn";
                deleteBtn.onclick = () => deleteItem(item.id);

                const formattedDate = new Date(item.date_reported).toLocaleDateString('vi-VN');

                row.innerHTML = `
                    <td>${item.id.slice(0, 5)}...</td>
                    <td>${item.title || 'Không có tiêu đề'}</td>
                    <td>${item.image_url ? `<img src="${item.image_url}" alt="Ảnh" style="max-width:60px; border-radius:4px;">` : 'Không có'}</td>
                    <td>${item.location_found || 'Không rõ'}</td>
                    <td>${formattedDate}</td>
                    <td>${item.contact_email || 'Không có'}</td>
                    <td class="status-cell"></td>
                    <td class="action-btns"></td>
                `;

                row.querySelector(".status-cell").appendChild(statusSelect);
                row.querySelector(".action-btns").appendChild(deleteBtn);

                // Sự kiện khi bấm vào hàng
                row.addEventListener("click", () => fillFormWithItem(item));

                itemsList.appendChild(row);
            });
        } catch (err) {
            console.error("Lỗi khi tải dữ liệu:", err);
            alert("Không thể tải dữ liệu: " + err.message);
        }
    }

    async function updateStatus(id, status) {
        try {
            const { error } = await supabaseClient
                .from('LFLibrary')
                .update({ status })
                .eq('id', id);
            if (error) throw error;
            alert("✅ Trạng thái đã được cập nhật.");
        } catch (err) {
            console.error("Lỗi cập nhật trạng thái:", err);
            alert("❌ Không thể cập nhật trạng thái: " + err.message);
        }
    }

    async function deleteItem(id) {
        if (!confirm("Bạn có chắc muốn xóa mục này?")) return;
        try {
            const { error } = await supabaseClient
                .from('LFLibrary')
                .delete()
                .eq('id', id);
            if (error) throw error;
            alert("🗑️ Mục đã được xóa.");
            loadAdminItems();
        } catch (err) {
            console.error("Lỗi khi xóa:", err);
            alert("❌ Không thể xóa: " + err.message);
        }
    }

    function fillFormWithItem(item) {
        document.getElementById("record-id").value = item.id;
        document.getElementById("title").value = item.title;
        document.getElementById("description").value = item.description || '';
        document.getElementById("location").value = item.location_found;
        document.getElementById("email").value = item.contact_email;
        document.getElementById("update-btn").style.display = "inline-block";
    }

    document.getElementById("update-btn").addEventListener("click", async () => {
        const id = document.getElementById("record-id").value;
        if (!id) return alert("❌ Không có dữ liệu để cập nhật");

        const updates = {
            title: document.getElementById("title").value,
            description: document.getElementById("description").value,
            location_found: document.getElementById("location").value,
            contact_email: document.getElementById("email").value
        };

        try {
            const { error } = await supabaseClient
                .from('LFLibrary')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            alert("✅ Cập nhật thành công!");
            form.reset();
            document.getElementById("update-btn").style.display = "none";
            loadAdminItems();
        } catch (err) {
            alert("❌ Lỗi cập nhật: " + err.message);
        }
    });
});
