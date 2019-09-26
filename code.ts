// This file holds the main code for the plugins. It has access to the *document*.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser enviroment (see documentation).

// This shows the HTML page in "ui.html".
figma.showUI(__html__);

figma.ui.resize(300, 370);

function clone(val) {
  return JSON.parse(JSON.stringify(val));
}

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = async msg => {

  const {
    type,
    modifiedData,
    numberOfRows,
    numberOfCols,
    width,
    fontSize,
    fontColour,
    fontFamily,
    letterSpacing,
    lineHeight,
    header
  } = msg;

  if (type === "data-received") {
    const height = lineHeight * numberOfRows;
    const nodes: SceneNode[] = [];

    async function loadFonts(fontWeight) {
      // load the font family;
      await figma.loadFontAsync({
        family: fontFamily,
        style: fontWeight
      });
    }

    if (header === "yes") {
      await loadFonts('Regular');
      await loadFonts('Bold');
    } else {
      await loadFonts('Regular');
    }

    // temporary put all the cost column on the page;
    const allLastColsNode = [];
    if (numberOfCols > 1) {
      for (let r = 0; r < numberOfRows; r++) {
        const text = figma.createText();
        text.fontName = {
          family: fontFamily,
          style: "Regular"
        };
        text.characters = modifiedData[r][numberOfCols-1];
        text.fontSize = fontSize;

        allLastColsNode.push(text);
      }
    } else {
      figma.notify("You don't have enough data to make a table! 😞");
    }
    // find the longest node within the cost column;
    const longest = allLastColsNode.reduce((a, b) => {
      return a.width > b.width ? a : b;
    });

    // generate lines;
    for (let r = 0; r < numberOfRows; r++) {
      const xPosition = 0;
      const yPosition = (r + 1) * lineHeight;

      if (header === "yes") {
        // not to include line for the first row
        if (r !== 0) {
          createLines();
        }
      } else {
        createLines();
      }

      function createLines () {
        const line = figma.createLine();
        line.x = xPosition;
        line.y = yPosition;

        // can only change width and height with resize(width, height);
        // lineNode can only have height of 0
        line.resize(msg.width, 0);
        line.fills = [
          {
            type: "SOLID",
            color: { r: fontColour.r, g: fontColour.g, b: fontColour.b }
          }
        ];
        // update the line colours. Initial stroke properties is readonly.
        const strokes = clone(line.strokes);
        strokes[0].color.r = fontColour.r;
        strokes[0].color.g = fontColour.g;
        strokes[0].color.b = fontColour.b;
        line.strokes = strokes;
        figma.currentPage.appendChild(line);
        nodes.push(line);
      }

      
      // generate texts;
      for (let c = 0; c < numberOfCols; c++) {
        const xPosition = 0;
        const yPosition = r * lineHeight;

        const text = figma.createText();

        if (header == "yes") {
          // bold the text on the first row;
          if (r === 0) {
            text.fontName = {
              family: fontFamily,
              style: "Bold"
            };
          } else {
            text.fontName = {
              family: fontFamily,
              style: "Regular"
            };
          }
        } else {
          text.fontName = {
            family: fontFamily,
            style: "Regular"
          };
        }

        text.characters = modifiedData[r][c];
        text.fontSize = fontSize;
        text.fills = [
          {
            type: "SOLID",
            color: { r: fontColour.r, g: fontColour.g, b: fontColour.b }
          }
        ];
        text.letterSpacing = {
          value: letterSpacing,
          unit: "PIXELS"
        };
        text.lineHeight = {
          value: lineHeight,
          unit: "PIXELS"
        };
        figma.currentPage.appendChild(text);
        text.y = yPosition;

        if (c === 0) {
          text.x = xPosition;
        } else if (c === numberOfCols - 1){
          //left align the last col based on the longest node;
          text.x = width - lineHeight / 2 - longest.width;
        } else {
          text.x = (width - lineHeight / 2 - longest.width) / (numberOfCols - 1);
        }
      }
    }

    // remove all the cost nodes from the page;
    allLastColsNode.map(childNode => {
      childNode.remove();
    });

    figma.currentPage.selection = nodes;
    figma.viewport.scrollAndZoomIntoView(nodes);

    figma.closePlugin();
  } 
  
  else if (type === "data-missing") {
    figma.notify("Did you forget to paste your data in? 🤔");
  }

  else if (type === "data-format-incorrect") {
    figma.notify("Please check the data you paste in. Something went wrong! 😬");
  }
};
