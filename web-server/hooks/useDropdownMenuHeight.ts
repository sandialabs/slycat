import { useEffect, RefObject } from "react";
import $ from "jquery";

export const useDropdownMenuHeight = (
  dropdownMenuRef: RefObject<HTMLElement>,
  containerSelector: string = ".ui-layout-container",
) => {
  useEffect(() => {
    if (!dropdownMenuRef?.current) return;

    // Get the parent element that contains the dropdown trigger and menu
    const dropdownContainer = $(dropdownMenuRef.current).parent();

    const handleDropdownShow = (event: JQuery.TriggeredEvent) => {
      if (!dropdownMenuRef?.current) return;
      // Get the dropdown menu
      const menu = $(dropdownMenuRef.current);
      // Get the container that holds the model's panes
      const container = $(containerSelector).first();
      // Set the max height of the menu to 70px less than the container.
      // This prevents the menu from sticking out beyond the page and allows
      // it to be scrollable when it is too long.
      const containerHeight = container.height();
      if (containerHeight !== undefined) {
        menu.css("max-height", `${containerHeight - 70}px`).css("overflow-y", "auto");
      }
    };

    // Add event listener to the dropdown container
    dropdownContainer.on("show.bs.dropdown", handleDropdownShow);

    // Handle window resize
    const handleResize = () => {
      if (dropdownMenuRef?.current && $(dropdownMenuRef.current).is(":visible")) {
        handleDropdownShow({ currentTarget: dropdownContainer[0] } as JQuery.TriggeredEvent);
      }
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      dropdownContainer.off("show.bs.dropdown", handleDropdownShow);
      window.removeEventListener("resize", handleResize);
    };
  }, [dropdownMenuRef, containerSelector]);
};
