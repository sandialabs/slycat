import { useEffect } from "react";
import $ from "jquery";

export const useDropdownMenuHeight = (containerSelector: string = ".ui-layout-container") => {
  useEffect(() => {
    const handleDropdownShow = (event: JQuery.TriggeredEvent) => {
      // Get all dropdown menus inside this element
      const menus = $(".dropdown-menu", event.currentTarget);
      // Get the container that holds the model's panes
      const container = $(containerSelector).first();
      // Set the max height of each menu to 70px less than the container.
      // This prevents the menus from sticking out beyond the page and allows
      // them to be scrollable when they are too long.
      const containerHeight = container.height();
      if (containerHeight !== undefined) {
        menus.css("max-height", `${containerHeight - 70}px`);
      }
    };

    // Add event listener
    $("#controls-pane").on("show.bs.dropdown", handleDropdownShow);

    // Cleanup
    return () => {
      $("#controls-pane").off("show.bs.dropdown", handleDropdownShow);
    };
  }, [containerSelector]);
};
