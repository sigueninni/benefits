sap.ui.define([
    "com/un/zhrbenefrequests/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "com/un/zhrbenefrequests/model/formatter",
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
            onInit: function () {

                const oCore = sap.ui.getCore();
                const oView = this.getView();

                // Model used to manipulate control states. The chosen values make sure,
                // detail page is busy indication immediately so there is no break in
                // between the busy indication for loading the view's meta data
                let oViewModel = new JSONModel({
                    busy: false,
                    delay: 0,
                    isMandatory: true,
                    isVoluntary: false,
                    mimePath: this._sMIMESpath
                });
                this.setModel(oViewModel, "detailView");

                // attach navigation route pattern event
                this.getRouter().getRoute("RouteDetail").attachPatternMatched(this._onObjectMatched, this);

                // attach validation events
                oCore.attachValidationError(function (oEvent) {
                    oEvent.getParameter("element").setValueState(sap.ui.core.ValueState.Error);
                });
                oCore.attachValidationSuccess(function (oEvent) {
                    oEvent.getParameter("element").setValueState(sap.ui.core.ValueState.None);
                });

                // set message model
                const oMessageManager = sap.ui.getCore().getMessageManager();
                oView.setModel(oMessageManager.getMessageModel(), "message");
                oMessageManager.removeAllMessages();
                oMessageManager.registerObject(oView, true);

                this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));

                /*******************************************************************************/
                //TO_REPLACE wth real TimeLine data
                /*******************************************************************************/
                /*this below code for get the JSON Model form Manifest.json file*/
                const commentsDataModel = this.getOwnerComponent().getModel("commentData");
                console.log({ commentsDataModel });
                this.getView().setModel(commentsDataModel, "commentsModel");



            },


            /* =========================================================== */
            /* event handlers                                              */
            /* =========================================================== */

            /**
             * Binds the view to the object path and expands the aggregated line items.
             * @function
             * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
             * @private
             */
            _onObjectMatched: function (oEvent) {
                const oView = this.getView();
                const oModel = oView.getModel();
                const sObjectId = oEvent.getParameter("arguments").benefitRequestId;

                this.getModel().metadataLoaded().then(function () {
                    // first reset all changes if any
                    if (oModel.hasPendingChanges()) {
                        oModel.resetChanges();
                    }

                    //TODO -> Validation checks
                    //   this._resetValidationChecks();

                    // set minimum dates
                    /*                     var oMinDate = new Date();
                                        oMinDate.setMonth(oMinDate.getMonth() + 1);
                                        oMinDate.setDate(oMinDate.getDate() - 2);
                                        oView.byId("foreseenStartDate").setMinDate(oMinDate);
                    
                                        oMinDate = new Date();
                                        // oMinDate.setMonth(oMinDate.getMonth() + 3);
                                        // oMinDate.setDate(oMinDate.getDate() - 4);
                                        oMinDate.setMonth(oMinDate.getMonth() + 1);
                                        oMinDate.setDate(oMinDate.getDate() - 2);
                                        oView.byId("endDate").setMinDate(oMinDate); */

                    const sObjectPath = this.getModel().createKey("RequestHeaderSet", {
                        Guid: sObjectId
                    });
                    this._bindView("/" + sObjectPath);
                }.bind(this));
            },

            _onBindingChange: function () {
                const oView = this.getView(),
                    oElementBinding = oView.getElementBinding();

                // No data for the binding
                if (!oElementBinding.getBoundContext()) {
                    this.getRouter().getTargets().display("detailObjectNotFound");
                    // if object could not be found, the selection in the master list
                    // does not make sense anymore.
                    this.getOwnerComponent().oListSelector.clearMasterListSelection();
                    return;
                }

                let sPath = oElementBinding.getPath(),
                    oResourceBundle = this.getResourceBundle(),
                    oObject = oView.getModel().getObject(sPath),
                    sObjectId = oObject.Guid,
                    sObjectName = oObject.Title,
                    oViewModel = this.getModel("detailView");

                this.getOwnerComponent().oListSelector.selectAListItem(sPath);

            },

            /**
          * Event handler for the save button 
          * @param {sap.ui.base.Event} oEvent the button Click event
          * @public
          */
            onSaveButtonPress: function (oEvent) {
                //   this._savePosRequestObject();
            },

            /**
            * Event handler for the button delete 
            * @param {sap.ui.base.Event} oEvent the button Click event
            * @public
            */
            onDeleteButtonPress: function (oEvent) {

                const that = this;
                const oView = this.getView();
                const oModel = oView.getModel();

                MessageBox.warning(this.getResourceBundle().getText("confirmDeletion"), {
                    title: this.getResourceBundle().getText("confirmDeletionTitle"),
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    initialFocus: MessageBox.Action.OK,
                    onClose: function (oAction) {
                        debugger;
                        if (oAction === MessageBox.Action.OK) {
                            // set busy indicator during view binding
                            let oViewModel = that.getModel("detailView");
                            oViewModel.setProperty("/busy", true);
                            // delete the entry
                            oModel.remove(oView.getBindingContext().getPath(), {
                                success: function (oSuccess) {
                                    oViewModel.setProperty("/busy", false);
                                    MessageToast.show(that.getResourceBundle().getText("requestDeleted"));
                                    that.getRouter().navTo("RouteMaster", that);
                                    //  that.getRouter().getTargets().display("notFound");
                                }
                            });
                        } else { //Request cancelled
                            MessageToast.show(that.getResourceBundle().getText("deletionCancelled"));
                        }
                    }
                });
            },


            /**
            * Event handler for the button save 
            * @param {sap.ui.base.Event} oEvent the button Click event
            * @public
            */
            onSaveBenefitRequestObject: function () {
                const that = this;
                const oView = this.getView();
                const oModel = oView.getModel();
                const oResourceBundle = this.getResourceBundle();
                // set status to saved draft
                oView.byId("draftIndicator").showDraftSaving();

                if (oModel.hasPendingChanges()) {

                    // set busy indicator during view binding
                    const oViewModel = this.getModel("detailView");
                    oViewModel.setProperty("/busy", true);

                    oModel.submitChanges({
                        success: function (oBatchData) {
                            oViewModel.setProperty("/busy", false);
                            // error in $batch responses / payload ? > no ChangeResponses ?
                            if (!oBatchData.__batchResponses[0].__changeResponses) {
                                const oError = JSON.parse(oBatchData.__batchResponses[0].response.body);
                                MessageBox.error(oError.error.message.value.toString());
                                oModel.resetChanges();
                            } else {
                                // reset the message popover 
                                sap.ui.getCore().getMessageManager().removeAllMessages();
                                that._resetValidationChecks();
                                oView.byId("draftIndicator").showDraftSaved();
                            }
                        }
                    });
                } else {
                    //MessageBox.information(oResourceBundle.getText("noChangesToSubmit"));
                }
            },


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
                                that._onConfirmAddClaim();
                            }
                        })
                    });
                    this.fragments._oAddClaimDialog.setModel(oView.getModel("i18n"), "i18n");
                    this.fragments._oAddClaimDialog.setModel(oDialogModel, "claimModel");
                }
                // Set the context/model to the dialog
                this.fragments._oAddClaimDialog.setModel(oDialogModel, "claimModel");
                oView.addDependent(this.fragments._oAddClaimDialog);
                this.fragments._oAddClaimDialog.open();
            },


            /**
             * Event handler for the Select child button
             * Opens the ChildTableSelectDialog for selecting a child
             */
            selectChildPress: function () {

                if (!this.fragments._oChildTableSelectDialog) {
                    this.fragments._oChildTableSelectDialog = sap.ui.xmlfragment("com.un.zhrbenefrequests.fragment.form.educationGrant.ChildTableSelectDialog", this);
                    this.getView().addDependent(this.fragments._oChildTableSelectDialog);
                    // forward compact/cozy style into Dialog
                    this.fragments._oChildTableSelectDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
                }
                this.fragments._oChildTableSelectDialog.open();
            },


            /**
             * Event handler for the Select child search
             * Filters the binding of the ChildTableSelectDialog
             */
            onChildSearch: function (oEvent) {
                const sValue = oEvent.getParameter("value");
                const oFilter = new Filter("Favor", FilterOperator.Contains, sValue);
                const oBinding = oEvent.getSource().getBinding("items");
                oBinding.filter([oFilter]);

            },

            /**
             * Event handler for the Confirm child button
             * Sets the child for EG request
             */
            onConfirmChild: function (oEvent) {
                debugger;
                const oModel = this.getView().getModel();
                const bindingContext = this.getView().getBindingContext();
                const path = bindingContext.getPath();

                // reset the filter
                const oBinding = oEvent.getSource().getBinding("items");
                oBinding.filter([]);

                const objDetail = this.getBindingDetailObject();

                const aContexts = oEvent.getParameter("selectedContexts");
                if (aContexts && aContexts.length) {
                    const selectedChild = aContexts[0].getObject(); // Get first selected child

                    // Update the model only - the UI will update automatically
                    const sEduGrantDetailPath = path + "/ToEduGrantDetail";
                    oModel.setProperty(sEduGrantDetailPath + "/Favor", selectedChild.Favor);
                    oModel.setProperty(sEduGrantDetailPath + "/Fanam", selectedChild.Fanam);
                    oModel.setProperty(sEduGrantDetailPath + "/Fgbdt", selectedChild.Fgbdt);
                    oModel.setProperty(sEduGrantDetailPath + "/Fgbna", selectedChild.Fgbna);
                    oModel.setProperty(sEduGrantDetailPath + "/Fanat", selectedChild.Fanat);
                    oModel.setProperty(sEduGrantDetailPath + "/Objps", selectedChild.Objps);
                    oModel.setProperty(sEduGrantDetailPath + "/Famsa", selectedChild.Famsa);
                    oModel.setProperty(sEduGrantDetailPath + "/Fasex", selectedChild.Fasex);
                    oModel.setProperty(sEduGrantDetailPath + "/Egage", selectedChild.Egage);

                    //Descriptions
                    this.getView().byId("nationality").setDescription(selectedChild.FanatTxt);
                    this.getView().byId("gender").setDescription(selectedChild.FasexTxt);

                    //  MessageToast.show("You have chosen " + selectedChild.Favor);
                }
            },

            /* =========================================================== */
            /* Internal methods                                            */
            /* =========================================================== */

            _onMetadataLoaded: function () {
                // Store original busy indicator delay for the detail view
                const iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
                    oViewModel = this.getModel("detailView");

                // Make sure busy indicator is displayed immediately when
                // detail view is displayed for the first time
                oViewModel.setProperty("/delay", 0);

                // Binding the view will set it to not busy - so the view is always busy if it is not bound
                oViewModel.setProperty("/busy", true);
                // Restore original busy indicator delay for the detail view
                oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
            },

            /**
             * Call a functionImport to get dates constraints
             * @function
             * @private
             */
            _getTimeConstraints: function () {
                debugger;
                /*  //Start Date 
                 --> Not in the past
                 --> Limit Year + 4 
                 --> Only '01' or '15' of the month */
                const oModel = this.getView().getModel();

                const bindingContext = this.getView().getBindingContext();
                const path = bindingContext.getPath();
                const object = bindingContext.getModel().getProperty(path);
                let oPositionRequest = bindingContext.getObject(); //getProperty("ReqFlow"); //bindingContext.getObject()
                let startDate = oPositionRequest.StartDate;
                let createdOnDate = oPositionRequest.CreatedOn || '';
                let oUrlParam = {
                    "ReqType": oPositionRequest.ReqType,
                    "ReqFlow": oPositionRequest.ReqFlow,
                    //"StartDate": startDate,
                    "ContractType": oPositionRequest.ContractType,
                    "DurationInMonths": oPositionRequest.DurationInMonths,
                    "CreatedOn": createdOnDate

                };

                if (startDate) { oUrlParam.StartDate = startDate; }

                oModel.setProperty("/busy", true);

                oModel.callFunction("/getDateSettings", {
                    method: "GET",
                    urlParameters: oUrlParam,
                    success: function (oSuccess) {
                        oModel.setProperty("/busy", false);
                        let oDateSettings = oSuccess.getDateSettings;
                        let oDatesModel = new JSONModel(oDateSettings);
                        this.getView().setModel(oDatesModel, 'datesModel');

                        //  if (oDateSettings && oDateSettings.EndDate)
                        if (this.byId("startDate").getValue() === '')
                            oModel.setProperty("StartDate", oDateSettings.DateInitial, this.getView().getBindingContext());
                        oModel.setProperty("EndDate", oDateSettings.EndDate, this.getView().getBindingContext());

                        // oModel.refresh();
                    }.bind(this),
                    error: function (oError) {
                        oModel.setProperty("/busy", false);
                        const oFunctError = JSON.parse(oError.responseText);
                        MessageBox.error(oFunctError.error.message.value);
                    }
                });

            },

            /**
             * Binds the view to the object path. Makes sure that detail view displays
             * a busy indicator while data for the corresponding element binding is loaded.
             * @function
             * @param {string} sObjectPath path to the object to be bound to the view.
             * @private
             */
            _bindView: function (sObjectPath) {
                let that = this;
                const oView = this.getView();
                // Set busy indicator during view binding
                let oViewModel = this.getModel("detailView");

                // If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
                oViewModel.setProperty("/busy", false);
                this.getView().bindElement({
                    path: sObjectPath,
                    parameters: {
                        expand: "ToEduGrantDetail"   // <-- ToEduGrantDetail
                        // ,select: "Guid,RequestKey,ReqEducationGrantMain/LongText" // optionnel
                    },
                    events: {
                        change: this._onBindingChange.bind(this),
                        dataRequested: function () {
                            oViewModel.setProperty("/busy", true);
                        },
                        dataReceived: function () {

                            oViewModel.setProperty("/busy", false);
                            //that._getTimeConstraints();
                        }
                    }
                });
            },

            /**
             * Confirms the addition of a new claim
             * Validates the data and adds it to the ClaimItems model
             */
            _onConfirmAddClaim: function () {
                const oDialogModel = this.fragments._oAddClaimDialog.getModel("claimModel");
                const oClaimData = oDialogModel.getData();
                
                // Validation
                if (!oClaimData.ExpenseType || !oClaimData.Amount || !oClaimData.Currency) {
                    sap.m.MessageBox.error(this.getView().getModel("i18n").getResourceBundle().getText("fillRequiredFields"));
                    return;
                }
                
                // Get the current context and model
                const oContext = this.getView().getBindingContext();
                const oModel = this.getView().getModel();
                
                // Create a new claim entry
                const oNewClaim = {
                    ExpenseType: oClaimData.ExpenseType,
                    Amount: parseFloat(oClaimData.Amount),
                    Currency: oClaimData.Currency,
                    Comments: oClaimData.Comments || "",
                    // Add a temporary ID for local handling
                    TempId: Date.now().toString()
                };
                
                // Get existing claims or create empty array
                const sPath = oContext.getPath();
                const aCurrentClaims = oModel.getProperty(sPath + "/ClaimItems") || [];
                
                // Add new claim to the array
                aCurrentClaims.push(oNewClaim);
                
                // Update the model
                oModel.setProperty(sPath + "/ClaimItems", aCurrentClaims);
                
                // Show success message
                sap.m.MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("claimAdded"));
                
                // Close dialog
                this._removeClaimAddDialog();
            },

            /**
             * Removes and destroys the Add Claim dialog
             */
            _removeClaimAddDialog: function () {
                if (this.fragments._oAddClaimDialog) {
                    this.fragments._oAddClaimDialog.close();
                    this.fragments._oAddClaimDialog.destroy();
                    this.fragments._oAddClaimDialog = null;
                }
            },

            /**
             * Event handler for the Add Advance button
             * Opens the AdvanceAdd dialog for new advance entry
             */
            onAddAdvanceButtonPress: function () {
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
                if (!this.fragments._oAddAdvanceDialog) {
                    this.fragments._oAddAdvanceDialog = new sap.m.Dialog({
                        id: "advanceAddDialog",
                        title: oView.getModel("i18n").getResourceBundle().getText("addAdvance"),
                        content: sap.ui.xmlfragment("com.un.zhrbenefrequests.fragment.form.educationGrant.AdvanceAdd", this),
                        beginButton: new sap.m.Button({
                            text: oView.getModel("i18n").getResourceBundle().getText("cancel"),
                            press: function () {
                                that._removeAdvanceAddDialog();
                            }
                        }),
                        endButton: new sap.m.Button({
                            text: oView.getModel("i18n").getResourceBundle().getText("submit"),
                            press: function () {
                                that._onConfirmAddAdvance();
                            }
                        })
                    });
                    this.fragments._oAddAdvanceDialog.setModel(oView.getModel("i18n"), "i18n");
                    this.fragments._oAddAdvanceDialog.setModel(oDialogModel, "advanceModel");
                }
                // Set the context/model to the dialog
                this.fragments._oAddAdvanceDialog.setModel(oDialogModel, "advanceModel");
                oView.addDependent(this.fragments._oAddAdvanceDialog);
                this.fragments._oAddAdvanceDialog.open();
            },

            /**
             * Confirms the addition of a new advance
             * Validates the data and adds it to the AdvanceItems model
             */
            _onConfirmAddAdvance: function () {
                const oDialogModel = this.fragments._oAddAdvanceDialog.getModel("advanceModel");
                const oAdvanceData = oDialogModel.getData();
                
                // Validation
                if (!oAdvanceData.ExpenseType || !oAdvanceData.Amount || !oAdvanceData.Currency) {
                    sap.m.MessageBox.error(this.getView().getModel("i18n").getResourceBundle().getText("fillRequiredFields"));
                    return;
                }
                
                // Get the current context and model
                const oContext = this.getView().getBindingContext();
                const oModel = this.getView().getModel();
                
                // Create a new advance entry
                const oNewAdvance = {
                    ExpenseType: oAdvanceData.ExpenseType,
                    Amount: parseFloat(oAdvanceData.Amount),
                    Currency: oAdvanceData.Currency,
                    Comments: oAdvanceData.Comments || "",
                    // Add a temporary ID for local handling
                    TempId: Date.now().toString()
                };
                
                // Get existing advances or create empty array
                const sPath = oContext.getPath();
                const aCurrentAdvances = oModel.getProperty(sPath + "/AdvanceItems") || [];
                
                // Add new advance to the array
                aCurrentAdvances.push(oNewAdvance);
                
                // Update the model
                oModel.setProperty(sPath + "/AdvanceItems", aCurrentAdvances);
                
                // Show success message
                sap.m.MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("advanceAdded"));
                
                // Close dialog
                this._removeAdvanceAddDialog();
            },

            /**
             * Removes and destroys the Add Advance dialog
             */
            _removeAdvanceAddDialog: function () {
                if (this.fragments._oAddAdvanceDialog) {
                    this.fragments._oAddAdvanceDialog.close();
                    this.fragments._oAddAdvanceDialog.destroy();
                    this.fragments._oAddAdvanceDialog = null;
                }
            },

            /**
             * Event handler for deleting an advance
             */
            onDeleteAdvanceButtonPress: function (oEvent) {
                const oContext = oEvent.getParameter("listItem").getBindingContext();
                const sPath = oContext.getPath();
                const oModel = this.getView().getModel();
                
                // Get the advance item to delete
                const oAdvanceToDelete = oModel.getProperty(sPath);
                
                // Get the parent path (request)
                const sRequestPath = sPath.substring(0, sPath.lastIndexOf("/AdvanceItems"));
                const aCurrentAdvances = oModel.getProperty(sRequestPath + "/AdvanceItems") || [];
                
                // Find and remove the advance
                const iIndex = aCurrentAdvances.findIndex(advance => 
                    advance.TempId === oAdvanceToDelete.TempId || 
                    (advance.ExpenseType === oAdvanceToDelete.ExpenseType && 
                     advance.Amount === oAdvanceToDelete.Amount && 
                     advance.Currency === oAdvanceToDelete.Currency)
                );
                
                if (iIndex > -1) {
                    aCurrentAdvances.splice(iIndex, 1);
                    oModel.setProperty(sRequestPath + "/AdvanceItems", aCurrentAdvances);
                    sap.m.MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("advanceDeleted"));
                }
            }

        });
    });