/**
 * ADMIN UI HELPER
 * Handles Toast notifications and other UI effects.
 */

// Toast System
function showToast(message, type = 'success') {
    // Remove existing toast if generic to avoid stacking too many
    const existing = document.querySelector('.admin-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `admin-toast toast--${type}`;

    // Icon based on type
    let icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'info') icon = 'ℹ️';

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    document.body.appendChild(toast);

    // Animation In
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Auto Dismiss
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, 3000); // 3 seconds
}

// Global exposure
window.showToast = showToast;
