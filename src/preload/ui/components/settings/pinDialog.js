/**
 * PIN dialog for settings access security
 */

// Hardcoded PIN for admin access
const ADMIN_PIN = '7897';

/**
 * Create a PIN dialog element with modern styling
 * @param {Function} onSuccess - Callback when PIN is correct
 * @param {Function} onCancel - Callback when dialog is cancelled
 * @returns {HTMLElement} PIN dialog element
 */
function createPinDialog(onSuccess, onCancel) {
  // Create backdrop
  const backdrop = document.createElement('div');
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(4px);
  `;

  // Create dialog container
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: rgba(25, 25, 25, 0.95);
    color: white;
    padding: 24px;
    border-radius: 12px;
    width: 300px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    animation: fadeInScale 0.2s ease-out;
  `;

  // Add animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInScale {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    @keyframes shakeAnimation {
      0% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      50% { transform: translateX(5px); }
      75% { transform: translateX(-5px); }
      100% { transform: translateX(0); }
    }
  `;
  document.head.appendChild(style);

  // Title
  const title = document.createElement('h3');
  title.textContent = 'Admin Authentication';
  title.style.cssText = `
    margin: 0 0 16px 0;
    font-size: 16px;
    text-align: center;
    font-weight: 600;
  `;
  dialog.appendChild(title);

  // Description
  const description = document.createElement('p');
  description.textContent = 'Please enter the admin PIN to access settings';
  description.style.cssText = `
    margin: 0 0 20px 0;
    font-size: 14px;
    text-align: center;
    color: rgba(255, 255, 255, 0.7);
  `;
  dialog.appendChild(description);

  // PIN input
  const inputContainer = document.createElement('div');
  inputContainer.style.cssText = `
    display: flex;
    gap: 8px;
    justify-content: center;
    margin-bottom: 20px;
  `;

  const digits = [];
  for (let i = 0; i < 4; i++) {
    const digit = document.createElement('input');
    digit.type = 'password';
    digit.maxLength = 1;
    digit.autocomplete = 'off';
    digit.inputMode = 'numeric';
    digit.pattern = '[0-9]*';
    digit.style.cssText = `
      width: 40px;
      height: 50px;
      text-align: center;
      font-size: 24px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      color: white;
      outline: none;
    `;
    
    // Focus handling for better UX
    digit.onfocus = () => {
      digit.style.borderColor = 'rgba(79, 180, 255, 0.8)';
      digit.style.boxShadow = '0 0 0 2px rgba(79, 180, 255, 0.2)';
    };
    
    digit.onblur = () => {
      digit.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      digit.style.boxShadow = 'none';
    };
    
    // Auto-advance to next field
    digit.oninput = (e) => {
      const value = e.target.value;
      if (value.length === 1) {
        // Move to next digit or check PIN if at last digit
        if (i < 3) {
          digits[i + 1].focus();
        } else {
          checkPin();
        }
      }
    };

    // Allow backspace navigation
    digit.onkeydown = (e) => {
      if (e.key === 'Backspace' && !digit.value && i > 0) {
        digits[i - 1].focus();
      }
    };
    
    inputContainer.appendChild(digit);
    digits.push(digit);
  }
  dialog.appendChild(inputContainer);

  // Error message container
  const errorMsg = document.createElement('p');
  errorMsg.style.cssText = `
    color: #ff4040;
    font-size: 14px;
    text-align: center;
    margin: 0 0 16px 0;
    height: 20px;
    visibility: hidden;
  `;
  errorMsg.textContent = 'Incorrect PIN. Please try again.';
  dialog.appendChild(errorMsg);

  // Button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    justify-content: space-between;
  `;

  // Cancel button
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.cssText = `
    padding: 8px 16px;
    font-size: 14px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
  `;
  
  cancelButton.onmouseover = () => {
    cancelButton.style.background = 'rgba(255, 255, 255, 0.15)';
  };
  
  cancelButton.onmouseout = () => {
    cancelButton.style.background = 'rgba(255, 255, 255, 0.1)';
  };
  
  cancelButton.onclick = () => {
    backdrop.remove();
    if (onCancel) onCancel();
  };

  // Submit button
  const submitButton = document.createElement('button');
  submitButton.textContent = 'Submit';
  submitButton.style.cssText = `
    padding: 8px 16px;
    font-size: 14px;
    background: #4F94FF;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
  `;
  
  submitButton.onmouseover = () => {
    submitButton.style.background = '#60A0FF';
  };
  
  submitButton.onmouseout = () => {
    submitButton.style.background = '#4F94FF';
  };
  
  submitButton.onclick = checkPin;

  // Function to check entered PIN
  function checkPin() {
    const enteredPin = digits.map(d => d.value).join('');
    
    if (enteredPin === ADMIN_PIN) {
      backdrop.remove();
      if (onSuccess) onSuccess();
    } else {
      // Show error message
      errorMsg.style.visibility = 'visible';
      
      // Apply shake animation to dialog
      dialog.style.animation = 'shakeAnimation 0.4s';
      setTimeout(() => {
        dialog.style.animation = '';
      }, 400);
      
      // Clear inputs and focus on first one
      digits.forEach(d => { d.value = ''; });
      digits[0].focus();
    }
  }
  
  // Add buttons to container
  buttonContainer.appendChild(cancelButton);
  buttonContainer.appendChild(submitButton);
  dialog.appendChild(buttonContainer);
  
  // Add dialog to backdrop
  backdrop.appendChild(dialog);
  
  // Focus first input upon showing dialog
  setTimeout(() => {
    digits[0].focus();
  }, 50);

  return backdrop;
}

module.exports = {
  createPinDialog
};
