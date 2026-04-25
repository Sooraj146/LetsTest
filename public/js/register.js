document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in and not submitted
    const sessionUser = sessionStorage.getItem('user');
    if (sessionUser) {
        const user = JSON.parse(sessionUser);
        if (user.isSubmitted) {
            window.location.href = '/result.html';
        } else {
            window.location.href = '/test.html';
        }
    }

    const form = document.getElementById('registerForm');
    const errorMsg = document.getElementById('errorMsg');
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value.trim();
        const rollNumber = document.getElementById('rollNumber').value.trim();
        const email = document.getElementById('email').value.trim();

        errorMsg.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg class="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...`;

        try {
            const user = await api.register({ name, rollNumber, email });
            
            // Store user info
            sessionStorage.setItem('user', JSON.stringify(user));

            if (user.isSubmitted) {
                window.location.href = '/result.html';
            } else {
                window.location.href = '/test.html';
            }
        } catch (error) {
            errorMsg.textContent = error.message;
            errorMsg.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtn.innerHTML = `
                <span>Start Assessment</span>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>`;
        }
    });
});
