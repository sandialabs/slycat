/*
Copyright 2013 National Technology & Engineering Solutions of Sandia, LLC (NTESS). 
Under the terms of Contract DE-NA0003525 with NTESS, the U.S. Government 
retains certain rights in this software.
*/

/**
 * Adds height adjustment functionality to a dropdown menu
 * @param {JQuery} container - The container element that has the dropdown trigger and menu
 * @param {JQuery} menu - The dropdown menu element
 */
export function setupDropdownMenuHeight(container, menu) {
  const handleDropdownShow = () => {
    const layoutContainer = $(".ui-layout-container").first();
    const containerHeight = layoutContainer.height();
    if (containerHeight !== undefined) {
      menu.css({
        "max-height": `${containerHeight - 70}px`,
        "overflow-y": "auto",
      });
    }
  };

  // Add event listeners for dropdown show and window resize
  container.on("show.bs.dropdown", handleDropdownShow);
  $(window).on("resize", () => {
    if (menu.is(":visible")) {
      handleDropdownShow();
    }
  });
}
