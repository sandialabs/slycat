Feature: Tracer Model

  # Variable changes

  Scenario: Change color theme
    When the theme colors variable is changed between Night, Day, and Rainbow
    Then the colormap should be changed to the corresponding theme's default colormap
    And the graphs should all be redrawn using the new theme's colormap
    And the color bands in all of the graph legends should display the new theme's colormap
    And the background should be redrawn using the new theme's background color

  Scenario: Change image set selection
    When the image set variable is changed
    Then the name of the new image set selection should be displayed
    And the images retrieved during mouse hover should be members of this alternate set

  Scenario: Change color variable
    When the color variable is changed
    Then the name of the new color variable should be displayed
    And the legend should change the values of the tic labels to reflect the value range of the new variable
    And the associated graph should be redrawn to display the colors of the new variable's values

  Scenario: Change axis variable 
    When an axis variable is changed
    Then the corresponding axis variable label should display the new variable name 
    And the corresponding axis tic labels should be changed to reflect the value range of the new variable
    And the graph point coordinates corresponding to the modified axis should be changed to values from the new variable
    And the graph point coordinates corresponding to the other axis should remain unchanged

  Scenario: Change axis variable when points are selected
    Given that points in the graph were previously selected
    When an axis variable is changed
    Then all of the change axis variable scenario should occur
    And the selected points should be redrawn at the new coordinates as highlighted points
    And the identities of the selected points should not change

  # Selection

  Scenario: Select a point
    Given a graph
    When the mouse is clicked on the graph line
    Then select the closest point to the click location as a selected point
    And redraw the selected point in all graphs with highlighting

  Scenario: Select multiple points
    Given a rubberband rectangle
    When the mouse button is released to complete the rectangle definition
    Then select all points on the graph within the rectangle as selected points
    And redraw the selected points in all graphs with highlighting

  # Images

  Scenario: Image retrieval 
    Given a graph, mouse coordinates, and an image set selection
    When the mouse location intersects the graph line
    Then the image corresponding to the closest point from the selected image set should be retrieved and displayed
    And a line should be drawn between the displayed image and its associated graph point

  Scenario: Image mouse hover
    Given a displayed image
    When the mouse location is within the image boundaries
    Then the delete, pin, and resize image icons should be visible in the corners of the image
    And the image icons should not be visible otherwise

  Scenario: Image dragging
    Given a displayed image
    When the mouse button is clicked and held on an image 
    Then the image location should be changed to follow the mouse position until the mouse button is released
    And the line connecting the image to the graph should rubberband to maintain the connection between the current image location and the fixed graph point

  Scenario: Image pinning
    Given a displayed image
    When the pin icon is clicked
    Then the image size should be reset to a predetermined image size for pinned images
    And the image location should be shifted away from the graph line plot

  Scenario: Image deletion
    Given a displayed image
    When the delete image icon is clicked
    Then the image should be removed from the display
    And the line connecting the image to the graph should also be removed

  Scenario: Image resizing
    Given a displayed image
    When the mouse is clicked on the resize icon and held
    Then the image size should be changed to follow the mouse position until the mouse button is released
    And the aspect ratio of the image should be preserved even if the mouse position does not move equally in both x and y
    And the minimum image size should be limited to always permit display of the three image icons - delete, pin, and resize
    And the maximum image size should be limited to the height of the graph view
    And the line connecting the image to the graph should rubberband to maintain the connection between the current image center and the fixed graph point  

  # Legend

  Scenario: Reposition legend
    Given a legend
    When the mouse button is clicked an held on a legend
    Then the legend location should be changed to follow the mouse position until the mouse button is released
    And the legend location should be limited to the neighborhood around its associated graph 

  # Animation

  Scenario: Play animation
    Given a graph and an image set
    When the animation button is clicked
    Then the associated graph is replaced by the video player
    And an animation is created from the selected image set
    And the point selection in the remaining graphs is replaced by a moving point corresponding to the current image in the animation


