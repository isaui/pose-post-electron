/**
 * Container component for the Pose control panel
 */

/**
 * Create the main container element with modern styling
 * @returns {HTMLElement} Container element
 */
function buildContainer() {
  const container = document.createElement('div');
  container.id = 'pose-control-panel';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: rgba(30, 30, 30, 0.85);
    color: white;
    padding: 12px 16px;
    border-radius: 12px;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(8px);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
  `;
  return container;
}

module.exports = {
  buildContainer
};
