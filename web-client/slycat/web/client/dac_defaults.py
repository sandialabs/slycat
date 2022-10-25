# This module contains the model UI defaults for creating a DAC model.

# S. Martin
# 10/24/22

# returns a JSON variable with UI defaults
def dac_model_defaults():

    # from dac-ui.pref file:
    # ----------------------
    return {

        # the step size for the alpha slider (varies from 0 to 1)
        "ALPHA_STEP": 0.001,

        # default width for the alpha sliders (in pixels)
        "ALPHA_SLIDER_WIDTH": 170,

        # default height of alpha buttons (in pixels)
        "ALPHA_BUTTONS_HEIGHT": 33,

        # number of points over which to stop animation
        "MAX_POINTS_ANIMATE": 2500,

        # border around scatter plot (fraction of 1)
        "SCATTER_BORDER": 0.025,

        # scatter button toolbar height
        "SCATTER_BUTTONS_HEIGHT": 37,

        # scatter plot colors (css/d3 named colors)
        "POINT_COLOR": 'whitesmoke',
        "POINT_SIZE": 5,
        "NO_SEL_COLOR": 'gray',
        "SELECTION_1_COLOR": 'red',
        "SELECTION_2_COLOR": 'blue',
        "COLOR_BY_LOW": 'white',
        "COLOR_BY_HIGH": 'dimgray',
        "OUTLINE_NO_SEL": 1,
        "OUTLINE_SEL": 2,

        # pixel adjustments for d3 time series plots
        "PLOTS_PULL_DOWN_HEIGHT": 38,
        "PADDING_TOP": 10,        # 10 (values when plot selectors were)
        "PADDING_BOTTOM": 14,     # 24 (at the bottom of the plots)
        "PADDING_LEFT": 37,
        "PADDING_RIGHT": 10,
        "X_LABEL_PADDING": 4,
        "Y_LABEL_PADDING": 13,
        "LABEL_OPACITY": 0.2,
        "X_TICK_FREQ": 80,
        "Y_TICK_FREQ": 40,

    }