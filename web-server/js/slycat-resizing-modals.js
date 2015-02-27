define("slycat-resizing-modals", ['slycat-navbar', 'domReady!'], function(){
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
})
