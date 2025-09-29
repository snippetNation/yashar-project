class OTPVerification {
    constructor() {
        this.otp = '';
        this.countdownTime = 120; // 2 minutes in seconds
        this.countdownInterval = null;
        this.isProcessing = false;
        
        this.initializeElements();
        this.attachEventListeners();
        this.generateDemoOTP();
    }

    initializeElements() {
        // Sections
        this.loaderSection = document.getElementById('loader-section');
        this.otpInputSection = document.getElementById('otp-input-section');
        this.successSection = document.getElementById('success-section');
        
        // Buttons
        this.startOtpBtn = document.getElementById('start-otp-btn');
        this.verifyBtn = document.getElementById('verify-btn');
        this.resendBtn = document.getElementById('resend-btn');
        this.resetBtn = document.getElementById('reset-btn');
        
        // Display elements
        this.countdownDisplay = document.getElementById('countdown');
        this.resendTimerDisplay = document.getElementById('resend-timer');
        this.statusMessage = document.getElementById('status-message');
        this.demoOtpDisplay = document.getElementById('demo-otp');
        
        // OTP inputs
        this.otpInputs = document.querySelectorAll('.otp-input');
    }

    attachEventListeners() {
        this.startOtpBtn.addEventListener('click', () => this.startOTPProcess());
        this.verifyBtn.addEventListener('click', () => this.verifyOTP());
        this.resendBtn.addEventListener('click', () => this.resendOTP());
        this.resetBtn.addEventListener('click', () => this.resetProcess());
        
        // OTP input handling
        this.otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => this.handleOTPInput(e, index));
            input.addEventListener('keydown', (e) => this.handleOTPKeydown(e, index));
            input.addEventListener('paste', (e) => this.handleOTPPaste(e));
        });
    }

    generateDemoOTP() {
        // Generate a random 6-digit OTP for demo
        this.otp = Math.floor(100000 + Math.random() * 900000).toString();
        this.demoOtpDisplay.textContent = this.otp;
    }

    async startOTPProcess() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.startOtpBtn.disabled = true;
        this.statusMessage.textContent = 'Sending OTP to your device...';
        
        // Show loader
        this.startOtpBtn.innerHTML = `
            <div class="flex items-center justify-center">
                <div class="loader mr-2"></div>
                Processing...
            </div>
        `;
        
        // Simulate API call delay (10 seconds)
        await this.delay(10000);
        
        // Hide loader section, show OTP input section
        this.loaderSection.classList.add('hidden');
        this.otpInputSection.classList.remove('hidden');
        this.statusMessage.textContent = 'OTP sent successfully! Check your device.';
        
        // Start countdown timer
        this.startCountdown();
        
        this.isProcessing = false;
    }

    handleOTPInput(event, index) {
        const input = event.target;
        const value = input.value;
        
        // Only allow numbers
        if (!/^\d*$/.test(value)) {
            input.value = '';
            return;
        }
        
        if (value.length === 1) {
            input.classList.add('filled');
            
            // Move to next input if available
            if (index < this.otpInputs.length - 1) {
                this.otpInputs[index + 1].focus();
            }
        } else {
            input.classList.remove('filled');
        }
        
        this.checkOTPCompletion();
    }

    handleOTPKeydown(event, index) {
        if (event.key === 'Backspace') {
            if (this.otpInputs[index].value === '' && index > 0) {
                // Move to previous input on backspace
                this.otpInputs[index - 1].focus();
            }
            this.otpInputs[index].classList.remove('filled');
        } else if (event.key === 'ArrowLeft' && index > 0) {
            this.otpInputs[index - 1].focus();
        } else if (event.key === 'ArrowRight' && index < this.otpInputs.length - 1) {
            this.otpInputs[index + 1].focus();
        }
    }

    handleOTPPaste(event) {
        event.preventDefault();
        const pasteData = event.clipboardData.getData('text').slice(0, 6);
        
        if (/^\d{6}$/.test(pasteData)) {
            pasteData.split('').forEach((digit, index) => {
                if (this.otpInputs[index]) {
                    this.otpInputs[index].value = digit;
                    this.otpInputs[index].classList.add('filled');
                }
            });
            this.checkOTPCompletion();
        }
    }

    checkOTPCompletion() {
        const enteredOTP = Array.from(this.otpInputs)
            .map(input => input.value)
            .join('');
        
        this.verifyBtn.disabled = enteredOTP.length !== 6;
    }

    async verifyOTP() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.verifyBtn.disabled = true;
        
        const enteredOTP = Array.from(this.otpInputs)
            .map(input => input.value)
            .join('');
        
        // Show loading state
        this.verifyBtn.innerHTML = `
            <div class="flex items-center justify-center">
                <div class="loader mr-2"></div>
                Verifying...
            </div>
        `;
        
        // Simulate verification delay
        await this.delay(2000);
        
        if (enteredOTP === this.otp) {
            this.showSuccess();
        } else {
            this.showError('Invalid OTP. Please try again.');
            this.clearOTPInputs();
        }
        
        this.isProcessing = false;
        this.verifyBtn.disabled = false;
        this.verifyBtn.textContent = 'Verify OTP';
    }

    async resendOTP() {
        if (this.isProcessing || !this.resendBtn.disabled) return;
        
        this.isProcessing = true;
        this.resendBtn.disabled = true;
        this.resendBtn.innerHTML = `
            <div class="flex items-center justify-center">
                <div class="loader mr-2"></div>
                Sending...
            </div>
        `;
        
        // Clear previous OTP inputs
        this.clearOTPInputs();
        
        // Generate new OTP
        this.generateDemoOTP();
        
        // Simulate sending delay
        await this.delay(5000);
        
        // Reset countdown
        this.resetCountdown();
        this.startCountdown();
        
        this.statusMessage.textContent = 'New OTP sent successfully!';
        this.isProcessing = false;
        this.resendBtn.disabled = true;
        this.resendBtn.innerHTML = `Request New OTP (<span id="resend-timer">${this.countdownTime}</span>s)`;
    }

    startCountdown() {
        let timeLeft = this.countdownTime;
        
        this.updateCountdownDisplay(timeLeft);
        this.resendBtn.disabled = true;
        
        this.countdownInterval = setInterval(() => {
            timeLeft--;
            this.updateCountdownDisplay(timeLeft);
            
            if (timeLeft <= 0) {
                this.clearCountdown();
                this.resendBtn.disabled = false;
                this.resendBtn.textContent = 'Request New OTP';
            }
        }, 1000);
    }

    updateCountdownDisplay(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        this.countdownDisplay.textContent = 
            `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        this.resendTimerDisplay.textContent = seconds;
    }

    clearCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }

    resetCountdown() {
        this.clearCountdown();
    }

    showSuccess() {
        this.otpInputSection.classList.add('hidden');
        this.successSection.classList.remove('hidden');
        this.clearCountdown();
    }

    showError(message) {
        this.statusMessage.textContent = message;
        this.statusMessage.className = 'text-red-600 font-semibold';
        
        // Reset error message after 3 seconds
        setTimeout(() => {
            this.statusMessage.textContent = 'Enter the 6-digit OTP sent to your device';
            this.statusMessage.className = 'text-gray-600';
        }, 3000);
    }

    clearOTPInputs() {
        this.otpInputs.forEach(input => {
            input.value = '';
            input.classList.remove('filled');
        });
        this.verifyBtn.disabled = true;
    }

    resetProcess() {
        // Reset all states
        this.clearOTPInputs();
        this.clearCountdown();
        this.generateDemoOTP();
        
        // Show initial state
        this.successSection.classList.add('hidden');
        this.otpInputSection.classList.add('hidden');
        this.loaderSection.classList.remove('hidden');
        
        // Reset buttons
        this.startOtpBtn.disabled = false;
        this.startOtpBtn.innerHTML = 'Simulate OTP Request';
        this.statusMessage.textContent = 'Click the button below to simulate receiving an OTP';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize OTP verification when page loads
document.addEventListener('DOMContentLoaded', () => {
    new OTPVerification();
});