sap.ui.define([
	"com/un/zhrbenefrequests/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"com/un/zhrbenefrequests/model/formatter",
	"com/un/zhrbenefrequests/model/constants",
	"sap/base/strings/formatMessage",
	"sap/ui/core/ValueState",
	"sap/viz/ui5/data/FlattenedDataset",
	"sap/viz/ui5/controls/common/feeds/FeedItem",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
], function (BaseController, JSONModel, formatter, constants, formatMessage, ValueState, FlattenedDataset, FeedItem, MessageBox, MessageToast, Filter,
	FilterOperator) {
	"use strict";

	return BaseController.extend("com.un.zhrbenefrequests.controller.Detail", {

		formatter: formatter,
		
		// Default role for all operations - can be overridden if received from route
		_currentRole: constants.USER_ROLES.EMPLOYEE,
		
		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */
		
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Initializes the detail view with models, route patterns, and validation events.
		 * @public
		 */
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
				mimePath: this._sMIMESpath,
				completionPercentage: 0,
				completionState: "Error"
			});
			this.setModel(oViewModel, "detailView");

			// Initialize local models for claims and advances
			const oLocalClaimsModel = new JSONModel({ claims: [] });
			const oLocalAdvancesModel = new JSONModel({ advances: [] });
			this.getView().setModel(oLocalClaimsModel, "localClaims");
			this.getView().setModel(oLocalAdvancesModel, "localAdvances");

			// Initialize value help models
			this._initializeValueHelpModels();

			// attach navigation route pattern event
			// this.getRouter().getRoute("RouteDetail").attachPatternMatched(this._onObjectMatched, this);
			this.getRouter().getRoute("RouteDetail").attachPatternMatched(function (oEvent) {
				this._onObjectMatched(oEvent, "RouteDetail");
			}.bind(this));
			this.getRouter().getRoute("RouteDetailOnly").attachPatternMatched(function (oEvent) {
				this._onObjectMatched(oEvent, "RouteDetailOnly");
			}.bind(this));

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
			console.log({
				commentsDataModel
			});
			this.getView().setModel(commentsDataModel, "commentsModel");
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		// /**
		//  * Event handler for the save button 
		//  * @param {sap.ui.base.Event} oEvent the button Click event
		//  * @public
		//  */
		// onSaveButtonPress: function (oEvent) {
		// 	this._saveBenefitRequestObject();
		// },

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
		 * Event handler for the save button.
		 * Calls the private save method without status override.
		 * @public
		 */
		onSaveBenefitRequestObject: function () {
			this._saveBenefitRequestObject();
		},

		/**
		 * Event handler for the Submit button
		 * Shows comment dialog before submitting the benefit request
		 * @public
		 */
		onSubmitButtonPress: function () {
			const that = this;
			
			// Show comment dialog and submit directly after comment
			this.showCommentDialog((sComment) => {
				// Submit directly with the comment - no second confirmation needed
				that._submitBenefitRequest(sComment);
			});
		},
		
		/**
		 * Internal method to submit the benefit request with comment
		 * @param {string} sComment - The submission comment
		 * @private
		 */
		_submitBenefitRequest: function (sComment) {
			// Submit the request with status change to "Submitted" status
			this._saveBenefitRequestObject("01", sComment); // Pass comment to save method
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
				Currency: ""
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
		 * Event handler for deleting an advance from the table
		 * Removes the selected advance from the local advances model
		 * @param {sap.ui.base.Event} oEvent - The delete event
		 * @public
		 */
		onDeleteAdvanceButtonPress: function (oEvent) {
			// Get the list item that was deleted
			const oListItem = oEvent.getParameter("listItem");
			const oBindingContext = oListItem.getBindingContext("localAdvances");
			
			if (oBindingContext) {
				// Get the index of the item to delete
				const sPath = oBindingContext.getPath();
				const iIndex = parseInt(sPath.split("/").pop());
				
				// Get the local advances model
				const oLocalModel = this.getView().getModel("localAdvances");
				const aAdvances = oLocalModel.getProperty("/advances") || [];
				
				// Remove the advance at the specified index
				aAdvances.splice(iIndex, 1);
				
				// Update the model
				oLocalModel.setProperty("/advances", aAdvances);
				
				// Show confirmation message
				sap.m.MessageToast.show("Advance supprimé");
			}
		},

		/*************************************************************************************************/
		/********************************  Begin of School Management ***************************************/
		/*************************************************************************************************/

		/**
		 * Event handler for school country value help button press.
		 * Opens a dialog to select school country from available options.
		 * @param {sap.ui.base.Event} oEvent - The button press event
		 * @public
		 */
		onSchoolCountryValueHelpPress: function (oEvent) {
			const oView = this.getView();
			if (!this.fragments._oSchoolCountryDialog) {
				this.fragments._oSchoolCountryDialog = sap.ui.xmlfragment(
					"com.un.zhrbenefrequests.fragment.form.educationGrant.SchoolCountryChoice", this);
				this.getView().addDependent(this.fragments._oSchoolCountryDialog);
				// forward compact/cozy style into Dialog
				this.fragments._oSchoolCountryDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
			}

			this.fragments._oSchoolCountryDialog.open();
		},

		/**
		 * Event handler for searching in the school country select dialog.
		 * Filters the available countries based on the search term.
		 * @param {sap.ui.base.Event} oEvent - The search event
		 * @public
		 */
		onSearchSchoolCountrySelectDialog: function (oEvent) {
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

		/**
		 * Event handler for confirming school country selection.
		 * Sets the selected country values back to the form fields.
		 * @param {sap.ui.base.Event} oEvent - The confirm event with selected contexts
		 * @public
		 */
		onConfirmSchoolCountrySelectDialogPress: function (oEvent) {
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
		 * @public
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

		/**
		 * Event handler for school type (EGTYP) change
		 * Resets Child Boarder to false if school type is not primary (0002) or secondary (0003)
		 * @param {sap.ui.base.Event} oEvent the change event
		 * @public
		 */
		onSchoolTypeChange(oEvent) {
			const oSelect = oEvent.getSource();
			const sSelectedKey = oSelect.getSelectedKey();
			const oContext = this.getView().getBindingContext();
			
			if (oContext) {
				const oModel = this.getView().getModel();
				
				// If school type is not primary (0002) or secondary (0003), reset child boarder to false
				if (sSelectedKey !== "0002" && sSelectedKey !== "0003") {
					oModel.setProperty("ToEduGrantDetail/Egchbrd", false, oContext);
				}
			}
		},

		/*************************************************************************************************/
		/********************************  End of School management ******************************************/
		/*************************************************************************************************/

		/*************************************************************************************************/
		/********************************  Begin of Currency Management ***********************************/
		/*************************************************************************************************/

		/**
		 * Event handler for currency value help button press.
		 * Opens a dialog to select currency from available options.
		 * Automatically detects the source field from the event.
		 * @param {sap.ui.base.Event} oEvent - The button press event
		 * @public
		 */
		onCurrencyValueHelpPress: function (oEvent) {
			// Get the ID of the control that triggered the event
			const sSourceFieldId = oEvent.getSource().getId();
			// Extract just the field ID (remove view prefix if present)
			const sFieldId = sSourceFieldId.split("--").pop();
			this._openCurrencyDialog(sFieldId);
		},



		/**
		 * Event handler for searching in the currency select dialog.
		 * Filters the available currencies based on the search term.
		 * @param {sap.ui.base.Event} oEvent - The search event
		 * @public
		 */
		onSearchCurrencySelectDialog: function (oEvent) {
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

		/**
		 * Event handler for confirming currency selection.
		 * Sets the selected currency values back to the appropriate form field.
		 * @param {sap.ui.base.Event} oEvent - The confirm event with selected contexts
		 * @public
		 */
		onConfirmCurrencySelectDialogPress: function (oEvent) {
			const oView = this.getView();
			const aContexts = oEvent.getParameter("selectedContexts");
			
			// get back the selected entry data
			if (aContexts && aContexts.length) {
				let sCurrencyName = aContexts.map(function (oContext) {
					return oContext.getObject().Txt;
				}).join(", ");
				let sCurrencyId = aContexts.map(function (oContext) {
					return oContext.getObject().Id;
				}).join(", ");
				
				// Try to find the target field using getCore (works for fragments too)
				let oTargetField = sap.ui.getCore().byId(this._sCurrencySourceField);
				
				// If not found directly, try with view prefix
				if (!oTargetField) {
					oTargetField = oView.byId(this._sCurrencySourceField);
				}
				
				if (oTargetField) {
					if (oTargetField.setDescription) {
						oTargetField.setDescription(sCurrencyName);
					}
					if (oTargetField.setValue) {
						oTargetField.setValue(sCurrencyId);
					} else if (oTargetField.setSelectedKey) {
						// For Select controls like currencyOfPayment
						oTargetField.setSelectedKey(sCurrencyId);
					}
				}
			}
			
			// clear filters
			oEvent.getSource().getBinding("items").filter([]);
			// destroy the dialog
			if (this.fragments._oCurrencyDialog) {
				this.fragments._oCurrencyDialog.destroy();
				delete this.fragments._oCurrencyDialog;
			}
		},

		/*************************************************************************************************/
		/********************************  End of Currency Management *************************************/
		/*************************************************************************************************/

		/* =========================================================== */
		/* Internal & private  methods                                 */
		/* =========================================================== */

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function (oEvent, routeName) {
			// Only detach previous listeners when navigating to avoid conflicts
			this._detachCompletionListeners();
			
			// Extract GUID from arguments (different structure for each route)
			const oArguments = oEvent.getParameter("arguments") || {};
			const sBenefitRequestId = oArguments.benefitRequestId;
			// Override default role if provided in route arguments
			if (oArguments.role) {
				this._currentRole = oArguments.role;
			}
			
			console.log("Route arguments:", oArguments);
			console.log("Matched route:", routeName);
			console.log("benefitRequestId received:", sBenefitRequestId);
			console.log("Current role:", this._currentRole);

			// Validate GUID
			if (!sBenefitRequestId || sBenefitRequestId === "00000000-0000-0000-0000-000000000000" || 
				sBenefitRequestId === "undefined" || sBenefitRequestId === "null") {
				console.warn("Invalid or undefined GUID:", sBenefitRequestId);
				return;
			}

			// Wait for metadata and then bind using unified approach
			this.getModel().metadataLoaded().then(function () {
				const oModel = this.getView().getModel();
				
				if (oModel.hasPendingChanges()) {
					oModel.resetChanges();
				}

				// Create consistent object path using createKey for both routes
				const sObjectPath = this.getModel().createKey("RequestHeaderSet", {
					Guid: sBenefitRequestId
				});
				
				// Use unified _bindView method for both routes
				this._bindView("/" + sObjectPath);
				
				// Load value help data for dropdown lists
				this._loadValueHelpData();
				
				// Handle route-specific logic if needed
				if (routeName === "RouteDetailOnly") {
					// Role is already set in _currentRole above
					// this._handleFooterButton(this._currentRole); // Uncomment if needed
				}
				
				// Form completion will be calculated in dataReceived event of _bindView
			}.bind(this));
		},

		/**
		 * Handles binding changes and updates the view state accordingly.
		 * Navigates to object not found page if no binding context is available.
		 * @private
		 */
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
		 * Called when metadata is loaded for the OData model.
		 * Sets up initial busy state and delays for the detail view.
		 * @private
		 */
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
		 * Confirms the addition of a new claim
		 * Validates the data and adds it to the ClaimItems local model
		 * Note: ClaimItems est stocké localement - pas encore d'association ABAP ToClaimItems
		 * @private
		 */
		_onConfirmAddClaim: function () {
			// Récupération simple et directe des valeurs depuis les contrôles
			const oExpenseTypeSelect = sap.ui.getCore().byId("expenseTypeAdd");
			const oAmountInput = sap.ui.getCore().byId("amountAdd");
			const oCurrencyInput = sap.ui.getCore().byId("currencyAdd");
			
			const sExpenseType = oExpenseTypeSelect ? oExpenseTypeSelect.getSelectedKey() : "";
			const sAmount = oAmountInput ? oAmountInput.getValue() : "";
			const sCurrency = oCurrencyInput ? oCurrencyInput.getValue() : "";

			// Validation simple
			if (!sExpenseType || !sAmount || !sCurrency) {
				sap.m.MessageBox.error(this.getView().getModel("i18n").getResourceBundle().getText("fillRequiredFields"));
				return;
			}

			const fAmount = parseFloat(sAmount);
			if (isNaN(fAmount) || fAmount <= 0) {
				sap.m.MessageBox.error("Veuillez entrer un montant valide supérieur à 0");
				return;
			}

			// Get the current context and model
			const oContext = this.getView().getBindingContext();
			const oModel = this.getView().getModel();

			// Create a new claim entry
			const oNewClaim = {
				ExpenseType: sExpenseType,
				Amount: fAmount,
				Currency: sCurrency,
				TempId: Date.now().toString()
			};

			// Utiliser un modèle JSON local pour les claims
			let oLocalModel = this.getView().getModel("localClaims");
			if (!oLocalModel) {
				// Créer le modèle local s'il n'existe pas
				oLocalModel = new sap.ui.model.json.JSONModel({ claims: [] });
				this.getView().setModel(oLocalModel, "localClaims");
			}

			// Récupérer les claims existants
			const aClaims = oLocalModel.getProperty("/claims") || [];
			
			// Ajouter le nouveau claim
			aClaims.push(oNewClaim);
			
			// Mettre à jour le modèle local
			oLocalModel.setProperty("/claims", aClaims);

			// Show success message
			sap.m.MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("claimAdded"));

			// Close dialog
			this._removeClaimAddDialog();
		},

		/**
		 * Confirms the addition of a new advance
		 * Validates the data and adds it to the AdvanceItems local model
		 * Note: AdvanceItems est stocké localement - pas encore d'association ABAP ToAdvanceItems
		 * @private
		 */
		_onConfirmAddAdvance: function () {
			const oDialogModel = this.fragments._oAdvanceDialog.getModel("advanceModel");
			const oAdvanceData = oDialogModel.getData();

			// Validation
			if (!oAdvanceData.ExpenseType || !oAdvanceData.Amount || !oAdvanceData.Currency) {
				sap.m.MessageBox.error(this.getView().getModel("i18n").getResourceBundle().getText("fillRequiredFields"));
				return;
			}

			// Create a new advance entry
			const oNewAdvance = {
				ExpenseType: oAdvanceData.ExpenseType,
				Amount: parseFloat(oAdvanceData.Amount),
				Currency: oAdvanceData.Currency,
				Comments: oAdvanceData.Comments || "",
				TempId: Date.now().toString()
			};

			// Utiliser un modèle JSON local pour les advances
			let oLocalModel = this.getView().getModel("localAdvances");
			if (!oLocalModel) {
				// Créer le modèle local s'il n'existe pas
				oLocalModel = new sap.ui.model.json.JSONModel({ advances: [] });
				this.getView().setModel(oLocalModel, "localAdvances");
			}

			// Récupérer les advances existants
			const aAdvances = oLocalModel.getProperty("/advances") || [];
			
			// Ajouter le nouveau advance
			aAdvances.push(oNewAdvance);
			
			// Mettre à jour le modèle local
			oLocalModel.setProperty("/advances", aAdvances);

			// Show success message
			sap.m.MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("advanceAdded"));

			// Close dialog
			this._removeAdvanceAddDialog();
		},

		/**
		 * Private method to open currency dialog and store source field.
		 * @param {string} sSourceFieldId - The ID of the field that triggered the dialog
		 * @private
		 */
		_openCurrencyDialog: function (sSourceFieldId) {
			const oView = this.getView();
			
			// Store the source field ID for later use
			this._sCurrencySourceField = sSourceFieldId;
			
			if (!this.fragments._oCurrencyDialog) {
				this.fragments._oCurrencyDialog = sap.ui.xmlfragment(
					"com.un.zhrbenefrequests.fragment.form.educationGrant.CurrencyChoice", this);
				this.getView().addDependent(this.fragments._oCurrencyDialog);
				// forward compact/cozy style into Dialog
				this.fragments._oCurrencyDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
			}

			this.fragments._oCurrencyDialog.open();
		},

		/**
		 * Initializes value help JSON models to avoid key collisions
		 * Creates and sets separate models for each value help dropdown
		 * @private
		 */
		_initializeValueHelpModels: function () {
			// Create separate JSON models for value helps to avoid key collisions
			const oGradeModel = new JSONModel();
			const oSchoolTypeAdditModel = new JSONModel();
			const oSchoolListModel = new JSONModel();
			const oSchoolTypeModel = new JSONModel();
			const oAttendanceTypeModel = new JSONModel();
			const oSpecialArrangementModel = new JSONModel();
			const oChangeReasonModel = new JSONModel();
			const oReasonBoardingModel = new JSONModel();
			const oCurrencyModel = new JSONModel();
			const oSchoolCountryModel = new JSONModel();
			
			this.setModel(oGradeModel, "gradeModel");
			this.setModel(oSchoolTypeAdditModel, "schoolTypeAdditModel");
			this.setModel(oSchoolListModel, "schoolListModel");
			this.setModel(oSchoolTypeModel, "schoolTypeModel");
			this.setModel(oAttendanceTypeModel, "attendanceTypeModel");
			this.setModel(oSpecialArrangementModel, "specialArrangementModel");
			this.setModel(oChangeReasonModel, "changeReasonModel");
			this.setModel(oReasonBoardingModel, "reasonBoardingModel");
			this.setModel(oCurrencyModel, "currencyModel");
			this.setModel(oSchoolCountryModel, "schoolCountryModel");
		},

		/**
		 * Saves position request object with pending changes.
		 * Uses submitChanges for batch processing and handles success/error responses.
		 * @private
		 */
		_savePosRequestObject: function () {
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
							//that._resetValidationChecks();
							oView.byId("draftIndicator").showDraftSaved();
						}
					}
				});
			} else {
				//MessageBox.information(oResourceBundle.getText("noChangesToSubmit"));
			}
		},

		/**
		 * Retrieves UI settings for form fields based on request type and status.
		 * Applies dynamic visibility, editability and requirement rules to form controls.
		 * @private
		 */
		_getUISettings: function () {
			const oCommonModel = this.getOwnerComponent().getModel("commonModel");
			let aFilters = [];

			const oCurrentObject = this.getBindingDetailObject();
			aFilters.push(new Filter("RequestType", FilterOperator.EQ, oCurrentObject.RequestType));
			aFilters.push(new Filter("Status", FilterOperator.EQ, oCurrentObject.RequestStatus));
			aFilters.push(new Filter("Actor", FilterOperator.EQ, this._currentRole));
			//Read entitySet
			oCommonModel.read("/UI5PropertySet", {
				filters: aFilters,
				success: this.getUI5PropertySetSuccess.bind(this),
				error: this.fError.bind(this)
			});
		},

		/**
		 * Success callback for UI5PropertySet read operation.
		 * Processes UI settings and applies them to form controls dynamically.
		 * @param {object} oData - Response data from the service
		 * @param {object} oResponse - Full response object
		 * @private
		 */
		getUI5PropertySetSuccess: function (oData) {
			const aUIProperties = oData?.results || [];
			const oView = this.getView();

			for (const oUIProperty of aUIProperties) {
				let editable = false,
					enabled = false,
					hidden = false,
					required = false;

				switch (oUIProperty.Property) {
					case "01":
						hidden = true;
						break; // Hidden
					case "02":
						hidden = false;
						break; // Visible
					case "03":
						editable = enabled = true;
						break; // Editable
					case "04":
						editable = enabled = true;
						required = true;
						break; // Mandatory
				}

				// Find the control by its id (which must match Field)
				const oCtrl = oView.byId(oUIProperty.Field);
				if (oCtrl) {
					console.info(" Field =", oUIProperty.Field, " Editable =", editable, " Hidden =", hidden, " Required =", required);
					// apply dynamically
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
					console.warn("Field non trouvé =", oUIProperty.Field);
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
		//  onApproveButtonPress: function() {
		// 	  const oModel = this.getView().getModel("approveModel");
			
		// 	  // Get the current hash from the URL
		// 	  const sHash = sap.ui.core.routing.HashChanger.getInstance().getHash(); // e.g., YHR_BEN_REQ-display&//DetailOnly/005056be-9b02-1fd0-a58e-8d5b404d123d/02/02/01/01
			
		// 	  // Extract the segments after the '&' symbol
		// 	  const aHashParts = sHash.split("&");
		// 	  const sDetailPath = aHashParts.find(part => part.includes("DetailOnly"));
			
		// 	  if (!sDetailPath) {
		// 	    sap.m.MessageBox.error("Invalid URL format. Cannot extract parameters.");
		// 	    return;
		// 	  }
			
		// 	  // Split the DetailOnly path into segments
		// 	  const aSegments = sDetailPath.split("/").filter(Boolean); // Removes empty strings
			
		// 	  // Extract Guid and ActorRole
		// 	  const sGuid = aSegments[1];       // 005056be-9b02-1fd0-a58e-8d5b404d123d
		// 	  const sActorRole = aSegments[2];  // 02
			
		// 	  // Call the OData function with dynamic parameters
		// 	  oModel.callFunction("/ApproveRequest", {
		// 	    method: "POST",
		// 	    urlParameters: {
		// 	      Guid: sGuid,
		// 	      ActorRole: sActorRole,
		// 	      ApprovalComent: "Test"
		// 	    },
		// 	    success: (oData) => {
		// 	      const oResult = oData?.ApproveRequest;
		// 	      const sReturnCode = oResult?.ReturnCode?.trim();
		// 	      const sMessage = oResult?.Message || "No message returned";
			
		// 	      if (sReturnCode === "0") {
		// 	        sap.m.MessageToast.show("Request approved successfully!");
		// 	      } else {
		// 	        sap.m.MessageBox.error(sMessage, {
		// 	          title: "Error",
		// 	          details: `Return Code: ${sReturnCode}`
		// 	        });
		// 	      }
		// 	    },
		// 	    error: () => {
		// 	      sap.m.MessageBox.error("Approval failed due to a technical error.", {
		// 	        title: "Error"
		// 	      });
		// 	    }
		// 	  });
		// },
		onApproveButtonPress: function() {
			  debugger;
			  const oModel = this.getView().getModel("approveModel");
			  const oBundle = this.getView().getModel("i18n").getResourceBundle();
			
			  const sHash = sap.ui.core.routing.HashChanger.getInstance().getHash();
			  const aHashParts = sHash.split("&");
			  const sDetailPath = aHashParts.find(part => part.includes("DetailOnly"));
			
			  if (!sDetailPath) {
			    sap.m.MessageBox.error(oBundle.getText("approvalInvalidUrl"));
			    return;
			  }
			
			  const aSegments = sDetailPath.split("/").filter(Boolean);
			  const sGuid = aSegments[1];
			  const sActorRole = aSegments[2];
			
			  this.showCommentDialog((sComment) => {
			    oModel.callFunction("/ApproveRequest", {
			      method: "POST",
			      urlParameters: {
			        Guid: sGuid,
			        ActorRole: sActorRole,
			        ApprovalComent: sComment
			      },
			      success: (oData) => {
			        const oResult = oData?.ApproveRequest;
			        const sReturnCode = oResult?.ReturnCode?.trim();
			        const sMessage = oResult?.Message || oBundle.getText("approvalNoMessage");
			
			        if (sReturnCode === "0") {
			          sap.m.MessageToast.show(oBundle.getText("approvalSuccess"), {
					    duration: 2000
					  });
			          window.history.back();
			        } else {
			          sap.m.MessageBox.error(sMessage, {
			            title: oBundle.getText("approvalErrorTitle"),
			            details: oBundle.getText("approvalErrorDetails", [sReturnCode])
			          });
			        }
			      },
			      error: () => {
			        sap.m.MessageBox.error(oBundle.getText("approvalErrorTechnical"), {
			          title: oBundle.getText("approvalErrorTitle")
			        });
			      }
			    });
			  });
		},

		_bindView: function (sObjectPath) {
			let that = this;
			const oView = this.getView();
			let oViewModel = this.getModel("detailView");

			oViewModel.setProperty("/busy", false);

			// (+) By Vincent : Check if we already have a binding and refresh if necessary
			const oElementBinding = oView.getElementBinding();
			if (oElementBinding && oElementBinding.getPath() === sObjectPath) {
				// (+) By Vincent : Same path = return to an already visited request
				// (+) By Vincent : Force refresh to reload ToEduGrantDetail
				oElementBinding.refresh(true); // (+) By Vincent : true = force refresh
				return;
			}

			this.getView().bindElement({
				path: sObjectPath,
				// Reactivated for deep insert - ToEduGrantDetail must be loaded for save
				parameters: {
					expand: "ToEduGrantDetail"
				},
				// Note: ToClaimItems and ToAdvanceItems are not yet implemented on the ABAP side
				// expand: "ToEduGrantDetail,ToClaimItems,ToAdvanceItems"
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function () {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function (oEvent) {
						oViewModel.setProperty("/busy", false);
			
						that._getUISettings();
						
						// Restore or calculate form completion once data is received
						that._restoreFormCompletion();
						that._attachCompletionListeners();
					}
				}
			});
		},

		/**
		 * Event handler for deleting a claim from the table
		 * Removes the selected claim from the local claims model
		 * @param {sap.ui.base.Event} oEvent - The delete event
		 * @public
		 */
		onDeleteClaimButtonPress: function (oEvent) {
			// Get the list item that was deleted
			const oListItem = oEvent.getParameter("listItem");
			const oBindingContext = oListItem.getBindingContext("localClaims");
			
			if (oBindingContext) {
				// Get the index of the item to delete
				const sPath = oBindingContext.getPath();
				const iIndex = parseInt(sPath.split("/").pop());
				
				// Get the local claims model
				const oLocalModel = this.getView().getModel("localClaims");
				const aClaims = oLocalModel.getProperty("/claims") || [];
				
				// Remove the claim at the specified index
				aClaims.splice(iIndex, 1);
				
				// Update the model
				oLocalModel.setProperty("/claims", aClaims);
				
				// Show confirmation message
				sap.m.MessageToast.show("Claim supprimé");
			}
		},

		/**
		 * Removes and destroys the Add Claim dialog
		 * @private
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
		 * @private
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

				// Also clear the School Country Input field description
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

						// Update the School Country field description
						if (oData.Egsct) {
							this._updateSchoolCountryDescription(oData.Egsct);
						}
					}
				},
				error: (oError) => {
					console.error("Error loading school details:", oError);
					
					// 🔥 EXEMPLE: Ajouter un message d'erreur via BaseController
					this.addODataErrorMessage(
						oError,
						"Erreur lors du chargement des détails de l'école",
						"/SchoolDetails"
					);
					
					this.fError();
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

			// Search for the country description in GenericVHSet
			const aFilters = [
				new Filter("Method", FilterOperator.EQ, "GET_SCHOOL_COUNTRY_LIST"),
				new Filter("Id", FilterOperator.EQ, sCountryCode)
			];

			oModel.read("/GenericVHSet", {
				filters: aFilters,
				success: (oData) => {
					console.log("GenericVHSet results:", oData.results);
					if (oData.results && oData.results.length > 0) {
						// Filter client-side to make sure we find the right country
						const aCountries = oData.results.filter(country => country.Id === sCountryCode);
						console.log("Filtered countries:", aCountries);

						if (aCountries.length > 0) {
							const sCountryDescription = aCountries[0].Txt;
							console.log("Setting description:", sCountryDescription);
							// Set the description in the Input (EGSCT)
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
					this.fError();
				}
			});
		},

		/**
		 * Private method to save benefit request object.
		 * Performs deep insert operation to save benefit request with education grant details.
		 * @param {string} sStatus - Optional status to override the current request status
		 * @param {string} sComment - Optional comment to store in Note field
		 * @private
		 */
		_saveBenefitRequestObject: function (sStatus, sComment) {
			const that = this;
			const oView = this.getView();
			const oModel = oView.getModel();
			const oContext = oView.getBindingContext();
			
			// set status to saved draft
			oView.byId("draftIndicator").showDraftSaving();

			if (!oContext) {
				console.error("No binding context available");
				return;
			}

			// Store comment in Note field if provided (common logic for creation and submit)
			if (sComment) {
				oModel.setProperty("Note", sComment, oContext);
			}

			// Remove the pending changes check - allow submit at any time
			// if (!oModel.hasPendingChanges()) {
			//     console.log("No pending changes to submit");
			//     oView.byId("draftIndicator").showDraftSaved();
			//     return;
			// }

			// set busy indicator during save
			const oViewModel = this.getModel("detailView");
			oViewModel.setProperty("/busy", true);

			// For deep insert, retrieve form data and create a new object
			const oRequestData = oModel.getObject(oContext.getPath());
			const oEduGrantDetail = oModel.getObject(oContext.getPath() + "/ToEduGrantDetail");

			// Build the object for deep insert with new GUID
			const oDeepInsertData = {
				// Header properties - new GUID
				...oRequestData,
				// Deep insert association with form data
				ToEduGrantDetail: {
					...oEduGrantDetail,
				}
			};

			// Override status if provided as parameter
			if (sStatus) {
				oDeepInsertData.RequestStatus = sStatus;
			}

			// 🔍 CONSOLE LOG - Objet complet envoyé au deep insert
			console.log("=== DEEP INSERT DATA ===");
			console.log("Header Data (RequestHeaderSet):", JSON.stringify(oRequestData, null, 2));
			console.log("Education Grant Detail (ToEduGrantDetail):", JSON.stringify(oEduGrantDetail, null, 2));
			console.log("Complete Deep Insert Object:", JSON.stringify(oDeepInsertData, null, 2));
			console.log("========================");

			// Use create() for deep insert of a new record
			oModel.create("/RequestHeaderSet", oDeepInsertData, {
				success: function (oData, oResponse) {
					oViewModel.setProperty("/busy", false);
					
					// Success - clean messages and indicate save
					that.clearMessages();
					that.addSuccessMessage(
						"Demande sauvegardée avec succès",
						`Votre demande a été enregistrée avec le GUID: ${oData.Guid}`
					);
					that._resetValidationChecks && that._resetValidationChecks();
					oView.byId("draftIndicator").showDraftSaved();
					
					// Reset pending changes because the new object has been created
					oModel.resetChanges();
					
					// Navigate to the newly created object
					that.getRouter().navTo("RouteDetail", {
						benefitRequestId: oData.Guid
					});
					
					console.log("Deep insert successful:", oData);
				},
				error: function (oError) {
					oViewModel.setProperty("/busy", false);
					console.error("Deep insert error:", oError);
					
					that.addODataErrorMessage(
						oError,
						"Erreur lors de la sauvegarde",
						"/SaveOperation"
					);
					
					oView.byId("draftIndicator").clearDraftState();
				}
			});
		},

		/**
		 * Load value help data into separate JSON models to avoid key collisions
		 * @private
		 */
		_loadValueHelpData: function() {
			// Load configuration from JSON file
			const sConfigPath = sap.ui.require.toUrl("com/un/zhrbenefrequests/model/valueHelpConfig.json");
			
			fetch(sConfigPath)
				.then(response => {
					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status}`);
					}
					return response.json();
				})
				.then(oConfigData => {
					const aValueHelpConfig = oConfigData.valueHelpConfig;
					
					// Load all models dynamically
					aValueHelpConfig.forEach(config => {
						this._loadGenericData(config.modelName, config.method);
					});
				})
				.catch(oError => {
					console.error("Error loading value help configuration:", oError);
					// Fallback to hardcoded configuration if JSON loading fails
					this._loadValueHelpDataFallback();
				});
		},

		/**
		 * Fallback method with hardcoded configuration in case JSON loading fails
		 * @private
		 */
		_loadValueHelpDataFallback: function() {
			const aValueHelpConfig = [
				{ modelName: "gradeModel", method: "GET_ATTEND_SCHOOL_GRADE_LIST" },
				{ modelName: "schoolTypeAdditModel", method: "GET_SCHOOL_TYPE_ADDIT_LIST" },
				{ modelName: "schoolListModel", method: "GET_SCHOOL_LIST" },
				{ modelName: "schoolTypeModel", method: "GET_SCHOOL_TYPE_LIST" },
				{ modelName: "attendanceTypeModel", method: "GET_ATTENDANCE_TYPE_LIST" },
				{ modelName: "specialArrangementModel", method: "GET_SPECIAL_ARRANGEMENT_LIST" },
				{ modelName: "changeReasonModel", method: "GET_CHANGE_REASON_LIST" },
				{ modelName: "reasonBoardingModel", method: "GET_REASON_BOARDING_LIST" },
				{ modelName: "currencyModel", method: "GET_CURRENCY_LIST" },
				{ modelName: "schoolCountryModel", method: "GET_SCHOOL_COUNTRY_LIST" }
			];

			// Load all models dynamically
			aValueHelpConfig.forEach(config => {
				this._loadGenericData(config.modelName, config.method);
			});
		},

		/**
		 * Generic method to load data from GenericVHSet into a specific JSON model
		 * @param {string} sModelName - Name of the JSON model to populate
		 * @param {string} sMethod - Method name for the GenericVHSet filter
		 * @private
		 */
		_loadGenericData: function(sModelName, sMethod) {
			const oModel = this.getModel();
			const aFilters = [new sap.ui.model.Filter("Method", sap.ui.model.FilterOperator.EQ, sMethod)];
			
			oModel.read("/GenericVHSet", {
				filters: aFilters,
				success: (oData) => {
					this.getModel(sModelName).setData({
						items: oData.results
					});
					console.log(`${sModelName} data loaded (${sMethod}):`, oData.results);
				},
				error: (oError) => {
					console.error(`Error loading ${sModelName} data (${sMethod}):`, oError);
				}
			});
		},

		/**
		 * Load school list data for EGSSL field
		 * @private
		 */
		_loadSchoolListData: function() {
			const oModel = this.getModel();
			const aFilters = [new sap.ui.model.Filter("Method", sap.ui.model.FilterOperator.EQ, "GET_SCHOOL_LIST")];
			
			oModel.read("/GenericVHSet", {
				filters: aFilters,
				success: (oData) => {
					this.getModel("schoolListModel").setData({
						items: oData.results
					});
					console.log("School list data loaded:", oData.results);
				},
				error: (oError) => {
					console.error("Error loading school list data:", oError);
				}
			});
		},

		/**
		 * Load school type data for EGSTY field
		 * @private
		 */
		_loadSchoolTypeData: function() {
			const oModel = this.getModel();
			const aFilters = [new sap.ui.model.Filter("Method", sap.ui.model.FilterOperator.EQ, "GET_SCHOOL_TYPE_LIST")];
			
			oModel.read("/GenericVHSet", {
				filters: aFilters,
				success: (oData) => {
					this.getModel("schoolTypeModel").setData({
						items: oData.results
					});
					console.log("School type data loaded:", oData.results);
				},
				error: (oError) => {
					console.error("Error loading school type data:", oError);
				}
			});
		},

		/**
		 * Load attendance type data for EGTYPATT field
		 * @private
		 */
		_loadAttendanceTypeData: function() {
			const oModel = this.getModel();
			const aFilters = [new sap.ui.model.Filter("Method", sap.ui.model.FilterOperator.EQ, "GET_ATTENDANCE_TYPE_LIST")];
			
			oModel.read("/GenericVHSet", {
				filters: aFilters,
				success: (oData) => {
					this.getModel("attendanceTypeModel").setData({
						items: oData.results
					});
					console.log("Attendance type data loaded:", oData.results);
				},
				error: (oError) => {
					console.error("Error loading attendance type data:", oError);
				}
			});
		},

		/**
		 * Load special arrangement data for EGSAR field
		 * @private
		 */
		_loadSpecialArrangementData: function() {
			const oModel = this.getModel();
			const aFilters = [new sap.ui.model.Filter("Method", sap.ui.model.FilterOperator.EQ, "GET_SPECIAL_ARRANGEMENT_LIST")];
			
			oModel.read("/GenericVHSet", {
				filters: aFilters,
				success: (oData) => {
					this.getModel("specialArrangementModel").setData({
						items: oData.results
					});
					console.log("Special arrangement data loaded:", oData.results);
				},
				error: (oError) => {
					console.error("Error loading special arrangement data:", oError);
				}
			});
		},

		/**
		 * Load change reason data for EGCRS field
		 * @private
		 */
		_loadChangeReasonData: function() {
			const oModel = this.getModel();
			const aFilters = [new sap.ui.model.Filter("Method", sap.ui.model.FilterOperator.EQ, "GET_CHANGE_REASON_LIST")];
			
			oModel.read("/GenericVHSet", {
				filters: aFilters,
				success: (oData) => {
					this.getModel("changeReasonModel").setData({
						items: oData.results
					});
					console.log("Change reason data loaded:", oData.results);
				},
				error: (oError) => {
					console.error("Error loading change reason data:", oError);
				}
			});
		},

		/**
		 * Load reason boarding data for EGBRS field
		 * @private
		 */
		_loadReasonBoardingData: function() {
			const oModel = this.getModel();
			const aFilters = [new sap.ui.model.Filter("Method", sap.ui.model.FilterOperator.EQ, "GET_REASON_BOARDING_LIST")];
			
			oModel.read("/GenericVHSet", {
				filters: aFilters,
				success: (oData) => {
					this.getModel("reasonBoardingModel").setData({
						items: oData.results
					});
					console.log("Reason boarding data loaded:", oData.results);
				},
				error: (oError) => {
					console.error("Error loading reason boarding data:", oError);
				}
			});
		},

		/**
		 * Load currency data for currency selection dialog
		 * @private
		 */
		_loadCurrencyData: function() {
			const oModel = this.getModel();
			const aFilters = [new sap.ui.model.Filter("Method", sap.ui.model.FilterOperator.EQ, "GET_CURRENCY_LIST")];
			
			oModel.read("/GenericVHSet", {
				filters: aFilters,
				success: (oData) => {
					this.getModel("currencyModel").setData({
						items: oData.results
					});
					console.log("Currency data loaded:", oData.results);
				},
				error: (oError) => {
					console.error("Error loading currency data:", oError);
				}
			});
		},

		/**
		 * Load school country data for school country selection dialog
		 * @private
		 */
		_loadSchoolCountryData: function() {
			const oModel = this.getModel();
			const aFilters = [new sap.ui.model.Filter("Method", sap.ui.model.FilterOperator.EQ, "GET_SCHOOL_COUNTRY_LIST")];
			
			oModel.read("/GenericVHSet", {
				filters: aFilters,
				success: (oData) => {
					this.getModel("schoolCountryModel").setData({
						items: oData.results
					});
					console.log("School country data loaded:", oData.results);
				},
				error: (oError) => {
					console.error("Error loading school country data:", oError);
				}
			});
		},

		/**
		 * Load grade data for EGGRD field
		 * @private
		 */
		_loadGradeData: function() {
			const oModel = this.getModel();
			const aFilters = [new sap.ui.model.Filter("Method", sap.ui.model.FilterOperator.EQ, "GET_ATTEND_SCHOOL_GRADE_LIST")];
			
			oModel.read("/GenericVHSet", {
				filters: aFilters,
				success: (oData) => {
					this.getModel("gradeModel").setData({
						items: oData.results
					});
					console.log("Grade data loaded:", oData.results);
				},
				error: (oError) => {
					console.error("Error loading grade data:", oError);
				}
			});
		},

		/**
		 * Load school type additional data for EGTYP field
		 * @private
		 */
		_loadSchoolTypeAdditData: function() {
			const oModel = this.getModel();
			const aFilters = [new sap.ui.model.Filter("Method", sap.ui.model.FilterOperator.EQ, "GET_SCHOOL_TYPE_ADDIT_LIST")];
			
			oModel.read("/GenericVHSet", {
				filters: aFilters,
				success: (oData) => {
					this.getModel("schoolTypeAdditModel").setData({
						items: oData.results
					});
					console.log("School type addit data loaded:", oData.results);
				},
				error: (oError) => {
					console.error("Error loading school type addit data:", oError);
				}
			});
		},

		/**
		 * Handler pour le changement d'état du switch multiple attendance
		 * Convertit l'état du switch en valeur pour le modèle
		 * @param {sap.ui.base.Event} oEvent - L'événement de changement du switch
		 */
		onMultipleAttendanceChange: function(oEvent) {
			var bState = oEvent.getParameter("state");
			var sValue = bState ? 'N' : '';
			
			// Mettre à jour le modèle avec la valeur convertie
			var oContext = this.getView().getBindingContext();
			if (oContext) {
				this.getModel().setProperty(
					oContext.getPath() + "/ToEduGrantDetail/Egmul", 
					sValue
				);
			}
			
			// Recalculer la complétude après changement
			this._calculateFormCompletion();
		},

		/**
		 * Get all visible form fields (Input, Select, CheckBox, etc.)
		 * Filters fields based on the current request type to avoid counting fields from inactive forms
		 * @returns {Array} Array of visible form controls for the active request type
		 * @private
		 */
		_getVisibleFormFields: function() {
			const oView = this.getView();
			const oContext = oView.getBindingContext();
			
			if (!oContext) {
				return [];
			}
			
			// Get current request type
			const sRequestType = oContext.getProperty("RequestType");
			
			// Get the appropriate form section based on request type (maintenant les IDs correspondent au contenu)
			let oFormSection;
			if (sRequestType === '01') {
				// Education Grant 
				oFormSection = oView.byId("educationGrantFormSection"); 
			} else if (sRequestType === '02') {
				// Rental Subsidy 
				oFormSection = oView.byId("rentalSubsidyFormSection"); 
			}
			
			if (!oFormSection) {
				return [];
			}
			
			if (!oFormSection.getVisible()) {
				return [];
			}
			
			// Find all form controls within the active section only
			const aInputs = oFormSection.findAggregatedObjects(true, function(oControl) {
				return (oControl.isA("sap.m.Input") || 
						oControl.isA("sap.m.Select") || 
						oControl.isA("sap.m.CheckBox") || 
						oControl.isA("sap.m.Switch") ||
						oControl.isA("sap.m.DatePicker")) && 
						oControl.getVisible();
			});
			
			console.log(`🎯 Request Type: ${sRequestType}, Form Section: ${oFormSection.getId()}, Fields found: ${aInputs.length}`);
			
			return aInputs;
		},

		/**
		 * Check if a field is filled
		 * @param {sap.ui.core.Control} oControl - The control to check
		 * @returns {boolean} True if field has value
		 * @private
		 */
		_isFieldFilled: function(oControl) {
			if (!oControl || !oControl.getVisible()) {
				return false;
			}
			
			if (oControl.isA("sap.m.Input")) {
				return !!oControl.getValue();
			} else if (oControl.isA("sap.m.Select")) {
				return !!oControl.getSelectedKey();
			} else if (oControl.isA("sap.m.CheckBox")) {
				return oControl.getSelected();
			} else if (oControl.isA("sap.m.Switch")) {
				return oControl.getState();
			} else if (oControl.isA("sap.m.DatePicker")) {
				return !!oControl.getValue();
			}
			
			return false;
		},

		/**
		 * Restore completion values from the current request context
		 * @private
		 */
		_restoreFormCompletion: function() {
			const oContext = this.getView().getBindingContext();
			
			if (oContext) {
				const oModel = this.getView().getModel();
				const sPath = oContext.getPath();
				
				// Récupérer la valeur stockée dans le champ Completion du modèle header
				const sCompletion = oModel.getProperty(sPath + "/Completion");
				
				if (sCompletion !== undefined && sCompletion !== null && sCompletion !== "") {
					// Vérifier si c'est une valeur valide (pas juste des espaces)
					const sTrimmed = String(sCompletion).trim();
					
					if (sTrimmed !== "" && !isNaN(parseFloat(sTrimmed))) {
						const sState = formatter.getCompletionState(sCompletion);
						return; // On a une valeur valide, pas besoin de recalculer
					}
				}
				
				// Pas de valeur stockée (création), lancer le calcul initial
				this._calculateFormCompletion();
			}
		},

		/**
		 * Calculate form completion percentage based on visible fields
		 * @private
		 */
		_calculateFormCompletion: function() {
			try {
				// Reset completion to default state at start of calculation
				let oViewModel = this.getModel("detailView");
				if (oViewModel) {
					oViewModel.setProperty("/completionPercentage", 0);
					oViewModel.setProperty("/completionState", "Error");
				}
				
				const aVisibleFields = this._getVisibleFormFields();
				
				// Early return if no fields found
				if (!aVisibleFields || aVisibleFields.length === 0) {
					return;
				}
				
				let iFilledCount = 0;
				const aFieldDetails = [];
				
				aVisibleFields.forEach(oControl => {
					const bIsFilled = this._isFieldFilled(oControl);
					const sControlId = oControl.getId() ? oControl.getId().split("--").pop() : "unknown";
					const sControlType = oControl.getMetadata().getName();
					let sValue = "";
					
					// Get current value for debugging
					try {
						if (oControl.isA("sap.m.Input") || oControl.isA("sap.m.DatePicker")) {
							sValue = oControl.getValue() || "";
						} else if (oControl.isA("sap.m.Select")) {
							sValue = oControl.getSelectedKey() || "";
						} else if (oControl.isA("sap.m.CheckBox")) {
							sValue = oControl.getSelected() ? "true" : "false";
						} else if (oControl.isA("sap.m.Switch")) {
							sValue = oControl.getState() ? "true" : "false";
						}
					} catch (oError) {
						sValue = "error";
					}
					
					if (bIsFilled) {
						iFilledCount++;
					}
				});
				
				const iPercentage = aVisibleFields.length > 0 ? 
					Math.round((iFilledCount / aVisibleFields.length) * 100) : 0;
				
				const sState = formatter.getCompletionState(iPercentage);
				
				// Stocker la valeur de completion dans le modèle header
				const oContext = this.getView().getBindingContext();
				if (oContext) {
					const oModel = this.getView().getModel();
					const sPath = oContext.getPath();
					
					// Stocker le pourcentage comme string pour correspondre au format backend string
					const sCompletionValue = iPercentage.toString();
					oModel.setProperty(sPath + "/Completion", sCompletionValue);
				}
				
			} catch (oError) {
				// Silently handle errors
			}
		},

		/**
		 * Reset form completion values and detach listeners when navigating between requests
		 * @private
		 */
		_resetFormCompletion: function() {
			// Detach previous listeners to avoid conflicts
			this._detachCompletionListeners();
			
			console.log("🔄 Form completion listeners reset for new request navigation");
		},

		/**
		 * Detach previous completion listeners to avoid collisions when navigating between requests
		 * @private
		 */
		_detachCompletionListeners: function() {
			// Detach from all form fields in the view to avoid conflicts
			const oView = this.getView();
			const aAllControls = oView.findAggregatedObjects(true, function(oControl) {
				return (oControl.isA("sap.m.Input") || 
						oControl.isA("sap.m.Select") || 
						oControl.isA("sap.m.CheckBox") || 
						oControl.isA("sap.m.Switch") ||
						oControl.isA("sap.m.DatePicker"));
			});
			
			aAllControls.forEach(oControl => {
				if (oControl.isA("sap.m.Input") || oControl.isA("sap.m.DatePicker")) {
					oControl.detachChange(this._calculateFormCompletion, this);
				} else if (oControl.isA("sap.m.Select")) {
					oControl.detachChange(this._calculateFormCompletion, this);
				} else if (oControl.isA("sap.m.CheckBox")) {
					oControl.detachSelect(this._calculateFormCompletion, this);
				} else if (oControl.isA("sap.m.Switch")) {
					oControl.detachChange(this._calculateFormCompletion, this);
				}
			});
			
			console.log(`🧹 Detached completion listeners from ${aAllControls.length} controls`);
		},

		/**
		 * Attach event listeners to all form fields for real-time completion calculation
		 * @private
		 */
		_attachCompletionListeners: function() {
			// First detach any existing listeners to avoid duplicates
			this._detachCompletionListeners();
			
			const aVisibleFields = this._getVisibleFormFields();
			
			aVisibleFields.forEach(oControl => {
				if (oControl.isA("sap.m.Input") || oControl.isA("sap.m.DatePicker")) {
					oControl.attachChange(this._calculateFormCompletion, this);
				} else if (oControl.isA("sap.m.Select")) {
					oControl.attachChange(this._calculateFormCompletion, this);
				} else if (oControl.isA("sap.m.CheckBox")) {
					oControl.attachSelect(this._calculateFormCompletion, this);
				} else if (oControl.isA("sap.m.Switch")) {
					oControl.attachChange(this._calculateFormCompletion, this);
				}
			});
		}

	});
});