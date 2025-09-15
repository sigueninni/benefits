/**    **********************************************************************-->
<!--* Projet           :  UNI			          							*-->
<!--* Module           :  Benefits Request			             		    *-->
<!--* Auteur           :  Saad Igueninni                            		*-->
<!--* Societe      	   :  KYWAN                                          	*-->
<!--* Date de creation :  08/07/2025                                                   }

                        // OK → retrieve the created entry
                        const change = batch.__changeResponses && batch.__changeResponses[0];                 }

                        // OK → retrieve the created entry
                        const change = batch.__changeResponses && batch.__changeResponses[0];           if (err) {
                            this._showODataError(); // always generic
                            return;
                        }

                        // OK → retrieve the created entry
                        const change = batch.__changeResponses && batch.__changeResponses[0];               }

                        // OK → retrieve the created entry
                        const change = batch.__changeResponses && batch.__changeResponses[0];
                        if (!change || !change.data) {
                            this._showODataError(); // security                    // OK → retrieve the created entry                  }

                        // OK → retrieve the created entry
                        const change = batch.__changeResponses && batch.__changeResponses[0];                      // OK → retrieve the created entry                       // OK → retrieve the created entry                  		    *-->
<!--* Version	       :  Initial											*-->
<!--* Description  	   :  Master(Dashboard) Controller for Benefits         *-->
<!--*                     Request App                                       *-->
<!--*********************************************************************   ***/

