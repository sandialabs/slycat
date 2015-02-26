//jQuery UI Stickies
//@VERSION 0.0.5

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
			this._createPin();
			this._createCloseButton();
			
			this.element
				.addClass( "ui-sticky-text ui-widget-content" )
				.appendTo( this.uiSticky );
				
			this.uiSticky
				.resizable()
				.draggable( { containment: "window"} )
				.position( this.options.position );
		},
		_createCloseButton: function() {
			this.uiStickyCloseButton = $( "<span>" )
				.addClass( "ui-sticky-close-button ui-icon ui-icon-closethick" )
				.appendTo( this.uiStickyHeader );
				
			this._on( this.uiStickyCloseButton, {
				"click": function() {
					this._destroy();
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
		_destroy: function() {
			this.uiSticky.remove();
		}
	});
	
}));
