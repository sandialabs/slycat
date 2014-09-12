/*!
 * Combobox Plugin for jQuery, version 0.5.0
 *
 * Copyright 2012, Dell Sala
 * http://dellsala.com/
 * https://github.com/dellsala/Combo-Box-jQuery-Plugin
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * Date: 2012-01-15
 */
(function () {

    jQuery.fn.combobox = function (selectOptions) {
    
        return this.each(function () {
            var newCombobox = new Combobox(this, selectOptions);
            jQuery.combobox.instances.push(newCombobox);
        });
    
    };

    jQuery.combobox = {
        instances : []
    };


    var Combobox = function (textInputElement, selectOptions) {
        this.textInputElement = jQuery(textInputElement);
        this.textInputElement.wrap(
            '<span class="combobox" style="position:relative; '+
            'display:-moz-inline-box; display:inline-block;"/>'
        );
        this.selector = new ComboboxSelector(this);
        this.setSelectOptions(selectOptions);
        var inputHeight = this.textInputElement.outerHeight();
        var buttonLeftPosition = this.textInputElement.outerWidth() + 0;
        var thisSelector = this.selector;
        var thisCombobox = this;
        this.textInputElement.click(function (e){
          thisSelector.buildSelectOptionList();
          thisSelector.show();
          thisCombobox.focus();
          return false;
        });
        this.bindKeypress();
    };

    Combobox.prototype = {

        setSelectOptions : function (selectOptions) {
            this.selector.setSelectOptions(selectOptions);
            this.selector.buildSelectOptionList(this.getValue());
        },

        bindKeypress : function () {
            var thisCombobox = this;
            this.textInputElement.keyup(function (event) {
                if (event.keyCode == Combobox.keys.TAB
                    || event.keyCode == Combobox.keys.SHIFT) 
                {
                    return;
                }
                if (event.keyCode != Combobox.keys.DOWNARROW
                    && event.keyCode != Combobox.keys.UPARROW
                    && event.keyCode != Combobox.keys.ESCAPE
                    && event.keyCode != Combobox.keys.ENTER)
                {
                    thisCombobox.selector.buildSelectOptionList(thisCombobox.getValue());
                }
                if (event.keyCode === Combobox.keys.ENTER)
                {
                    return;
                }
                thisCombobox.selector.show()
            });
        },
        
        setValue : function (value) {
            var oldValue = this.textInputElement.val();
            this.textInputElement.val(value);
            if (oldValue != value) {
                this.textInputElement.trigger('change');
            }
        },

        getValue : function () {
            return this.textInputElement.val();
        },
        
        focus : function () {
            this.textInputElement.trigger('focus');         
        }
        
    };

    Combobox.keys = {
        UPARROW : 38,
        DOWNARROW : 40,
        ENTER : 13,
        ESCAPE : 27,
        TAB : 9,
        SHIFT : 16
    };



    var ComboboxSelector = function (combobox) {
        this.combobox = combobox;
        this.optionCount = 0;
        this.selectedIndex = -1;
        this.allSelectOptions = [];
        var selectorTop = combobox.textInputElement.outerHeight();
        var selectorWidth = combobox.textInputElement.outerWidth();
        this.selectorElement = jQuery(
            '<div class="combobox_selector" '+
            'style="display:none; width:'+selectorWidth+
            'px; position:absolute; left: 0; top: '+selectorTop+'px;"'+
            '></div>'
        ).insertAfter(this.combobox.textInputElement);
        var thisSelector = this;
        this.keypressHandler = function (e) {
            if (e.keyCode == Combobox.keys.DOWNARROW) {
                thisSelector.selectNext();
            } else if (e.keyCode == Combobox.keys.UPARROW) {
                thisSelector.selectPrevious();
            } else if (e.keyCode == Combobox.keys.ESCAPE) {
                thisSelector.hide();
                thisSelector.combobox.focus();
            } else if (e.keyCode == Combobox.keys.ENTER) {
                if(thisSelector.selectedIndex !== -1){
                    e.preventDefault();
                }
                thisSelector.combobox.setValue(thisSelector.getSelectedValue());
                thisSelector.combobox.focus();
                thisSelector.hide();
            } else if(e.keyCode == Combobox.keys.TAB){
                thisSelector.hide();
            }
        }
        
    };


    ComboboxSelector.prototype = {

        setSelectOptions : function (selectOptions) {
            this.allSelectOptions = selectOptions;
        },

        buildSelectOptionList : function (startingLetters) {
            if (! startingLetters) {
                startingLetters = "";
            }
            this.unselect();
            this.selectorElement.empty();
            var selectOptions = [];
            this.selectedIndex = -1;
            var i;
            for (i=0; i < this.allSelectOptions.length; i++) {
                if (! startingLetters.length 
                    || this.allSelectOptions[i].toLowerCase().indexOf(startingLetters.toLowerCase()) === 0)
                {
                    selectOptions.push(this.allSelectOptions[i]);
                }
            }
            this.optionCount = selectOptions.length;
            var ulElement = jQuery('<ul></ul>').appendTo(this.selectorElement);
            for (i = 0; i < selectOptions.length; i++) {
                ulElement.append('<li>'+selectOptions[i]+'</li>');
            }
            var thisSelector = this;
            if(selectOptions.length == 0){
              thisSelector.hide();
            }
            this.selectorElement.find('li').click(function (e) {
                thisSelector.hide();
                thisSelector.combobox.setValue(this.innerHTML);
                thisSelector.combobox.focus();
            });
            this.selectorElement.mouseover(function (e) {
                thisSelector.unselect();
            });
            this.htmlClickHandler = function () {
                thisSelector.hide();
            };

        },

        show : function () {
            if (this.selectorElement.find('li').length < 1
                || this.selectorElement.is(':visible'))
            {
                return false;
            }
            jQuery('html').keydown(this.keypressHandler);
            this.selectorElement.slideDown('fast');
            jQuery('html').click(this.htmlClickHandler);
            return true;
        },

        hide : function () {
            jQuery('html').unbind('keydown', this.keypressHandler);
            jQuery('html').unbind('click', this.htmlClickHandler);
            this.selectorElement.unbind('click');
            this.unselect();
            this.selectorElement.hide();
        },

        selectNext : function () {
            var newSelectedIndex = this.selectedIndex + 1;
            if (newSelectedIndex > this.optionCount - 1) {
                newSelectedIndex = this.optionCount - 1;
            }
            this.select(newSelectedIndex);
        },

        selectPrevious : function () {
            var newSelectedIndex = this.selectedIndex - 1;
            if (newSelectedIndex < 0) {
                newSelectedIndex = 0;
            }
            this.select(newSelectedIndex);
        },
        
        select : function (index) {
            this.unselect();
          this.selectorElement.find('li:eq('+index+')').addClass('selected');
          this.selectedIndex = index;
        },

        unselect : function () {
          this.selectorElement.find('li').removeClass('selected');
          this.selectedIndex = -1;
        },
        
        getSelectedValue : function () {
            if(this.selectedIndex !== -1){
                return this.selectorElement.find('li').get(this.selectedIndex).innerHTML;
            } else {
                return this.combobox.textInputElement.val();
            }
        }

    };


})();
