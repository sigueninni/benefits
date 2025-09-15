/*global history */
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/m/MessageToast",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/Text",
	"com/un/zhrbenefrequests/model/constants"
], function (Controller, History, MessageToast, Dialog, Button, Text, Constants) {
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
		}

	});
});
