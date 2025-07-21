sap.ui.define([
    "com/un/zhrbenefrequests/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "com/un/zhrbenefrequests//model/formatter",
    "sap/base/strings/formatMessage",
    "sap/ui/core/ValueState",
    "sap/viz/ui5/data/FlattenedDataset",
    "sap/viz/ui5/controls/common/feeds/FeedItem",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",

],
    function (BaseController, JSONModel, formatter, formatMessage, ValueState, FlattenedDataset, FeedItem, MessageBox, MessageToast, Filter, FilterOperator) {
        "use strict";

        return BaseController.extend("com.un.zhrbenefrequests.controller.Detail", {

            formatter: formatter,
            formatMessage: formatMessage,

            /* =========================================================== */
            /* lifecycle methods                                           */
            /* =========================================================== */
            onInit: function () {},

            /**
             * Event handler for the Add Claim button
             * Opens the ClaimAdd dialog for new claim entry
             */
            onAddClaimButtonPress: function () {
                const that = this;
                const oView = this.getView();
                // Create a new JSON model for the dialog if needed
                const oDialogModel = new sap.ui.model.json.JSONModel({
                    ExpenseType: "",
                    Amount: "",
                    Currency: "",
                    Comments: ""
                });
                // Create dialog only once
                if (!this.fragments._oAddClaimDialog) {
                    this.fragments._oAddClaimDialog = new sap.m.Dialog({
                        id: "claimAddDialog",
                        title: oView.getModel("i18n").getResourceBundle().getText("addClaim"),
                        content: sap.ui.xmlfragment("com.un.zhrbenefrequests.fragment.form.educationGrant.ClaimAdd", this),
                        beginButton: new sap.m.Button({
                            text: oView.getModel("i18n").getResourceBundle().getText("cancel"),
                            press: function () {
                                that._removeClaimAddDialog();
                            }
                        }),
                        endButton: new sap.m.Button({
                            text: oView.getModel("i18n").getResourceBundle().getText("submit"),
                            press: function () {
                                // TODO: Add logic to save the claim
                                that._removeClaimAddDialog();
                            }
                        })
                    });
                    this.fragments._oAddClaimDialog.setModel(oView.getModel("i18n"), "i18n");
                    this.fragments._oAddClaimDialog.setModel(oDialogModel, "dialogModel");
                }
                // Set the context/model to the dialog
                this.fragments._oAddClaimDialog.setModel(oDialogModel, "dialogModel");
                oView.addDependent(this.fragments._oAddClaimDialog);
                this.fragments._oAddClaimDialog.open();
            },
            _removeClaimAddDialog: function () {
                if (this.fragments._oAddClaimDialog) {
                    this.fragments._oAddClaimDialog.destroy();
                    this.fragments._oAddClaimDialog = null;
                }
            }

        });
    });