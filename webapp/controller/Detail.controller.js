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

                    /*******************************************************************************/
                    //Initial controls of Dates, retro etc...
                    /*******************************************************************************/
                    //this._getTimeConstraints();


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

                /*   oViewModel.setProperty("/saveAsTileTitle", oResourceBundle.getText("shareSaveTileAppTitle", [sObjectName]));
                  oViewModel.setProperty("/shareOnJamTitle", sObjectName);
                  oViewModel.setProperty("/shareSendEmailSubject",
                      oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
                  oViewModel.setProperty("/shareSendEmailMessage",
                      oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
   */
                // this._filterPersonnelSubareaValues();

                // this._getTimeConstraints();
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


            selectChildPress: function () { 

             if (!this.fragments._oChildTableSelectDialog) {
                    this.fragments._oChildTableSelectDialog = sap.ui.xmlfragment("com.un.zhrbenefrequests.fragment.form.educationGrant.ChildTableSelectDialog", this);
                    this.getView().addDependent(this.fragments._oChildTableSelectDialog);
                    // forward compact/cozy style into Dialog
                    this.fragments._oChildTableSelectDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
                }
                this.fragments._oChildTableSelectDialog.open();

                
            },
                      
                    

            /*        _removeClaimAddDialog: function () {
                       if (this.fragments._oAddClaimDialog) {
                           this.fragments._oAddClaimDialog.destroy();
                           this.fragments._oAddClaimDialog = null;
                       }
                   } */

            /* =========================================================== */
            /* Internal methods                                     */
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
            }

        });
    });