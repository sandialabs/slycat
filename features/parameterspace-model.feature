Feature: Parameter Space Model

  # Variable changes

  Scenario: Change color theme in the parameter space model
    When the theme colors variable is changed between Night, Day, and Rainbow
    Then the colormap should be changed to the corresponding theme's default colormap
    And the color band in the legend should display the new theme's colormap
    And the background should be redrawn using the new theme's background color
    And the points in the scatterplot should be redrawn using the new theme's colormap
    And the color band in the legend should display the new theme's colormap
    And the background should be redrawn using the new theme's background color
    And any selected points should be redrawn using the new theme's colormap as highlighted points
    And the identities of the selected points should not change

  Scenario: Change Point Color variable in the parameter space model
    When the Point Color variable is changed either through the drop down or through clicking on the table column header
    Then the Point Color variable label should display the new variable name
    And the new Point Color variable name should be displayed in the legend
    And the legend should change the values of the tic labels to reflect the value range of the new variable
    And the scatterplot should be redrawn to display the colors of the new variable's values for each point
    And the corresponding table column should be redrawn to display the numeric values with a color-encoded background corresponding to the scatterplot point color
    And the backgrounds in the table column for the previously selected Point Color variable should return to the color-coding for inputs, outputs, or neither (green, purple, or white)
    And any selected points should be redrawn displaying the new color values as highlighted points
    And the identities of the selected points should not change

  Scenario: Change axis variable in the parameter space model
    When an axis variable is changed either through the drop down or though clicking on the X or Y icons in the table column header
    Then the corresponding axis variable label should display the new variable name
    And the corresponding axis tic labels should be changed to reflect the value range of the new variable
    And the scatterplot point coordinates corresponding to the modified axis should be changed to values from the new variable
    And the scatterplot point coordinates corresponding to the other axis should remain unchanged
    And the corresponding table column should display a bold X or Y icon depending on the axis changed
    And the table column for the previously selected axis variable's X or Y should be grayed out 
    And any selected points should be redrawn at the new coordinates as highlighted points
    And the identities of the selected points should not change

  Scenario: Change Image Set selection in the parameter space model
    When the image set variable is changed either through the drop down or though clicking on the square icon in the table column header
    Then the name of the new image set selection should be displayed
    And the images retrieved during mouse hover should be members of this alternate set
    And the corresponding table column should display a bold square icon
    And the table column for the previously selected image variable's square icon should be grayed out 

  # Selection

  Scenario: Select scatterplot point in the parameter space model
    Given a scatterplot
    When the mouse is clicked on a scatterplot point
    Then the closest point to the click location should be the selected point
    And the selected point should be redrawn with highlighting in the sctterplot
    And any previously selected points should be redrawn without highlighting in the scatterplot
    And the table row that corresponds to the selected point should be highlighted
    And table rows that correspond to any previously selected points should not be highlighted

  Scenario: Select multiple scatterplot points in the parameter space model
    Given a rubberband rectangle
    When the mouse button is released to complete the rectangle definition
    Then all of the scatterplot points within the rectangle should replace the selected point set
    And the new selected points should be redrawn with highlighting in the scatterplot 
    And any previously selected points should be redrawn without highlighting in the scatterplot 
    And table rows that correspond to the new selected points should be highlighted
    And table rows that correspond to any previously selected points should not be highlighted

  Scenario: Select a table row in the parameter space model
    Given a table, where rows correspond to points in the scatterplot
    When the mouse is clicked on a row
    Then any previous point selection should be replaced with the point corresponding to the selected row
    And the selected table row should be highlighted
    And table rows that correspond to any previously selected points should not be highlighted
    And the point associated with the selected row should be redrawn with highlighting in the scatterplot 
    And any previously selected points should be redrawn without highlighting in the scatterplot

  Scenario: Select multiple table rows in the parameter space model
    Given a table, where rows correspond to points in the scatterplot
    When the mouse is clicked on a row, and a second row is also clicked while holding the shift key
    Then any previous point selection should be replaced with the points corresponding to all rows between the two selected rows, inclusive
    And the selected table rows should be highlighted
    And table rows that correspond to any previously selected points should not be highlighted
    And the points associated with the selected rows should be redrawn with highlighting in the scatterplot
    And any previously selected points should be redrawn without highlighting in the scatterplot

  Scenario: Clear selected scatterplot points by clicking in the parameter space model
    Given a scatterplot with zero to many selected points
    When the mouse is clicked over the background away from any of the points 
    Then any previously selected points should cease to be selected
    And any previously unselected points should remain unselected
    And any previously selected points that were highlighted in the scatterplot should be redrawn without highlighting
    And any table rows that correspond to the previously selected points should no longer be highlighted

  Scenario: Clear selected scatterplot points by rubberbanding empty region in the parameter space model 
    Given a scatterplot with zero to many selected points and a rubberband rectangle
    When the mouse button is released to complete the rectangle definition and the rectangle does not contain any points
    Then any previously selected points should cease to be selected
    And any previously unselected points should remain unselected
    And any previously selected points that were highlighted in the scatterplot should be redrawn without highlighting
    And any table rows that correspond to the previously selected points should no longer be highlighted
    And the rectangle should disappear

  # Images

  Scenario: Image retrieval in the parameter space model
    Given a scatterplot, mouse coordinates, and an image set selection
    When the mouse location is within the boundary definitions of one or more points 
    Then the point closest to the mouse coordinates should be identified, and the associated image from the current selected image set should be retrieved and displayed
    And a line should be drawn between the displayed image and its associated scatterplot point
    And the pin and resize icons should be visible in the image corners
    And the image should remain for as long as the mouse location remains within the point boundary definition
    And the image should disappear after a brief delay once the mouse location moves outside of the point boundary definition

  Scenario: Image mouse hover in the parameter space model
    Given a displayed image
    When the mouse location is within the image boundaries
    Then the cursor should be the move cursor
    And the delete, pin, and resize image icons should be visible in the corners of the image
    And the cursor should be the arrow cursor when the mouse location is outside of the image boundaries
    And the image icons should not be visible when the mouse location is outside the image boundaries 

  Scenario: Image dragging in the parameter space model
    Given a displayed image
    When the mouse button is clicked and held on an image
    Then the image location should be changed to follow the mouse position until the mouse button is released
    And the line connecting the image to the graph should rubberband to maintain the connection between the current image location and the fixed graph point

  Scenario: Image pinning in the parameter space model
    Given a displayed image
    When the pin icon is clicked
    Then the image size should be reset to a predetermined image size for pinned images
    And the image location should be shifted to the edges of the scatterplot 

  Scenario: Image deletion in the parameter space model
    Given a displayed image
    When the delete image icon is clicked
    Then the image should be removed from the display
    And the line connecting the image to the graph should also be removed

  Scenario: Image resizing in the parameter space model
    Given a displayed image
    When the mouse is clicked on the resize icon and held
    Then the image size should be changed to follow the mouse position until the mouse button is released
    And the aspect ratio of the image should be preserved even if the mouse position does not move equally in both x and y
    And the minimum image size should be limited to always permit display of the three image icons - delete, pin, and resize
    And the maximum image size should be limited to the height of the scatterplot view
    And the line connecting the image to the scatterplot point should rubberband to maintain the connection between the current image center and the fixed scatterplot point

  # Legend

  Scenario: Reposition legend in the parameter space model
    Given a legend
    When the mouse button is clicked an held on a legend
    Then the legend location should be changed to follow the mouse position until the mouse button is released

  # Animation

  Scenario: Video retrieval in the parameter space model
    Given a scatterplot, mouse coordinates, and an image set selection with a video link
    When the mouse location is within the boundary definitions of one or more points 
    Then the point closest to the mouse coordinates should be identified, and the associated video from the current selected image set should be retrieved and displayed in a videoplayer
    And a line should be drawn between the videoplayer and its associated scatterplot point
    And the pin and resize icons should be visible in the image corners
    And the video should remain for as long as the mouse location remains within the point boundary definition
    And the video should disappear after a brief delay once the mouse location moves outside of the point boundary definition

  Scenario: Play animation in the parameter space model
    Given a videoplayer 
    When the play button is clicked
    Then the video should begin to play

  Scenario: Video mouse hover in the parameter space model
    Given a videoplayer
    When the mouse location is within the videoplayer boundaries
    Then the cursor should be the move cursor
    And the delete, pin, and resize icons should be visible in the corners of the video frame 
    And the cursor should be the arrow cursor when the mouse location is outside of the video frame
    And the delete, pin, and resize icons should not be visible when the mouse location is outside the video frame 

  Scenario: Video dragging in the parameter space model
    Given a videoplayer
    When the mouse button is clicked and held within the video frame 
    Then the videoplayer location should be changed to follow the mouse position until the mouse button is released
    And the line connecting the videoplayer to the scatterplot point should rubberband to maintain the connection between the current videoplayer location and the fixed scatterplot point

  Scenario: Video pinning in the parameter space model
    Given a videoplayer
    When the pin icon is clicked
    Then the videoplayer size should be reset to a predetermined size for pinned videoplayers
    And the videoplayer location should be shifted to the edges of the scatterplot 

  Scenario: Video deletion in the parameter space model
    Given a videoplayer
    When the delete icon is clicked
    Then the videoplayer should be removed from the display
    And the line connecting the videoplayer to the scatterplot point should also be removed

  Scenario: Video resizing in the parameter space model
    Given a videoplayer
    When the mouse is clicked on the resize icon and held
    Then the videoplayer size should be changed to follow the mouse position until the mouse button is released
    And the aspect ratio of the video frame should be preserved even if the mouse position does not move equally in both x and y
    And the minimum videoplayer size should be limited to always permit display of the three icons - delete, pin, and resize
    And the maximum videoplayer size should be limited to the height of the scatterplot view
    And the line connecting the videoplayer to the scatterplot point should rubberband to maintain the connection between the current videoplayer center and the fixed scatterplot point

  # Resizing

  Scenario: When the browser window is resized in the parameter space model
    Given a scatterplot, displayed images, and a table
    When the browser window is resized
    Then the sizes of the scatterplot and the table should adjust to fill the space
    And the relative vertical proportions of the scatterplot and the table should be maintained
    And the font size of the axes and legend tic labels should scale to match the width of the axes and legend regions
    And the font size should not shrink below a minimum size, nor expand beyond a maximum size
    And the sizes of any images or videos should scale while maintaining their aspect ratios
    And image or video locations should be transformed to maintain their relative positions relative to the scatterplot 
    And lines connecting images or videos to scatterplot points should connect the new point location with the location for the scaled image or video

  Scenario: When the table is resized in the parameter space model
    Given a scatterplot, displayed images, and a table
    When the table view is resized
    Then the sizes of the scatterplot and the table should adjust to fill their available vertical space
    And the font size of the axes and legend tic labels should scale to match the width of the axes and legend regions
    And the font size should not shrink below a minimum size, nor expand beyond a maximum size
    And the sizes of any images or videos should scale while maintaining their aspect ratios
    And image or video locations should be transformed to maintain their relative positions relative to the scatterplot
    And lines connecting images to graphs should connect the new graph point location with the location for the scaled image or video

  # Table

  Scenario: When a table column is sorted
    Given a table
    When the sorting icon is clicked
    Then the column is sorted in either ascending or descending order
