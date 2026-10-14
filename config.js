// ===== CẤU HÌNH – chỉ sửa file này =====
window.TV_CONFIG = {
  // 1. Link web app Apps Script (Triển khai → Quản lý triển khai → URL ứng dụng web, kết thúc bằng /exec)
  execUrl: 'https://script.google.com/macros/s/AKfycbxaIozE1fiIGD7o7KA6Si3wQ9f5zLG3xUfSMl_AFdr9IoKLTt8eXUj4LSugzJfDAM1vxQ/exec',

  // 2. Firebase: Project settings → General → Your apps → Web app → SDK setup and configuration → Config
  // ⚠ apiKey và appId: nên copy-dán lại từ Firebase để chắc chắn đúng từng ký tự (chữ O / số 0, chữ I / chữ l dễ nhầm)
  firebase: {
    apiKey: 'AIzaSyAg6OBIMQV13G6aZO-ySwQI81iYWxD8jbE',
    authDomain: 'pd-thoiviec.firebaseapp.com',
    projectId: 'pd-thoiviec',
    storageBucket: 'pd-thoiviec.firebasestorage.app',
    messagingSenderId: '983754819991',
    appId: '1:983754819991:web:6e81b3359c10e8ba899cd2'
  },

  // 3. Firebase: Project settings → Cloud Messaging → Web Push certificates → Key pair
  // ⚠ Nên bấm nút copy ở Firebase rồi dán đè lại để chắc chắn đúng từng ký tự
  vapidKey: 'BAUxkJXLLSn4qmFrrGx9y-mdNRTFKCa7u3rARey8GEheV3ycEep7MrV4niiMDZc4fVqJwL5Gm0hUmeE-zugXFwM'
};
