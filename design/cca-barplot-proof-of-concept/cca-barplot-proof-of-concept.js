$( document ).ready(function() {

	var numberOfColumns = $(".barplotHeaderColumn").length;

	$(".barplotHeaderColumn").each(
		function(index){
			var maxWidth = Math.max.apply( null, $(".col" + index).map( function () {
	    	return $( this ).width();
			}).get() );
			$(".col" + index).width(maxWidth);
		}
	);

	var tableHeight = $("#barplot-table").height();
	var headerHeight = $(".barplotHeader").height();
	$(".barplotCanvas").height( (tableHeight - headerHeight)/2 );
	$(".barplotGroup").height( (tableHeight - headerHeight)/2 );
	var tableWidth = $("#barplot-table").width();
	var firstColumnWidth = $(".barplotColumn").width();
	$(".barplotCanvas").width(tableWidth - firstColumnWidth);

	$(".barplotCanvas.input").on("scroll", function(){
		$(".barplotHeaderColumns").css("margin-left", "-" + $(this).scrollLeft() + "px");
		$(".barplotColumn.input").css("margin-top", "-" + $(this).scrollTop() + "px");
	});

	$(".barplotCanvas.output").on("scroll", function(){
		$(".barplotHeaderColumns").css("margin-left", "-" + $(this).scrollLeft() + "px");
		$(".barplotColumn.output").css("margin-top", "-" + $(this).scrollTop() + "px");
		$(".barplotCanvas.input").scrollLeft( $(this).scrollLeft() );
	});




	// $(".col0").each(
	// 	function(index, element){
	// 		console.log( index + ": " + "is a cell in the first column. Its width is: " + $(element).width() );
	// 	});


	// var maxWidth = Math.max.apply( null, $(".col0").map( function () {
	//     return $( this ).width();
	// }).get() );

	// console.log("Max width is: " + maxWidth);

	// $(".col0").width(maxWidth);



});