/**
 * Status label component for the Pose control panel
 */

/**
 * Create status label element with modern styling
 * @returns {HTMLElement} Status label
 */
function buildStatusLabel() {
  const statusLabel = document.createElement('div');
  statusLabel.textContent = 'Server: Offline';
  statusLabel.style.cssText = `
    font-weight: 500;
    font-size: 14px;
    display: flex;
    align-items: center;
    white-space: nowrap;
  `;
  return statusLabel;
}

module.exports = {
  buildStatusLabel
};
