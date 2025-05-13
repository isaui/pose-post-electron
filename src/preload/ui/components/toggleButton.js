/**
 * Toggle button component for the Pose control panel
 */

/**
 * Create toggle button element with modern styling
 * @returns {HTMLElement} Toggle button
 */
function buildToggleButton() {
  const toggleButton = document.createElement('button');
  toggleButton.textContent = 'Start Server';
  toggleButton.style.cssText = `
    padding: 6px 12px;
    background: #33aa33;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    font-size: 14px;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  // Hover effects
  toggleButton.onmouseover = () => { 
    toggleButton.style.transform = 'translateY(-1px)';
    toggleButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
  };
  
  toggleButton.onmouseout = () => { 
    toggleButton.style.transform = 'translateY(0)';
    toggleButton.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
  };
  
  return toggleButton;
}

module.exports = {
  buildToggleButton
};
