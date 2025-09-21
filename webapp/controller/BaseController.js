/*global history */
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/m/MessageToast",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/Text",
	"sap/m/MessagePopover",
	"sap/m/MessageItem",
	"com/un/zhrbenefrequests/model/constants"
], function (Controller, History, MessageToast, Dialog, Button, Text, MessagePopover, MessageItem, Constants) {
	"use strict";

	return Controller.extend("com.un.zhrbenefrequests.controller.BaseController", {
		fragments: {},

		getRouter: function () {
			return this.getOwnerComponent().getRouter();
		},

		getModel: function (sName) {
			return this.getView().getModel(sName);
		},

		setModel: function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Get request status constants
		 * @returns {object} Request status constants
		 * @public
		 */
		getRequestStatus: function() {
			return Constants.REQUEST_STATUS;
		},

		onNavBack: function () {
			const sPreviousHash = History.getInstance().getPreviousHash();
			const oCA = sap.ushell?.Container?.getService?.("CrossApplicationNavigation");
			if (sPreviousHash !== undefined || (oCA && !oCA.isInitialNavigation())) {
				history.go(-1);
			} else {
				this.getRouter().navTo("master", {}, true);
			}
		},

		setEnabled: function (arr, isEnabled) {
			for (let id of arr) {
				this.getView().byId(id)?.setEnabled(isEnabled);
			}
		},

		setVisible: function (arr, isVisible) {
			for (let id of arr) {
				this.getView().byId(id)?.setVisible(isVisible);
			}
		},

		onCancel: function (oEvent) {
			const name = oEvent.getSource().data("name");
			const dlg = this.fragments[name];
			if (dlg) {
				dlg.close();
				dlg.destroy();
				delete this.fragments[name];
			}
		},

		getBindingDetailObject: function () {
			const bc = this.getView().getBindingContext();
			return bc?.getObject();
		},

		getBindingMasterObject: function () {
			const bc = this.getView().getBindingContext();
			return bc?.getObject();
		},

		isAFieldEmpty: function (aFields) {
			const txtFieldRequired = this.getText("MSG_FIELD_REQUIRED");
			aFields.forEach(id => {
				const c = this.getView().byId(id) || sap.ui.getCore().byId(id);
				c?.setValueState("None");
				c?.setValueStateText("");
			});

			return aFields.some(id => {
				const oControl = this.getView().byId(id) || sap.ui.getCore().byId(id);
				if (!oControl) { return true; }
				let value = "";
				if (oControl.getValue) value = oControl.getValue();
				else if (oControl.getSelectedKey) value = oControl.getSelectedKey();
				else if (oControl.getSelected) value = oControl.getSelected() ? "true" : "";
				else if (oControl.getState) value = oControl.getState() ? "true" : "";
				else if (oControl.getText) value = oControl.getText();

				if (!value || String(value).trim() === "") {
					if (oControl.setValueState) {
						oControl.setValueState("Error");
						oControl.setValueStateText(txtFieldRequired);
					}
					return true;
				}
				return false;
			});
		},

		/* ===================== Messages ===================== */


		/** Detect OData errors encapsulated in $batch responses (returns a string or null) */
		_parseODataErrorFromBatch: function (oBatch) {
			// Case 1: error at the changeset level (present on batch.response)
			if (oBatch && oBatch.response) {
				// try to extract JSON error message
				try {
					const body = oBatch.response.body;
					if (body) {
						const parsed = JSON.parse(body);
						return parsed?.error?.message?.value || parsed?.error?.message || "changeset error";
					}
				} catch (e) {
					// ignore JSON parse errors
				}
				return "changeset error";
			}

			// Case 2: inspect first change response
			const first = oBatch && oBatch.__changeResponses && oBatch.__changeResponses[0];
			if (!first) return "no change response";

			const status = String(first.statusCode || first.status || "");
			const ok2xx = /^2\d\d$/.test(status);
			if (ok2xx) return null; // no error

			// try to extract JSON error message from change response
			try {
				const body = first.response?.body || first.body;
				if (body) {
					const parsed = JSON.parse(body);
					return parsed?.error?.message?.value || parsed?.error?.message || "change error";
				}
			} catch (e) {
				// ignore JSON parse errors
			}
			return first.message || "change error";
		},

		displayToastMessage: function (sMessageKey, aParams) {
			const text = this.getText(sMessageKey, aParams);
			MessageToast.show(text, {
				duration: 3000, my: "center center", at: "center center",
				animationDuration: 2000, closeOnBrowserNavigation: false
			});
		},

		/** Show always the generic error message */
		_showODataError: function () {
			const msg = this.getText("MSG_SERVICE_ERROR");
			new Dialog({
				title: this.getText("LBL_ERROR"),
				state: "Error",
				icon: "sap-icon://warning",
				content: new Text({ text: msg, wrapping: true }),
				beginButton: new Button({
					text: this.getText("LBL_CLOSE"),
					press: function () { this.getParent().close(); }
				}),
				afterClose: function () { this.destroy(); }
			}).open();
			this.fError(); // fallback
		},

		/** Service Error (fallback) */
		fError: function () {
			this.alertErr([this.getText("MSG_SERVICE_ERROR")]);
		},

		getText: function (textId, arr) {
			const oModel = this.getOwnerComponent().getModel("i18n");
			if (!oModel) return textId;
			try { return oModel.getResourceBundle().getText(textId, arr); }
			catch (e) { return textId; }
		},

		alertErr: function (aMessage) {
			const lText = aMessage.join("");
			const oText = new Text({ text: lText, wrapping: true, renderWhitespace: true });
			if (!this.escapePreventDialog) {
				this.escapePreventDialog = new Dialog({
					title: this.getText("LBL_ERROR"),
					state: "Error",
					icon: "sap-icon://warning",
					buttons: [
						new Button({
							text: this.getText("LBL_CLOSE"),
							press: function () { this.escapePreventDialog.close(); }.bind(this)
						})
					]
				});
			}
			this.escapePreventDialog.removeAllContent();
			this.escapePreventDialog.addContent(oText);
			this.escapePreventDialog.open();
		},

		/* ===================== Message Manager Utilities ===================== */

		/**
		 * Utility method to add messages to the MessageManager
		 * @param {string} sMessage - The main error message
		 * @param {string} sDescription - Detailed description (optional)
		 * @param {string} sTarget - Target field path (optional)
		 * @param {string} sType - Message type (Error, Warning, Success, Information)
		 * @public
		 */
		addMessage: function(sMessage, sDescription, sTarget, sType) {
			const oMessageManager = sap.ui.getCore().getMessageManager();
			const sMessageType = sType || sap.ui.core.MessageType.Error;
			
			oMessageManager.addMessages(
				new sap.ui.core.message.Message({
					message: sMessage,
					type: sMessageType,
					target: sTarget || "",
					processor: this.getView().getModel(),
					description: sDescription || "",
					additionalText: new Date().toLocaleTimeString()
				})
			);
		},

		/**
		 * Event handler for the messages button press.
		 * Opens a MessagePopover to display all validation and error messages.
		 * @param {sap.ui.base.Event} oEvent - The button press event
		 * @public
		 */
		onMessagesButtonPress: function (oEvent) {
			if (!this._oMessagePopover) {
				this._oMessagePopover = new sap.m.MessagePopover({
					items: {
						path: "message>/",
						template: new sap.m.MessageItem({
							type: "{message>type}",
							title: "{message>message}",
							description: "{message>description}",
							subtitle: "{message>additionalText}",
							counter: "{message>counter}"
						})
					}
				});
				this.getView().addDependent(this._oMessagePopover);
			}
			this._oMessagePopover.toggle(oEvent.getSource());
		},

		/**
		 * Clear all messages from the MessageManager
		 * @public
		 */
		clearMessages: function() {
			const oMessageManager = sap.ui.getCore().getMessageManager();
			oMessageManager.removeAllMessages();
		},

		/**
		 * Add an error message to the MessageManager
		 * @param {string} sMessage - The error message
		 * @param {string} sDescription - Detailed description (optional)
		 * @param {string} sTarget - Target field path (optional)
		 * @public
		 */
		addErrorMessage: function(sMessage, sDescription, sTarget) {
			this.addMessage(sMessage, sDescription, sTarget, sap.ui.core.MessageType.Error);
		},

		/**
		 * Add a warning message to the MessageManager
		 * @param {string} sMessage - The warning message
		 * @param {string} sDescription - Detailed description (optional)
		 * @param {string} sTarget - Target field path (optional)
		 * @public
		 */
		addWarningMessage: function(sMessage, sDescription, sTarget) {
			this.addMessage(sMessage, sDescription, sTarget, sap.ui.core.MessageType.Warning);
		},

		/**
		 * Add a success message to the MessageManager
		 * @param {string} sMessage - The success message
		 * @param {string} sDescription - Detailed description (optional)
		 * @param {string} sTarget - Target field path (optional)
		 * @public
		 */
		addSuccessMessage: function(sMessage, sDescription, sTarget) {
			this.addMessage(sMessage, sDescription, sTarget, sap.ui.core.MessageType.Success);
		},

		/**
		 * Add an information message to the MessageManager
		 * @param {string} sMessage - The information message
		 * @param {string} sDescription - Detailed description (optional)
		 * @param {string} sTarget - Target field path (optional)
		 * @public
		 */
		addInfoMessage: function(sMessage, sDescription, sTarget) {
			this.addMessage(sMessage, sDescription, sTarget, sap.ui.core.MessageType.Information);
		},

		/**
		 * Parse OData error and add it as a message
		 * @param {object} oError - The OData error object
		 * @param {string} sDefaultMessage - Default message if parsing fails
		 * @param {string} sTarget - Target field path (optional)
		 * @public
		 */
		addODataErrorMessage: function(oError, sDefaultMessage, sTarget) {
			let sErrorMessage = sDefaultMessage || "Une erreur s'est produite";
			let sErrorDetails = "Erreur technique";
			
			try {
				if (oError.responseText) {
					const oErrorData = JSON.parse(oError.responseText);
					sErrorMessage = oErrorData.error?.message?.value || sErrorMessage;
					sErrorDetails = oErrorData.error?.innererror?.errordetails?.[0]?.message || sErrorDetails;
				} else if (oError.message) {
					sErrorMessage = oError.message;
				}
			} catch (e) {
				console.warn("Could not parse OData error response", e);
			}
			
			this.addErrorMessage(sErrorMessage, sErrorDetails, sTarget);
		}

	});
});
