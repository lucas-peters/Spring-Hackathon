import addOnSandboxSdk from "add-on-sdk-document-sandbox";
import { editor } from "express-document-sdk";

// Get the document sandbox runtime.
const { runtime } = addOnSandboxSdk.instance;

function start() {
    // Store original opacity values
    const originalOpacityValues = new Map();
    
    // APIs to be exposed to the UI runtime
    const sandboxApi = {
        createRectangle: () => {
            const rectangle = editor.createRectangle();

            // Define rectangle dimensions.
            rectangle.width = 240;
            rectangle.height = 180;

            // Define rectangle position.
            rectangle.translation = { x: 10, y: 10 };

            // Define rectangle color.
            const color = { red: 0.32, green: 0.34, blue: 0.89, alpha: 1 };

            // Fill the rectangle with the color.
            const rectangleFill = editor.makeColorFill(color);
            rectangle.fill = rectangleFill;

            // Add the rectangle to the document.
            const insertionParent = editor.context.insertionParent;
            insertionParent.children.append(rectangle);
        },
        
        // Make all objects except the selected one translucent
        makeOtherObjectsTranslucent: (selectedObjectId) => {
            console.log("Making other objects translucent, keeping", selectedObjectId);
            
            try {
                // Clear previous stored opacity values
                originalOpacityValues.clear();
                
                // Get all objects in the document
                const allObjects = getAllObjects();
                
                console.log(`Found ${allObjects.length} objects in the document`);
                
                // Apply opacity to all objects except the selected one
                allObjects.forEach(object => {
                    try {
                        if (object.id !== selectedObjectId) {
                            // Store the original opacity value
                            originalOpacityValues.set(object.id, object.opacity || 1.0);
                            
                            // Set opacity to 0% for non-selected objects
                            object.opacity = 0;
                            console.log(`Set opacity for object ${object.id} to 0% (was ${originalOpacityValues.get(object.id)})`);
                        }
                    } catch (objError) {
                        console.warn(`Could not process object ${object.id}: ${objError.message}`);
                    }
                });
                
                return {
                    success: true,
                    message: `Made ${allObjects.length - 1} objects invisible`,
                    totalObjects: allObjects.length,
                    storedOpacityValues: originalOpacityValues.size
                };
            } catch (error) {
                console.error("Error making objects invisible:", error);
                return {
                    success: false,
                    error: error.message
                };
            }
        },
        
        // Reset all objects to their original opacity
        resetObjectOpacity: () => {
            console.log("Resetting all object opacities to original values");
            
            try {
                // Get all objects in the document
                const allObjects = getAllObjects();
                
                // Reset opacity for all objects to their original values
                allObjects.forEach(object => {
                    if (originalOpacityValues.has(object.id)) {
                        // Restore the original opacity value
                        const originalOpacity = originalOpacityValues.get(object.id);
                        object.opacity = originalOpacity;
                        console.log(`Restored opacity for object ${object.id} to ${originalOpacity}`);
                    } else {
                        // If we don't have a stored value, set to 1.0 (fully visible)
                        object.opacity = 1.0;
                        console.log(`No stored opacity for object ${object.id}, set to 1.0`);
                    }
                });
                
                // Clear the stored values after restoring
                const storedCount = originalOpacityValues.size;
                originalOpacityValues.clear();
                
                return {
                    success: true,
                    message: `Reset opacity for ${allObjects.length} objects (${storedCount} from stored values)`,
                    totalObjects: allObjects.length
                };
            } catch (error) {
                console.error("Error resetting object opacity:", error);
                return {
                    success: false,
                    error: error.message
                };
            }
        },
        
        // Handle next button in frame 1
        handleNextButtonFrame1: () => {
            console.log("Next button clicked in frame 1");
            
            // Check if any elements are selected
            const selection = editor.context.selection;
            
            if (!selection || selection.length === 0) {
                console.error("No elements selected");
                return {
                    success: false,
                    error: "No elements selected. Please select an element before proceeding."
                };
            }
            console.log("Selected elements:", selection.map(e => e.id));
            
            // Get the first selected element (0th element in the selection array)
            const selectedElement = selection[0];
            console.log("Selected element:", selectedElement.id, selectedElement.type);
            
            // Make all other objects translucent (not just images)
            return sandboxApi.makeOtherObjectsTranslucent(selectedElement.id);
            // crop image
            // send image to AI
            // reset opacity
            // return success
        }
    };
    
    // Helper function to get all objects in the document
    function getAllObjects() {
        const allObjects = [];
        
        try {
            // Function to recursively traverse the document tree
            function traverseForObjects(node) {
                if (!node) return;
                
                try {
                    // Add all visible nodes (except groups and artboards)
                    if (node.type && node.type !== "artboard" && node.type !== "group") {
                        allObjects.push(node);
                    }
                    
                    // If the node has children, traverse them too
                    if (node.children && typeof node.children.length === 'number') {
                        for (let i = 0; i < node.children.length; i++) {
                            try {
                                const child = node.children[i];
                                if (child) {
                                    traverseForObjects(child);
                                }
                            } catch (childError) {
                                console.warn(`Error traversing child at index ${i}: ${childError.message}`);
                            }
                        }
                    }
                } catch (nodeError) {
                    console.warn(`Error processing node: ${nodeError.message}`);
                }
            }
            
            // Start traversal from the document root
            const rootNode = editor.context.insertionParent;
            if (rootNode) {
                traverseForObjects(rootNode);
                console.log(`Successfully found ${allObjects.length} objects in the document`);
            } else {
                console.warn("Could not get insertion parent from editor context");
            }
        } catch (error) {
            console.error("Error in getAllObjects:", error);
        }
        
        return allObjects;
    }

    // Expose the API to the UI runtime
    runtime.exposeApi({
        selectNodeForAI: () => {
            const selectedNode = editor.context.selection[0]; // Get the first selected node
            if (selectedNode) {
                // Extract necessary data from the selected node
                const nodeData = {
                    type: selectedNode.type,
                    properties: selectedNode.properties, // Adjust based on what you need
                };
                console.log("Selected node data for AI query:", nodeData);
                
                // Make all other objects invisible
                sandboxApi.makeOtherObjectsTranslucent(selectedNode.id);
            } else {
                console.log("No node selected.");
            }
        },
        
        // Expose the handleNextButtonFrame1 function
        handleNextButtonFrame1: sandboxApi.handleNextButtonFrame1,
        
        // Also expose the other functions
        makeOtherObjectsTranslucent: sandboxApi.makeOtherObjectsTranslucent,
        resetObjectOpacity: sandboxApi.resetObjectOpacity
    });
}

start();