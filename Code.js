var scriptProperties = PropertiesService.getScriptProperties();

// TODO handle edge cases combined for all...
// TODO add code cogs link
// TODO use clasp to github: https://developers.google.com/apps-script/guides/clasp
// TODO handle super/sub script
// TODO handle frac
// TODO handle all the stuff we can't do inline

function onOpen() {
  SlidesApp.getUi() // Or DocumentApp or FormApp.
    .createMenu('Equations')
    .addItem('Add/Edit Image Equation', 'ShowImageDialog')
    .addItem('Add/Edit Inline Equation', 'showInlineDialog')
    .addToUi();
}

function showInlineDialog() {
  if (!currentPage) {
    SlidesApp.getUi().alert('Please select a slide where you want to insert the equation.');
    return;
  }

  var selection = SlidesApp.getActivePresentation().getSelection();
  var textRange = selection.getTextRange();
  var selectedText = textRange ? textRange.asString() : "";
  var dialogTitle = selectedText ? "Edit Inline Equation" : "Add Inline Equation";

  // Create a template and pass data to it
  var template = HtmlService.createTemplateFromFile('InlinePage');
  template.selectedText = selectedText; // Pass selectedText to the template

  var htmlOutput = template.evaluate() // Evaluate the template to generate HTML
    .setWidth(400)
    .setHeight(300);

  SlidesApp.getUi().showModalDialog(htmlOutput, dialogTitle);
}


function insertInlineEquation(equationText) {
  var selection = SlidesApp.getActivePresentation().getSelection();
  var currentPage = SlidesApp.getActivePresentation().getSelection().getCurrentPage();

  // Check if the selection is a text range
  if (selection.getSelectionType() === SlidesApp.SelectionType.TEXT) {
    var textRange = selection.getTextRange();
    if (textRange) {
      // Replace selected text with the equation text
      textRange.clear();
      textRange.insertText(0, equationText);
    }
  } else {
    // If there's no text selected, create a new text box with the equation
    currentPage.insertTextBox(equationText);
  }
}


function ShowImageDialog() {
  var selection = SlidesApp.getActivePresentation().getSelection();
  var selectedElements = selection.getPageElementRange();

  if (selectedElements && selectedElements.getPageElements().length > 0) {
    var selectedElement = selectedElements.getPageElements()[0];
    if (selectedElement.getPageElementType() === SlidesApp.PageElementType.IMAGE) {
      var description = selectedElement.asImage().getDescription();
      if (description) {
        // Edit mode
        scriptProperties.setProperty('editingImageId', selectedElement.getObjectId());
        showDialog("Edit Equation", description);
        return;
      }
    }
  }

  // Default to Add mode if no valid selection is found
  showDialog("Add an Equation", "");
}

function showDialog(title, equation) {
  var template = HtmlService.createTemplateFromFile('ImagePage');
  template.equation = equation
  var htmlOutput = template.evaluate()
    .setWidth(400)
    .setHeight(300);

  SlidesApp.getUi().showModalDialog(htmlOutput, title);
}


function insertImage(imageUrl, equation) {
  var editingImageId = scriptProperties.getProperty('editingImageId');
  var oldImageAttributes = null;

  // If in edit mode, capture old image attributes and delete it
  if (editingImageId) {
    var currentPage = SlidesApp.getActivePresentation().getSelection().getCurrentPage();
    var elements = currentPage.getPageElements();
    for (var i = 0; i < elements.length; i++) {
      if (elements[i].getObjectId() === editingImageId) {
        var oldImage = elements[i].asImage();
        // Capture X, Y, width, and height of the old image
        oldImageAttributes = {
          x: oldImage.getLeft(),
          y: oldImage.getTop(),
          width: oldImage.getWidth(),
          height: oldImage.getHeight()
        };
        elements[i].remove(); // Remove the old image
        break;
      }
    }
    // Clear the stored image ID to exit edit mode
    scriptProperties.deleteProperty('editingImageId');
  }

  // Proceed to insert the new image
  var currentPage = SlidesApp.getActivePresentation().getSelection().getCurrentPage();
  var image = currentPage.insertImage(imageUrl);

  // Use the image's description to store the equation text as metadata
  image.setDescription(equation);

  // If oldImageAttributes were captured, calculate and set the new image's position to center it over the old image's position
  if (oldImageAttributes) {
    // Calculate the center position of the old image
    var centerX = oldImageAttributes.x + (oldImageAttributes.width / 2);
    var centerY = oldImageAttributes.y + (oldImageAttributes.height / 2);

    // Calculate the top-left corner of the new image to center it over the old image's position
    var newImageX = centerX - (image.getWidth() / 2);
    var newImageY = centerY - (image.getHeight() / 2);

    // Set the new image's position without resizing
    image.setLeft(newImageX);
    image.setTop(newImageY);
  }
}

