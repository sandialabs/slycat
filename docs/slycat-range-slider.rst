.. _slycat-range-slider:
.. default-domain:: js

slycat-range-slider Module
==========================

The slycat-range-slider module registers a `Knockout <http://knockoutjs.com>`_
component of the same name.  The slycat-range-slider component provides a
standard GUI widget for selecting a closed range of values from a continuous
domain.

To use slycat-range-slider, create :class:`ko.observable` objects for each of the range
slider parameters, including the output range values, and bind them to the page DOM:

.. code-block:: js

  var page =
  {
    minimum_price: ko.observable(150),
    low_price: ko.observable(1000),
    high_price: ko.observable(5000),
    maximum_price: ko.observable(20000),
    slider_length: 500,
  };

  ko.applyBindings(page);

Then, embed the slycat-range-slider component in your markup and bind your observables
to the component parameters:

.. code-block:: html

  <p>Filter results by price:</p>
  <slycat-range-slider params="
    length: slider_length,
    domain_min: minimum_price,
    low_value: low_price,
    high_value: high_price,
    domain_max: maximum_price,
    ">
  </slycat-range-slider>

Now, changes to any of the input parameters automatically update the slider, and user interaction
with the slider updates the `low_value` and `high_value` observables.

The full set of parameters supported by slycat-range-slider are as follows:

* axis, string: "vertical" or "horizontal" to create a slider with the given orientation.  Default: "vertical".
* reverse, bool: If true, the orientation of the slider is reversed so that high and low values are swapped.  Default: false.
* length, :class:`ko.observable`: Length of the slider in pixels.  Default: 500 pixels.
* thumb_length, :class:`ko.observable`: Length of the slider thumb buttons in pixels.  Default: 12 pixels.
* dragging, :class:`ko.observable`: Set to true while the user is dragging a thumb button.
* domain_min, :class:`ko.observable`: Minimum allowed value.  Default: 0.
* low_value, :class:`ko.observable`: Currently-selected range low value.  Default: 0.33.
* high_value, :class:`ko.observable`: Currently-selected range high value.  Default: 0.66.
* domain_max, :class:`ko.observable`: Maximum allowed value.  Default: 1.
