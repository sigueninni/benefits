/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "com/un/zhrbenefrequests/model/models",
    "com/un/zhrbenefrequests/controller/ListSelector"
],
    function (UIComponent, Device, models, ListSelector) {
        "use strict";

        return UIComponent.extend("com.un.zhrbenefrequests.Component", {
            metadata: {
                manifest: "json"
            },

            /**
   * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
   * @public
   * @override
   */
            init: function () {
                this.oListSelector = new ListSelector();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");
                // set the FLP model
                this.setModel(models.createFLPModel(), "FLP");

                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // enable routing
                this.getRouter().initialize();
            },

            /**
         * The component is destroyed by UI5 automatically.
         * In this method, the ListSelector and ErrorHandler are destroyed.
         * @public
         * @override
         */
            destroy: function () {
                this.oListSelector.destroy();
                // this._oErrorHandler.destroy();
                // call the base component's destroy function
                UIComponent.prototype.destroy.apply(this, arguments);
            },

            /**
             * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
             * design mode class should be set, which influences the size appearance of some controls.
             * @public
             * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
             */
            getContentDensityClass: function () {
                if (this._sContentDensityClass === undefined) {
                    // check whether FLP has already set the content density class; do nothing in this case
                    if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
                        this._sContentDensityClass = "";
                    } else if (!Device.support.touch) { // apply "compact" mode if touch is not supported
                        this._sContentDensityClass = "sapUiSizeCompact";
                    } else {
                        // "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
                        this._sContentDensityClass = "sapUiSizeCozy";
                    }
                }
                return this._sContentDensityClass;
            }


        });
    }
);