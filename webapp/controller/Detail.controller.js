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
], function (BaseController, JSONModel, formatter, formatMessage, ValueState, FlattenedDataset, FeedItem, MessageBox, MessageToast, Filter, FilterOperator) {
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
            debugger;
            const oView = this.getView();
            const oModel = oView.getModel();
            const sObjectId = oEvent.getParameter("arguments").benefitRequestId;

            this.getModel().metadataLoaded().then(function () {
                // first reset all changes if any
                if (oModel.hasPendingChanges()) {
                    oModel.resetChanges();
                }

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

        /*********************  Claim  *********************/

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

        /*********************  Advance  *********************/
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
                this.fragments._oAdvanceDialog.setModel(oView.getModel("i18n"), "i18n");
                this.fragments._oAdvanceDialog.setModel(oDialogModel, "advanceModel");
            }
            // Set the context/model to the dialog
            this.fragments._oAdvanceDialog.setModel(oDialogModel, "advanceModel");
            oView.addDependent(this.fragments._oAdvanceDialog);
            this.fragments._oAdvanceDialog.open();
        },

        /**
         * Confirms the addition of a new advance
         * Validates the data and adds it to the AdvanceItems model
         */
        _onConfirmAddAdvance: function () {
            const oDialogModel = this.fragments._oAdvanceDialog.getModel("advanceModel");
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
        },

        /*************************************************************************************************/
        /********************************  Begin of School Management ***************************************/
        /*************************************************************************************************/

        /**
         * Event handler for the ValueHelpPress event
         * @param {sap.ui.base.Event} oEvent for OrgUnit
         * @public
         */
        onSchoolCountryValueHelpPress: function (oEvent) {
            debugger;
            const oView = this.getView();
            if (!this.fragments._oSchoolCountryDialog) {
                this.fragments._oSchoolCountryDialog = sap.ui.xmlfragment("com.un.zhrbenefrequests.fragment.form.educationGrant.SchoolCountryChoice", this);
                this.getView().addDependent(this.fragments._oSchoolCountryDialog);
                // forward compact/cozy style into Dialog
                this.fragments._oSchoolCountryDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
            }

            this.fragments._oSchoolCountryDialog.open();
        },

        onSearchSchoolCountrySelectDialog: function (oEvent) {
            debugger;
            const sValue = oEvent.getParameter("value").toString();
            if (sValue !== "") {
                let oFilter = new Filter("Txt", sap.ui.model.FilterOperator.Contains, sValue);
                let oBinding = oEvent.getSource().getBinding("items");
                oBinding.filter([oFilter]);
            } else {
                // clear filters
                oEvent.getSource().getBinding("items").filter([]);
            }
        },

        onConfirmSchoolCountrySelectDialogPress: function (oEvent) {
            debugger;
            const oView = this.getView();
            const aContexts = oEvent.getParameter("selectedContexts");
            // get back the selected entry data
            if (aContexts && aContexts.length) {
                let sSchoolCountryName = aContexts.map(function (oContext) {
                    return oContext.getObject().Txt;
                }).join(", ");
                let sSchoolCountryId = aContexts.map(function (oContext) {
                    return oContext.getObject().Id;
                }).join(", ");
                // now set the returned values back into the view
                oView.byId("EGSCT").setDescription(sSchoolCountryName);
                oView.byId("EGSCT").setValue(sSchoolCountryId);
            }
            // clear filters
            oEvent.getSource().getBinding("items").filter([]);
            // destroy the dialog
            if (this.fragments._oSchoolCountryDialog) {
                this.fragments._oSchoolCountryDialog.destroy();
                delete this.fragments._oSchoolCountryDialog;
            }
        },

        /**
         * Event handler for school selection change in education grant form
         * @param {sap.ui.base.Event} oEvent - The change event
         */
        onSchoolChange(oEvent) {
            const oSelect = oEvent.getSource();
            const sSelectedKey = oSelect.getSelectedKey();

            if (sSelectedKey) {
                this._loadSchoolDetails(sSelectedKey);
            } else {
                // Clear school-related fields when no school is selected
                const oContext = this.getView().getBindingContext();
                if (oContext) {
                    const oModel = this.getView().getModel();
                    oModel.setProperty("EGSNA", "", oContext);
                    oModel.setProperty("ORT01", "", oContext);
                    oModel.setProperty("EGSCT", "", oContext);
                    oModel.setProperty("EGSTY", "", oContext);
                }
            }
        },

        /*************************************************************************************************/
        /********************************  End of School management ******************************************/
        /*************************************************************************************************/

        /* =========================================================== */
        /* Internal methods                                            */
        /* =========================================================== */

        /**
         * GetUI settings
         * @function
         * @private
         */
        _getUISettings: function () {
            debugger;
            const oCommonModel = this.getOwnerComponent().getModel("commonModel");
            let aFilters = [];

            const oCurrentObject = this.getBindingDetailObject();
            debugger;
            aFilters.push(new Filter("RequestType", FilterOperator.EQ, oCurrentObject.RequestType));
            aFilters.push(new Filter("Status", FilterOperator.EQ, oCurrentObject.RequestStatus));
            aFilters.push(new Filter("Actor", FilterOperator.EQ, "01")); //TODO Role constant for now , make it dynamic
            //Read entitySet
            oCommonModel.read("/UI5PropertySet", {
                filters: aFilters,
                success: this.getUI5PropertySetSuccess.bind(this),
                error: this.fError.bind(this)
            });
        },

        /**
         * Success callback for UI5PropertySet read
         * @param {object} oData - Response data from the service
         * @param {object} oResponse - Full response object
         */
        getUI5PropertySetSuccess: function (oData) {
            const a = oData?.results || [];
            const oView = this.getView();

            for (const r of a) {
                let editable = false, enabled = false, hidden = false, required = false;

                switch (r.Property) {
                    case "01": hidden = true; break; // Hidden
                    case "02": hidden = false; break; // Visible
                    case "03": editable = enabled = true; break; // Editable
                    case "04": editable = enabled = true; required = true; break; // Mandatory
                }

                // Cherche le contrôle par son id (qui doit matcher Field)
                const oCtrl = oView.byId(r.Field);
                if (oCtrl) {
                    console.info(" Field =", r.Field, " Editable =", editable, " Hidden =", hidden, " Required =", required);
                    // applique dynamiquement
                    if (oCtrl.setEditable) {
                        oCtrl.setEditable(editable);
                    }
                    if (oCtrl.setEnabled) {
                        oCtrl.setEnabled(enabled);
                    }
                    if (oCtrl.setVisible) {
                        oCtrl.setVisible(!hidden);
                    }
                    if (oCtrl.setRequired) {
                        oCtrl.setRequired(required);
                    }
                } else {
                    console.warn("Field non trouvé =", r.Field);
                }
            }
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
            let oViewModel = this.getModel("detailView");

            oViewModel.setProperty("/busy", false);
            
            // (+) Par Vincent : Vérifier si on a déjà un binding et le refresh si nécessaire
            const oElementBinding = oView.getElementBinding();
            if (oElementBinding && oElementBinding.getPath() === sObjectPath) {
                // (+) Par Vincent : Même path = retour sur une request déjà visitée
                // (+) Par Vincent : Force refresh pour recharger ToEduGrantDetail
                oElementBinding.refresh(true); // (+) Par Vincent : true = force refresh
                return;
            }
            
            this.getView().bindElement({
                path: sObjectPath,
                parameters: {
                    expand: "ToEduGrantDetail"
                },
                events: {
                    change: this._onBindingChange.bind(this),
                    dataRequested: function () {
                        oViewModel.setProperty("/busy", true);
                    },
                    dataReceived: function (oEvent) {
                        oViewModel.setProperty("/busy", false);
                        // (+) Par Vincent : Décommenter cette ligne pour que les UISettings fonctionnent
                        that._getUISettings();
                    }
                }
            });
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
         * Load school details from backend using SchoolsVHSet
         * @param {string} sSchoolId - The selected school ID
         * @private
         */
        _loadSchoolDetails(sSchoolId) {
            debugger;
            const oModel = this.getView().getModel();
            const oView = this.getView();
            const oContext = this.getView().getBindingContext();

            if (oContext) {
                const sEduGrantDetailPath = oContext.getPath() + "/ToEduGrantDetail";

                // Clear all school-related fields first to avoid old values
                oModel.setProperty(sEduGrantDetailPath + "/Egsna", "");
                oModel.setProperty(sEduGrantDetailPath + "/Ort01", "");
                oModel.setProperty(sEduGrantDetailPath + "/Egsct", "");
                oModel.setProperty(sEduGrantDetailPath + "/Egsty", "");

                // Vider aussi la description du champ School Country Input
                const oSchoolCountryInput = oView.byId("EGSCT");
                if (oSchoolCountryInput && oSchoolCountryInput.setDescription) {
                    oSchoolCountryInput.setDescription("");
                }
            }

            const sPath = `/schoolsVHSet('${sSchoolId}')`;

            oModel.read(sPath, {
                success: (oData) => {
                    const oContext = this.getView().getBindingContext();
                    if (oContext && oData) {
                        // Populate school-related fields with retrieved data
                        const sEduGrantDetailPath = oContext.getPath() + "/ToEduGrantDetail";
                        oModel.setProperty(sEduGrantDetailPath + "/Egsna", oData.Egsna || "");
                        oModel.setProperty(sEduGrantDetailPath + "/Ort01", oData.Ort01 || "");
                        oModel.setProperty(sEduGrantDetailPath + "/Egsct", oData.Egsct || "");
                        oModel.setProperty(sEduGrantDetailPath + "/Egsty", oData.Egsty || "");

                        // Mettre à jour la description du champ School Country
                        if (oData.Egsct) {
                            this._updateSchoolCountryDescription(oData.Egsct);
                        }
                    }
                },
                error: (oError) => {
                    this.fError("Error loading school details", oError);
                }
            });
        },

        /**
         * Update school country description based on country code
         * @param {string} sCountryCode - The country code
         * @private
         */
        _updateSchoolCountryDescription(sCountryCode) {
            console.log("Country code to find:", sCountryCode);
            const oModel = this.getView().getModel();
            const oView = this.getView();

            // Chercher la description du pays dans GenericVHSet
            const aFilters = [
                new Filter("Method", FilterOperator.EQ, "GET_SCHOOL_COUNTRY_LIST"),
                new Filter("Id", FilterOperator.EQ, sCountryCode)
            ];

            oModel.read("/GenericVHSet", {
                filters: aFilters,
                success: (oData) => {
                    console.log("GenericVHSet results:", oData.results);
                    if (oData.results && oData.results.length > 0) {
                        // Filtrer côté client pour être sûr de trouver le bon pays
                        const aCountries = oData.results.filter(country => country.Id === sCountryCode);
                        console.log("Filtered countries:", aCountries);

                        if (aCountries.length > 0) {
                            const sCountryDescription = aCountries[0].Txt;
                            console.log("Setting description:", sCountryDescription);
                            // Mettre la description dans l'Input (EGSCT)
                            const oSchoolCountryInput = oView.byId("EGSCT");
                            if (oSchoolCountryInput && oSchoolCountryInput.setDescription) {
                                oSchoolCountryInput.setDescription(sCountryDescription);
                            }
                        } else {
                            console.warn("No country found with code:", sCountryCode);
                        }
                    } else {
                        console.warn("No results from GenericVHSet");
                    }
                },
                error: (oError) => {
                    console.error("Error loading country description:", oError);
                    this.fError("Error loading country description", oError);
                }
            });
        }

    });
});