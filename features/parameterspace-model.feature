Feature: Parameter Space Model

  # Variable changes

  Scenario: Change color theme in the parameter space model
    When the theme colors variable is changed between Night, Day, and Rainbow
    Then the colormap should be changed to the corresponding theme's default colormap
    And the scatterplot should be redrawn using the new theme's colormap
    And the color band in the legend should display the new theme's colormap
    And the background should be redrawn using the new theme's background color

  Scenario: Change Image Set selection in the parameter space model
    When the image set variable is changed
    Then the name of the new image set selection should be displayed
    And the images retrieved during mouse hover should be members of this alternate set

  Scenario: Change Point Color variable in the parameter space model
    When the Point Color variable is changed
    Then the name of the new Point Color variable should be displayed
    And the legend should change the values of the tic labels to reflect the value range of the new variable
    And the scatterplot should be redrawn to display the colors of the new variable's values

  Scenario: Change axis variable in the parameter space model
    When an axis variable is changed
    Then the corresponding axis variable label should display the new variable name
    And the corresponding axis tic labels should be changed to reflect the value range of the new variable
    And the graph point coordinates corresponding to the modified axis should be changed to values from the new variable
    And the graph point coordinates corresponding to the other axis should remain unchanged

  Scenario: Change axis variable when points are selected in the parameter space model
    Given that points in the graph were previously selected
    When an axis variable is changed
    Then all of the change axis variable scenario should occur
    And the selected points should be redrawn at the new coordinates as highlighted points
    And the identities of the selected points should not change

  # Selection

  Scenario: Select graph point in the parameter space model
    Given a graph
    When the mouse is clicked on the graph line
    Then the closest point to the click location should be the selected point
    And the selected point should be redrawn with highlighting in all of the graphs
    And any previously selected points should be redrawn without highlighting in all of the graphs
    And the table row that corresponds to the selected point should be highlighted
    And table rows that correspond to any previously selected points should not be highlighted

  Scenario: Select multiple graph points in the parameter space model
    Given a rubberband rectangle
    When the mouse button is released to complete the rectangle definition
    Then all of the graph points within the rectangle should replace the selected point set
    And the new selected points should be redrawn with highlighting in all of the graphs
    And any previously selected points should be redrawn without highlighting in all of the graphs
    And table rows that correspond to the new selected points should be highlighted
    And table rows that correspond to any previously selected points should not be highlighted

  Scenario: Select a table row in the parameter space model
    Given a table of points
    When the mouse is clicked on a row
    Then any previous point selection should be replaced with the point corresponding to the selected row
    And the selected table row should be highlighted
    And table rows that correspond to any previously selected points should not be highlighted
    And the point associated with the selected row should be redrawn with highlighting in all of the graphs
    And any previously selected points should be redrawn without highlighting in all of the graphs

  Scenario: Select multiple table rows in the parameter space model
    Given a table of points
    When the mouse is clicked on a row and a second row is clicked on while holding the shift key
    Then any previous point selection should be replaced with the points corresponding to all rows between the two selected rows, inclusive
    And the selected table rows should be highlighted
    And table rows that correspond to any previously selected points should not be highlighted
    And the points associated with the selected rows should be redrawn with highlighting in all of the graphs
    And any previously selected points should be redrawn without highlighting in all of the graphs

  Scenario: Clear selected graph points by clicking in the parameter space model
    Given a graph with zero to many selected points
    When the mouse is clicked off of the graph line
    Then any previously selected points should cease to be selected
    And any previously unselected points should remain unselected
    And any previously selected points that were highlighted in the graphs should be redrawn without highlighting
    And any table rows that correspond to the previously selected points should no longer be highlighted

  Scenario: Clear selected graph points by rubberbanding empty region in the parameter space model 
    Given a graph with zero to many selected points and a rubberband rectangle
    When the mouse button is released to complete the rectangle definition and the rectangle does not contain any points
    Then any previously selected points should cease to be selected
    And any previously unselected points should remain unselected
    And any previously selected points that were highlighted in the graphs should be redrawn without highlighting
    And any table rows that correspond to the previously selected points should no longer be highlighted
    And the rectangle should disappear

  # Images

  Scenario: Image retrieval in the parameter space model
    Given a graph, mouse coordinates, and an image set selection
    When the mouse location intersects the graph line
    Then the image corresponding to the closest point from the selected image set should be retrieved and displayed
    And a line should be drawn between the displayed image and its associated graph point
    And the image icons should be visible in the image corners

  Scenario: Image mouse hover in the parameter space model
    Given a displayed image
    When the mouse location is within the image boundaries
    Then the delete, pin, and resize image icons should be visible in the corners of the image
    And the image icons should not be visible otherwise

  Scenario: Image dragging in the parameter space model
    Given a displayed image
    When the mouse button is clicked and held on an image
    Then the image location should be changed to follow the mouse position until the mouse button is released
    And the line connecting the image to the graph should rubberband to maintain the connection between the current image location and the fixed graph point

  Scenario: Image pinning in the parameter space model
    Given a displayed image
    When the pin icon is clicked
    Then the image size should be reset to a predetermined image size for pinned images
    And the image location should be shifted away from the graph line plot

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
    And the maximum image size should be limited to the height of the graph view
    And the line connecting the image to the graph should rubberband to maintain the connection between the current image center and the fixed graph point

  # Legend

  Scenario: Reposition legend in the parameter space model
    Given a legend
    When the mouse button is clicked an held on a legend
    Then the legend location should be changed to follow the mouse position until the mouse button is released
    And the legend location should be limited to the neighborhood around its associated graph

  # Animation

  Scenario: Play animation in the parameter space model
    Given a graph and an image set
    When the animation button is clicked
    Then the associated graph should be replaced by the video player
    And an animation should be created from the selected image set
    And the point selection in the remaining graphs should be replaced by a moving point corresponding to the current image in the animation

  # Resizing

  Scenario: When the browser window is resized in the parameter space model
    Given a set of graphs, displayed images, and a table
    When the browser window is resized
    Then the sizes of the graph view and the table should adjust to fill the space
    And the relative vertical proportions of the graph view and the table should be maintained
    And the sizes of each of the graphs should adjust to equally divide the available space both vertically and horizontally
    And each graph should be centered in its region
    And the font size of the axes and legend tic labels should scale to match the width of the axes and legend regions
    And the font size should not shrink below a minimum size, nor expand beyond a maximum size
    And the sizes of any images should scale while maintaining their aspect ratios
    And image locations should be transformed to maintain their relative positions relative to their graphs
    And lines connecting images to graphs should connect the new graph point location with the location for the scaled image
    And rubberbands should be scaled and transformed to enclose the same set of selected points as were enclosed prior to the resizing

  Scenario: When the table is resized in the parameter space model
    Given a set of graphs, displayed images, and a table
    When the table view is resized
    Then the sizes of the graph view and the table should adjust to fill their available vertical space
    And the sizes of each of the graphs should adjust to equally divide the available space both vertically and horizontally
    And each graph should be centered in its region
    And the font size of the axes and legend tic labels should scale to match the width of the axes and legend regions
    And the font size should not shrink below a minimum size, nor expand beyond a maximum size
    And the sizes of any images should scale while maintaining their aspect ratios
    And image locations should be transformed to maintain their relative positions relative to their graphs
    And lines connecting images to graphs should connect the new graph point location with the location for the scaled image
    And rubberbands should be scaled and transformed to enclose the same set of selected points as were enclosed prior to the resizing

  # Table

  Scenario: When a table column is sorted
    Given a table
    When the sorting icon is clicked
    Then the column is sorted in either ascending or descending order
