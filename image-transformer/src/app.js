// Utility functions for the Element Transformer Add-on

// Show loading overlay with custom message
export function showLoading(message) {
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingMessage = document.getElementById('loading-message');
  
  if (loadingMessage) {
    loadingMessage.textContent = message || 'Loading...';
  }
  
  if (loadingOverlay) {
    loadingOverlay.classList.remove('hidden');
  }
}

// Hide loading overlay
export function hideLoading() {
  const loadingOverlay = document.getElementById('loading-overlay');
  
  if (loadingOverlay) {
    loadingOverlay.classList.add('hidden');
  }
}

// Show error notification
export function showError(message) {
  showNotification(message, 'error');
}

// Show success notification
export function showSuccess(message) {
  showNotification(message, 'success');
}

// Create and show a notification
function showNotification(message, type) {
  const container = document.getElementById('notification-container');
  
  if (!container) return;
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  container.appendChild(notification);
  
  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    
    // Remove from DOM after transition
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Get element type based on Adobe Express element
export function getElementType(expressElement) {
  if (!expressElement) return 'unknown';
  
  // This would need to be updated based on actual Adobe Express SDK element types
  switch(expressElement.type) {
    case 'text':
      return 'text';
    case 'image':
      return 'image';
    case 'shape':
      return 'shape';
    case 'container':
      return 'container';
    case 'group':
      return 'group';
    default:
      return 'unknown';
  }
}

// Format the element name for display
export function formatElementName(element) {
  if (!element) return 'Unknown Element';
  
  // If element has a name, use it
  if (element.name) return element.name;
  
  // Otherwise generate a name based on type
  const type = getElementType(element);
  switch(type) {
    case 'text':
      return 'Text Block';
    case 'image':
      return 'Image';
    case 'shape':
      return 'Shape';
    case 'container':
      return 'Container';
    case 'group':
      return 'Group';
    default:
      return 'Element';
  }
}

// Get element subtype for display
export function getElementSubtype(element) {
  if (!element) return '';
  
  const type = getElementType(element);
  
  // This would need to be updated based on actual Adobe Express SDK element properties
  switch(type) {
    case 'text':
      return element.textType || 'Paragraph';
    case 'image':
      return element.format || 'PNG file';
    case 'shape':
      return element.shapeType || 'Shape';
    default:
      return '';
  }
}

// Slider functionality for the results screen
export function initializeSlider() {
  const sliderHandle = document.querySelector('.slider-handle');
  const sliderDivider = document.querySelector('.slider-divider');
  const previewContainer = document.querySelector('.preview-container');
  
  if (!sliderHandle || !sliderDivider || !previewContainer) return;
  
  let isDragging = false;
  
  sliderHandle.addEventListener('mousedown', (e) => {
    isDragging = true;
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const containerRect = previewContainer.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const offsetX = e.clientX - containerRect.left;
    
    // Limit slider position within container
    let position = offsetX;
    if (position < 0) position = 0;
    if (position > containerWidth) position = containerWidth;
    
    // Update slider position
    const percent = (position / containerWidth) * 100;
    sliderDivider.style.left = `${percent}%`;
    
    // Update preview sides
    const originalSide = document.querySelector('.preview-side.original');
    const modifiedSide = document.querySelector('.preview-side.modified');
    
    if (originalSide && modifiedSide) {
      originalSide.style.width = `${percent}%`;
      modifiedSide.style.width = `${100 - percent}%`;
      modifiedSide.style.left = `${percent}%`;
    }
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}




import addOnUISdk from "https://new.express.adobe.com/static/add-on-sdk/sdk.js";

// Global state management
const state = {
  currentScreen: 'selection',  // 'selection', 'chat', or 'results'
  selectedElements: [],
  transformationText: '',
  transformedElements: null, // Will store the result from AI transformation
};

//initialize the application when SDK is ready
addOnUISdk.ready.then(async () => {
    console.log("addOnUISdk is ready for use.");

    // Get the UI runtime.
    const { runtime } = addOnUISdk.instance;

    // Get the proxy object, which is required
    // to call the APIs defined in the Document Sandbox runtime
    // i.e., in the `code.js` file of this add-on.
    const sandboxProxy = await runtime.apiProxy("documentSandbox");

    document.getElementById("loading-overlay").style.display = "none";
    //document.getElementById("selection").style.display = "inherit";
    initializeApp();
});

// Initialize the application
function initializeApp() {
  console.log("Initializing app");
  // Initial render
  renderCurrentScreen();
  
  // Set up event listeners
  setupEventListeners();
  
  // Listen for document selections
  listenForDocumentSelections();
}

// Render the current screen based on state
function renderCurrentScreen() {
  const container = document.getElementById('add-on-container');
  if (!container) {
    console.error("Container element not found");
    return;
  }
  
  container.innerHTML = '';
  
  switch(state.currentScreen) {
    case 'selection':
      container.appendChild(createSelectionScreen());
      break;
    case 'chat':
      container.appendChild(createChatScreen());
      break;
    case 'results':
      container.appendChild(createResultsScreen());
      break;
    default:
      console.error("Unknown screen:", state.currentScreen);
      container.appendChild(createSelectionScreen());
  }
}

// Create the Selection Screen (Screen 1)
function createSelectionScreen() {
  const screen = document.createElement('div');
  screen.className = 'screen selection-screen';
  
  // Create header with progress indicator
  const header = createHeader(1);
  screen.appendChild(header);
  
  // Create title
  const title = document.createElement('h2');
  title.textContent = 'Select Elements';
  title.className = 'screen-title';
  screen.appendChild(title);
  
  // Create "Select All" button
  const selectAllBtn = document.createElement('button');
  selectAllBtn.textContent = 'Select All Elements';
  selectAllBtn.className = 'select-all-button';
  selectAllBtn.addEventListener('click', handleSelectAllElements);
  screen.appendChild(selectAllBtn);

  // Create "Select Current Element" button
  // const selectNodeButton = document.createElement('button');
  // selectNodeButton.textContent = 'Select Current Element';
  // selectNodeButton.id = 'selectNodeButton';
  // selectNodeButton.addEventListener('click', async () => {
  //   const sandboxProxy = await runtime.apiProxy("documentSandbox");
  //   sandboxProxy.selectNodeForAI(); // Call the function when button is pressed
  // });
  // screen.appendChild(selectNodeButton);
  
  // Create selected elements container
  const elementsContainer = document.createElement('div');
  elementsContainer.className = 'selected-elements-container';
  
  // If we have selected elements, display them
  if (state.selectedElements.length > 0) {
    state.selectedElements.forEach((element, index) => {
      const elementItem = createElementItem(element, index);
      elementsContainer.appendChild(elementItem);
    });
  } else {
    // Show empty state
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.textContent = 'No elements selected. Use the Adobe Express document to select elements.';
    elementsContainer.appendChild(emptyState);
  }
  
  screen.appendChild(elementsContainer);
  
  // Create Next button
  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next →';
  nextBtn.className = 'primary-button next-button';
  nextBtn.addEventListener('click', async () => {
    try {
      // Show loading state
      nextBtn.disabled = true;
      showLoading("Processing selection...");
      
      // Call the sandbox function to make other objects invisible
      const { runtime } = addOnUISdk.instance;
      const sandboxProxy = await runtime.apiProxy("documentSandbox");
      const result = await sandboxProxy.handleNextButtonFrame1();
      
      if (!result.success) {
        // Show error message if no element is selected
        hideLoading();
        showError(result.error || "Failed to process selection");
        nextBtn.disabled = false;
        return;
      }
      
      // Hide loading and proceed to next screen
      hideLoading();
      showSuccess("Selected element processed successfully");
      
      // Change to chat screen
      state.currentScreen = 'chat';
      renderCurrentScreen();
    } catch (error) {
      console.error("Error handling next button:", error);
      hideLoading();
      showError("An unexpected error occurred. Please try again.");
      nextBtn.disabled = false;
    }
  });
  screen.appendChild(nextBtn);
  
  return screen;
}

// Create the Chat Screen (Screen 2)
function createChatScreen() {
  const screen = document.createElement('div');
  screen.className = 'screen chat-screen';
  
  // Create header with progress indicator
  const header = createHeader(2);
  screen.appendChild(header);
  
  // Create title
  const title = document.createElement('h2');
  title.textContent = 'Specify Changes';
  title.className = 'screen-title';
  screen.appendChild(title);
  
  // Create selected elements summary
  const summary = document.createElement('div');
  summary.className = 'selected-summary';
  summary.textContent = `${state.selectedElements.length} elements selected`;
  screen.appendChild(summary);
  
  // Create prompt area
  const promptArea = document.createElement('div');
  promptArea.className = 'prompt-area';
  promptArea.textContent = 'How would you like to transform these elements?';
  screen.appendChild(promptArea);
  
  // Create text input area
  const textInput = document.createElement('textarea');
  textInput.className = 'text-input';
  textInput.placeholder = 'e.g., "Make text bold and change image colors to blue"';
  textInput.value = state.transformationText;
  textInput.addEventListener('input', (e) => {
    state.transformationText = e.target.value;
  });
  screen.appendChild(textInput);
  
  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'button-container';
  
  // Create Back button
  const backBtn = document.createElement('button');
  backBtn.textContent = '← Back';
  backBtn.className = 'secondary-button back-button';
  backBtn.addEventListener('click', () => {
    state.currentScreen = 'selection';
    renderCurrentScreen();
  });
  buttonContainer.appendChild(backBtn);
  
  // Create Send button
  const sendBtn = document.createElement('button');
  sendBtn.textContent = 'Send';
  sendBtn.className = 'primary-button send-button';
  sendBtn.addEventListener('click', handleSendTransformation);
  buttonContainer.appendChild(sendBtn);
  
  screen.appendChild(buttonContainer);
  
  return screen;
}

// Create the Results Screen (Screen 3)
function createResultsScreen() {
  const screen = document.createElement('div');
  screen.className = 'screen results-screen';
  
  // Create header with progress indicator
  const header = createHeader(3);
  screen.appendChild(header);
  
  // Create title
  const title = document.createElement('h2');
  title.textContent = 'Preview Changes';
  title.className = 'screen-title';
  screen.appendChild(title);
  
  // Create preview container
  const previewContainer = document.createElement('div');
  previewContainer.className = 'preview-container';
  
  // Create preview elements (original and modified)
  const originalSide = document.createElement('div');
  originalSide.className = 'preview-side original';
  originalSide.innerHTML = '<div class="preview-label">Original</div>';
  
  const modifiedSide = document.createElement('div');
  modifiedSide.className = 'preview-side modified';
  modifiedSide.innerHTML = '<div class="preview-label">Modified</div>';
  
  // Add slider divider
  const sliderDivider = document.createElement('div');
  sliderDivider.className = 'slider-divider';
  
  const sliderHandle = document.createElement('div');
  sliderHandle.className = 'slider-handle';
  sliderDivider.appendChild(sliderHandle);
  
  // Add preview content based on selected elements
  // This would normally be populated with actual document elements and their transformations
  
  previewContainer.appendChild(originalSide);
  previewContainer.appendChild(sliderDivider);
  previewContainer.appendChild(modifiedSide);
  
  screen.appendChild(previewContainer);
  
  // Create Apply Changes button
  const applyBtn = document.createElement('button');
  applyBtn.textContent = 'Apply Changes';
  applyBtn.className = 'primary-button apply-button';
  applyBtn.addEventListener('click', handleApplyChanges);
  screen.appendChild(applyBtn);
  
  // Create Try Again button
  const tryAgainBtn = document.createElement('button');
  tryAgainBtn.textContent = 'Try Again';
  tryAgainBtn.className = 'secondary-button try-again-button';
  tryAgainBtn.addEventListener('click', () => {
    state.currentScreen = 'selection';
    renderCurrentScreen();
  });
  screen.appendChild(tryAgainBtn);
  
  return screen;
}

// Helper Functions

// Create header with progress indicator
function createHeader(activeStep) {
  const header = document.createElement('div');
  header.className = 'header';
  
  // Create progress indicator
  const progressIndicator = document.createElement('div');
  progressIndicator.className = 'progress-indicator';
  
  // Add steps
  for (let i = 1; i <= 3; i++) {
    const step = document.createElement('div');
    step.className = `step ${i === activeStep ? 'active' : ''}`;
    step.innerHTML = `<span>${i}</span>`;
    progressIndicator.appendChild(step);
    
    // Add connector if not the last step
    if (i < 3) {
      const connector = document.createElement('div');
      connector.className = 'connector';
      progressIndicator.appendChild(connector);
    }
  }
  
  header.appendChild(progressIndicator);
  
  // Add help button
  const helpBtn = document.createElement('button');
  helpBtn.className = 'help-button';
  helpBtn.textContent = '?';
  helpBtn.addEventListener('click', showHelp);
  header.appendChild(helpBtn);
  
  return header;
}

// Create an element item for the selection list
function createElementItem(element, index) {
  const item = document.createElement('div');
  item.className = 'element-item';
  
  // Create thumbnail
  const thumbnail = document.createElement('div');
  thumbnail.className = 'element-thumbnail';
  thumbnail.innerHTML = getElementThumbnailHTML(element);
  item.appendChild(thumbnail);
  
  // Create element info
  const info = document.createElement('div');
  info.className = 'element-info';
  
  const name = document.createElement('div');
  name.className = 'element-name';
  name.textContent = formatElementName(element);
  
  const type = document.createElement('div');
  type.className = 'element-type';
  type.textContent = getElementSubtype(element);
  
  info.appendChild(name);
  info.appendChild(type);
  item.appendChild(info);
  
  // Create remove button
  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove-button';
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', () => {
    removeElement(index);
  });
  item.appendChild(removeBtn);
  
  return item;
}

// Get HTML representation for element thumbnail
function getElementThumbnailHTML(element) {
  // This would be replaced with actual thumbnail generation based on element type
  const type = getElementType(element);
  switch (type) {
    case 'text':
      return '<div class="text-thumbnail">Aa</div>';
    case 'image':
      return '<div class="image-thumbnail"><div class="image-placeholder"></div></div>';
    case 'shape':
      return '<div class="shape-thumbnail"><div class="shape-triangle"></div></div>';
    default:
      return '<div class="unknown-thumbnail"></div>';
  }
}

// Event Handlers

// Handle Select All Elements button
async function handleSelectAllElements() {
  try {
    // Show loading
    showLoading("Getting document elements...");
    
    // This would use the Adobe Express SDK to select all elements
    const elements = await addOnUISdk.instance.document.elements.getAll();
    
    state.selectedElements = elements.map(element => ({
      id: element.id,
      type: element.type,
      name: element.name || `Element ${element.id}`,
      // Additional properties as needed
    }));
    
    // Hide loading
    hideLoading();
    
    // Update UI
    renderCurrentScreen();
  } catch (error) {
    console.error('Error selecting all elements:', error);
    hideLoading();
    showError('Failed to select elements. Please try again.');
  }
}


// async function handleSelectCurrentElement() {
//   try {
//     // Show loading
//     showLoading("Getting current element...");
    
//     // This would use the Adobe Express SDK to select the current element
//     const element = await addOnUISdk.instance.document.elements.getCurrent();
    
//     state.selectedElements = [element];
    
//     // Hide loading
//     hideLoading();
    
//     // Update UI
//     renderCurrentScreen();
//   } catch (error) {
//     console.error('Error selecting current element:', error);
//     hideLoading();
//     showError('Failed to select element. Please try again.');
//   }
// }

// Handle removing an element from selection
function removeElement(index) {
  state.selectedElements.splice(index, 1);
  renderCurrentScreen();
}

// Handle sending the transformation request
async function handleSendTransformation() {
  if (!state.transformationText) {
    showError('Please specify how you want to transform the elements.');
    return;
  }
  
  if (state.selectedElements.length === 0) {
    showError('Please select at least one element to transform.');
    return;
  }
  
  // This would send the data to your backend for AI processing
  try {
    // Show loading state
    showLoading('Processing transformation...');
    
    // Prepare data for AI model
    const data = {
      elements: state.selectedElements,
      transformationText: state.transformationText
    };
    
    // Simulate API call - replace with actual API call
    // const response = await fetch('your-backend-url/transform', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(data)
    // });
    // const result = await response.json();
    
    // Simulate API response for development
    await new Promise(resolve => setTimeout(resolve, 1500));
    const result = {
      transformedElements: state.selectedElements.map(element => ({
        ...element,
        transformed: true,
        // Add transformation properties based on the element type
      }))
    };
    
    // Store transformed elements
    state.transformedElements = result.transformedElements;
    
    // Hide loading state
    hideLoading();
    
    // Move to results screen
    state.currentScreen = 'results';
    renderCurrentScreen();
    
    // Initialize slider for comparison view
    initializeSlider();
  } catch (error) {
    hideLoading();
    console.error('Error sending transformation:', error);
    showError('Failed to process transformation. Please try again.');
  }
}

// Handle applying changes to the document
async function handleApplyChanges() {
  try {
    // Show loading state
    showLoading('Applying changes to document...');
    
    // This would use the Adobe Express SDK to apply the transformations
    // For now, we'll just simulate a successful operation
    
    // For each transformed element, we would apply the changes to the document
    // Example:
    // for (const element of state.transformedElements) {
    //   const docElement = await addOnUISdk.instance.document.getElementById(element.id);
    //   // Apply transformation properties
    //   // e.g., for text: docElement.textProperties = { ...element.textProperties };
    // }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Hide loading state
    hideLoading();
    
    // Show success message
    showSuccess('Changes applied successfully!');
    
    // Reset state and go back to selection screen
    state.selectedElements = [];
    state.transformationText = '';
    state.transformedElements = null;
    state.currentScreen = 'selection';
    renderCurrentScreen();
  } catch (error) {
    hideLoading();
    console.error('Error applying changes:', error);
    showError('Failed to apply changes. Please try again.');
  }
}

// Show help information
function showHelp() {
  // Display help information in a modal or tooltip
  alert('Element Transformer Help:\n\n1. Select elements from your document\n2. Specify the changes you want to make\n3. Preview and apply the changes');
}

// Setup event listeners for the add-on
function setupEventListeners() {
  // Any global event listeners would go here
  // For example, window resize handling, keyboard shortcuts, etc.
  
  window.addEventListener('resize', () => {
    // Handle resize if needed
    if (state.currentScreen === 'results') {
      initializeSlider();
    }
  });
}

// Listen for document selection changes
function listenForDocumentSelections() {
  // Listen for selection changes in the document
  // This is a simplified version - actual implementation would use Adobe Express SDK

  // Example using Adobe Express SDK:
  addOnUISdk.instance.document.on('selectionChanged', async () => {
    if (state.currentScreen === 'selection') {
      try {
        // Get selected elements from the document
        const selectedElements = await addOnUISdk.instance.document.getSelection();
        
        if (selectedElements && selectedElements.length > 0) {
          // Filter out elements that are already in our selection
          const newElements = selectedElements.filter(element => 
            !state.selectedElements.some(existingElement => existingElement.id === element.id)
          );
          
          if (newElements.length > 0) {
            // Add new elements to our selection
            state.selectedElements = [
              ...state.selectedElements,
              ...newElements.map(element => ({
                id: element.id,
                type: element.type,
                name: element.name || `Element ${element.id}`,
                // Additional properties as needed
              }))
            ];
            
            // Update UI
            renderCurrentScreen();
          }
        }
      } catch (error) {
        console.error('Error handling selection change:', error);
      }
    }
  });
}