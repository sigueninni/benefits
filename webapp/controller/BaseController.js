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
        },

        	/* =========================================================== */
		/* Handling Messages                                           */
		/* =========================================================== */

		/**
		 * Display a Message Toast centered
		 * @param	{string}	sMessage
		 * @method displayToastMessage
		 */
		displayToastMessage: function (sMessage) {
			MessageToast.show(sMessage, {
				duration: 3000,
				my: "center center",
				at: "center center",
				animationDuration: 2000,
				closeOnBrowserNavigation: false
			});
		},

		/*
		 * Messages from SAP
		 * @method getODataResponseMessage
		 * @param  {Object} réponse ODATA
		 * @return {Array} Array of error Messages
		 */
		getODataResponseMessage: function (oResponse) {
			// Getting Messages from SAP 
			let oBatchResponse;
			let oChangeResponse;
			let oDetail;
			let aMessages = [];

			if (oResponse !== undefined && oResponse.__batchResponses !== undefined) {
				// Récupération des messages en mode Batch
				for (var i = 0; i < oResponse.__batchResponses.length; i++) {
					oBatchResponse = oResponse.__batchResponses[i];

					if (oBatchResponse !== undefined && oBatchResponse.__changeResponses !== undefined) {
						for (var j = 0; j < oBatchResponse.__changeResponses.length; j++) {
							oChangeResponse = oBatchResponse.__changeResponses[j];

							if (oChangeResponse !== undefined && oChangeResponse.headers !== undefined && oChangeResponse.headers["sap-message"] !==
								undefined) {
								oDetail = JSON.parse(oChangeResponse.headers["sap-message"]);
								aMessages.push({
									severity: oDetail.severity,
									message: oDetail.message
								});

								if (oDetail !== undefined && oDetail.details !== undefined) {
									for (var k = 0; k < oDetail.details.length; k++) {
										aMessages.push(oDetail.details[k]);
									}
								}
							}
						}
					}
				}
			} else if (oResponse !== undefined && oResponse.headers !== undefined && oResponse.headers["sap-message"] !== undefined) {
				// Récupération des messages pour les autres cas
				oDetail = JSON.parse(oResponse.headers["sap-message"]);

				aMessages.push({
					severity: oDetail.severity,
					message: oDetail.message
				});

				if (oDetail !== undefined && oDetail.details !== undefined) {
					for (var l = 0; l < oDetail.details.length; l++) {
						aMessages.push({
							severity: oDetail.details[l].severity,
							message: oDetail.details[l].message
						});
					}
				}
			}

			return aMessages;
		},

		/**
		 * CallBack Handling Messages
		 **/
		_callBackMsgSAP: function (oData, oResponse, oEvent) {
			try {
				// On remonte dans l'application si des messages sont trouvés
				this._displayMessagesFromSAP(oResponse);
			} catch (oError) {
				this.displayToastMessage(oError.message);
			}
		},

		/**
		 * Displaying messages from SAP
		 **/
		_displayMessagesFromSAP: function (oResponse) {
			// => Dialog if error Message
			// => Orherwise MessageToast
			let aMessages;
			let oDialog;
			let bError;
			let sMessages = "";
			let i;

			try {
				aMessages = this.getODataResponseMessage(oResponse);
				if (aMessages !== undefined && aMessages.length > 0) {
					// Type of Message
					for (i = 0; i < aMessages.length; i++) {
						if (aMessages[i].severity === "error") {
							bError = true;
						}
						// Constructing the Message
						sMessages = sMessages + aMessages[i].message;
						if (i < (aMessages.length - 1)) {
							sMessages += " \n";
						}
					}
					// Block user
					// auAt least one error Message
					if (bError) {
						oDialog = new Dialog({
							title: this.getText("MSG_TITLE"),
							type: "Message",
							content: new Text({
								text: sMessages
							}),
							beginButton: new Button({
								text: this.getText("LBL_CLOSE"),
								press: function () {
									oDialog.close();
								}
							}),
							afterClose: function () {
								oDialog.destroy();
							}
						});
						oDialog.open();
					} else {
						// on ne bloque pas l'utilisateur car aucun message d'erreur n'est remonté de SAP
						for (i = 0; i < aMessages.length; i++) {
							this.displayToastMessage(aMessages[i].message);
						}
					}
				}
			} catch (oError) {
				this.displayToastMessage(oError.message);
			}
		},

		/**
		 * Return service Error
		 * @method fError
		 */
		fError: function () {
			this.alertErr([this.getText("MSG_ERREUR_SERVICE")]);
		},

		/*
		 * Get a text from I18n
		 * @method getText
		 * @param  {String} textId 
		 * @param  {array}  arr  array of parameters
		 * @return {String} text
		 */
		getText: function (textId, arr) {
			const oModel = sap.ui.getCore().getModel("i18n");
			let text;

			if (oModel === undefined) {
				return "";
			}

			try {
				text = oModel.getResourceBundle().getText(textId, arr);
			} catch (error) {
				text = textId;
			}

			return text;
		},

		/**
		 * Display error Message
		 * @param  {String} aMessage Tableau de string à afficher
		 */
		alertErr: function (aMessage) {
			var oText = new sap.m.Text();
			var lText = "";
			//Long Message -> Array of params
			for (var i = 0; i !== aMessage.length; i++) {
				lText = lText.concat(aMessage[i]);
			}
			oText.setText(lText);
			oText.setWrapping(true);
			oText.setTextAlign(sap.ui.core.TextAlign.Center);
			oText.setRenderWhitespace(true);
			//Open Dialog              
			if (!this.escapePreventDialog) {
				this.escapePreventDialog = new sap.m.Dialog({
					title: this.getText("LBL_ERROR"),
					state: 'Error',
					icon: "sap-icon://warning",
					buttons: [
						new sap.m.Button({
							text: this.getText("LBL_CLOSE"),
							//Close Dialog
							press: function () {
								this.escapePreventDialog.close();
							}.bind(this)
						})
					]
				});
			}

			this.escapePreventDialog.removeAllContent();
			this.escapePreventDialog.addContent(oText);
			this.escapePreventDialog.open();
		}

    });

});