Feature: testing CCA models

  Scenario: Navigate to CCA Scatterplot and check bitmap image of Scatterplot
     Given we can navigate to our example CCA model
      when we have the Scatterplot load
      then we should have an accurate Scatterplot