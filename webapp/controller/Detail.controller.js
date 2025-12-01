sap.ui.define([
	"com/un/zhrbenefrequests/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"com/un/zhrbenefrequests/model/formatter",
	"com/un/zhrbenefrequests/model/constants",
	"sap/base/strings/formatMessage",
	"sap/ui/core/ValueState",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
], function (BaseController, JSONModel, formatter, constants, formatMessage, ValueState, MessageBox, MessageToast, Filter,
	FilterOperator) {
	"use strict";

	return BaseController.extend("com.un.zhrbenefrequests.controller.Detail", {

		formatter: formatter,

		// Global array to store required fields from backend UI settings
		_aRequiredFields: [],

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
				completionPercentage: 0,
				completionState: "Error",
				role: constants.USER_ROLES.EMPLOYEE // Default initialization
			});
			this.setModel(oViewModel, "detailView");

			this.fragments = this.fragments || {};

			// Configure OData model for deferred batch mode
			const oModel = this.getOwnerComponent().getModel();
			oModel.setUseBatch(true);
			oModel.setDeferredGroups(["allSave"]);
			oModel.setChangeGroups({
				// Catch ALL entities and defer them until explicit submitChanges
				"*": { groupId: "allSave", changeSetId: "all", single: false }
			});

			this._initLocalModels();

			// this.getRouter().getRoute("RouteDetail").attachPatternMatched(this._onObjectMatched, this);
			this.getRouter().getRoute("RouteDetail").attachPatternMatched(function (oEvent) {
				this._onObjectMatched(oEvent, "RouteDetail");
			}.bind(this));
			this.getRouter().getRoute("RouteDetailOnly").attachPatternMatched(function (oEvent) {
				this._onObjectMatched(oEvent, "RouteDetailOnly");
			}.bind(this));

			// attach validation events //TO_CHECK
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

		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler for the button delete 
		 * @param {sap.ui.base.Event} oEvent the button Click event
		 * @public
		 */
		onDeleteButtonPress: function (oEvent) {
			const that = this;
			const oView = this.getView();
			const oModel = oView.getModel();

			MessageBox.warning(this.getText("confirmDeletion"), {
				title: this.getText("confirmDeletionTitle"),
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
								MessageToast.show(that.getText("requestDeleted"));
								that.getRouter().navTo("RouteMaster");
							}
						});
					} else { //Request cancelled
						MessageToast.show(that.getText("deletionCancelled"));
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
		 * Validates required fields before showing comment dialog and submitting
		 * @public
		 */
	onSubmitButtonPress: function () {
		const that = this;

		// Validate required fields before proceeding
		const aValidationErrors = this._validateRequiredFields();			if (aValidationErrors.length > 0) {
				// Show generic validation error message (fields are already highlighted in red)
				const sErrorMessage = this.getText("requiredFieldsValidation");

				sap.m.MessageBox.error(sErrorMessage, {
					title: this.getText("validationErrorTitle")
				});

				// Set focus on the first invalid field
				this._focusFirstInvalidField(aValidationErrors);
				return;
			}			// Show comment dialog and submit directly after comment
			this.showCommentDialog((sComment) => {
				// Submit directly with the comment - no second confirmation needed
				that._submitBenefitRequest(sComment);
			});
		},


		/*********************  Claim  *********************/

		/**
		 * Event handler for the Add Claim button
		 * Opens the ClaimAdd dialog for new claim entry
		 */
		onAddClaimButtonPress: function () {
			const that = this;
			const oView = this.getView();

			// Create dialog only once
			if (!this.fragments._oAddClaimDialog) {
				this.fragments._oAddClaimDialog = new sap.m.Dialog({
					title: this.getText("addClaim"),
					content: sap.ui.xmlfragment("com.un.zhrbenefrequests.fragment.form.educationGrant.ClaimAdd", this),
					beginButton: new sap.m.Button({
						text: this.getText("cancel"),
						press: function () {
							that._removeClaimAddDialog();
						}
					}),
					endButton: new sap.m.Button({
						text: this.getText("submit"),
						press: function () {
							that._onConfirmAddClaim();
						}
					})
				});
				this.fragments._oAddClaimDialog.setModel(oView.getModel("i18n"), "i18n");
			}

			// Get TuitionWaers from binding context
			const oContext = oView.getBindingContext();
			const oModel = oView.getModel();
			const sPath = oContext.getPath() + "/ToEduGrantDetail";
			const eduGrantDetail = oModel.getProperty(sPath);
			const sTuitionWaers = eduGrantDetail?.TuitionWaers || "";

			// Create a fresh model for each dialog opening
			const oDialogModel = new sap.ui.model.json.JSONModel({
				ExpenseType: "tuition",
				ExpenseAmount: "",
				AdvanceAmount: "",
				Currency: sTuitionWaers
			});
			oDialogModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);

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

			// Create dialog only once
			if (!this.fragments._oAddAdvanceDialog) {
				this.fragments._oAddAdvanceDialog = new sap.m.Dialog({
					title: this.getText("addAdvance"),
					content: sap.ui.xmlfragment("com.un.zhrbenefrequests.fragment.form.educationGrant.AdvanceAdd", this),
					beginButton: new sap.m.Button({
						text: this.getText("cancel"),
						press: function () {
							that._removeAdvanceAddDialog();
						}
					}),
					endButton: new sap.m.Button({
						text: this.getText("submit"),
						press: function () {
							that._onConfirmAddAdvance();
						}
					})
				});

			}

			// Get TuitionWaers from binding context
			const oContext = oView.getBindingContext();
			const oModel = oView.getModel();
			const sPath = oContext.getPath() + "/ToEduGrantDetail";
			const eduGrantDetail = oModel.getProperty(sPath);
			const sTuitionWaers = eduGrantDetail?.TuitionWaers || "";

			// Create a fresh model with OData property names
			const oDialogModel = new sap.ui.model.json.JSONModel({
				Excos: "",      // Expense Type
				Examt: "",      // Expense Amount
				Waers: sTuitionWaers,  // Currency initialized from TuitionWaers
				Exdat: new Date() // Date
			});


			this.fragments._oAddAdvanceDialog.setModel(oDialogModel, "advanceModel");
			oView.addDependent(this.fragments._oAddAdvanceDialog);
			this.fragments._oAddAdvanceDialog.open();
		},

		/**
		 * Event handler for deleting an advance from the table
		 * Removes the selected advance from the local model "adv"
		 * @param {sap.ui.base.Event} oEvent - The delete event
		 * @public
		 */
		onDeleteAdvanceButtonPress: function (oEvent) {
			const oListItem = oEvent.getParameter("listItem");
			const oBindingContext = oListItem.getBindingContext("adv");

			if (oBindingContext) {
				// Get the index of the item to delete
				const sPath = oBindingContext.getPath();
				const iIndex = parseInt(sPath.split("/").pop());

				// Get the local advances model
				const oAdvModel = this.getView().getModel("adv");
				const aItems = oAdvModel.getProperty("/items") || [];

				// Remove the advance at the specified index
				aItems.splice(iIndex, 1);

				// Update the model
				oAdvModel.setProperty("/items", aItems);

				// Show confirmation message
				sap.m.MessageToast.show(this.getText("advanceDeleted"));
			}
		},		/*************************************************************************************************/
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
				// Clear all school-related fields when no school is selected
				this._clearSchoolFields();
			}
		},		/**
		 * Event handler for the Cancel button in the floating footer bar
		 * Discards all unsaved changes and refreshes data from backend
		 * @public
		 */
		onCancelButtonPress: function () {
			const oModel = this.getView().getModel();
			const oContext = this.getView().getBindingContext();

			// Reset any pending changes to discard unsaved modifications
			if (oModel.hasPendingChanges()) {
				oModel.resetChanges();
				sap.m.MessageToast.show(this.getText("changesDiscarded"));
			} else {
				sap.m.MessageToast.show(this.getText("noChangesToDiscard"));
			}

			// Reload local models from backend to restore original state
			if (oContext) {
				const sGuid = oContext.getProperty("Guid");
				const sRequestType = oContext.getProperty("RequestType");

				// Reload attachments from backend
				this._initLocalAttachmentsFromBackend(sGuid);

				// Reload claims and advances based on request type
				if (sRequestType === constants.REQUEST_TYPES.EDUCATION_GRANT) { // Education Grant
					this._initLocalClaimsFromBackend(sGuid);
					this._initLocalAdvancesFromBackend(sGuid);
				}
			}
		},		/**
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
			
			// Check if YYPSYEAR should be mandatory for post-secondary types
			if (this.formatter.isPostSecondary(sSelectedKey)) {
				this._checkFieldUISettings("YYPSYEAR");
			} else {
				// Remove YYPSYEAR from required fields if school type is not post-secondary
				this._removeFieldFromRequired("YYPSYEAR");
			}
		}
	},		/*************************************************************************************************/
		/********************************  End of School management ******************************************/
		/*************************************************************************************************/

		/**
		 * Event handler for proration factor checkbox select
		 * Controls editability of EGFAC field based on EGPRO checkbox state
		 * @param {sap.ui.base.Event} oEvent - The checkbox select event
		 * @public
		 */
	onSelectProrationFactor: function (oEvent) {
		const bSelected = oEvent.getSource().getSelected();
		const oView = this.getView();
		const oEgfacField = oView.byId("EGFAC");			if (oEgfacField) {
				// Set editability based on checkbox state
				oEgfacField.setEditable(bSelected);
				oEgfacField.setEnabled(bSelected);

			}
		},

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
		 * Event handler for currency value help button press in Rental Subsidy.
		 * Opens a dialog to select currency from available options.
		 * Automatically detects the source field from the event.
		 * @param {sap.ui.base.Event} oEvent - The button press event
		 * @public
		 */
		onCurrencyValueHelpPressRS: function (oEvent) {
			// Get the ID of the control that triggered the event
			const sSourceFieldId = oEvent.getSource().getId();
			// Extract just the field ID (remove view prefix if present)
			const sFieldId = sSourceFieldId.split("--").pop();
			this._openCurrencyDialogRS(sFieldId);
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
				let oFilterId = new Filter("Id", sap.ui.model.FilterOperator.Contains, sValue);
				let oFilterTxt = new Filter("Txt", sap.ui.model.FilterOperator.Contains, sValue);
				let oCombinedFilter = new Filter({
					filters: [oFilterId, oFilterTxt],
					and: false  // OR logic - search in Id OR Txt
				});
				let oBinding = oEvent.getSource().getBinding("items");
				oBinding.filter([oCombinedFilter]);
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

	/**
	 * Event handler for currency value help in table rows (Claims/Advances)
	 * @param {sap.ui.base.Event} oEvent - The button press event
	 * @public
	 */
	onCurrencyValueHelpPressTable: function (oEvent) {
		const oInput = oEvent.getSource();
		// Store the input field reference for later update
		this._sTableCurrencyField = oInput;
		this._openCurrencyDialogForTable();
	},

/**
 * Private method to open currency dialog for table fields
 * Uses a separate dialog instance with custom confirm handler
 * @private
 */
_openCurrencyDialogForTable: function () {
	const oView = this.getView();
	
	// Destroy previous instance to ensure fresh handler attachment
	if (this.fragments._oCurrencyDialogTable) {
		this.fragments._oCurrencyDialogTable.destroy();
		delete this.fragments._oCurrencyDialogTable;
	}
	
	// Create new dialog with table-specific confirm handler
	this.fragments._oCurrencyDialogTable = sap.ui.xmlfragment(
		"tableDialogId",
		"com.un.zhrbenefrequests.fragment.form.educationGrant.CurrencyChoice", 
		{
			onConfirmCurrencySelectDialogPress: this.onConfirmCurrencySelectDialogPressTable.bind(this),
			onSearchCurrencySelectDialog: this.onSearchCurrencySelectDialog.bind(this)
		}
	);
	
	this.getView().addDependent(this.fragments._oCurrencyDialogTable);
	this.fragments._oCurrencyDialogTable.addStyleClass(this.getOwnerComponent().getContentDensityClass());
	this.fragments._oCurrencyDialogTable.open();
},	/**
	 * Event handler for confirming currency selection in table
	 * Updates the model directly for table row bindings
	 * @param {sap.ui.base.Event} oEvent - The confirm event
	 * @public
	 */
	onConfirmCurrencySelectDialogPressTable: function (oEvent) {
		const aContexts = oEvent.getParameter("selectedContexts");
		
		if (aContexts && aContexts.length && this._sTableCurrencyField) {
			let sCurrencyId = aContexts[0].getObject().Id;
			
			// Get binding context and update model directly
			const oBindingContext = this._sTableCurrencyField.getBindingContext("clm") || 
									this._sTableCurrencyField.getBindingContext("adv");
			
			if (oBindingContext) {
				const sPath = oBindingContext.getPath() + "/Waers";
				const oModel = oBindingContext.getModel();
				oModel.setProperty(sPath, sCurrencyId);
			}
		}
		
		// clear filters
		oEvent.getSource().getBinding("items").filter([]);
		// cleanup
		this._sTableCurrencyField = null;
	},

	/*************************************************************************************************/
	/********************************  End of Currency Management *************************************/
	/*************************************************************************************************/		/*************************************************************************************************/
		/********************************  Begin of Attachment Management ********************************/
		/*************************************************************************************************/

	/**
	 * Generic handler for all attachment file selections
	 * Reads the FileUploader ID to determine attachment type
	 * Validates file type and size, stores File object (Blob) in local model for binary upload
	 * @param {sap.ui.base.Event} oEvent - The file change event
	 * @public
	 */
	onAttachmentFileChange: function (oEvent) {
		const that = this;
		const oFileUploader = oEvent.getSource();			// Get attachment type from FileUploader ID (005, 004, 010, 009, 011)
			const sAttachmentType = oFileUploader.getId().split("--").pop(); // Remove view prefix

			const domRef = oFileUploader.getFocusDomRef();
			const aFiles = domRef.files; // Read files IMMEDIATELY

			if (!aFiles || aFiles.length === 0) {
				return;
			}

			const oAttachmentsModel = this.getView().getModel("attachments");
			const aExistingItems = oAttachmentsModel.getProperty("/items") || [];

			// Process each file immediately
			Array.from(aFiles).forEach(function (file) {
				// Validate file type
				const sFileType = file.type;
				const aAllowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];

				if (!aAllowedTypes.includes(sFileType)) {
					sap.m.MessageBox.error(that.getText("invalidFileType") + ": " + file.name);
					return;
				}

				// Validate file size (5MB max)
				const nMaxSize = 5 * 1024 * 1024; // 5MB in bytes
				if (file.size > nMaxSize) {
					sap.m.MessageBox.error(that.getText("fileTooLarge") + ": " + file.name);
					return;
				}

				// Store File object (Blob) directly for binary upload
				aExistingItems.push({
					AttType: sAttachmentType,
					IncNb: '00', // New files always start with '00'
					Filename: file.name,
					Filetype: file.type,
					Blob: file,  // Store File object (Blob) for binary upload
					toDelete: false  // Ensure new files are not marked for deletion
				}); oAttachmentsModel.setProperty("/items", aExistingItems);
				oAttachmentsModel.refresh(true); // Force refresh to update bindings
				sap.m.MessageToast.show(that.getText("fileAdded") + ": " + file.name);
			});

			// Clear the FileUploader to allow re-selection of same file
			oFileUploader.clear();
		},

		/**
		 * Handler to view/download an attachment
		 * @param {sap.ui.base.Event} oEvent - The press event
		 * @public
		 */
		onViewAttachment: function (oEvent) {
			const oListItem = oEvent.getSource();
			const oContext = oListItem.getBindingContext("attachments");

			if (!oContext) {
				console.error("No binding context found for attachment");
				return;
			}

			const oAttachment = oContext.getObject();
			console.log("Attachment object:", oAttachment);

			// Only allow viewing files that are saved on backend (IncNb != '00')
			if (oAttachment.IncNb === "00") {
				sap.m.MessageToast.show(this.getText("fileNotYetSaved"));
				return;
			}

			// Get the Guid from the main view context
			const oBindingContext = this.getView().getBindingContext();
			if (!oBindingContext) {
				console.error("No binding context for view");
				return;
			}

			const sGuid = oBindingContext.getProperty("Guid");
			console.log("Request Guid:", sGuid);
			console.log("AttachType:", oAttachment.AttType);
			console.log("IncNb:", oAttachment.IncNb);

			// Construct the URL to download the file
			const sUrl = `/sap/opu/odata/sap/ZHR_BENEFITS_COMMON_SRV/AttachmentSet(Guid=guid'${sGuid}',AttachType='${oAttachment.AttType}',IncNb='${oAttachment.IncNb}')/$value`;
			console.log("Opening URL:", sUrl);

			// Open in new window
			window.open(sUrl, "_blank");
		},

		/**
		 * Handler to remove an attachment from the local model or mark for deletion
		 * @param {sap.ui.base.Event} oEvent - The press event
		 * @public
		 */
		onRemoveAttachment: function (oEvent) {
			// Stop event propagation to prevent triggering the list item's press event
			oEvent.cancelBubble();

			const oButton = oEvent.getSource();
			const oListItem = oButton.getParent().getParent(); // Button -> HBox -> CustomListItem
			const oContext = oListItem.getBindingContext("attachments");
			const oAttachment = oContext.getObject();

			// Get the index directly from the binding context path
			const sPath = oContext.getPath(); // "/items/3"
			const nIndex = parseInt(sPath.split("/").pop()); // Extract index (3)

			const oAttachmentsModel = this.getView().getModel("attachments");
			const aItems = oAttachmentsModel.getProperty("/items") || [];

			if (nIndex >= 0 && nIndex < aItems.length) {
				if (oAttachment.IncNb === "00") {
					// New attachment not yet saved - remove from local model immediately
					aItems.splice(nIndex, 1);
				} else {
					// Existing attachment from backend - mark for deletion
					aItems[nIndex].toDelete = true;
				}
				oAttachmentsModel.setProperty("/items", aItems);
				oAttachmentsModel.refresh(true); // Force refresh to apply filters
				sap.m.MessageToast.show(this.getText("fileRemoved") + ": " + oAttachment.Filename);
			}
		},

		/*************************************************************************************************/
		/********************************  End of Attachment Management **********************************/
		/*************************************************************************************************/

		/* =========================================================== */
		/* Internal & private  methods                                 */
		/* =========================================================== */
		/**
 * Internal method to submit the benefit request with comment
 * @param {string} sComment - The submission comment
 * @private
 */
		_submitBenefitRequest: function (sComment) {
			// Pass empty string to trigger auto-detection of status based on Isclaim and Isadvance
			this._saveBenefitRequestObject("", sComment);
		},


		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function (oEvent, routeName) {
			// detach previous listeners when navigating to avoid conflicts
			this._detachCompletionListeners();

			// Clear local models when navigating to a different request
			this._clearLocalModels();

			// Extract GUID and requestType from arguments
			const oArguments = oEvent.getParameter("arguments") || {};
			const sBenefitRequestId = oArguments.benefitRequestId;
			const sRequestType = oArguments.requestType; // Get requestType from URL parameters

			// ROLE-BASED BUTTON VISIBILITY MANAGEMENT
			// Override default role if provided in route arguments (e.g., from RouteDetailOnly)
			const oViewModel = this.getModel("detailView");
			if (oViewModel && oArguments.role) {
				oViewModel.setProperty("/role", oArguments.role);
			}

			// Validate GUID
			if (!sBenefitRequestId || sBenefitRequestId === "00000000-0000-0000-0000-000000000000" ||
				sBenefitRequestId === "undefined" || sBenefitRequestId === "null") {
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

				// Load value help data for dropdown lists based on request type
				this._loadValueHelpData(sRequestType);

				// Reload auxiliary data (Timeline, Attachments, Claims, Advances)
				this._reloadAuxiliaryData(sBenefitRequestId, sRequestType);
			}.bind(this));
		},

	/**
	 * Reloads all auxiliary data (Timeline, Attachments, Claims, Advances)
	 * Reusable method for full data refresh without navigation
	 * @param {string} sGuid - The request GUID
	 * @param {string} sRequestType - The request type (optional, will be read from context if not provided)
	 * @private
	 */
	_reloadAuxiliaryData: function (sGuid, sRequestType) {
		// Get request type from context if not provided
		if (!sRequestType) {
			const oContext = this.getView().getBindingContext();
			sRequestType = oContext ? oContext.getProperty("RequestType") : null;
		}

		// Bind Timeline with request Guid filter
		this._bindTimelineData(sGuid);

		// Load attachments from backend
		this._initLocalAttachmentsFromBackend(sGuid);

		// Load claims and advances based on request type
		if (sRequestType === constants.REQUEST_TYPES.EDUCATION_GRANT) { // Education Grant only
			this._initLocalAdvFromBackend(sGuid);
			this._initLocalClmFromBackend(sGuid);
		}
	},		/**
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
				oObject = oView.getModel().getObject(sPath),
				sObjectId = oObject.Guid,
				sObjectName = oObject.Title,
				oViewModel = this.getModel("detailView");

			this.getOwnerComponent().oListSelector.selectAListItem(sPath);			// Get UI settings now that binding context is available
			this._getUISettings();
		},		/**
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
		 * Adds entry to local JSON model "clm"
		 * @private
		 */
	_onConfirmAddClaim: function () {
		const oDialogModel = this.fragments._oAddClaimDialog.getModel("claimModel");
		const oClaimData = oDialogModel.getData();			// Format amounts as string for Edm.Decimal
			const sExpenseAmount = oClaimData.ExpenseAmount ? parseFloat(oClaimData.ExpenseAmount).toFixed(3) : "0.000";
			const sAdvanceAmount = oClaimData.AdvanceAmount ? parseFloat(oClaimData.AdvanceAmount).toFixed(3) : "0.000";

			// Create a new claim entry
			const oNewClaim = {
				Excos: oClaimData.ExpenseType || "",
				ExamtE: sExpenseAmount,  // ExamtE = Expense Amount (String for Edm.Decimal)
				Examt: sAdvanceAmount,   // Examt = Advance Amount (String for Edm.Decimal)
				Waers: (oClaimData.Currency || "").toUpperCase()
			};

			// Add to local model
			const oClmModel = this.getView().getModel("clm");
			const aItems = oClmModel.getProperty("/items") || [];
			aItems.push(oNewClaim);
			oClmModel.setProperty("/items", aItems);

			sap.m.MessageToast.show(this.getText("claimAdded"));
			this._removeClaimAddDialog();
		},		/**

		/**
		 * Confirms the addition of a new advance
		 * Adds entry to local JSON model "adv"
		 * @private
		 */
	_onConfirmAddAdvance: function () {
		const oDialogModel = this.fragments._oAddAdvanceDialog.getModel("advanceModel");
		const oAdvanceData = oDialogModel.getData();			// Format amount as string for Edm.Decimal
			const sAmount = oAdvanceData.Examt ? parseFloat(oAdvanceData.Examt).toFixed(3) : "0.000";

			// Create a new advance entry
			const oNewAdvance = {
				Excos: oAdvanceData.Excos || "",
				Examt: sAmount,  // String for Edm.Decimal
				Waers: (oAdvanceData.Waers || "").toUpperCase(),
				Exdat: oAdvanceData.Exdat || new Date()
			};

			// Add to local model
			const oAdvModel = this.getView().getModel("adv");
			const aItems = oAdvModel.getProperty("/items") || [];
			aItems.push(oNewAdvance);
			oAdvModel.setProperty("/items", aItems);

			sap.m.MessageToast.show(this.getText("advanceAdded"));
			this._removeAdvanceAddDialog();
		},		/**
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
		 * Private method to open currency dialog for Rental Subsidy and store source field.
		 * @param {string} sSourceFieldId - The ID of the field that triggered the dialog
		 * @private
		 */
		_openCurrencyDialogRS: function (sSourceFieldId) {
			const oView = this.getView();

			// Store the source field ID for later use
			this._sCurrencySourceField = sSourceFieldId;

			if (!this.fragments._oCurrencyDialogRS) {
				this.fragments._oCurrencyDialogRS = sap.ui.xmlfragment(
					"com.un.zhrbenefrequests.fragment.form.rentalSubsidy.CurrencyChoiceRS", this);
				this.getView().addDependent(this.fragments._oCurrencyDialogRS);
				// forward compact/cozy style into Dialog
				this.fragments._oCurrencyDialogRS.addStyleClass(this.getOwnerComponent().getContentDensityClass());
			}

			this.fragments._oCurrencyDialogRS.open();
		},


		_initLocalModels: function () {			// Initialize local models for claims and advances
			const oLocalClaimsModel = new JSONModel({ items: [] });
			this.getView().setModel(oLocalClaimsModel, "clm");

			const oLocalAdvancesModel = new JSONModel({ items: [] });
			this.getView().setModel(oLocalAdvancesModel, "adv");

			// Initialize local model for attachments
		const oLocalAttachmentsModel = new JSONModel({ 
			items: [],
			// Education Grant
			canDelete005: false,
			canDelete004: false,
			canDelete010: false,
			canDelete009: false,
			canDelete011: false,
			// Rental Subsidy
			canDelete001: false,
			canDelete002: false,
			canDelete003: false,
			canDelete006: false,
			canDelete007: false,
			canDelete008: false,
			canDelete012: false
		});
		this.getView().setModel(oLocalAttachmentsModel, "attachments");			// Initialize value help models
			this._initializeValueHelpModels();
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
			const oCurrencyPaymentModel = new JSONModel();
			const oEgCustomerStatusModel = new JSONModel();
			const oExpenseTypeModel = new JSONModel();
			const oApplicationReasonModel = new JSONModel();
			const oDwellingRentTypeModel = new JSONModel();
			const oReimbursementApplicationTypeModel = new JSONModel();
			const oCurrencyRSModel = new JSONModel();

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
			this.setModel(oCurrencyPaymentModel, "currencyPaymentModel");
			this.setModel(oEgCustomerStatusModel, "egCustomerStatusModel");
			this.setModel(oExpenseTypeModel, "expenseTypeModel");
			this.setModel(oApplicationReasonModel, "applicationReasonModel");
			this.setModel(oDwellingRentTypeModel, "dwellingRentTypeModel");
			this.setModel(oReimbursementApplicationTypeModel, "reimbursementApplicationTypeModel");
			this.setModel(oCurrencyRSModel, "currencyRSModel");
		},		/**
		 * Retrieves UI settings for form fields based on request type and status.
		 * Applies dynamic visibility, editability and requirement rules to form controls.
		 * @private
		 */
	_getUISettings: function () {
		//	debugger;
		const oCommonModel = this.getOwnerComponent().getModel("commonModel");
		let aFilters = [];

		const oCurrentObject = this.getBindingDetailObject();
		aFilters.push(new Filter("RequestType", FilterOperator.EQ, oCurrentObject.RequestType));
		aFilters.push(new Filter("Status", FilterOperator.EQ, oCurrentObject.RequestStatus));
		aFilters.push(new Filter("Actor", FilterOperator.EQ, this.getModel("detailView").getProperty("/role")));
		aFilters.push(new Filter("Guid", FilterOperator.EQ, oCurrentObject.Guid));
		
		//Read entitySet
		oCommonModel.read("/UI5PropertySet", {
			filters: aFilters,
			success: this.getUI5PropertySetSuccess.bind(this),
			error: this.fError.bind(this)
		});
	},	/**
	 * Success callback for UI5PropertySet read operation.
	 * Processes UI settings and applies them to form controls dynamically.
	 * @param {object} oData - Response data from the service
	 * @param {object} oResponse - Full response object
	 * @private
	 */
	getUI5PropertySetSuccess: function (oData) {
		const aUIProperties = oData?.results || [];
		const oView = this.getView();

		// Clear and rebuild the required fields array
		this._aRequiredFields = [];

		// Track delete button visibility for tables
		let bClaimDeleteVisible = true;
		let bAdvanceDeleteVisible = true;

		for (const oUIProperty of aUIProperties) {				// Defaut is field from the list by Backend is not visible and not editable
			this._resetVisibility(oUIProperty.Field);


			let editable = false,
				enabled = false,
				hidden = true,
				required = false;


			//Special cases - Skip fields with custom visibility management
			if (this._isUISettingsException(oUIProperty.Field)) {
				continue;
			}

			switch (oUIProperty.Property) {
				case "01":
					hidden = true; //redundant but ok as Hidden by default
					break; // Hidden
				case "02":
					hidden = false;
					break; // Visible
				case "03":
					hidden = false;
					editable = enabled = true;
					break; // Editable
				case "04":
					hidden = false;
					required = editable = enabled = true;
					break; // Mandatory
			}

		// Track delete button visibility for Claims
		if (oUIProperty.Field === "BTNDELCLAIM") {
			bClaimDeleteVisible = !hidden;
		}

		// Track delete button visibility for Advances
		if (oUIProperty.Field === "BTNDELADVANCE") {
			bAdvanceDeleteVisible = !hidden;
		}

		// Track delete button visibility for Attachments (based on FileUploader visibility)
		const oAttachmentsModel = this.getView().getModel("attachments");
		// List of attachment field IDs (Education Grant + Rental Subsidy)
		const aAttachmentFields = ["005", "004", "010", "009", "011", "001", "002", "003", "006", "007", "008", "012"];
		// Set canDelete property dynamically: canDelete + Field ID
		if (oAttachmentsModel && aAttachmentFields.includes(oUIProperty.Field)) {
			oAttachmentsModel.setProperty("/canDelete" + oUIProperty.Field, !hidden);
		}

		// Find the control by its id (which must match Field)
		const oCtrl = oView.byId(oUIProperty.Field);

			// Store required field info AFTER getting the control, so we can get the proper label
			if (oUIProperty.Property === "04" && oCtrl) {
				this._aRequiredFields.push({
					fieldId: oUIProperty.Field,
					label: this._getFieldLabel(oUIProperty.Field, oCtrl)
				});
			}

			if (oCtrl) {
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
			}
		}

		// Apply table mode based on delete button visibility
		const oViewModel = this.getModel("detailView");
		
		// Claims Table
		const oClaimTable = this.byId("claimTable");
		if (oClaimTable) {
			oClaimTable.setMode(bClaimDeleteVisible ? "Delete" : "None");
			oViewModel.setProperty("/claimTableEditable", bClaimDeleteVisible);
		}

		// Advances Table
		const oAdvanceTable = this.byId("advanceTable");
		if (oAdvanceTable) {
			oAdvanceTable.setMode(bAdvanceDeleteVisible ? "Delete" : "None");
			oViewModel.setProperty("/advanceTableEditable", bAdvanceDeleteVisible);
		}

		// Call the diagnostic function here
		this._logImpactedUIFields(aUIProperties);
	},

	/**
	 * Checks UI settings for a specific field and adds it to required fields if mandatory
	 * @param {string} sFieldId - The field ID to check
	 * @private
	 */
	_checkFieldUISettings: function (sFieldId) {
		const oCommonModel = this.getOwnerComponent().getModel("commonModel");
		const oCurrentObject = this.getBindingDetailObject();
		
		let aFilters = [];
		aFilters.push(new Filter("RequestType", FilterOperator.EQ, oCurrentObject.RequestType));
		aFilters.push(new Filter("Status", FilterOperator.EQ, oCurrentObject.RequestStatus));
		aFilters.push(new Filter("Actor", FilterOperator.EQ, this.getModel("detailView").getProperty("/role")));
		aFilters.push(new Filter("Guid", FilterOperator.EQ, oCurrentObject.Guid));
		aFilters.push(new Filter("Field", FilterOperator.EQ, sFieldId)); // Filter specific field
		
		oCommonModel.read("/UI5PropertySet", {
			filters: aFilters,
			success: (oData) => {
				const aResults = oData?.results || [];
				if (aResults.length > 0) {
					const oProperty = aResults[0];
					const oView = this.getView();
					const oCtrl = oView.byId(sFieldId);
					
					// If property is "04" (Mandatory) and control exists, add to required fields
					if (oProperty.Property === "04" && oCtrl) {
						// Remove existing entry if present
						this._removeFieldFromRequired(sFieldId);
						// Add to required fields
						this._aRequiredFields.push({
							fieldId: sFieldId,
							label: this._getFieldLabel(sFieldId, oCtrl)
						});
					}
				}
			},
			error: this.fError.bind(this)
		});
	},

	/**
	 * Removes a field from the required fields array
	 * @param {string} sFieldId - The field ID to remove
	 * @private
	 */
	_removeFieldFromRequired: function (sFieldId) {
		this._aRequiredFields = this._aRequiredFields.filter(field => field.fieldId !== sFieldId);
	},

	/**
		 * Gets the field label for a given field ID by searching for associated Label controls
		 * @param {string} sFieldId - The field ID
		 * @param {sap.ui.core.Control} oControl - The control (optional)
		 * @returns {string} The field label or empty string if not found
		 * @private
		 */
		_getFieldLabel: function (sFieldId, oControl) {
			const oView = this.getView();

			// Try to find a Label that references this field via labelFor property
			const aLabels = oView.findAggregatedObjects(true, function (oObj) {
				return oObj.isA && oObj.isA("sap.m.Label") &&
					oObj.getLabelFor && oObj.getLabelFor() === sFieldId;
			});

			if (aLabels.length > 0) {
				return aLabels[0].getText() || "";
			}

			// Try alternative approach: look for labels in the same FormContainer/FormElement
			if (oControl) {
				const oParent = oControl.getParent();
				if (oParent && oParent.getLabel && oParent.getLabel()) {
					return oParent.getLabel();
				}
			}

			// Fallback: try to find label by proximity (same parent container)
			if (oControl) {
				const oContainer = oControl.getParent();
				if (oContainer) {
					const aSiblings = oContainer.getAggregation("content") || oContainer.getContent && oContainer.getContent() || [];
					for (let i = 0; i < aSiblings.length; i++) {
						const oSibling = aSiblings[i];
						if (oSibling.isA && oSibling.isA("sap.m.Label")) {
							const sLabelText = oSibling.getText();
							if (sLabelText) {
								return sLabelText;
							}
						}
					}
				}
			}

			return ""; // No label found
		},

	/**
	 * Event handler for Set Claim button (BTNSETCLAIM)
	 * Calls backend function import addClaimForAdvance to set isClaim flag
	 * Refreshes header binding to update UI and trigger UI settings reload
	 * @public
	 */
	onSetClaimButtonPress: function () {
		const oView = this.getView();
		const oContext = oView.getBindingContext();
		const oModel = oView.getModel();

		// Get Guid from binding context
		const sGuid = oContext.getProperty("Guid");

		// Call function import addClaimForAdvance
		oModel.callFunction("/addClaimForAdvance", {
			method: "POST",
			urlParameters: {
				Guid: sGuid
			},
			success: (oData) => {
				const oResult = oData?.addClaimForAdvance;
				const sReturnCode = oResult?.ReturnCode?.trim();

				if (sReturnCode === "0") {
					const oElementBinding = oView.getElementBinding();
					if (oElementBinding) {
						// Create one-time event handler to reload auxiliary data AFTER refresh completes
						const fnDataReceived = () => {
							oElementBinding.detachDataReceived(fnDataReceived);
							const sRequestType = oContext.getProperty("RequestType");
							this._reloadAuxiliaryData(sGuid, sRequestType);
						};
						
						// Attach event handler BEFORE calling refresh
						oElementBinding.attachDataReceived(fnDataReceived);
						oElementBinding.refresh(true);
					}
				} else {
					// Display backend error message
					const sMessage = oResult?.Message || this.getText("setClaimErrorTechnical");
					sap.m.MessageBox.error(sMessage, {
						title: this.getText("setClaimErrorTitle"),
						details: this.getText("setClaimErrorDetails", [sReturnCode])
					});
				}
			},
			error: (oError) => {
				sap.m.MessageBox.error(this.getText("setClaimErrorTechnical"), {
					title: this.getText("setClaimErrorTitle")
				});
			}
		});
	},		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		onApproveButtonPress: function () {
			const oModel = this.getView().getModel("approveModel");

			const sHash = sap.ui.core.routing.HashChanger.getInstance().getHash();
			const aHashParts = sHash.split("&");
			const sDetailPath = aHashParts.find(part => part.includes("DetailOnly"));

			if (!sDetailPath) {
				sap.m.MessageBox.error(this.getText("approvalInvalidUrl"));
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
						const sMessage = oResult?.Message || this.getText("approvalNoMessage");

						if (sReturnCode === "0") {
							sap.m.MessageToast.show(this.getText("approvalSuccess"), {
								duration: 2000
							});
							window.history.back();
						} else {
							sap.m.MessageBox.error(sMessage, {
								title: this.getText("approvalErrorTitle"),
								details: this.getText("approvalErrorDetails", [sReturnCode])
							});
						}
					},
					error: () => {
						sap.m.MessageBox.error(this.getText("approvalErrorTechnical"), {
							title: this.getText("approvalErrorTitle")
						});
					}
				});
			});
		},

		onRejectButtonPress: function () {
			const oModel = this.getView().getModel("approveModel");

			const sHash = sap.ui.core.routing.HashChanger.getInstance().getHash();
			const aHashParts = sHash.split("&");
			const sDetailPath = aHashParts.find(part => part.includes("DetailOnly"));

			if (!sDetailPath) {
				sap.m.MessageBox.error(this.getText("approvalInvalidUrl"));
				return;
			}

			const aSegments = sDetailPath.split("/").filter(Boolean);
			const sGuid = aSegments[1];
			const sActorRole = aSegments[2];

			this.showCommentDialog((sComment) => {
				oModel.callFunction("/RejectRequest", {
					method: "POST",
					urlParameters: {
						Guid: sGuid,
						ActorRole: sActorRole,
						RejectionComent: sComment
					},
					success: (oData) => {
						const oResult = oData?.RejectRequest;
						const sReturnCode = oResult?.ReturnCode?.trim();
						const sMessage = oResult?.Message || this.getText("approvalNoMessage");

						if (sReturnCode === "0") {
							sap.m.MessageToast.show(this.getText("rejectionSuccess"), {
								duration: 2000
							});
							window.history.back();
						} else {
							sap.m.MessageBox.error(sMessage, {
								title: this.getText("rejectionErrorTitle"),
								details: this.getText("rejectionErrorDetails", [sReturnCode])
							});
						}
					},
					error: () => {
						sap.m.MessageBox.error(this.getText("rejectionErrorTechnical"), {
							title: this.getText("rejectionErrorTitle")
						});
					}
				});
			});
		},

		onReturnButtonPress: function () {
			const oModel = this.getView().getModel("approveModel");

			const sHash = sap.ui.core.routing.HashChanger.getInstance().getHash();
			const aHashParts = sHash.split("&");
			const sDetailPath = aHashParts.find(part => part.includes("DetailOnly"));

			if (!sDetailPath) {
				sap.m.MessageBox.error(this.getText("approvalInvalidUrl"));
				return;
			}

			const aSegments = sDetailPath.split("/").filter(Boolean);
			const sGuid = aSegments[1];
			const sActorRole = aSegments[2];

			this.showCommentDialog((sComment) => {
				oModel.callFunction("/ReturnRequest", {
					method: "POST",
					urlParameters: {
						Guid: sGuid,
						ActorRole: sActorRole,
						ReturnComent: sComment
					},
					success: (oData) => {
						const oResult = oData?.ReturnRequest;
						const sReturnCode = oResult?.ReturnCode?.trim();
						const sMessage = oResult?.Message || this.getText("approvalNoMessage");

						if (sReturnCode === "0") {
							sap.m.MessageToast.show(this.getText("returnSuccess"), {
								duration: 2000
							});
							window.history.back();
						} else {
							sap.m.MessageBox.error(sMessage, {
								title: this.getText("approvalErrorTitle"),
								details: this.getText("approvalErrorDetails", [sReturnCode])
							});
						}
					},
					error: () => {
						sap.m.MessageBox.error(this.getText("returnErrorTechnical"), {
							title: this.getText("approvalErrorTitle")
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

			// Always use bindElement() to ensure events are properly configured
			this.getView().bindElement({
				path: sObjectPath,
				// Expand only ToEduGrantDetail (advances are managed via local JSON model)
				parameters: {
					expand: "ToEduGrantDetail,ToRentalSubsidyDetail"
				},
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function () {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function (oEvent) {
						oViewModel.setProperty("/busy", false);

						// Form completion will be calculated if needed
						//that._restoreFormCompletion();
						//that._attachCompletionListeners();
					}.bind(this)
				}
			});
		},

		/**
		 * Reads ReqEGAdvanceSet from backend and populates local "adv" model
		 * @param {string} sGuid - The request GUID
		 * @private
		 */
		_initLocalAdvFromBackend: function (sGuid) {
			const oModel = this.getView().getModel();
			const oAdvModel = this.getView().getModel("adv");

			// If request is not yet persisted, leave empty
			if (!sGuid || sGuid === "00000000-0000-0000-0000-000000000000") {
				oAdvModel.setProperty("/items", []);
				return;
			}

			// Create filter for Guid (same approach as Timeline)
			const oFilter = new Filter("Guid", FilterOperator.EQ, sGuid);

			// Read advances from ReqEGAdvanceSet entity set with GUID filter
			oModel.read("/ReqEGAdvanceSet", {
				filters: [oFilter],
				success: (oData) => {
					const aAdvances = (oData && oData.results) ? oData.results : [];
					// Normalize data (keep string format for Edm.Decimal)
					const items = aAdvances.map(x => ({
						Excos: x.Excos || "",
						Examt: (x.Examt != null ? String(x.Examt) : "0.000"),
						Waers: x.Waers || "",
						/* 				// Convert to JS Date if necessary
										Exdat: x.Exdat ? new Date(x.Exdat) : new Date() */
					}));
					oAdvModel.setProperty("/items", items);
				},
				error: () => {
					// On read error, keep table empty
					oAdvModel.setProperty("/items", []);
				}
			});
		},

	/**
	 * Reads ReqEGClaimSet from backend and populates local "clm" model
	 * @param {string} sGuid - The request GUID
	 * @private
	 */
	_initLocalClmFromBackend: function (sGuid) {
		const oModel = this.getView().getModel();
		const oClmModel = this.getView().getModel("clm");

		// If request is not yet persisted, leave empty
		if (!sGuid || sGuid === "00000000-0000-0000-0000-000000000000") {
			oClmModel.setProperty("/items", []);
			return;
		}

		// Create filter for Guid (same approach as Timeline)
		const oFilter = new Filter("Guid", FilterOperator.EQ, sGuid);

		// Read claims from ReqEGClaimSet entity set with GUID filter
		oModel.read("/ReqEGClaimSet", {
			filters: [oFilter],
			success: (oData) => {
				const aClaims = (oData && oData.results) ? oData.results : [];
				// Normalize data (keep string format for Edm.Decimal)
				const items = aClaims.map(x => ({
					Excos: x.Excos || "",
					ExamtE: (x.ExamtE != null ? String(x.ExamtE) : "0.000"),  // ExamtE = Expense Amount
					Examt: (x.Examt != null ? String(x.Examt) : "0.000"),     // Examt = Advance Amount
					Waers: x.Waers || ""
				}));
				oClmModel.setProperty("/items", items);
			},
			error: () => {
				// On read error, keep table empty
				oClmModel.setProperty("/items", []);
			}
		});
	},		/**
		 * Reads AttachmentSet from common service backend and populates local "attachments" model
		 * @param {string} sGuid - The request GUID
		 * @private
		 */
		_initLocalAttachmentsFromBackend: function (sGuid) {
			const oCommonModel = this.getOwnerComponent().getModel("commonModel");
			const oAttachmentsModel = this.getView().getModel("attachments");

			// If request is not yet persisted, leave empty
			if (!sGuid || sGuid === "00000000-0000-0000-0000-000000000000") {
				oAttachmentsModel.setProperty("/items", []);
				return;
			}

			// Check if common model is available
			if (!oCommonModel) {
				oAttachmentsModel.setProperty("/items", []);
				return;
			}

			// Create filter for Guid
			const oFilter = new Filter("Guid", FilterOperator.EQ, sGuid);

			// Read attachments from AttachmentSet entity set with GUID filter
			oCommonModel.read("/AttachmentSet", {
				filters: [oFilter],
				success: (oData) => {
					const aAttachments = (oData && oData.results) ? oData.results : [];
					// Map backend data to local model structure
					const items = aAttachments.map(x => ({
						AttType: x.AttachType || "",
						IncNb: x.IncNb || "00",
						Filename: x.Filename || "",
						Fileext: x.Fileext || "",
						Filetype: x.Filetype || "",
						Filecontent: x.Filecontent || "",
						toDelete: false
					}));
					oAttachmentsModel.setProperty("/items", items);
				},
				error: () => {
					// On read error, keep attachments empty
					oAttachmentsModel.setProperty("/items", []);
				}
			});
		},

		/**
		 * Uploads all attachments stored in local model to backend
		 * Uses ZHR_BENEFITS_COMMON_SRV AttachmentSet with Upload action
		 * @param {string} sGuid - The request GUID
		 * @private
		 */
		_uploadAttachments: function (sGuid) {
			const that = this;
			const oAttachmentsModel = this.getView().getModel("attachments");
			const aAttachments = oAttachmentsModel.getProperty("/items") || [];

			// Use the common service model
			const oCommonModel = this.getOwnerComponent().getModel("commonModel");

			if (!oCommonModel) {
				sap.m.MessageBox.error(this.getText("commonServiceNotAvailable"));
				return;
			}

			// Filter only new attachments (IncNb = '00')
			const aNewAttachments = aAttachments.filter(att => att.IncNb === '00');

			if (aNewAttachments.length === 0) {
				return; // No new files to upload
			}

			// Get CSRF token
			const sCsrfToken = oCommonModel.getSecurityToken();

			// Create promises for all uploads using fetch + binary - SEQUENTIAL to avoid timing issues
			const uploadSequentially = async () => {
				for (const oAtt of aNewAttachments) {
					const sUrl = `/sap/opu/odata/sap/ZHR_BENEFITS_COMMON_SRV/AttachmentSet(Guid=guid'${sGuid}',AttachType='${oAtt.AttType}',IncNb='00')/Upload`;

					try {
						const response = await fetch(sUrl, {
							method: "POST",
							headers: {
								"x-csrf-token": sCsrfToken,
								"Content-Type": oAtt.Filetype,
								"Slug": oAtt.Filename
							},
							body: oAtt.Blob
						});

						if (!response.ok) {
							throw new Error(`HTTP ${response.status}: ${response.statusText}`);
						}

						sap.m.MessageToast.show(that.getText("fileUploaded") + ": " + oAtt.Filename);

					} catch (error) {
						console.error("Upload error for " + oAtt.Filename + ":", error);
						that._showODataError(that.getText("fileUploadError") + ": " + oAtt.Filename);
						throw error;
					}
				}
			};

			// Execute sequential upload
			uploadSequentially()
				.then(() => {
					that._initLocalAttachmentsFromBackend(sGuid);
				})
				.catch((error) => {
					console.error("Some uploads failed, but will still reload from backend:", error);
					that._initLocalAttachmentsFromBackend(sGuid);
				});
		},		
		/**
		 * Event handler for deleting a claim from the table
		 * Removes the selected claim from the local claims model
		 * @param {sap.ui.base.Event} oEvent - The delete event
		 * @public
		 */
		/**
		 * Event handler for deleting a claim from the table
		 * Removes the selected claim from the local model "clm"
		 * @param {sap.ui.base.Event} oEvent - The delete event
		 * @public
		 */
		onDeleteClaimButtonPress: function (oEvent) {
			const oListItem = oEvent.getParameter("listItem");
			const oBindingContext = oListItem.getBindingContext("clm");

			if (oBindingContext) {
				// Get the index of the item to delete
				const sPath = oBindingContext.getPath();
				const iIndex = parseInt(sPath.split("/").pop());

				// Get the local claims model
				const oClmModel = this.getView().getModel("clm");
				const aItems = oClmModel.getProperty("/items") || [];

				// Remove the claim at the specified index
				aItems.splice(iIndex, 1);

				// Update the model
				oClmModel.setProperty("/items", aItems);

				// Show confirmation message
				sap.m.MessageToast.show(this.getText("claimDeleted"));
			}
		},		/**
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
				const sEduGrantDetailPath = oContext.getPath() + "/ToEduGrantDetail";				// Clear ALL school-related fields first to avoid old values
				// Basic school information
				oModel.setProperty(sEduGrantDetailPath + "/Egsna", "");        // School Name
				oModel.setProperty(sEduGrantDetailPath + "/Egsty", "");        // School Type (from backend)
				oModel.setProperty(sEduGrantDetailPath + "/Ort01", "");        // School City
				oModel.setProperty(sEduGrantDetailPath + "/Egsct", "");        // School Country

				// Additional school type and academic information
				oModel.setProperty(sEduGrantDetailPath + "/Egtyp", "");        // School Type (additional)
				oModel.setProperty(sEduGrantDetailPath + "/Egfpda", false);    // First Post Secondary Degree
				oModel.setProperty(sEduGrantDetailPath + "/YyPsYear", "");     // Year of Entry Post Secondary
				oModel.setProperty(sEduGrantDetailPath + "/Eggrd", "");        // Grade
				oModel.setProperty(sEduGrantDetailPath + "/Egtypatt", "");     // Type of Attendance

				// Location and logistics
				oModel.setProperty(sEduGrantDetailPath + "/Egcdf", false);     // Commuting Distance
				// oModel.setProperty(sEduGrantDetailPath + "/TuitionWaers", ""); // Tuition Currency - Don't clear
				oModel.setProperty(sEduGrantDetailPath + "/Egchbrd", false);   // Child Boarder

				// Academic period dates
				// oModel.setProperty(sEduGrantDetailPath + "/Egyfr", null);      // Starting From - Don't clear
				// oModel.setProperty(sEduGrantDetailPath + "/Egyto", null);      // Up To - Don't clear

				// Also clear the School Country Input field description
				const oSchoolCountryInput = oView.byId("EGSCT");
				if (oSchoolCountryInput && oSchoolCountryInput.setDescription) {
					oSchoolCountryInput.setDescription("");
				}

				// Don't touch TUITION_WAERS at all (neither value nor description)

				// Load school details from backend
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
						this.addODataErrorMessage(
							oError,
							this.getText("schoolDetailsLoadError"),
							"/SchoolDetails"
						);

						this.fError();
					}
				});
			}
		},

		/**
		 * Clear all school-related fields when no school is selected
		 * @private
		 */
		_clearSchoolFields: function () {
			const oModel = this.getView().getModel();
			const oView = this.getView();
			const oContext = this.getView().getBindingContext();

			if (oContext) {
				const sEduGrantDetailPath = oContext.getPath() + "/ToEduGrantDetail";				// Clear ALL school-related fields
				// Basic school information
				oModel.setProperty(sEduGrantDetailPath + "/Egsna", "");        // School Name
				oModel.setProperty(sEduGrantDetailPath + "/Egsty", "");        // School Type (from backend)
				oModel.setProperty(sEduGrantDetailPath + "/Ort01", "");        // School City
				oModel.setProperty(sEduGrantDetailPath + "/Egsct", "");        // School Country

				// Additional school type and academic information
				oModel.setProperty(sEduGrantDetailPath + "/Egtyp", "");        // School Type (additional)
				oModel.setProperty(sEduGrantDetailPath + "/Egfpda", false);    // First Post Secondary Degree
				oModel.setProperty(sEduGrantDetailPath + "/YyPsYear", "");     // Year of Entry Post Secondary
				oModel.setProperty(sEduGrantDetailPath + "/Eggrd", "");        // Grade
				oModel.setProperty(sEduGrantDetailPath + "/Egtypatt", "");     // Type of Attendance

				// Location and logistics
				oModel.setProperty(sEduGrantDetailPath + "/Egcdf", false);     // Commuting Distance
				oModel.setProperty(sEduGrantDetailPath + "/TuitionWaers", ""); // Tuition Currency
				oModel.setProperty(sEduGrantDetailPath + "/Egchbrd", false);   // Child Boarder

				// Academic period dates
				oModel.setProperty(sEduGrantDetailPath + "/Egyfr", null);      // Starting From
				oModel.setProperty(sEduGrantDetailPath + "/Egyto", null);      // Up To

				// Also clear the School Country Input field description
				const oSchoolCountryInput = oView.byId("EGSCT");
				if (oSchoolCountryInput && oSchoolCountryInput.setDescription) {
					oSchoolCountryInput.setDescription("");
				}

				// Clear the Tuition Currency Input field description
				const oTuitionCurrencyInput = oView.byId("TUITION_WAERS");
				if (oTuitionCurrencyInput && oTuitionCurrencyInput.setDescription) {
					oTuitionCurrencyInput.setDescription("");
				}
			}
		},

		/**
		 * Update school country description based on country code
		 * @param {string} sCountryCode - The country code
		 * @private
		 */
		_updateSchoolCountryDescription(sCountryCode) {
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
					if (oData.results && oData.results.length > 0) {
						// Filter client-side to make sure we find the right country
						const aCountries = oData.results.filter(country => country.Id === sCountryCode);

						if (aCountries.length > 0) {
							const sCountryDescription = aCountries[0].Txt;
							// Set the description in the Input (EGSCT)
							const oSchoolCountryInput = oView.byId("EGSCT");
							if (oSchoolCountryInput && oSchoolCountryInput.setDescription) {
								oSchoolCountryInput.setDescription(sCountryDescription);
							}
						}
					}
				},
				error: (oError) => {
					this.fError();
				}
			});
		},

	/**
	 * Private method to save benefit request object.
	 * Performs deep insert operation to save benefit request with education grant details.
	 * @param {string} sStatus - Optional status to override the current request status (empty string triggers auto-detection)
	 * @param {string} sComment - Optional comment to store in Note field
	 * @private
	 */
	_saveBenefitRequestObject: function (sStatus, sComment) {
		const that = this;
		const oView = this.getView();
		const oModel = oView.getModel();
		const oContext = oView.getBindingContext();
		
		// If sStatus is empty string (called from submit), auto-detect status based on Isclaim and Isadvance
		if (sStatus === "") {
			const bIsClaim = oContext.getProperty("Isclaim");
			const bIsAdvance = oContext.getProperty("Isadvance");
			
			// If both Isclaim and Isadvance are true, use SUBMITTED_CLAIMS status
			if (bIsClaim === true && bIsAdvance === true) {
				sStatus = constants.REQUEST_STATUS.SUBMITTED_CLAIMS; // "09"
			} else {
				sStatus = constants.REQUEST_STATUS.SUBMITTED; // "01"
			}
		}
		// If sStatus is undefined (Save button), don't override status
		// If sStatus has a value ("01", "09", etc.), use it as-is
		
		// set status to saved draft
		oView.byId("draftIndicator").showDraftSaving();			if (!oContext) {
				return;
			}

			// Store comment in Note field if provided (common logic for creation and submit)
			if (sComment) {
				oModel.setProperty("Note", sComment, oContext);
			}

			// set busy indicator during save
			// set busy indicator during save
			const oViewModel = this.getModel("detailView");
			oViewModel.setProperty("/busy", true);

			// For deep insert, retrieve form data and create a new object
			const oRequestData = oModel.getObject(oContext.getPath());
			const oEduGrantDetail = oModel.getObject(oContext.getPath() + "/ToEduGrantDetail");
			const oRentalSubsidy = oModel.getObject(oContext.getPath() + "/ToRentalSubsidyDetail");

			// Get advances from local model "adv" instead of OData
			const oAdvModel = oView.getModel("adv");
			const aAdvances = oAdvModel.getProperty("/items") || [];

			// Get claims from local model "clm"
			const oClmModel = oView.getModel("clm");
			const aClaims = oClmModel.getProperty("/items") || [];

			// Build the object for deep insert with new GUID
			const oDeepInsertData = {
				// Header properties - new GUID
				...oRequestData,
				// Deep insert association with form data
				ToEduGrantDetail: {
					...oEduGrantDetail,
				},
				ToRentalSubsidyDetail: {
					...oRentalSubsidy,
				},
				// Deep insert association for advances from local model
				ToEduGrantAdvances: aAdvances,
				// Deep insert association for claims from local model
				ToEduGrantClaims: aClaims
			};

			// Override status if provided as parameter
			if (sStatus) {
				oDeepInsertData.RequestStatus = sStatus;
			}

			// Use create() for deep insert of a new record
			oModel.create("/RequestHeaderSet", oDeepInsertData, {
				success: function (oData, oResponse) {
					oViewModel.setProperty("/busy", false);
					// Success - clean messages and indicate save
					that.clearMessages();
					that.addSuccessMessage(
						that.getText("requestSavedSuccessfully")
					);
					// Show toast message if this was a submit action (status was provided)
					if (sStatus) {
						sap.m.MessageToast.show(that.getText("requestSubmittedSuccessfully"), {
							duration: 3000
						});
					}
					that._resetValidationChecks && that._resetValidationChecks();
					oView.byId("draftIndicator").showDraftSaved();
					// Reset pending changes because the new object has been created
					oModel.resetChanges();
					// Refresh OData to get updated data from backend
					const oElementBinding = oView.getElementBinding();
					if (oElementBinding) {
						oElementBinding.refresh(true); // Force refresh from backend
					}
					// Refresh Timeline to show new submit entry
					that._refreshTimeline();
					// Update UI settings after status change (e.g., from Draft to Submitted)
					// Note: This will be called again in _onBindingChange after the refresh
					that._getUISettings();
					// Delete attachments marked for deletion, then upload new attachments
					that._deleteAttachments(oData.Guid).then(function () {
						that._uploadAttachments(oData.Guid);
					}).catch(function (oError) {
						console.error("Error deleting attachments", oError);
						// Continue with upload even if delete fails
						that._uploadAttachments(oData.Guid);
					});
					// Navigate to the newly created object
					const currentUrl = window.location.href;
					if (currentUrl.includes("DetailOnly")) {
						// Get current role from URL arguments to preserve context
						const oArguments = that.getRouter().getRoute("RouteDetailOnly")._oConfig._oRouter._oMatchedRoute.getParameter("arguments") || {};
						const sCurrentRole = oViewModel.getProperty("/role") || oArguments.role || oData.Objps;
						
						that.getRouter().navTo("RouteDetailOnly", {
							benefitRequestId: oData.Guid,
							role: sCurrentRole,
							nextActorCode: oData.NextActor,
							requestStatus: oData.RequestStatus,
							requestType: oData.RequestType
						});
					} else {
						// Navigate to standard master-detail route
						that.getRouter().navTo("RouteDetail", {
							benefitRequestId: oData.Guid,
							requestType: oData.RequestType
						});
					}
				},
				error: function (oError) {
					oViewModel.setProperty("/busy", false);
					that.addODataErrorMessage(
						oError,
						that.getText("saveErrorTitle"),
						"/SaveOperation"
					);
					oView.byId("draftIndicator").clearDraftState();
				}
			});
		},
		/**
		 * Load value help data into separate JSON models based on request type
		 * Loads configuration from valueHelpConfigEG.json or valueHelpConfigRS.json
		 * @param {string} sRequestType - Request type (constants.REQUEST_TYPES)
		 * @private
		 */
		_loadValueHelpData: function (sRequestType) {
			// Determine which config file to load based on request type
			let sConfigFileName = "";
			if (sRequestType === constants.REQUEST_TYPES.EDUCATION_GRANT) {
				sConfigFileName = "valueHelpConfigEG.json";
			} else if (sRequestType === constants.REQUEST_TYPES.RENTAL_SUBSIDY) {
				sConfigFileName = "valueHelpConfigRS.json";
			} else {
				// Default to EG if type is unknown
				sConfigFileName = "valueHelpConfigEG.json";
			}

			const sConfigPath = sap.ui.require.toUrl("com/un/zhrbenefrequests/model/" + sConfigFileName);

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
						this._loadGenericData(config.modelName, config.method, sRequestType);
					});
				})
				.catch(oError => {
					console.error("Error loading value help config:", oError);
				});
		},

		/**
		 * Generic method to load data from GenericVHSet into a specific JSON model
		 * @param {string} sModelName - Name of the JSON model to populate
		 * @param {string} sMethod - Method name for the GenericVHSet filter
		 * @param {string} sRequestType - Request type for the GenericVHSet filter
		 * @private
		 */
		_loadGenericData: function (sModelName, sMethod, sRequestType) {
			const oModel = this.getModel();
			const aFilters = [
				new sap.ui.model.Filter("Method", sap.ui.model.FilterOperator.EQ, sMethod),
				new sap.ui.model.Filter("RequestType", sap.ui.model.FilterOperator.EQ, sRequestType)
			];

			oModel.read("/GenericVHSet", {
				filters: aFilters,
				success: (oData) => {
					this.getModel(sModelName).setData({
						items: oData.results
					});
				},
				error: (oError) => {
					// Handle error silently or with minimal logging
				}
			});
		},		/**
		 * Handler for multiple attendance switch state change
		 * Converts switch state to model value
		 * @param {sap.ui.base.Event} oEvent - The switch change event
		 */
		onMultipleAttendanceChange: function (oEvent) {
			var bState = oEvent.getParameter("state");
			var sValue = bState ? 'N' : '';

			// Update the model with the converted value
			var oContext = this.getView().getBindingContext();
			if (oContext) {
				this.getModel().setProperty(
					oContext.getPath() + "/ToEduGrantDetail/Egmul",
					sValue
				);
			}

			// Recalculate completion after change
			this._calculateFormCompletion();
		},

		/**
		 * Handler for EGRUL (Apply Two Third Rule) checkbox change
		 * Converts checkbox state to model value
		 * '' (empty) = Checked (true), 'N' = Unchecked (false)
		 * @param {sap.ui.base.Event} oEvent - The checkbox select event
		 */
		onEgrulChange: function (oEvent) {
			var bSelected = oEvent.getParameter("selected");
			var sValue = bSelected ? '' : 'N';  // Checked = '' (empty), Unchecked = 'N'

			// Update the model with the converted value
			var oContext = this.getView().getBindingContext();
			if (oContext) {
				this.getModel().setProperty(
					oContext.getPath() + "/ToEduGrantDetail/Egrul",
					sValue
				);
			}

			// Recalculate completion after change
			this._calculateFormCompletion();
		},

		/**
		 * Binds timeline data with Guid filter
		 * Applies filter to RequestHistoryAndComentsSet using current request Guid
		 * @private
		 */
		_bindTimelineData: function (_guid) {
			const oView = this.getView();

			// Find Timeline control - it could be in fragment or direct view
			let oTimeline = oView.byId("idTimelineObject");

			if (oTimeline) {
				// Create filter for Guid
				const oFilter = new sap.ui.model.Filter("Guid", sap.ui.model.FilterOperator.EQ, _guid);

				// Bind with filter
				oTimeline.bindAggregation("content", {
					path: "/RequestHistoryAndComentsSet",
					filters: [oFilter],
					template: oTimeline.getBindingInfo("content").template
				});
			}
		},

		/**
		 * Refreshes the Timeline data to show latest entries (e.g., after submit)
		 * @private
		 */
		_refreshTimeline: function () {
			const oView = this.getView();
			const oTimeline = oView.byId("idTimelineObject");

			if (oTimeline) {
				const oBinding = oTimeline.getBinding("content");
				if (oBinding) {
					oBinding.refresh(true); // Force refresh from backend
				}
			}
		},



		/**
		 * Get all visible form fields (Input, Select, CheckBox, etc.)
		 * Filters fields based on the current request type to avoid counting fields from inactive forms
		 * @returns {Array} Array of visible form controls for the active request type
		 * @private
		 */
		_getVisibleFormFields: function () {
			const oView = this.getView();
			const oContext = oView.getBindingContext();

			if (!oContext) {
				return [];
			}

			// Get current request type
			const sRequestType = oContext.getProperty("RequestType");

			// Get the appropriate form section based on request type (maintenant les IDs correspondent au contenu)
			let oFormSection;
			if (sRequestType === constants.REQUEST_TYPES.EDUCATION_GRANT) {
				// Education Grant 
				oFormSection = oView.byId("educationGrantFormSection");
			} else if (sRequestType === constants.REQUEST_TYPES.RENTAL_SUBSIDY) {
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
			const aInputs = oFormSection.findAggregatedObjects(true, function (oControl) {
				return (oControl.isA("sap.m.Input") ||
					oControl.isA("sap.m.Select") ||
					oControl.isA("sap.m.CheckBox") ||
					oControl.isA("sap.m.Switch") ||
					oControl.isA("sap.m.DatePicker")) &&
					oControl.getVisible();
			});

			return aInputs;
		},

		/**
		 * Check if a field is filled
		 * @param {sap.ui.core.Control} oControl - The control to check
		 * @returns {boolean} True if field has value
		 * @private
		 */
		_isFieldFilled: function (oControl) {
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
		_restoreFormCompletion: function () {
			const oContext = this.getView().getBindingContext();

			if (oContext) {
				const oModel = this.getView().getModel();
				const sPath = oContext.getPath();

				// Get the stored value from the Completion field in the header model
				const sCompletion = oModel.getProperty(sPath + "/Completion");

				if (sCompletion !== undefined && sCompletion !== null && sCompletion !== "") {
					// Check if it's a valid value (not just spaces)
					const sTrimmed = String(sCompletion).trim();

					if (sTrimmed !== "" && !isNaN(parseFloat(sTrimmed))) {
						const sState = formatter.getCompletionState(sCompletion);
						return; // We have a valid value, no need to recalculate
					}
				}

				// No stored value (creation), launch initial calculation
				this._calculateFormCompletion();
			}
		},

		/**
		 * Calculate form completion percentage based on visible fields
		 * @private
		 */
		_calculateFormCompletion: function () {
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

				// Store completion value in the header model
				const oContext = this.getView().getBindingContext();
				if (oContext) {
					const oModel = this.getView().getModel();
					const sPath = oContext.getPath();

					// Store percentage as string to match backend string format
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
		_resetFormCompletion: function () {
			// Detach previous listeners to avoid conflicts
			this._detachCompletionListeners();
		},

		/**
		 * Detach previous completion listeners to avoid collisions when navigating between requests
		 * @private
		 */
		_detachCompletionListeners: function () {
			// Detach from all form fields in the view to avoid conflicts
			const oView = this.getView();
			const aAllControls = oView.findAggregatedObjects(true, function (oControl) {
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
		},

		/**
		 * Clear all local models when navigating to a different request
		 * @private
		 */
		_clearLocalModels: function () {
			const oView = this.getView();

			// Clear claims model
			const oClmModel = oView.getModel("clm");
			if (oClmModel) {
				oClmModel.setProperty("/items", []);
			}

			// Clear advances model
			const oAdvModel = oView.getModel("adv");
			if (oAdvModel) {
				oAdvModel.setProperty("/items", []);
			}

			// Clear attachments model
			const oAttachmentsModel = oView.getModel("attachments");
			if (oAttachmentsModel) {
				oAttachmentsModel.setProperty("/items", []);
			}
		},		/**
		 * Attach event listeners to all form fields for real-time completion calculation
		 * @private
		 */
		_attachCompletionListeners: function () {
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
		},

		/**
	 * Deletes attachments marked for deletion from backend
	 * Uses ZHR_BENEFITS_COMMON_SRV AttachmentSet DELETE
	 * @param {string} sGuid - The request GUID
	 * @private
	 */
		_deleteAttachments: function (sGuid) {
			const that = this;
			const oAttachmentsModel = this.getView().getModel("attachments");
			const aAttachments = oAttachmentsModel.getProperty("/items") || [];

			// Filter attachments marked for deletion
			const aToDelete = aAttachments.filter(att => att.toDelete === true);

			if (aToDelete.length === 0) {
				return Promise.resolve(); // No files to delete
			}

			// Use the common service model
			const oCommonModel = this.getOwnerComponent().getModel("commonModel");

			if (!oCommonModel) {
				sap.m.MessageBox.error(this.getText("commonServiceNotAvailable"));
				return Promise.reject();
			}

			// Get CSRF token
			const sCsrfToken = oCommonModel.getSecurityToken();

			// Create promises for all deletions using fetch
			const aDeletePromises = aToDelete.map(async (oAtt) => {
				// Build the URL with key parameters
				// AttachmentSet(Guid=guid'xxx',AttachType='001',IncNb='01')/$value
				const sUrl = `/sap/opu/odata/sap/ZHR_BENEFITS_COMMON_SRV/AttachmentSet(Guid=guid'${sGuid}',AttachType='${oAtt.AttType}',IncNb='${oAtt.IncNb}')/$value`;

				try {
					const response = await fetch(sUrl, {
						method: "DELETE",
						headers: {
							"x-csrf-token": sCsrfToken
						}
					});

					if (!response.ok) {
						throw new Error(`HTTP ${response.status}: ${response.statusText}`);
					}

					console.log("Attachment deleted:", oAtt.Filename);
					return response;

				} catch (error) {
					console.error("Error deleting attachment:", oAtt.Filename, error);
					throw error;
				}
			});

			// Wait for all deletions to complete
			return Promise.all(aDeletePromises).then(function () {
				// Remove deleted items from local model
				const aRemainingItems = aAttachments.filter(att => att.toDelete !== true);
				oAttachmentsModel.setProperty("/items", aRemainingItems);
			});
		},


		/**
		 * Validates all required fields in the current form
		 * @returns {Array} Array of field labels that are required but empty
		 * @private
		 */
		_validateRequiredFields: function () {
			const oView = this.getView();
			const oContext = oView.getBindingContext();
			const oModel = oView.getModel();
			const aValidationErrors = [];

			// If no required fields array or no binding context, skip validation
			if (!this._aRequiredFields || this._aRequiredFields.length === 0 || !oContext) {
				return aValidationErrors;
			}

			// Get the data object that will be sent to backend
			const oRequestData = oModel.getObject(oContext.getPath());
			const sRequestType = oRequestData.RequestType;

			// Get the appropriate detail object based on request type
			let oDetailObject;
			if (sRequestType === constants.REQUEST_TYPES.EDUCATION_GRANT) { // "01"
				oDetailObject = oModel.getObject(oContext.getPath() + "/ToEduGrantDetail");
			} else if (sRequestType === constants.REQUEST_TYPES.RENTAL_SUBSIDY) { // "02"
				oDetailObject = oModel.getObject(oContext.getPath() + "/ToRentalSubsidyDetail");
			}

			// Validate each required field by checking the binding data
			this._aRequiredFields.forEach(function (oFieldInfo) {
				const sFieldId = oFieldInfo.fieldId; // e.g., "EGCNA" or "EG_CNA"
				const sFieldLabel = oFieldInfo.label || sFieldId;

				// Helper function to find property in object with case-insensitive search
				const findPropertyCaseInsensitive = function (oObject, sPropertyName) {
					if (!oObject) return null;

					// Try direct match first
					if (sPropertyName in oObject) {
						return oObject[sPropertyName];
					}

					// Remove underscores and try again
					const sPropertyNameNoUnderscore = sPropertyName.replace(/_/g, '');
					if (sPropertyNameNoUnderscore !== sPropertyName && sPropertyNameNoUnderscore in oObject) {
						return oObject[sPropertyNameNoUnderscore];
					}

					// Search through all keys with case-insensitive comparison (with and without underscores)
					const sPropertyNameLower = sPropertyName.toLowerCase();
					const sPropertyNameNoUnderscoreLower = sPropertyNameNoUnderscore.toLowerCase();

					for (const sKey in oObject) {
						const sKeyLower = sKey.toLowerCase();
						const sKeyNoUnderscore = sKey.replace(/_/g, '').toLowerCase();

						if (sKeyLower === sPropertyNameLower ||
							sKeyNoUnderscore === sPropertyNameNoUnderscoreLower) {
							return oObject[sKey];
						}
					}
					return null;
		};

		// Determine the value by checking both data structures
		let sValue = findPropertyCaseInsensitive(oDetailObject, sFieldId);
		if (sValue === null) {
			sValue = findPropertyCaseInsensitive(oRequestData, sFieldId);
		}

		// Special handling for FileUploader controls (attachments)
		const aFileUploaderIds = ["005", "004", "010", "009", "011"];
		if (aFileUploaderIds.includes(sFieldId)) {
			// Check in attachments model instead of OData model
			const oAttachmentsModel = oView.getModel("attachments");
			const aAttachments = oAttachmentsModel.getProperty("/items") || [];
			
			// Count files of this type that are not marked for deletion
			const aValidFiles = aAttachments.filter(function(oAtt) {
				return oAtt.AttType === sFieldId && oAtt.toDelete !== true;
			});
			
			// If at least one file exists, consider the field as filled
			if (aValidFiles.length > 0) {
				sValue = "HAS_FILES"; // Non-empty value to pass validation
			} else {
				sValue = ""; // Empty to fail validation
			}
		}

		// Check if value is empty (null, undefined, empty string, or whitespace)
		const bIsEmpty = sValue === null || sValue === undefined ||
			(typeof sValue === 'string' && sValue.trim() === '');

		if (bIsEmpty) {
			// Set value state to error on the control for visual feedback
			const oControl = oView.byId(sFieldId);
			if (oControl && oControl.setValueState) {
				oControl.setValueState(sap.ui.core.ValueState.Error);
				oControl.setValueStateText(this.getText("fieldRequired") || "Ce champ est obligatoire");
			}
			aValidationErrors.push(sFieldLabel);
		} else {
			// Clear error state if field is filled
			const oControl = oView.byId(sFieldId);
			if (oControl && oControl.setValueState) {
				oControl.setValueState(sap.ui.core.ValueState.None);
			}
		}
	}.bind(this));			return aValidationErrors;
		},

		/**
		 * Sets focus on the first invalid field for better user experience
		 * @param {Array} aValidationErrors - Array of field labels with errors
		 * @private
		 */
		_focusFirstInvalidField: function (aValidationErrors) {
			if (aValidationErrors.length === 0 || !this._aRequiredFields) {
				return;
			}

			const oView = this.getView();

			// Find the first field with an error and set focus
			for (let i = 0; i < this._aRequiredFields.length; i++) {
				const oFieldInfo = this._aRequiredFields[i];
				if (aValidationErrors.includes(oFieldInfo.label)) {
					const oControl = oView.byId(oFieldInfo.fieldId);
					if (oControl && oControl.focus) {
						setTimeout(function () {
							oControl.focus();
						}, 100);
						break;
					}
				}
			}
		},
		/**
		 * Check if a field is an exception that should not be managed by UI settings
		 * @param {string} sFieldId - The field ID to check
		 * @returns {boolean} True if the field is an exception
		 * @private
		 */
	_isUISettingsException: function (sFieldId) {
		// List of fields that have custom visibility/editability management
		const aExceptions = [
			"EGSAR",     // Handled separately in _loadSchoolDetails, controlled by EGDIS switch
			"YYPSYEAR"   // Conditional visibility based on EGTYP (Post-secondary only)
		];
		return aExceptions.includes(sFieldId);
	},		_resetVisibility: function (oField) {
			const oView = this.getView();

			// Skip fields that have custom visibility management
			if (this._isUISettingsException(oField)) {
				return;
			}

			// Find the control by its id (which must match Field)
			const oCtrl = oView.byId(oField);
			if (oCtrl) {
				// apply dynamically
				if (oCtrl.setEditable) {
					oCtrl.setEditable(false);
				}
				if (oCtrl.setEnabled) {
					oCtrl.setEnabled(false);
				}
				if (oCtrl.setVisible) {
					oCtrl.setVisible(false);
				}
				if (oCtrl.setRequired) {
					oCtrl.setRequired(false);
				}
			}
		},

		/**
		 * Logs all impacted UI fields and their changed properties in a table.
		 * @param {Array} aUIProperties - Array of UI properties from the service
		 * @private
		 */
		_logImpactedUIFields: function (aUIProperties) {
			const oView = this.getView();
			const aImpactedFields = [];

			// Log the filter values used for UI settings
			const oCurrentObject = this.getBindingDetailObject();
			const sCurrentRole = this.getModel("detailView").getProperty("/role");

			console.log("UI Settings Filter Values:");
			console.log("RequestType:", oCurrentObject.RequestType);
			console.log("Actor:", sCurrentRole + " - " + this.formatter.formatActorRole(sCurrentRole));
			console.log("Status:", oCurrentObject.RequestStatus + " - " + this.formatter.formatRequestStatusText(oCurrentObject.RequestStatus));

			for (const oUIProperty of aUIProperties) {
				let bException = false;
				let sExceptionReason = "";

				// Check for exceptions (special cases that are handled separately)
				if (this._isUISettingsException(oUIProperty.Field)) {
					bException = true;
					sExceptionReason = "Custom visibility management (not controlled by backend UI settings)";
				}

				const oCtrl = oView.byId(oUIProperty.Field);
				if (oCtrl || bException) {
					let editable = false, enabled = false, hidden = true, required = false;

					if (!bException) {
						switch (oUIProperty.Property) {
							case "01": hidden = true; break;
							case "02": hidden = false; break;
							case "03": editable = enabled = true; break;
							case "04": editable = enabled = true; required = true; break;
						}
					}

					aImpactedFields.push({
						Field: oUIProperty.Field,
						Property: oUIProperty.Property,
						Visible: bException ? "N/A" : !hidden,
						Editable: bException ? "N/A" : editable,
						Enabled: bException ? "N/A" : enabled,
						Required: bException ? "N/A" : required,
						ControlType: oCtrl ? oCtrl.getMetadata().getName() : "Not Found",
						Exception: bException ? "EXCEPTION: " + sExceptionReason : "Applied"
					});
				}
			}

			if (aImpactedFields.length > 0) {
				console.log("UI Settings Applied:");
				// Specify columns explicitly for console.table
				console.table(aImpactedFields, ["Field", "FieldLabel", "Property", "Visible", "Editable", "Enabled", "Required", "ControlType", "Exception"]);
			}
			else {
				console.log("No UI settings found on SAP.check table ZTHRFIORI_UI5PRO!");
			}
		}

	});
});