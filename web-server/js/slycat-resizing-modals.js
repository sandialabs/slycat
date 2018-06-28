/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import "js/slycat-navbar";

// Wait for document ready
$(document).ready(function() {

  $('body').delegate('.zooming-modals .modal', 'shown.bs.modal', function(){
    var self = $(this);
    var modalBackdrop = self.find('.modal-backdrop');
    var resized = function(){
      $(self.find('.modal-backdrop').siblings('.modal-dialog').find('div')[2]).css('max-height', parseInt(self.css('height')) * 0.93 + 'px');
    };
    var observer = new MutationObserver(resized);
    observer.observe(self.find('.modal-backdrop')[0], {attributes: true});
    resized();
  });

});