//jQuery UI Stickies
//@VERSION 0.0.5

// Note that this file has been modified by the Slycat team from its original at:
// https://github.com/reesewill/stickies/blob/5d7fdef8a23a69dd2706f35411e85842efc4903d/src/core.js

(function( factory ) {

	if ( typeof define === "function" && define.amd ) {

		// AMD. Register as an anonymous module.
		define([
			"jquery",
			"./core",
			"./widget",
			"./draggable",
			"./mouse",
			"./position",
			"./resizable"
		], factory );
	} else {

		// Browser globals
		factory( jQuery );
	}
}(function($) {

	return $.widget("ot.stickies", {
		options: {
			pinned: 0,
			position: {
				my: "left top",
				at: "left+32 top+32",
				of: window,
				collision: "fit",
				// Ensure the titlebar is always visible
				using: function( pos ) {
					var topOffset = $( this ).css( pos ).offset().top;
					if ( topOffset < 0 ) {
						$( this ).css( "top", pos.top - topOffset );
					}
				}
			}
		},
		_create: function() {

			this._createWrapper();
			this._createHeader();
			// Slycat commenting out
			//this._createPin();
			this._createCloseButton();

			this.element
				.addClass( "ui-sticky-text ui-widget-content" )
				.appendTo( this.uiSticky );

			this.uiSticky
				.resizable()
				.draggable( { containment: "window" } )
				.position( this.options.position )
				; 
		},
		_createCloseButton: function() {

			// Slycat changing format of Close button
			// this.uiStickyCloseButton = $( "<span>" )
			// 	.addClass( "ui-sticky-close-button ui-icon ui-icon-closethick" )
			// 	.appendTo( this.uiStickyHeader );

			this.uiStickyCloseButton = $('<i title="Close">')
				.addClass("fas fa-times float-end")
				.appendTo(this.uiStickyHeader);
			// End Slycat modification
			
			this._on( this.uiStickyCloseButton, {
				"click": function(e) {
					// Slycat disabling _destroy custom, widget-specific, cleanup because this is
					// causing a "maximum call stack size exceeded" error. Instead, we are calling
					// this.uiSticky.remove() here and then calling this.destroy() to remove the
					// widget functionality completely.

					// this._destroy();
					this.uiSticky.remove();
					this.destroy();
					// End Slycat modification
				}
			});
		},
		_createWrapper: function() {

			this.uiSticky = $( "<div>" )
				.addClass( "ui-sticky ui-sticky-wrapper" )
				.appendTo( "body" );
		},
		_createHeader: function() {

			this.uiStickyHeader = $( "<div>" )
				.addClass( "ui-sticky-header ui-widget-header" )
				.prependTo( this.uiSticky );
		},
		_createPin: function() {

			this.uiStickyPin = $( "<span>" )
				.addClass( "ui-sticky-pin ui-icon ui-icon-pin-s" )
				.prependTo( this.uiStickyHeader );

			this._on( this.uiStickyPin, {
				"click": this._pin
			});
		},
		_pin: function( value ) {

			if ( typeof( value ) === "object" ) {
				this.options.pinned = !this.options.pinned;
				value = this.options.pinned;
			}

			this.uiStickyPin
				.toggleClass( "ui-icon-pin-s", !value )
				.toggleClass( "ui-icon-pin-w", value );

			this.uiSticky.toggleClass( "ui-sticky-pinned", value );
		},
		_setOption: function( key, value ) {

			this._super( key, value );

			if ( key === "pinned" ) {
				this._pin( value );
			}

		},
		// Slycat disabling _destroy custom, widget-specific, cleanup because this is 
		// causing a "maximum call stack size exceeded" error. Instead, we are calling
		// this.uiSticky.remove() in the _createCloseButton function.
		// _destroy: function() {
			// this.uiSticky.remove();
		// }
		// End Slycat modification
	});

}));
