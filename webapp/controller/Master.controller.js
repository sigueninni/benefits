/**    **********************************************************************-->
<!--* Projet           :  UNI			          							*-->
<!--* Module           :  Benefits Request			             		    *-->
<!--* Auteur           :  Saad Igueninni                            		*-->
<!--* Societe      	   :  KYWAN                                          	*-->
<!--* Date de creation :  08/07/2025                                                   }
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
    "sap/m/MessageToast",
    "sap/m/ViewSettingsDialog",
    "sap/m/ViewSettingsItem",
    "sap/ui/model/Sorter"
],
    function (BaseController, JSONModel, formatter, Filter, FilterOperator, Device, MessageToast, ViewSettingsDialog, ViewSettingsItem, Sorter) {
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
            const oSelectedItem = oEvent.getParameter("selectedItem");
            const sSelectedKey = oSelectedItem.getKey();

            // Update the type model to control visibility
            const oTypeModel = this.fragments._oTypeReqDialog.getModel("typeModel");
            oTypeModel.setProperty("/RequestType", sSelectedKey);

            // Reset Isclaim and Isadvance based on request type
            if (sSelectedKey === "02") { // Rental Subsidy
                oTypeModel.setProperty("/Isclaim", false);
                oTypeModel.setProperty("/Isadvance", false);
            } else if (sSelectedKey === "01") { // Education Grant
                oTypeModel.setProperty("/Isclaim", false);
                oTypeModel.setProperty("/Isadvance", true); // Default to Advance for EG
            }

            console.log("Request Type changed to:", sSelectedKey);
        },            /**
             * Event handler for the RadioButtonGroup select event
             * @param {sap.ui.base.Event} oEvent the select event
             * @public
             */
            onClaimAdvanceChange: function (oEvent) {
                const oSelectedButton = oEvent.getParameter("selectedButton");
                
                // Check if selectedButton exists to avoid errors
                if (!oSelectedButton) {
                    console.warn("No selected button found in onClaimAdvanceChange event");
                    return;
                }
                
                const sButtonId = oSelectedButton.getId();
                const oTypeModel = this.fragments._oTypeReqDialog.getModel("typeModel");

                // More robust way: check the button's text or use index
                const sButtonText = oSelectedButton.getText();
                
                if (sButtonId.includes("isClaim") || sButtonText === this.getText("isClaim")) {
                    oTypeModel.setProperty("/Isclaim", true);
                    oTypeModel.setProperty("/Isadvance", false);
                } else if (sButtonId.includes("isAdvance") || sButtonText === this.getText("isAdvance")) {
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
                let aFilters = [];
                const sQuery = oEvent.getSource().getValue();
                if (sQuery && sQuery.length > 0) {
                    const aOrFilters = [
                        // Note: Date fields (Begda, Endda) don't support Contains operator
                        // new Filter("Begda", FilterOperator.Contains, sQuery),
                        // new Filter("Endda", FilterOperator.Contains, sQuery),
                        new Filter("RequestKey", FilterOperator.Contains, sQuery),
                        new Filter("RequestStatusTxt", FilterOperator.Contains, sQuery),
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
             * Event handler for the list updateFinished event
             * Updates the counter in the master view when list changes
             * @param {sap.ui.base.Event} oEvent the updateFinished event
             * @public
             */
            onUpdateFinished: function (oEvent) {
                // Update the counter in the master view title
                const oList = oEvent.getSource();
                const iTotalItems = oEvent.getParameter("total");
                const oViewModel = this.getModel("masterView");
                
                if (oViewModel) {
                    const sTitle = this.getText("masterTitleCount", [iTotalItems]);
                    oViewModel.setProperty("/title", sTitle);
                }
                
                // Update the list selector
                this.getOwnerComponent().oListSelector.oWhenListLoadingIsDone.then(
                    function () {
                        // Selection handling after update finished
                    }.bind(this)
                );
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
                    title: this.getText("masterTitleCount", [0]),
                    noDataText: this.getText("masterListNoDataText"),
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
                const oContext = oItem.getBindingContext();
                this.getRouter().navTo("RouteDetail", {
                    benefitRequestId: oContext.getProperty("Guid"),
                    requestType: oContext.getProperty("RequestType")
                }, bReplace);


            },

            /**
             * If the master route was hit (empty hash) we have to set
             * the hash to to the first item in the list as soon as the
             * listLoading is done and the first item in the list is known
             * @private
             */
            _onMasterMatched: function () {
                // Refresh the master list when navigating to master view
                const oList = this.byId("list");
                if (oList && oList.getBinding("items")) {
                    oList.getBinding("items").refresh();
                }
                
                this.getOwnerComponent().oListSelector.oWhenListLoadingIsDone.then(

                    function (mParams) {
                        console.log('done');
                        if (mParams.list.getMode() === "None") {
                            return;
                        }

                        const oContext = mParams.firstListitem.getBindingContext();
                        let sObjectId = oContext.getProperty("Guid");
                        let sRequestType = oContext.getProperty("RequestType");
                        console.log({ sObjectId });
                        this.getRouter().navTo("RouteDetail", {
                            benefitRequestId: sObjectId,
                            requestType: sRequestType
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
                    Isclaim: false,     // Default to claim
                    Isadvance: true,  // Default to not advance
                    Begda: null,       // Start date
                    Endda: null,       // End date
                    Comments: "",      // Comments field
                    AttachedRequestGuid: "", // GUID of attached request for claims
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
                let Comments = oTypeModel.getProperty("/Comments");
                let AttachedRequestGuid = oTypeModel.getProperty("/AttachedRequestGuid");

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
                        "RequestDesc": this.getText("newBenefitRequestTitle"),
                        "Subty": _famsa ? _famsa : "",
                        "Objps": _objps ? _objps : "",
                        "Note": Comments || ""
                        // AttachedRequestGuid not sent to backend for now - frontend only
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
                        
                        // Refresh the master list to include the newly created request
                        const oList = this.byId("list");
                        if (oList && oList.getBinding("items")) {
                            oList.getBinding("items").refresh();
                        }
                        
                        // Navigate to the new request
                        oRouter.navTo("RouteDetail", { 
                            benefitRequestId: oNewEntry.Guid,
                            requestType: oNewEntry.RequestType
                        }, true);
                        
                        // Select the new item in the master list after a short delay
                        setTimeout(function() {
                            const sNewItemPath = oModel.createKey("/RequestHeaderSet", {
                                Guid: oNewEntry.Guid
                            });
                            this.getOwnerComponent().oListSelector.selectAListItem(sNewItemPath);
                        }.bind(this), 300);

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
            },

            /* =========================================================== */
            /* Sort and Filter methods                                     */
            /* =========================================================== */

            /**
             * Event handler for sort button
             * @public
             */
            onSort: function () {
                this._showViewSettingsDialog("sort");
            },

            /**
             * Event handler for group button
             * @public
             */
            onGroup: function () {
                this._showViewSettingsDialog("group");
            },

            /**
             * Shows the ViewSettingsDialog
             * @param {string} sDialogMode - The mode of the dialog (sort, group)
             * @private
             */
            _showViewSettingsDialog: function (sDialogMode) {
                if (!this._oViewSettingsDialog) {
                    this._oViewSettingsDialog = new ViewSettingsDialog({
                        confirm: this._onViewSettingsConfirm.bind(this),
                        sortItems: [
                            new ViewSettingsItem({
                                text: "{i18n>requestKey}",
                                key: "RequestKey"
                            }),
                            new ViewSettingsItem({
                                text: "{i18n>createdOn}",
                                key: "Begda",
                                selected: true
                            }),
                            new ViewSettingsItem({
                                text: "{i18n>status}",
                                key: "RequestStatusTxt"
                            })
                        ],
                        sortDescending: true,
                        groupItems: [
                            new ViewSettingsItem({
                                text: "{i18n>status}",
                                key: "RequestStatusTxt"
                            }),
                            new ViewSettingsItem({
                                text: "{i18n>requestType}",
                                key: "RequestTypeTxt"
                            })
                        ]
                    });
                    this.getView().addDependent(this._oViewSettingsDialog);
                }

                // Set the dialog mode
                if (sDialogMode === "sort") {
                    this._oViewSettingsDialog.open("sort");
                } else if (sDialogMode === "group") {
                    this._oViewSettingsDialog.open("group");
                }
            },

            /**
             * Event handler for ViewSettingsDialog confirm
             * @param {sap.ui.base.Event} oEvent the confirm event
             * @private
             */
            _onViewSettingsConfirm: function (oEvent) {
                const oParams = oEvent.getParameters();
                const oBinding = this._oList.getBinding("items");
                let aSorters = [];
                let aGroupers = [];

                // Apply sorting
                if (oParams.sortItem) {
                    const sSortPath = oParams.sortItem.getKey();
                    const bDescending = oParams.sortDescending;
                    aSorters.push(new Sorter(sSortPath, bDescending));
                }

                // Apply grouping
                if (oParams.groupItem) {
                    const sGroupPath = oParams.groupItem.getKey();
                    const bDescending = oParams.groupDescending;
                    aGroupers.push(new Sorter(sGroupPath, bDescending, true));
                    
                    // Si pas de tri explicite, ajouter un tri par défaut dans les groupes
                    if (!oParams.sortItem) {
                        aSorters.push(new Sorter("CreationDate", true)); // Tri par CreationDate descendant
                    }
                }

                // Apply sorters and groupers to binding
                oBinding.sort(aGroupers.concat(aSorters));
            }



        });
    });