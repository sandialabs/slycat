Feature: Tracer Model

  # Variable changes

  Scenario: Change color theme in the tracer model
    When the theme colors variable is changed between Night, Day, and Rainbow
    Then the colormap should be changed to the corresponding theme's default colormap
    And the graphs should all be redrawn using the new theme's colormap
    And the color bands in all of the graph legends should display the new theme's colormap
    And the background should be redrawn using the new theme's background color

  Scenario: Change image set selection in the tracer model
    When the image set variable is changed
    Then the name of the new image set selection should be displayed
    And the images retrieved during mouse hover should be members of this alternate set

  Scenario: Change color variable in the tracer model
    When the color variable is changed
    Then the name of the new color variable should be displayed
    And the legend should change the values of the tic labels to reflect the value range of the new variable
    And the associated graph should be redrawn to display the colors of the new variable's values

  Scenario: Change axis variable in the tracer model
    When an axis variable is changed
    Then the corresponding axis variable label should display the new variable name
    And the corresponding axis tic labels should be changed to reflect the value range of the new variable
    And the graph point coordinates corresponding to the modified axis should be changed to values from the new variable
    And the graph point coordinates corresponding to the other axis should remain unchanged

  Scenario: Change axis variable when points are selected in the tracer model
    Given that points in the graph were previously selected
    When an axis variable is changed
    Then all of the change axis variable scenario should occur
    And the selected points should be redrawn at the new coordinates as highlighted points
    And the identities of the selected points should not change

  # Selection

  Scenario: Select graph point in the tracer model
    Given a graph
    When the mouse is clicked on the graph line
    Then the closest point to the click location should be the selected point
    And the selected point should be redrawn with highlighting in all of the graphs
    And any previously selected points should be redrawn without highlighting in all of the graphs
    And the table row that corresponds to the selected point should be highlighted
    And table rows that correspond to any previously selected points should not be highlighted

  Scenario: Select multiple graph points in the tracer model
    Given a rubberband rectangle
    When the mouse button is released to complete the rectangle definition
    Then all of the graph points within the rectangle should replace the selected point set
    And the new selected points should be redrawn with highlighting in all of the graphs
    And any previously selected points should be redrawn without highlighting in all of the graphs
    And table rows that correspond to the new selected points should be highlighted
    And table rows that correspond to any previously selected points should not be highlighted

  Scenario: Select a table row in the tracer model
    Given a table of points
    When the mouse is clicked on a row
    Then any previous point selection should be replaced with the point corresponding to the selected row
    And the selected table row should be highlighted
    And table rows that correspond to any previously selected points should not be highlighted
    And the point associated with the selected row should be redrawn with highlighting in all of the graphs
    And any previously selected points should be redrawn without highlighting in all of the graphs

  Scenario: Select multiple table rows in the tracer model
    Given a table of points
    When the mouse is clicked on a row and a second row is clicked on while holding the shift key
    Then any previous point selection should be replaced with the points corresponding to all rows between the two selected rows, inclusive
    And the selected table rows should be highlighted
    And table rows that correspond to any previously selected points should not be highlighted
    And the points associated with the selected rows should be redrawn with highlighting in all of the graphs
    And any previously selected points should be redrawn without highlighting in all of the graphs

  # Images

  Scenario: Image retrieval in the tracer model
    Given a graph, mouse coordinates, and an image set selection
    When the mouse location intersects the graph line
    Then the image corresponding to the closest point from the selected image set should be retrieved and displayed
    And a line should be drawn between the displayed image and its associated graph point
    And the image icons should be visible in the image corners

  Scenario: Image mouse hover in the tracer model
    Given a displayed image
    When the mouse location is within the image boundaries
    Then the delete, pin, and resize image icons should be visible in the corners of the image
    And the image icons should not be visible otherwise

  Scenario: Image dragging in the tracer model
    Given a displayed image
    When the mouse button is clicked and held on an image
    Then the image location should be changed to follow the mouse position until the mouse button is released
    And the line connecting the image to the graph should rubberband to maintain the connection between the current image location and the fixed graph point

  Scenario: Image pinning in the tracer model
    Given a displayed image
    When the pin icon is clicked
    Then the image size should be reset to a predetermined image size for pinned images
    And the image location should be shifted away from the graph line plot

  Scenario: Image deletion in the tracer model
    Given a displayed image
    When the delete image icon is clicked
    Then the image should be removed from the display
    And the line connecting the image to the graph should also be removed

  Scenario: Image resizing in the tracer model
    Given a displayed image
    When the mouse is clicked on the resize icon and held
    Then the image size should be changed to follow the mouse position until the mouse button is released
    And the aspect ratio of the image should be preserved even if the mouse position does not move equally in both x and y
    And the minimum image size should be limited to always permit display of the three image icons - delete, pin, and resize
    And the maximum image size should be limited to the height of the graph view
    And the line connecting the image to the graph should rubberband to maintain the connection between the current image center and the fixed graph point

  # Legend

  Scenario: Reposition legend in the tracer model
    Given a legend
    When the mouse button is clicked an held on a legend
    Then the legend location should be changed to follow the mouse position until the mouse button is released
    And the legend location should be limited to the neighborhood around its associated graph

  # Animation

  Scenario: Play animation in the tracer model
    Given a graph and an image set
    When the animation button is clicked
    Then the associated graph is replaced by the video player
    And an animation is created from the selected image set
    And the point selection in the remaining graphs is replaced by a moving point corresponding to the current image in the animation


