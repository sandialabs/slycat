(function ($) {
  /***
   * A Slycat AJAX data store implementation that uses the workers api.
   */
  function CCALoader(url, workerId, row_count, variable_names, all_column_indexes) {
    // private
    // The URL to get to server/workers
    var targetUrl;
    // The worker id
    var targetWorkerId;
    var PAGESIZE = 50;
    var data = {length: 0};
    var sortcol = null;
    var sortdir = null;
    var h_request = null;
    var req = null; // ajax request

    // events
    var onDataLoading = new Slick.Event();
    var onDataLoaded = new Slick.Event();

    function init() {
      targetUrl = url;
      targetWorkerId = workerId;
    }

    // Checks if some data range is loaded.
    // Not called internally.
    function isDataLoaded(from, to) {
      for (var i = from; i <= to; i++) {
        if (data[i] == undefined || data[i] == null) {
          return false;
        }
      }

      return true;
    }

    // Clears the local data array.
    // Called by setSort internally.
    function clear() {
      for (var key in data) {
        delete data[key];
      }
      data.length = 0;
    }

    // Called by reloadData internally.
    // Does all the work of loading data from remote source.
    // from and to are the rows that need to be fetched
    // colBegin and colEnd are the columns to be fetched
    function ensureData(from, to, colBegin, colEnd, callback) {
    
      if (req) {
        req.abort();
        for (var i = req.fromPage; i <= req.toPage; i++)
          data[i * PAGESIZE] = undefined;
      }

      if (from < 0) {
        from = 0;
      }

      var fromPage = Math.floor(from / PAGESIZE);
      var toPage = Math.floor(to / PAGESIZE);
      
      while (data[fromPage * PAGESIZE] !== undefined && fromPage < toPage)
        fromPage++;

      while (data[toPage * PAGESIZE] !== undefined && fromPage < toPage)
        toPage--;

      if (fromPage > toPage || ((fromPage == toPage) && data[fromPage * PAGESIZE] !== undefined)) {
        // TODO:  look-ahead
        if(callback != null)
          callback();
        return;
      }
      
      var url = targetUrl + targetWorkerId + "/table-chunker/chunk"

      if (h_request != null) {
        clearTimeout(h_request);
      }

      h_request = setTimeout(function () {
        for (var i = fromPage; i <= toPage; i++)
          data[i * PAGESIZE] = null; // null indicates a 'requested but not available yet'

        onDataLoading.notify({from: from, to: to});   
      
      var queryParams = { 
        "rows" : (fromPage * PAGESIZE) + "-" + ((toPage * PAGESIZE) + PAGESIZE), 
        "columns" : all_column_indexes.join(","),
      }

      req = $.ajax({
          url: url,
          contentType : "application/json",
          data: queryParams,
          processData : true,
          dataType: 'json',
          async: true,
          success: [onSuccess, callback],
          error: function(xhr, ajaxOptions, thrownError){
              onError(fromPage, toPage, xhr, ajaxOptions, thrownError)
          }
          });
      // Setting fromPage and toPage on the req does not work for some reason
      req.fromPage = fromPage;
      req.toPage = toPage;
      }, 50);

    }

    // Called by ajax request internally.
    function onError(fromPage, toPage, xhr, ajaxOptions, thrownError) {
      //alert("3...error loading pages " + fromPage + " to " + toPage + "\n" + xhr.statusText + "\n" + ajaxOptions + "\n" + thrownError);
    }

    // Called by ajax request internally
    function onSuccess(resp) {
      var row_indexes = resp["rows"];
      data.length = row_count;

      var rows = zip(resp["data"]);

      for (var i = 0; i < row_indexes.length; i++) {
        data[ row_indexes[i] ] = toObject(resp["column-names"], rows[i]);
        data[ row_indexes[i] ].index = row_indexes[i];
      }

      req = null;

      onDataLoaded.notify( row_indexes );
    }

    // Helper function to zip arrays. Used to zip column arrays into row arrays.
    function zip(arrays) {
      return arrays[0].map(function(_,i){
        return arrays.map(function(array){return array[i]})
      });
    }

    // Helper function to prepend each row array with names of columns since SlickGrid needs this format.
    function toObject(columnNames, rowValues) {
      var rv = {};
      for (var i = 0; i < columnNames.length; ++i) {
        rowValue = rowValues[i];
        if (null == rowValue)
          rowValue = "...";
        /* disabling prepending column names with counter for now
        rv[i + '_' + columnNames[i]] = rowValue;
        */
        rv[columnNames[i]] = rowValue;
      }
      return rv;
    }

    // Clears a data range and then reloads it
    // Not called internally.
    function reloadData(from, to) {
      for (var i = from; i <= to; i++)
        delete data[i];

      ensureData(from, to);
    }

    // Not called internally
    function setSort(column, dir) {
      sortcol = column;
      sortdir = dir;

      var url = targetUrl + targetWorkerId + "/table-chunker/sort";
      var queryParams = { "order" : [[all_column_indexes[ $.inArray(sortcol, variable_names) ] , (sortdir==1 ? "ascending" : "descending")]]};

      req = $.ajax({
        url: url,
        type : "PUT",
        contentType : "application/json",
        data : $.toJSON(queryParams),
        processData: false,
        async: false, // Need to do this synchonously since it's followed by ensureData, which will abort it if it's not finished
      });

      clear();
    }


    init();

    return {
      // properties
      "data": data,

      // methods
      "clear": clear,
      "isDataLoaded": isDataLoaded,
      "ensureData": ensureData,
      "reloadData": reloadData,
      "setSort": setSort,
      /* not used in Slycat
      "setSearch": setSearch,
      */

      // events
      "onDataLoading": onDataLoading,
      "onDataLoaded": onDataLoaded
    };
  }

  // Slick.Data.CCALoader
  $.extend(true, window, { Slick: { Data: { CCALoader: CCALoader }}});
})(jQuery);
