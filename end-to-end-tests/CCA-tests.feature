Feature: testing CCA models


  Scenario: create CCA Scatterplot from cars and check bitmap image of Scatterplot
     Given we can navigate to the main projects window and create a CCA model from Cars csv
      when we have the Scatterplot load
      then we should have an accurate Scatterplot

  Scenario: Navigate to CCA Scatterplot and check bitmap image of Scatterplot
     Given we can navigate to our example CCA model
      when we have the Scatterplot load
      then we should have an accurate Scatterplot