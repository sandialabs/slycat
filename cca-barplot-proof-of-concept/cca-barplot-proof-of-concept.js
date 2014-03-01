$( document ).ready(function() {

	// Get all the columns
	var numberOfColumns = $(".barplotHeaderColumn").length;

	$(".barplotHeaderColumn").each(
		function(index){
			var maxWidth = Math.max.apply( null, $(".col" + index).map( function () {
	    	return $( this ).width();
			}).get() );
			$(".col" + index).width(maxWidth);
		}
	);

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