sap.ui.define([
    "com/un/zhrbenefrequests/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "com/un/zhrbenefrequests/model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/Device",
    "sap/m/MessageToast"
],
    function (BaseController, JSONModel, formatter, Filter, FilterOperator, Device, MessageToast) {
        "use strict";

        return BaseController.extend("com.un.zhrbenefrequests.controller.Master", {

            formatter: formatter,

            /* =========================================================== */
            /* lifecycle methods                                           */
            /* =========================================================== */
            onInit: function () {

                let oList = this.byId("list"),
                    oViewModel = this._createViewModel(),
                    iOriginalBusyDelay = oList.getBusyIndicatorDelay();

                //TODO : add the groupSortState    
                // this._oGroupSortState = new GroupSortState(oViewModel, grouper.groupUnitNumber(this.getResourceBundle()));

                this._oList = oList;
                this.setModel(oViewModel, "masterView");
                // Make sure, busy indication is showing immediately so there is no
                // break after the busy indication for loading the view's meta data is
                // ended (see promise 'oWhenMetadataIsLoaded' in AppController)
                oList.attachEventOnce("updateFinished", function () {
                    // Restore original busy indicator delay for the list
                    oViewModel.setProperty("/delay", iOriginalBusyDelay);
                });

                this.getView().addEventDelegate({
                    onBeforeFirstShow: function () {
                        this.getOwnerComponent().oListSelector.setBoundMasterList(oList);
                    }.bind(this)
                });
                this.getRouter().getRoute("RouteMaster").attachPatternMatched(this._onMasterMatched, this);
                this.getRouter().attachBypassed(this.onBypassed, this);



            },

            /* =========================================================== */
            /* event handlers                                              */
            /* =========================================================== */

            /**
            * Event handler for the bypassed event, which is fired when no routing pattern matched.
            * If there was an object selected in the master list, that selection is removed.
            * @public
            */
            onBypassed: function () {
                this._oList.removeSelections(true);
            },
            /**
             * Event handler for the list selection event
             * @param {sap.ui.base.Event} oEvent the list selectionChange event
             * @public
             */
            onSelectionChange: function (oEvent) {
                // get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
                this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
            },
            /**
             * Event handler for the select event TypeFlowChoice.fragment
             * @param {sap.ui.base.Event} oEvent the select event
             * @public
             */
            onReqTypChange: function (oEvent) {
                debugger;
                const oSelectedItem = oEvent.getParameter("selectedItem");
                const sSelectedKey = oSelectedItem.getKey();

                // Update the type model to control visibility
                const oTypeModel = this.fragments._oTypeReqDialog.getModel("typeModel");
                oTypeModel.setProperty("/RequestType", sSelectedKey);

                console.log("Request Type changed to:", sSelectedKey);
            },

            /**
             * Event handler for the RadioButtonGroup select event
             * @param {sap.ui.base.Event} oEvent the select event
             * @public
             */
            onClaimAdvanceChange: function (oEvent) {
                const oSelectedButton = oEvent.getParameter("selectedButton");
                const sButtonId = oSelectedButton.getId();
                const oTypeModel = this.fragments._oTypeReqDialog.getModel("typeModel");

                if (sButtonId.includes("isClaim")) {
                    oTypeModel.setProperty("/Isclaim", true);
                    oTypeModel.setProperty("/Isadvance", false);
                } else if (sButtonId.includes("isAdvance")) {
                    oTypeModel.setProperty("/Isclaim", false);
                    oTypeModel.setProperty("/Isadvance", true);
                }
            },

            /**
            * Event handler for the select eventonSearch
            * @param {sap.ui.base.Event} oEvent the select event
            * @public
            */
            onSearch: function (oEvent) {

                // add filter for search
                debugger;
                let aFilters = [];
                const sQuery = oEvent.getSource().getValue();
                if (sQuery && sQuery.length > 0) {
                    const aOrFilters = [
                        // new Filter("Begda", FilterOperator.Contains, sQuery),
                        new Filter("RequestKey", FilterOperator.Contains, sQuery),
                        new Filter("Info1", FilterOperator.Contains, sQuery),
                        new Filter("Info2", FilterOperator.Contains, sQuery),
                        new Filter("Info3", FilterOperator.Contains, sQuery)
                    ];
                    aFilters.push(new Filter({
                        filters: aOrFilters,
                        and: false // This creates OR logic
                    }));
                }

                // update list binding
                const oList = this.byId("list");
                const oBinding = oList.getBinding("items");
                oBinding.filter(aFilters);
            },



            /**
       * Event handler for the Select child button
       * Opens the ChildTableSelectDialog for selecting a child
       */
            _openChildDialog: function () {

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

                //    const path = bindingContext.getPath();

                // reset the filter
                const oBinding = oEvent.getSource().getBinding("items");
                oBinding.filter([]);


                const aContexts = oEvent.getParameter("selectedContexts");
                if (aContexts && aContexts.length) {
                    const selectedChild = aContexts[0].getObject(); // Get first selected child

                    // Update the model only - the UI will update automatically
                    /*               const sEduGrantDetailPath = path + "/ToEduGrantDetail";
                                  oModel.setProperty(sEduGrantDetailPath + "/Favor", selectedChild.Favor);
                                  oModel.setProperty(sEduGrantDetailPath + "/Fanam", selectedChild.Fanam);
                                  oModel.setProperty(sEduGrantDetailPath + "/Fgbdt", selectedChild.Fgbdt);
                                  oModel.setProperty(sEduGrantDetailPath + "/Fgbna", selectedChild.Fgbna);
                                  oModel.setProperty(sEduGrantDetailPath + "/Fanat", selectedChild.Fanat);
                                  oModel.setProperty(sEduGrantDetailPath + "/Objps", selectedChild.Objps); */
                    oModel.setProperty(+ "/Subty", selectedChild.Famsa);
                    oModel.setProperty(+ "/Objps", selectedChild.Famsa);
                    /*                    oModel.setProperty(sEduGrantDetailPath + "/Famsa", selectedChild.Famsa);
                                       oModel.setProperty(sEduGrantDetailPath + "/Fasex", selectedChild.Fasex);
                                       oModel.setProperty(sEduGrantDetailPath + "/Egage", selectedChild.Egage);
                   
                                       //Descriptions
                                       this.getView().byId("FANAT").setDescription(selectedChild.FanatTxt);
                                       this.getView().byId("FASEX").setDescription(selectedChild.FasexTxt); */

                    //  MessageToast.show("You have chosen " + selectedChild.Favor);

                    this._createRequest(selectedChild.Famsa, selectedChild.Objps);
                }
            },





            /* =========================================================== */
            /*  internal methods                                     */
            /* =========================================================== */

            _createViewModel: function () {
                return new JSONModel({
                    isFilterBarVisible: false,
                    filterBarLabel: "",
                    delay: 0,
                    title: this.getResourceBundle().getText("masterTitleCount", [0]),
                    noDataText: this.getResourceBundle().getText("masterListNoDataText"),
                    sortBy: "Title",
                    groupBy: "None"
                });
            },

            /**
             * Shows the selected item on the detail page
             * On phones a additional history entry is created
             * @param {sap.m.ObjectListItem} oItem selected Item
             * @private
             */
            _showDetail: function (oItem) {
                const bReplace = !Device.system.phone;
                this.getRouter().navTo("RouteDetail", {
                    benefitRequestId: oItem.getBindingContext().getProperty("Guid")
                }, bReplace);


            },

            /**
             * If the master route was hit (empty hash) we have to set
             * the hash to to the first item in the list as soon as the
             * listLoading is done and the first item in the list is known
             * @private
             */
            _onMasterMatched: function () {
                // debugger;
                this.getOwnerComponent().oListSelector.oWhenListLoadingIsDone.then(

                    function (mParams) {
                        console.log('done');
                        if (mParams.list.getMode() === "None") {
                            return;
                        }

                        let sObjectId = mParams.firstListitem.getBindingContext().getProperty("Guid");
                        console.log({ sObjectId });
                        this.getRouter().navTo("RouteDetail", {
                            benefitRequestId: sObjectId
                        }, true);
                    }.bind(this),
                    function (mParams) {
                        if (mParams.error) {
                            console.log(mParams.error)
                            return;
                        }
                        this.getRouter().getTargets().display("detailNoObjectsAvailable");
                    }.bind(this)
                );
                //  }
            },

            onCreateButtonPress: function () {

                // Open the TypeReq fragment dialog
                if (!this.fragments._oTypeReqDialog) {
                    this.fragments._oTypeReqDialog = sap.ui.xmlfragment("com.un.zhrbenefrequests.fragment.TypeReq", this);
                    this.getView().addDependent(this.fragments._oTypeReqDialog);
                    // forward compact/cozy style into Dialog
                    this.fragments._oTypeReqDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
                }

                // Create and set the type model for visibility binding with default value
                const oTypeModel = new JSONModel({
                    RequestType: "01", // Set default value to "01"
                    Isclaim: true,     // Default to claim
                    Isadvance: false,  // Default to not advance
                    Begda: null,       // Start date
                    Endda: null,       // End date
                    startDateValueState: "None",     // Validation state for start date
                    endDateValueState: "None",       // Validation state for end date
                    startDateValueStateText: "",     // Validation message for start date
                    endDateValueStateText: ""        // Validation message for end date
                });
                this.fragments._oTypeReqDialog.setModel(oTypeModel, "typeModel");
                this.fragments._oTypeReqDialog.open();

            },

            onConfirmTypeReqButtonPress: function (oEvent) {

                // Validation of mandatory dates

                const aFieldsToValidate = ['begda', 'endda', 'requestType'];
                const errorValidation = this.isAFieldEmpty(aFieldsToValidate);

                debugger;
                // If validation failed, stop execution
                if (errorValidation) {
                    return;
                }

                //Check begda le endda
                //TODO - check begda lt endda and retro 

                // if Education Grant , open Child dialog Choice otherwise create request directly
                const oTypeModel = this.fragments._oTypeReqDialog.getModel("typeModel");
                let ReqType = oTypeModel.getProperty("/RequestType");
                if (ReqType === "01") { // If Education Grant
                    this._openChildDialog();
                } else {
                    this._createRequest('', '');
                }

            },


            _createRequest: function (_famsa, _objps) {
                // Read type/flow info
                const oTypeModel = this.fragments._oTypeReqDialog.getModel("typeModel");
                let ReqType = oTypeModel.getProperty("/RequestType");
                let Isclaim = oTypeModel.getProperty("/Isclaim");
                let Isadvance = oTypeModel.getProperty("/Isadvance");
                let Begda = oTypeModel.getProperty("/Begda");
                let Endda = oTypeModel.getProperty("/Endda");

                // Group & models
                const sGroupId = "benefitRequest" + (new Date().getUTCMilliseconds());
                const oRouter = this.getRouter();
                const oModel = this.getView().getModel();

                // Defer the group
                let aDeferredGroups = oModel.getDeferredGroups() || [];
                if (!aDeferredGroups.includes(sGroupId)) {
                    aDeferredGroups = aDeferredGroups.concat([sGroupId]);
                    oModel.setDeferredGroups(aDeferredGroups);
                }

                // Normalize dates if strings
                if (Begda && typeof Begda === "string") Begda = new Date(Begda);
                if (Endda && typeof Endda === "string") Endda = new Date(Endda);

                // Busy ON
                const oViewModel = this.getModel("masterView");
                oViewModel?.setProperty("/busy", true);

                // Create entry
                oModel.createEntry("/RequestHeaderSet", {
                    groupId: sGroupId,
                    properties: {
                        "Seqnr": "001",
                        "RequestStatus": this.getRequestStatus().DRAFT,
                        "RequestType": ReqType,
                        "Isclaim": Isclaim,
                        "Isadvance": Isadvance,
                        "Begda": Begda,
                        "Endda": Endda,
                        "RequestDesc": this.getResourceBundle().getText("newBenefitRequestTitle"),
                        "Subty": _famsa ? _famsa : "",
                        "Objps": _objps ? _objps : ""
                    }
                });

                // Submit
                oModel.submitChanges({
                    groupId: sGroupId,

                    success: function (oSuccess) {
                        oViewModel?.setProperty("/busy", false);

                        const batch = oSuccess?.__batchResponses?.[0];
                        if (!batch) {
                            this._showODataError(); // always MSG_SERVICE_ERROR
                            return;
                        }

                        // detect an error encapsulated in the batch 200
                        const err = this._parseODataErrorFromBatch ? this._parseODataErrorFromBatch(batch) : null;
                        if (err) {
                            this._showODataError(); // always generic
                            return;
                        }

                        // OK → récupérer l’entry créée
                        const change = batch.__changeResponses && batch.__changeResponses[0];
                        if (!change || !change.data) {
                            this._showODataError(); // security
                            return;
                        }

                        const oNewEntry = change.data;
                        oRouter.navTo("RouteDetail", { benefitRequestId: oNewEntry.Guid }, true);

                        // Auto-open child dialog for Education Grant
                        if (ReqType === "01") {
                            setTimeout(() => {
                                const oDetailView = sap.ui.getCore().byId("__component0---detail");
                                oDetailView?.getController()?.selectChildPress?.();
                            }, 1000);
                        }

                        // Cleanup type dialog
                        this.fragments._oTypeReqDialog?.close();
                        this.fragments._oTypeReqDialog?.destroy();
                        delete this.fragments._oTypeReqDialog;
                    }.bind(this),

                    error: function (/*oError*/) {
                        oViewModel?.setProperty("/busy", false);
                        this._showODataError(); // toujours MSG_SERVICE_ERROR
                    }.bind(this)
                });
            }



        });
    });