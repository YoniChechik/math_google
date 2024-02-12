var scriptProperties = PropertiesService.getScriptProperties();

// TODO add code cogs link
// TODO image font size 52

function onOpen() {
  SlidesApp.getUi() // Or DocumentApp or FormApp.
    .createMenu("Equations")
    .addItem("Add/Edit Image Equation", "ShowImageDialog")
    .addItem("Add/Edit Inline Equation", "showInlineDialog")
    .addToUi();
}

// ======================== inline
function showInlineDialog() {
  var selection = SlidesApp.getActivePresentation().getSelection();
  var textRange = selection.getTextRange();
  var selectedText = "";
  if (textRange) {
    var selectedText = convertTextRangeToLaTeX(textRange);
  }
  var dialogTitle = selectedText ? "Edit Inline Equation" : "Add Inline Equation";

  // Create a template and pass data to it
  var template = HtmlService.createTemplateFromFile("InlinePage");
  template.selectedText = selectedText; // Pass selectedText to the template

  var htmlOutput = template
    .evaluate() // Evaluate the template to generate HTML
    .setWidth(400)
    .setHeight(300);

  SlidesApp.getUi().showModalDialog(htmlOutput, dialogTitle);
}

function convertTextRangeToLaTeX(selectedTextRange) {
  let latexString = "";
  let currentFormat = "regular"; // Tracks the current formatting context

  for (let i = 0; i < selectedTextRange.asString().length; i++) {
    // Extract a single character as a subrange
    let charRange = selectedTextRange.getRange(i, i + 1);
    let charTextStyle = charRange.getTextStyle();
    let baselineOffset = charTextStyle.getBaselineOffset();

    // Determine the formatting of the current character based on baseline offset
    if (baselineOffset === SlidesApp.TextBaselineOffset.SUPERSCRIPT) {
      if (currentFormat !== "superscript") {
        if (currentFormat !== "regular") latexString += "}"; // Close the previous format
        latexString += "^{";
        currentFormat = "superscript";
      }
    } else if (baselineOffset === SlidesApp.TextBaselineOffset.SUBSCRIPT) {
      if (currentFormat !== "subscript") {
        if (currentFormat !== "regular") latexString += "}"; // Close the previous format
        latexString += "_{";
        currentFormat = "subscript";
      }
    } else {
      if (currentFormat !== "regular") {
        latexString += "}"; // Close the previous format
        currentFormat = "regular";
      }
    }

    // Add the current character to the output string
    latexString += charRange.asString();
  }

  // Ensure any open formatting is properly closed
  if (currentFormat !== "regular") {
    latexString += "}";
  }

  return latexString;
}

function insertInlineEquation(encodedText) {
  var presentation = SlidesApp.getActivePresentation();
  var selection = presentation.getSelection();
  var currentPage = presentation.getSelection().getCurrentPage();
  var textRange;

  // Check if there's a current text selection or cursor in a text box
  if (selection.getSelectionType() === SlidesApp.SelectionType.TEXT) {
    textRange = selection.getTextRange();
    // Clear the text if there's a selection
    if (textRange) {
      textRange.clear();
    }
  } else {
    // If no text is selected, create a new text box
    var textBox = currentPage.insertTextBox(""); // Insert the text box with the encodedText
    textRange = textBox.getText(); // Get the range for the newly inserted text
  }

  applyFormatting(textRange, encodedText); // This will be adjusted in the next step
}

function applyFormatting(textRange, encodedText) {
  let formattedText = ""; // Initialize empty string to build the new word
  let formatMarks = []; // To keep track of formatting marks

  let i = 0; // Current position in the encodedText
  while (i < encodedText.length) {
    if (encodedText.substring(i, i + 5) === "<sup>") {
      i += 5; // Skip the <sup> tag
      let start = i;
      let start_formatted = formattedText.length;
      while (encodedText.substring(i, i + 6) !== "</sup>") {
        i++;
      }
      formattedText += encodedText.substring(start, i); // Add the superscript text
      formatMarks.push({ type: "superscript", start: start_formatted, end: formattedText.length });
      i += 6; // Skip the </sup> tag
    } else if (encodedText.substring(i, i + 5) === "<sub>") {
      i += 5; // Skip the <sub> tag
      let start = i;
      let start_formatted = formattedText.length;
      while (encodedText.substring(i, i + 6) !== "</sub>") {
        i++;
      }
      formattedText += encodedText.substring(start, i); // Add the subscript text
      formatMarks.push({ type: "subscript", start: start_formatted, end: formattedText.length });
      i += 6; // Skip the </sub> tag
    } else {
      formattedText += encodedText[i]; // Add the regular character
      i++;
    }
  }

  // Insert the built string
  let insertedRange = textRange.insertText(0, formattedText);

  // Apply formatting
  formatMarks.forEach((mark) => {
    let formatRange = insertedRange.getRange(mark.start, mark.end);
    if (mark.type === "superscript") {
      formatRange.getTextStyle().setBaselineOffset(SlidesApp.TextBaselineOffset.SUPERSCRIPT);
    } else if (mark.type === "subscript") {
      formatRange.getTextStyle().setBaselineOffset(SlidesApp.TextBaselineOffset.SUBSCRIPT);
    }
  });
}

// ======================== image
function ShowImageDialog() {
  var selection = SlidesApp.getActivePresentation().getSelection();
  var selectedElements = selection.getPageElementRange();

  var latex_eq = "";
  if (selectedElements && selectedElements.getPageElements().length > 0) {
    var selectedElement = selectedElements.getPageElements()[0];
    if (selectedElement.getPageElementType() === SlidesApp.PageElementType.IMAGE) {
      var description = selectedElement.asImage().getDescription();
      if (description) {
        scriptProperties.setProperty("editingImageId", selectedElement.getObjectId());
        latex_eq = description;
      }
    }
  }
  var dialogTitle = latex_eq ? "Edit Image Equation" : "Add Image Equation";

  var template = HtmlService.createTemplateFromFile("ImagePage");
  template.equation = latex_eq;
  var htmlOutput = template.evaluate().setWidth(400).setHeight(300);

  SlidesApp.getUi().showModalDialog(htmlOutput, dialogTitle);
}

function insertImage(imageUrl, equation) {
  var editingImageId = scriptProperties.getProperty("editingImageId");
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
          height: oldImage.getHeight(),
        };
        elements[i].remove(); // Remove the old image
        break;
      }
    }
    // Clear the stored image ID to exit edit mode
    scriptProperties.deleteProperty("editingImageId");
  }

  // Proceed to insert the new image
  var currentPage = SlidesApp.getActivePresentation().getSelection().getCurrentPage();
  var image = currentPage.insertImage(imageUrl);

  // Use the image's description to store the equation text as metadata
  image.setDescription(equation);

  // If oldImageAttributes were captured, calculate and set the new image's position to center it over the old image's position
  if (oldImageAttributes) {
    // Calculate the center position of the old image
    var centerX = oldImageAttributes.x + oldImageAttributes.width / 2;
    var centerY = oldImageAttributes.y + oldImageAttributes.height / 2;

    // Calculate the top-left corner of the new image to center it over the old image's position
    var newImageX = centerX - image.getWidth() / 2;
    var newImageY = centerY - image.getHeight() / 2;

    // Set the new image's position without resizing
    image.setLeft(newImageX);
    image.setTop(newImageY);
  }
}
