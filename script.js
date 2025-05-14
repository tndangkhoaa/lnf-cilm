// 1. Kết nối Supabase
const SUPABASE_URL = 'https://nrsksqrofooddfsiavot.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yc2tzcXJvZm9vZGRmc2lhdm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwMjc3NjgsImV4cCI6MjA2MjYwMzc2OH0.nMWFx8T4r3o5Nu1RfuX07KhpAOlaoj9QQRxTMv9x-8o';
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. DOM Elements
const form = document.getElementById("report-form");
const itemsList = document.getElementById("items-list");

// 3. Hàm nén ảnh trước khi upload
function compressImage(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target.result;
        };

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = maxWidth / img.width;
            canvas.width = maxWidth;
            canvas.height = img.height * scale;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
                if (blob) {
                    const newFile = new File([blob], file.name, { type: 'image/jpeg' });
                    resolve(newFile);
                } else {
                    reject(new Error("Không thể nén ảnh."));
                }
            }, 'image/jpeg', quality);
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// 4. Upload ảnh lên Supabase Storage sau khi nén
async function uploadImage(file) {
    const compressedFile = await compressImage(file, 800, 0.7);
    const fileName = Date.now() + "_" + encodeURIComponent(file.name);

    const { data, error } = await supabaseClient
        .storage
        .from('images')
        .upload(fileName, compressedFile);

    if (error) {
        console.error("Lỗi tải ảnh:", error.message);
        return null;
    }

    return `https://nrsksqrofooddfsiavot.supabase.co/storage/v1/object/public/images/${data.path}`;
}

// 5. Xử lý Submit Form
form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById("image");
    const imageFile = fileInput.files[0];

    const formData = {
        title: document.getElementById("title").value,
        description: document.getElementById("description").value,
        location_found: document.getElementById("location").value,
        contact_phone: document.getElementById("phone").value,
        contact_email: document.getElementById("email").value,
        image_url: imageFile ? await uploadImage(imageFile) : null,
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
        await loadItems();
    } catch (error) {
        console.error("Lỗi khi gửi dữ liệu:", error);
        alert(`Lỗi: ${error.message}`);
    }
});

// 6. Tải danh sách đồ thất lạc
async function loadItems() {
    try {
        itemsList.innerHTML = "<p>Đang tải dữ liệu...</p>";

        const { data, error } = await supabaseClient
            .from('LFLibrary')
            .select('*')
            .order('date_reported', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            itemsList.innerHTML = "<p>Không có dữ liệu</p>";
            return;
        }

        itemsList.innerHTML = data.map(item => {
            const displayDate = item.date_reported
                ? new Date(item.date_reported).toLocaleDateString('vi-VN')
                : 'N/A';

            return `
                <div class="item">
                    <h3>${item.title || 'Không có tiêu đề'}</h3>
                    <p><strong>Vị trí:</strong> ${item.location_found || 'Chưa xác định'}</p>
                    <p><strong>Mô tả:</strong> ${item.description || 'Không có mô tả'}</p>
                    <p><strong>Ngày đăng:</strong> ${displayDate}</p>
                    ${item.image_url ? `<img src="${item.image_url}" alt="Ảnh minh họa">` : ''}
                    <p><strong>Liên hệ:</strong> ${item.contact_email || 'Không có'}</p>
                    <p><strong>Trạng thái:</strong> <span style="color: ${item.status === 'Đã nhận' ? 'green' : 'red'}">${item.status || 'Chưa nhận'}</span></p>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
        itemsList.innerHTML = `<p style="color: red;">Lỗi tải dữ liệu: ${error.message}</p>`;
    }
}

// 7. Tải dữ liệu khi trang mở
document.addEventListener('DOMContentLoaded', () => {
    loadItems();
});
