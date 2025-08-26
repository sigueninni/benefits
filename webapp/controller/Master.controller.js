/**    **********************************************************************-->
<!--* Projet           :  UNI			          							*-->
<!--* Module           :  Benefits Request			             		    *-->
<!--* Auteur           :  Saad Igueninni                            		*-->
<!--* Societe      	   :  KYWAN                                          	*-->
<!--* Date de creation :  08/07/2025                               		    *-->
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
],
    function (BaseController, JSONModel, formatter, Filter, FilterOperator, Device) {
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

                //TODO : ajouter le groupSortState    
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
                console.log(oEvent.getParameter("selectedItem"));
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

                if (!this.fragments._oTypeReqDialog) {
                    this.fragments._oTypeReqDialog = sap.ui.xmlfragment("com.un.zhrbenefrequests.fragment.TypeReq", this);
                    this.getView().addDependent(this.fragments._oTypeReqDialog);
                    // forward compact/cozy style into Dialog
                    this.fragments._oTypeReqDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
                }
                this.fragments._oTypeReqDialog.open();


                /*         if (!this._oTypeReqDialog) {
                            this._oTypeReqDialog = sap.ui.xmlfragment(
                                "com.un.zhrbenefrequests.fragment.TypeReq",
                                this
                            );
                            this.getView().addDependent(this._oTypeReqDialog);
                        }
                        this._oTypeReqDialog.open(); */
            },

            onConfirmTypeReqButtonPress: function (oEvent) {

                const sGroupId = "benefitRequest" + (new Date().getUTCMilliseconds());
                const oRouter = this.getRouter();
                const oModel = this.getView().getModel();
                let aDeferredGroups = oModel.getDeferredGroups();
                // set this subset to deferred
                aDeferredGroups = aDeferredGroups.concat([sGroupId]);
                oModel.setDeferredGroups(aDeferredGroups);


                //Get type Flow
                debugger;
                //  let reqFlow = sap.ui.getCore().byId("requestType").getSelectedButton().getId();

                // set busy indicator during view binding
                let oViewModel = this.getModel("masterView");
                oViewModel.setProperty("/busy", true);
                //sap.ui.core.BusyIndicator.show();

                // create a new entry in model
                oModel.createEntry("/RequestHeaderSet", {
                    groupId: sGroupId,
                    properties: {
                        "Seqnr": "001",
                        "RequestStatus": "00",
                        "RequestType": "01",
                        "RequestDesc": this.getResourceBundle().getText("newBenefitRequestTitle")
                    }
                });

                // initialize the request in backend and then navigate to object page for binding
                oModel.submitChanges({
                    groupId: sGroupId,
                    success: function (oSuccess) {
                        let oResponse = oSuccess.__batchResponses[0];
                        if (oResponse.__changeResponses) {
                            let oNewEntry = oResponse.__changeResponses[0].data;
                            oViewModel.setProperty("/busy", false);
                            oRouter.navTo("RouteDetail", {
                                benefitRequestId: oNewEntry.Guid
                            }, true);
                            // setTimeout(function() { 
                            // 	oViewModel.setProperty("/busy", false);
                            // 	//sap.ui.core.BusyIndicator.hide();
                            // 	oRouter.navTo("object", {
                            // 		"objectId": oNewEntry.Id //object key
                            // 	});
                            // }, 1500);
                        } else {
                            oViewModel.setProperty("/busy", false);
                            //sap.ui.core.BusyIndicator.hide();
                        }

                        this.fragments._oTypeReqDialog.close();
                        this.fragments._oTypeReqDialog.destroy();
                        delete this.fragments._oTypeReqDialog;

                    }.bind(this)
                });
            },


        });
    });