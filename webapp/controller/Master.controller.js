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
    "sap/ui/Device",
],
    function (BaseController, JSONModel, formatter, Device) {
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
                    positionRequestId: oItem.getBindingContext().getProperty("Guid")
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
                /*           if (this.getOwnerComponent().getComponentData() && this.getOwnerComponent().getComponentData().startupParameters) {
          
                              //TODO check why not working in FLP mode and why undefined in noFlp
                              const startupParams = this.getOwnerComponent().getComponentData().startupParameters; // get Startup params from Owner Component
                              if ((startupParams.objectId && startupParams.objectId[0])) {
          
                                  this._oList.removeAllItems();
                                  this.getRouter().navTo("object", {
                                      objectId: startupParams.objectId[0]  // read Supplier ID. Every parameter is placed in an array therefore [0] holds the value
                                  }, true);
                              }
          
                          }
                          else { */
                this.getOwnerComponent().oListSelector.oWhenListLoadingIsDone.then(

                    function (mParams) {
                        console.log('done');
                        if (mParams.list.getMode() === "None") {
                            return;
                        }

                        let sObjectId = mParams.firstListitem.getBindingContext().getProperty("Guid");
                        console.log({ sObjectId });
                        this.getRouter().navTo("RouteDetail", {
                            positionRequestId: sObjectId
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








        });
    });