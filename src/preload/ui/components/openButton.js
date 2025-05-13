/**
 * Open button component for the Pose control panel
 */

/**
 * Create open browser button element with modern styling
 * @returns {HTMLElement} Open button
 */
function buildOpenButton() {
  const openButton = document.createElement('button');
  openButton.textContent = '🌐 Open';
  openButton.style.cssText = `
    padding: 6px 12px;
    background: #555;
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
    opacity: 0.5;
  `;
  
  // Hover effects (only when enabled)
  openButton.onmouseover = () => { 
    if (!openButton.disabled) {
      openButton.style.transform = 'translateY(-1px)';
      openButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
    }
  };
  
  openButton.onmouseout = () => { 
    if (!openButton.disabled) {
      openButton.style.transform = 'translateY(0)';
      openButton.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
    }
  };
  
  openButton.disabled = true;
  return openButton;
}

module.exports = {
  buildOpenButton
};
