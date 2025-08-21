/*global history */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History"
], function (Controller, History) {
    "use strict";


    return Controller.extend("com.un.zhrbenefrequests.controller.BaseController", {
              fragments: {}, //All Fragments here
        /**
         * Convenience method for accessing the router in every controller of the application.
         * @public
         * @returns {sap.ui.core.routing.Router} the router for this component
         */
        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },

        /**
         * Convenience method for getting the view model by name in every controller of the application.
         * @public
         * @param {string} sName the model name
         * @returns {sap.ui.model.Model} the model instance
         */
        getModel: function (sName) {
            return this.getView().getModel(sName);
        },

        /**
         * Convenience method for setting the view model in every controller of the application.
         * @public
         * @param {sap.ui.model.Model} oModel the model instance
         * @param {string} sName the model name
         * @returns {sap.ui.mvc.View} the view instance
         */
        setModel: function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        /**
         * Convenience method for getting the resource bundle.
         * @public
         * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
         */
        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        /**
         * Event handler for navigating back.
         * It there is a history entry or an previous app-to-app navigation we go one step back in the browser history
         * If not, it will replace the current entry of the browser history with the master route.
         * @public
         */
        onNavBack: function () {
            const sPreviousHash = History.getInstance().getPreviousHash(),
                oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

            if (sPreviousHash !== undefined || !oCrossAppNavigator.isInitialNavigation()) {
                history.go(-1);
            } else {
                this.getRouter().navTo("master", {}, true);
            }
        },
        /**
     * Set Controls Id Enablement to isEnabled( parameter)
     * @method setEnabled
     * @param  {arr} Array of controls Id, isEnabled( boolean)
     */
        setEnabled: function (arr, isEnabled) {
            for (let id of arr) {
                this.getView().byId(id).setEnabled(isEnabled);
            }
        },
        /**
     * Set Controls Id Visibility to isVisible( parameter)
     * @method setVisible
     * @param  {arr} Array of controls Id, isVisible( boolean)
     */
        setVisible: function (arr, isVisible) {
            for (let id of arr) {
                this.getView().byId(id).setVisible(isVisible);
            }
        },



        /**
     * Return service Error
     * @method fError
     */
        fError: function () {
            this.alertErr([this.getText("MSG_ERREUR_SERVICE")]);
        },



        onCancel: function (oEvent) {
            debugger;

            let name = oEvent.getSource().data("name");
            if (this.fragments[name]) {
                let _odialog = this.fragments[name];
                _odialog.close();
                _odialog.destroy();
                delete this.fragments[name];

            }

        }
        ,

        getBindingDetailObject: function () {
            const oModel = this.getView().getModel();
            const bindingContext = this.getView().getBindingContext();
            const path = bindingContext.getPath();
            return bindingContext.getObject();
        }

    });

});